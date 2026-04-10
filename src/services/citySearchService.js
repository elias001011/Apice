/**
 * Serviço de busca de cidades usando OpenWeatherMap Geocoding API.
 * Endpoint: http://api.openweathermap.org/geo/1.0/direct
 * Documentação: https://openweathermap.org/api/geocoding-api
 */

const CLIMA_FUNCTION_PATH = '/.netlify/functions/get-clima'

// Lista expandida de cidades brasileiras para fallback robusto
const FALLBACK_CITIES = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Brasília, DF', 'Belo Horizonte, MG',
  'Curitiba, PR', 'Porto Alegre, RS', 'Florianópolis, SC', 'Salvador, BA',
  'Recife, PE', 'Fortaleza, CE', 'Manaus, AM', 'Belém, PA', 'Goiânia, GO',
  'Campinas, SP', 'São Luís, MA', 'Maceió, AL', 'Natal, RN', 'Teresina, PI',
  'Campo Grande, MS', 'Nova Iguaçu, RJ', 'São Gonçalo, RJ', 'João Pessoa, PB',
  'Londrina, PR', 'Cuiabá, MT', 'Sorocaba, SP', 'Feira de Santana, BA',
  'Aracaju, SE', 'Joinville, SC', 'Ribeirão Preto, SP', 'Uberlândia, MG',
  'Contagem, MG', 'Santos, SP', 'Macapá, AP', 'Vitória, ES',
  'Ananindeua, PA', 'Porto Velho, RO', 'Boa Vista, RR', 'Palmas, TO',
  'Rio Branco, AC', 'São José dos Campos, SP', 'Osasco, SP',
  'Santo André, SP', 'Guarulhos, SP', 'Jundiaí, SP', 'Piracicaba, SP',
  'São José do Rio Preto, SP', 'Mauá, SP', 'Carapicuíba, SP',
  'Diadema, SP', 'Mogi das Cruzes, SP', 'Bauru, SP', 'São Vicente, SP',
  'Itaquaquecetuba, SP', 'Franca, SP', 'Guarujá, SP', 'Taubaté, SP',
  'Limeira, SP', 'Suzano, SP', 'Taboão da Serra, SP', 'Sumaré, SP',
  'Barueri, SP', 'Embu das Artes, SP', 'São Carlos, SP', 'Marília, SP',
  'Americana, SP', 'Jacareí, SP', 'Araraquara, SP', 'Presidente Prudente, SP',
  'Hortolândia, SP', 'Santa Bárbara d\'Oeste, SP', 'Ferraz de Vasconcelos, SP',
  'Francisco Morato, SP', 'Itapecerica da Serra, SP', 'Itu, SP',
  'Bragança Paulista, SP', 'Pindamonhangaba, SP', 'Atibaia, SP',
]

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
    const response = await fetch(`${CLIMA_FUNCTION_PATH}?geocode=1&q=${encodeURIComponent(q)}&limit=${limit}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return data
    }

    // API retornou vazio — usa fallback
    return fallbackCitySearch(q, limit)
  } catch (error) {
    console.warn('[citySearch] API indisponível, usando fallback:', error.message)
    return fallbackCitySearch(q, limit)
  }
}

/**
 * Busca fallback usando lista estática de cidades brasileiras.
 */
function fallbackCitySearch(query, limit) {
  const normalizedQuery = normalizeStr(query)

  const results = FALLBACK_CITIES
    .filter(city => normalizeStr(city).includes(normalizedQuery))
    .slice(0, limit)
    .map(city => ({
      name: city.split(',')[0].trim(),
      state: city.split(',')[1]?.trim() || '',
      displayName: city,
    }))

  // Se não achou nada com acento, tenta sem
  if (results.length === 0) {
    return FALLBACK_CITIES
      .filter(city => {
        const normalizedCity = normalizeStr(city)
        // Tenta match parcial
        return normalizedCity.includes(normalizedQuery) ||
               normalizedQuery.includes(normalizedCity.slice(0, Math.min(normalizedQuery.length + 3, normalizedCity.length)))
      })
      .slice(0, limit)
      .map(city => ({
        name: city.split(',')[0].trim(),
        state: city.split(',')[1]?.trim() || '',
        displayName: city,
      }))
  }

  return results
}

/**
 * Normaliza string removendo acentos e convertendo para lowercase.
 */
function normalizeStr(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Formata o nome de exibição para uma cidade encontrada.
 */
export function formatCityDisplayName(city) {
  if (!city) return ''
  if (typeof city === 'string') return city
  if (city.displayName) return city.displayName
  const parts = []
  if (city.name) parts.push(city.name)
  if (city.state) parts.push(city.state)
  return parts.join(', ')
}
