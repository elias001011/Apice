/**
 * Endpoint de clima usando OpenWeatherMap Geocoding + One Call 3 + Air Pollution.
 *
 * Fluxo:
 *  1. Geocoding API para converter cidade → lat/lon
 *  2. One Call 3 para dados climáticos atuais
 *  3. Air Pollution API para índice de qualidade do ar
 *
 * Endpoints públicos:
 *   GET /.netlify/functions/get-clima?city=São+Paulo
 *   GET /.netlify/functions/get-clima?geocode=1&q=São+Paulo&limit=5
 */

import process from 'node:process'
import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'

const OWM_API_KEY = process.env.CLIMA
const OWM_GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct'
const OWM_WEATHER_URL = 'https://api.openweathermap.org/data/3.0/onecall'
const OWM_AIR_URL = 'https://api.openweathermap.org/data/2.5/air_pollution'

/**
 * Mapeia o AQI numérico (1-5) para label e cor em português.
 */
function aqiInfo(aqi) {
  const map = {
    1: { label: 'Boa', color: '#4caf50' },
    2: { label: 'Razoável', color: '#8bc34a' },
    3: { label: 'Moderada', color: '#ff9800' },
    4: { label: 'Ruim', color: '#f44336' },
    5: { label: 'Muito ruim', color: '#b71c1c' },
  }
  return map[aqi] || { label: 'N/A', color: '#888' }
}

export default async function handler(req, context) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  const url = new URL(req.url)
  const isGeocode = url.searchParams.get('geocode') === '1'

  // ── Geocoding endpoint (sem auth) ───────────────────────────────
  if (isGeocode) {
    return handleGeocode(url, headers)
  }

  // ── Weather + Air Quality endpoint (com auth) ───────────────────
  const auth = requireAuth(req, context, headers)
  if (auth instanceof Response) {
    console.warn('[get-clima] Não autenticado')
    return auth
  }

  const cityParam = url.searchParams.get('city') || 'São Paulo'
  const cityName = cityParam.split(',')[0].trim()

  if (!OWM_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key não configurada' }), { status: 500, headers })
  }

  try {
    // Passo 1: Geocoding
    const geoRes = await fetch(`${OWM_GEO_URL}?q=${encodeURIComponent(cityName)}&limit=1&appid=${OWM_API_KEY}`)
    if (!geoRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha no geocoding' }), { status: geoRes.status, headers })
    }
    const geoData = await geoRes.json()
    if (!geoData || geoData.length === 0) {
      return new Response(JSON.stringify({ error: 'Cidade não encontrada', city: cityName }), { status: 404, headers })
    }
    const { lat, lon, name, state, country } = geoData[0]

    // Passo 2: One Call 3 (clima)
    const weatherUrl = `${OWM_WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&exclude=minutely,hourly,daily,alerts&appid=${OWM_API_KEY}`
    const weatherRes = await fetch(weatherUrl)

    if (!weatherRes.ok) {
      const errBody = await weatherRes.json().catch(() => ({}))
      console.error('[get-clima] One Call erro:', weatherRes.status, errBody)
      return new Response(JSON.stringify({
        error: 'Falha ao buscar clima',
        owmStatus: weatherRes.status,
        detail: errBody.message || '',
      }), { status: weatherRes.status, headers })
    }

    const weatherData = await weatherRes.json()
    const current = weatherData.current || {}

    // Passo 3: Air Pollution
    let airQuality = null
    try {
      const airRes = await fetch(`${OWM_AIR_URL}?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`)
      if (airRes.ok) {
        const airData = await airRes.json()
        const main = airData?.list?.[0]?.main
        const components = airData?.list?.[0]?.components
        if (main?.aqi) {
          const info = aqiInfo(main.aqi)
          airQuality = {
            aqi: main.aqi,
            label: info.label,
            color: info.color,
            components: components || {},
          }
        }
      }
    } catch (airErr) {
      console.warn('[get-clima] Falha ao buscar qualidade do ar:', airErr.message)
    }

    // Monta resposta compatível com o frontend
    const result = {
      cidade: name,
      pais: country,
      estado: state || '',
      temperatura: Math.round(current.temp),
      minima: Math.round(current.temp_min ?? current.temp),
      maxima: Math.round(current.temp_max ?? current.temp),
      sensacao: Math.round(current.feels_like ?? current.temp),
      descricao: current.weather?.[0]?.description || '',
      icone: current.weather?.[0]?.icon || '',
      condicaoId: current.weather?.[0]?.id,
      umidade: current.humidity,
      pressao: current.pressure,
      vento: Math.round((current.wind_speed || 0) * 3.6),
      visibilidadeKm: current.visibility ? Math.round(current.visibility / 1000 * 10) / 10 : null,
      nuvens: current.clouds,
      alertas: weatherData.alerts || [],
      qualidadeAr: airQuality,
      debug: {
        auth: 'ok',
        userId: auth.user.id.slice(0, 12),
        timestamp: new Date().toISOString(),
        lat, lon,
      },
    }

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[get-clima] Erro:', error.message)
    return new Response(JSON.stringify({ error: 'Erro interno', detail: error.message }), { status: 500, headers })
  }
}

/**
 * Handler para busca de cidades via Geocoding API.
 * GET /.netlify/functions/get-clima?geocode=1&q=São+Paulo&limit=5
 */
async function handleGeocode(url, headers) {
  const query = url.searchParams.get('q')
  const limit = url.searchParams.get('limit') || '5'

  if (!query || query.trim().length < 2) {
    return new Response(JSON.stringify([]), { status: 200, headers })
  }

  if (!OWM_API_KEY) {
    return new Response(JSON.stringify([]), { status: 200, headers })
  }

  try {
    const geoUrl = `${OWM_GEO_URL}?q=${encodeURIComponent(query.trim())}&limit=${limit}&appid=${OWM_API_KEY}`
    const res = await fetch(geoUrl)

    if (!res.ok) {
      console.error('[get-clima:geocode] Erro:', res.status)
      return new Response(JSON.stringify([]), { status: 200, headers })
    }

    const data = await res.json()
    const results = Array.isArray(data) ? data.slice(0, parseInt(limit, 10)).map(item => ({
      name: item.name,
      state: item.state || '',
      country: item.country || '',
      lat: item.lat,
      lon: item.lon,
      displayName: [item.name, item.state].filter(Boolean).join(', '),
    })) : []

    return new Response(JSON.stringify(results), { status: 200, headers })
  } catch (error) {
    console.error('[get-clima:geocode] Erro:', error.message)
    return new Response(JSON.stringify([]), { status: 200, headers })
  }
}
