const WEATHER_LOCATION_KEY = 'apice:weather:location:v1'
const WEATHER_LOCATION_EVENT = 'apice:weather-location-updated'
export const DEFAULT_WEATHER_LOCATION = 'Sao Paulo'

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

export function saveWeatherLocation(value) {
  const nextLocation = normalizeWeatherLocation(value)

  if (typeof window === 'undefined' || !window.localStorage) {
    return nextLocation
  }

  try {
    localStorage.setItem(WEATHER_LOCATION_KEY, nextLocation)
    window.dispatchEvent(new CustomEvent(WEATHER_LOCATION_EVENT, {
      detail: { location: nextLocation },
    }))
  } catch {
    // ignore local persistence failures
  }

  return nextLocation
}

export function subscribeWeatherLocation(callback) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => callback(loadWeatherLocation())
  window.addEventListener(WEATHER_LOCATION_EVENT, handler)
  return () => window.removeEventListener(WEATHER_LOCATION_EVENT, handler)
}
