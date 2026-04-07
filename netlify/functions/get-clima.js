/**
 * Endpoint de clima para diagnóstico de autenticação.
 *
 * Usa OpenWeatherMap API (free tier) para buscar clima atual.
 * Protegido por JWT auth — mesma cadeia das IAs.
 *
 * Se este endpoint falhar = problema de autenticação.
 * Se funcionar = problema específico das IAs.
 *
 * GET /.netlify/functions/get-clima?city=Sao+Paulo
 */

import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'

const OWM_API_KEY = process.env.CLIMA
const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'

export default async function handler(req) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // ── Authentication (mesma proteção das IAs) ────────────────────────────
  const auth = requireAuth(req, headers)
  if (auth instanceof Response) {
    console.warn('[get-clima] Requisição não autenticada (401).')
    return auth
  }

  // ── Parse query params ────────────────────────────────────────────────
  const url = new URL(req.url)
  const city = url.searchParams.get('city') || 'Sao Paulo'

  if (!OWM_API_KEY) {
    console.error('[get-clima] OPENWEATHERMAP_API_KEY não configurada')
    return new Response(
      JSON.stringify({
        error: 'API de clima não configurada',
        debug: { auth: 'ok', user: auth.user?.id?.slice(0, 8) + '...' }
      }),
      { status: 500, headers }
    )
  }

  try {
    const owmUrl = `${OWM_BASE_URL}?q=${encodeURIComponent(city)}&appid=${OWM_API_KEY}&units=metric&lang=pt_br`
    console.log(`[get-clima] Buscando clima para "${city}"`)

    const response = await fetch(owmUrl)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`[get-clima] OpenWeatherMap erro ${response.status}:`, errorData)
      return new Response(
        JSON.stringify({
          error: 'Falha ao buscar clima',
          owmStatus: response.status,
          owmError: errorData.message || '',
          debug: {
            auth: 'ok',
            userId: auth.user.id.slice(0, 12),
            city,
          }
        }),
        { status: response.status, headers }
      )
    }

    const data = await response.json()

    // Resposta simplificada e segura
    const result = {
      cidade: data.name,
      pais: data.sys?.country,
      temperatura: Math.round(data.main?.temp),
      sensacao: Math.round(data.main?.feels_like),
      descricao: data.weather?.[0]?.description,
      icone: data.weather?.[0]?.icon,
      umidade: data.main?.humidity,
      vento: Math.round((data.wind?.speed || 0) * 3.6), // m/s → km/h
      debug: {
        auth: 'ok',
        userId: auth.user.id.slice(0, 12),
        timestamp: new Date().toISOString(),
      }
    }

    console.log(`[get-clima] Sucesso para "${city}": ${result.temperatura}°C`)
    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[get-clima] Erro inesperado:', error.message)
    return new Response(
      JSON.stringify({
        error: 'Falha interna ao buscar clima',
        detail: error.message,
        debug: {
          auth: 'ok',
          userId: auth.user.id.slice(0, 12),
          city,
        }
      }),
      { status: 502, headers }
    )
  }
}
