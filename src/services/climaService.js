/**
 * Serviço de clima para diagnóstico de autenticação.
 *
 * Se a API de clima falhar = problema de autenticação JWT.
 * Se funcionar = problema específico das IAs.
 */

import { authFetch } from './authFetch.js'

const CLIMA_KEY = 'apice:clima:last-result:v1'
const CLIMA_ERROR_KEY = 'apice:clima:last-error:v1'
export const CLIMA_CACHE_MAX_AGE = 60 * 60 * 1000 // 1 hora

function normalizeCityKey(city) {
  return String(city || '').trim().toLowerCase()
}

/**
 * Busca o clima de uma cidade.
 *
 * @param {string} city - Cidade para buscar (default: São Paulo)
 * @returns {Promise<object>} Dados do clima
 */
export async function fetchClima(city = 'Sao Paulo') {
  const normalizedCity = String(city || '').trim() || 'Sao Paulo'

  // Limpa erro anterior
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(CLIMA_ERROR_KEY)
  }

  const res = await authFetch(`/.netlify/functions/get-clima?city=${encodeURIComponent(normalizedCity)}`)

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const error = new Error(errorData.error || 'Falha ao buscar clima')
    error.status = res.status
    error.detail = errorData.detail || errorData.owmError || ''
    error.debug = errorData.debug || {}

    // Salva erro para diagnóstico
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CLIMA_ERROR_KEY, JSON.stringify({
        status: res.status,
        error: errorData.error,
        debug: errorData.debug,
        timestamp: new Date().toISOString(),
      }))
    }

    throw error
  }

  const data = await res.json()
  const payload = {
    ...data,
    fetchedAt: new Date().toISOString(),
    requestedCity: normalizedCity,
    requestedCityKey: normalizeCityKey(normalizedCity),
  }

  // Salva resultado para referência
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(CLIMA_KEY, JSON.stringify(payload))
  }

  return payload
}

/**
 * Retorna o último resultado de clima cacheado.
 */
export function getLastClimaResult() {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(CLIMA_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isClimaResultFresh(result, city, maxAgeMs = CLIMA_CACHE_MAX_AGE) {
  if (!result?.fetchedAt) return false

  const fetchedAt = new Date(result.fetchedAt).getTime()
  if (Number.isNaN(fetchedAt)) return false
  if (Date.now() - fetchedAt > maxAgeMs) return false

  if (city) {
    return normalizeCityKey(result.requestedCityKey || result.requestedCity || result.cidade) === normalizeCityKey(city)
  }

  return true
}

/**
 * Retorna o último erro de clima.
 */
export function getLastClimaError() {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(CLIMA_ERROR_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Limpa dados de clima.
 */
export function clearClimaData() {
  if (typeof window === 'undefined' || !window.localStorage) return
  localStorage.removeItem(CLIMA_KEY)
  localStorage.removeItem(CLIMA_ERROR_KEY)
}
