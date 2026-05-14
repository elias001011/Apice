/**
 * Serviço de busca de cidades usando OpenWeatherMap Geocoding API.
 * Endpoint: http://api.openweathermap.org/geo/1.0/direct
 * Documentação: https://openweathermap.org/api/geocoding-api
 */

const CLIMA_FUNCTION_PATH = '/.netlify/functions/get-clima'

// Lista extensa de cidades brasileiras (capitais + maiores cidades)
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
  'Sarandi, PR', 'Sarandi, RS', 'Marília, SP', 'Indaiatuba, SP',
  'Cotia, SP', 'Santana de Parnaíba, SP', 'São Bernardo do Campo, SP',
  'Diadema, SP', 'Vila Velha, ES', 'Serra, ES', 'Cariacica, ES',
  'Caxias do Sul, RS', 'Pelotas, RS', 'Canoas, RS', 'Santa Maria, RS',
  'Gravataí, RS', 'Viamão, RS', 'Novo Hamburgo, RS', 'São Leopoldo, RS',
  'Rio Grande, RS', 'Alvorada, RS', 'Passo Fundo, RS', 'Uruguaiana, RS',
  'Santa Cruz do Sul, RS', 'Erechim, RS', 'Bagé, RS', 'Bento Gonçalves, RS',
  'Guaíba, RS', 'Sapucaia do Sul, RS', 'Esteio, RS', 'Eldorado do Sul, RS',
  'Charqueadas, RS', 'Montenegro, RS', 'Triunfo, RS', 'Camaquã, RS',
  'Ijuí, RS', 'Santo Ângelo, RS', 'Santa Rosa, RS', 'Cruz Alta, RS',
  'Cachoeira do Sul, RS', 'Lajeado, RS', 'Estrela, RS', 'Venâncio Aires, RS',
  'São Gabriel, RS', 'Rosário do Sul, RS', 'Alegrete, RS', 'Santana do Livramento, RS',
  'Dom Pedrito, RS', 'Jaguarão, RS', 'Herval, RS', 'Pedras Altas, RS',
  'Aceguá, RS', 'Candiota, RS', 'Hulha Negra, RS', 'Pedro Osório, RS',
  'Morro Redondo, RS', 'São Lourenço do Sul, RS', 'Turuçu, RS', 'Arroio do Padre, RS',
  'Capão do Leão, RS', 'Rio Grande, RS', 'São José do Norte, RS', 'Mostardas, RS',
  'Tavares, RS', 'São José do Norte, RS', 'Imbé, RS', 'Tramandaí, RS',
  'Capão da Canoa, RS', 'Torres, RS', 'Arroio do Sal, RS', 'Mampituba, RS',
  'Praia Grande, RS', 'Dom Feliciano, RS', 'Cristal, RS', 'Chuvisca, RS',
  'Cerro Branco, RS', 'Barão do Triunfo, RS', 'Arambaré, RS', 'Sentinela do Sul, RS',
  'Tapes, RS', 'Glorinha, RS', 'Viamão, RS', 'Cachoeirinha, RS',
  'Gravataí, RS', 'Alvorada, RS', 'Eldorado do Sul, RS', 'Novo Hamburgo, RS',
  'Estância Velha, RS', 'Igrejinha, RS', 'Taquara, RS', 'Gramado, RS',
  'Canela, RS', 'São Francisco de Paula, RS', 'Vacaria, RS', 'Bom Jesus, RS',
  'Cambará do Sul, RS', 'Jaquirana, RS', 'São José dos Ausentes, RS',
  'Esmeralda, RS', 'Pinhal da Serra, RS', 'Campos Borges, RS', 'Ibiraiaras, RS',
  'Sananduva, RS', 'Iraí, RS', 'Frederico Westphalen, RS', 'Palmeira das Missões, RS',
  'Carazinho, RS', 'Cruz Alta, RS', 'Ijuí, RS', 'Santo Ângelo, RS',
  'Giruá, RS', 'São Luiz Gonzaga, RS', 'São Miguel das Missões, RS',
  'Santo Antônio das Missões, RS', 'São Borja, RS', 'Itaqui, RS', 'Mata, RS',
  'Manoel Viana, RS', 'Alegrete, RS', 'Quaraí, RS', 'Barra do Quaraí, RS',
  'Uruguaiana, RS', 'Rosário do Sul, RS', 'Cacequi, RS', 'Santa Maria, RS',
  'Formigueiro, RS', 'São Sepé, RS', 'Caçapava do Sul, RS', 'Lavras do Sul, RS',
  'São Gabriel, RS', 'Dom Pedrito, RS', 'Santana do Livramento, RS',
  'Aceguá, RS', 'Bagé, RS', 'Pedro Osório, RS', 'Canguçu, RS',
  'Piratini, RS', 'Herval, RS', 'Jaguarão, RS', 'Rio Grande, RS',
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
  } catch {
    // Fallback silencioso - não logar erro se a API ainda não está disponível
    return fallbackCitySearch(q, limit)
  }
}

/**
 * Busca fallback usando lista estática de cidades brasileiras.
 */
function fallbackCitySearch(query, limit) {
  const normalizedQuery = normalizeStr(query)
  const words = normalizedQuery.split(/\s+/).filter(Boolean)

  // Busca por match de todas as palavras (ex: "sao paulo" = "sao" AND "paulo")
  const results = FALLBACK_CITIES
    .filter(city => {
      const normalizedCity = normalizeStr(city)
      return words.every(word => normalizedCity.includes(word))
    })
    .slice(0, limit)
    .map(city => ({
      name: city.split(',')[0].trim(),
      state: city.split(',')[1]?.trim() || '',
      displayName: city,
    }))

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
