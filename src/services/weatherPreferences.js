const WEATHER_LOCATION_KEY = 'apice:weather:location:v1'
const WEATHER_CARD_ENABLED_KEY = 'apice:weather:card-enabled:v1'
const WEATHER_PREFERENCES_EVENT = 'apice:weather-preferences-updated'
export const DEFAULT_WEATHER_LOCATION = 'Sao Paulo'
export const DEFAULT_WEATHER_CARD_ENABLED = true

export const WEATHER_LOCATION_SUGGESTIONS = [
  'Sao Paulo',
  'Rio de Janeiro',
  'Brasilia',
  'Belo Horizonte',
  'Curitiba',
  'Porto Alegre',
  'Florianopolis',
  'Salvador',
  'Recife',
  'Fortaleza',
]

export function normalizeWeatherLocation(value) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ')
  return normalized || DEFAULT_WEATHER_LOCATION
}

export function loadWeatherLocation() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_WEATHER_LOCATION
  }

  try {
    return normalizeWeatherLocation(localStorage.getItem(WEATHER_LOCATION_KEY))
  } catch {
    return DEFAULT_WEATHER_LOCATION
  }
}

export function loadWeatherCardEnabled() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_WEATHER_CARD_ENABLED
  }

  try {
    const raw = localStorage.getItem(WEATHER_CARD_ENABLED_KEY)
    if (raw === null) return DEFAULT_WEATHER_CARD_ENABLED
    if (raw === '0' || raw === 'false') return false
    return true
  } catch {
    return DEFAULT_WEATHER_CARD_ENABLED
  }
}

function emitWeatherPreferencesChange() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(WEATHER_PREFERENCES_EVENT, {
    detail: {
      location: loadWeatherLocation(),
      cardEnabled: loadWeatherCardEnabled(),
    },
  }))
}

export function saveWeatherLocation(value) {
  const nextLocation = normalizeWeatherLocation(value)

  if (typeof window === 'undefined' || !window.localStorage) {
    return nextLocation
  }

  try {
    localStorage.setItem(WEATHER_LOCATION_KEY, nextLocation)
    emitWeatherPreferencesChange()
  } catch {
    // ignore local persistence failures
  }

  return nextLocation
}

export function saveWeatherCardEnabled(value) {
  const nextValue = value !== false

  if (typeof window === 'undefined' || !window.localStorage) {
    return nextValue
  }

  try {
    localStorage.setItem(WEATHER_CARD_ENABLED_KEY, nextValue ? '1' : '0')
    emitWeatherPreferencesChange()
  } catch {
    // ignore local persistence failures
  }

  return nextValue
}

export function subscribeWeatherLocation(callback) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => callback(loadWeatherLocation())
  window.addEventListener(WEATHER_PREFERENCES_EVENT, handler)
  return () => window.removeEventListener(WEATHER_PREFERENCES_EVENT, handler)
}

export function subscribeWeatherCardEnabled(callback) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => callback(loadWeatherCardEnabled())
  window.addEventListener(WEATHER_PREFERENCES_EVENT, handler)
  return () => window.removeEventListener(WEATHER_PREFERENCES_EVENT, handler)
}
