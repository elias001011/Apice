/**
 * Serviço de busca de cidades usando OpenWeatherMap Geocoding API.
 * Endpoint: http://api.openweathermap.org/geo/1.0/direct
 * Documentação: https://openweathermap.org/api/geocoding-api
 */

const GEO_API_BASE = 'https://geocoding-api.openweathermap.org/2.5'
const CLIMA_FUNCTION_PATH = '/.netlify/functions/get-clima'

/**
 * Busca cidades usando a API de Geocoding do OpenWeatherMap.
 * @param {string} query - Texto da busca (ex: "São Paulo", "Porto Alegre")
 * @param {number} limit - Número máximo de resultados (padrão: 8)
 * @returns {Promise<Array<{name: string, state: string, country: string, displayName: string}>>}
 */
export async function searchCities(query, limit = 8) {
  const q = String(query || '').trim()
  if (!q || q.length < 2) {
    return []
  }

  try {
    // Tenta usar a função Netlify que já tem a API key
    const response = await fetch(`${CLIMA_FUNCTION_PATH}?geocode=1&q=${encodeURIComponent(q)}&limit=${limit}`)
    
    if (!response.ok) {
      throw new Error('Falha na busca de cidades')
    }

    const data = await response.json()
    return data
  } catch (error) {
    // Fallback: usa lista estática se a API falhar
    console.warn('Geocoding API indisponível, usando fallback:', error.message)
    return fallbackCitySearch(q, limit)
  }
}

/**
 * Busca fallback usando lista estática de cidades principais.
 */
function fallbackCitySearch(query, limit) {
  const fallbackCities = [
    'São Paulo', 'Rio de Janeiro', 'Brasília', 'Belo Horizonte', 'Curitiba',
    'Porto Alegre', 'Florianópolis', 'Salvador', 'Recife', 'Fortaleza',
    'Manaus', 'Belém', 'Goiânia', 'Campinas', 'São Luís',
    'Maceió', 'Natal', 'Teresina', 'Campo Grande', 'Nova Iguaçu',
    'São Gonçalo', 'João Pessoa', 'Londrina', 'Cuiabá', 'Sorocaba',
    'Feira de Santana', 'Aracaju', 'Joinville', 'Ribeirão Preto', 'Uberlândia',
    'Contagem', 'Santos', 'Macapá', 'Vitória', 'Flora',
  ]

  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  return fallbackCities
    .filter(city => {
      const normalizedCity = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return normalizedCity.includes(q)
    })
    .slice(0, limit)
    .map(city => ({
      name: city,
      displayName: city,
    }))
}

/**
 * Formata o nome de exibição para uma cidade encontrada.
 * @param {Object} city - Objeto da cidade (name, state, country)
 * @returns {string}
 */
export function formatCityDisplayName(city) {
  if (!city) return ''
  
  const parts = []
  if (city.name) parts.push(city.name)
  if (city.state) parts.push(city.state)
  
  return parts.join(', ')
}
