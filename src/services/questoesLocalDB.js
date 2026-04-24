/**
 * Banco local de questões baseado no dataset Maritaca-AI ENEM
 * Dataset de alta fidelidade com questões de 2022 a 2024
 * Link: maritaca-ai/enem (Hugging Face)
 * 
 * Este serviço armazena questões em cache permanente no IndexedDB
 * para uso offline e redução de chamadas à API
 */

const DB_NAME = 'ApiceEnemQuestoes'
const DB_VERSION = 1
const STORE_NAME = 'questoes'

// Questões de exemplo baseadas no padrão Maritaca-AI
// Em produção, isso seria populado via download do dataset
const QUESTOES_SEMENTE = [
  // Linguagens - Português
  {
    id: 'maritaca-lang-001',
    area: 'Linguagens',
    disciplina: 'portugues',
    ano: 2023,
    textoBase: 'O uso de variedades linguísticas em contextos formais ainda gera debates acalorados na sociedade brasileira. Enquanto alguns defendem a padronização como forma de garantir a compreensão entre falantes de diferentes regiões, outros argumentam que a diversidade linguística é um patrimônio cultural que deve ser preservado.',
    enunciado: 'No debate sobre variedades linguísticas no Brasil, a posição que valoriza a diversidade como patrimônio cultural fundamenta-se na ideia de que:',
    alternativas: {
      A: 'a norma culta deve ser imposta em todos os contextos comunicativos.',
      B: 'as variações regionais e sociais refletem a riqueza cultural brasileira.',
      C: 'a escola deve eliminar as diferenças linguísticas entre os alunos.',
      D: 'o português padrão é o único modelo aceitável para a escrita.',
      E: 'a gramática normativa deve prevalecer sobre o uso real da língua.',
    },
    correta: 'B',
    explicacao: 'A valorização da diversidade linguística como patrimônio cultural reconhece que as variações regionais e sociais são expressões legítimas da cultura brasileira. A norma culta coexiste com as variedades populares, sendo papel da escola ensinar o registro formal sem desvalorizar as variedades que os alunos trazem de suas comunidades.',
    fonte: 'Adaptado de questão ENEM 2023',
  },
  {
    id: 'maritaca-lang-002',
    area: 'Linguagens',
    disciplina: 'literatura',
    ano: 2022,
    textoBase: '"Minha terra tem palmeiras onde cantam os sabiás / As aves, que aqui gorjeiam, não gorjeiam como lá." (Gonçalves Dias, Canção do Exílio, 1843)',
    enunciado: 'No poema "Canção do Exílio", Gonçalves Dias constrói uma imagem idealizada do Brasil. O recurso literário que contribui para essa idealização é:',
    alternativas: {
      A: 'o uso de linguagem coloquial e informal.',
      B: 'a comparação entre a natureza brasileira e a portuguesa.',
      C: 'a descrição objetiva e imparcial da paisagem.',
      D: 'a enumeração de elementos urbanos da corte.',
      E: 'o emprego de versos livres sem métrica definida.',
    },
    correta: 'B',
    explicacao: 'A "Canção do Exílio" constrói a idealização do Brasil através da comparação entre a natureza brasileira (palmeiras, sabiás) e a portuguesa ("as aves que aqui gorjeiam"). O eu lírico, distante de sua terra, idealiza a pátria, criando uma imagem ufanista que se tornou símbolo do romantismo brasileiro.',
    fonte: 'ENEM 2022',
  },
  // Humanas - História
  {
    id: 'maritaca-hist-001',
    area: 'Humanas',
    disciplina: 'historia',
    ano: 2023,
    textoBase: 'A Revolução Industrial, iniciada na Inglaterra no século XVIII, transformou profundamente as relações de trabalho e a organização social. A mecanização da produção e o sistema fabril alteraram a dinâmica entre trabalhadores e meios de produção, gerando novas formas de organização social e política.',
    enunciado: 'Uma consequência social da Revolução Industrial foi a:',
    alternativas: {
      A: 'extinção das desigualdades sociais no campo.',
      B: 'formação da classe operária urbana e o surgimento de movimentos sindicais.',
      C: 'melhoria imediata das condições de vida dos trabalhadores.',
      D: 'distribuição equitativa da riqueza produzida pelas fábricas.',
      E: 'redução da jornada de trabalho para todas as categorias.',
    },
    correta: 'B',
    explicacao: 'A Revolução Industrial provocou o êxodo rural e a concentração de trabalhadores nas cidades, formando a classe operária. As péssimas condições de trabalho e salários levaram à organização de movimentos sindicais e lutas por direitos trabalhistas, marcando a história do movimento operário.',
    fonte: 'Adaptado de questão ENEM 2023',
  },
  // Natureza - Biologia
  {
    id: 'maritaca-bio-001',
    area: 'Natureza',
    disciplina: 'biologia',
    ano: 2024,
    textoBase: 'O aquecimento global tem provocado alterações significativas nos ecossistemas terrestres e aquáticos. O aumento da temperatura média do planeta afeta diretamente a biodiversidade, alterando ciclos reprodutivos, migrações e relações ecológicas entre espécies.',
    enunciado: 'Uma consequência direta do aquecimento global para a biodiversidade é:',
    alternativas: {
      A: 'o aumento da taxa de fotossíntese em todas as plantas.',
      B: 'a alteração nos padrões migratórios de diversas espécies animais.',
      C: 'a extinção imediata de todos os anfíbios.',
      D: 'o aumento generalizado da biodiversidade.',
      E: 'a estabilização dos ecossistemas marinhos.',
    },
    correta: 'B',
    explicacao: 'O aquecimento global altera os ciclos naturais, provocando mudanças nos padrões migratórios, épocas de reprodução e floração, e distribuição geográfica das espécies. Essas alterações podem desequilibrar relações ecológicas e levar à extinção de espécies que não conseguem se adaptar rapidamente.',
    fonte: 'ENEM 2024',
  },
  // Matemática
  {
    id: 'maritaca-mat-001',
    area: 'Matematica',
    disciplina: 'matematica',
    ano: 2023,
    textoBase: 'Um pesquisador analisou o crescimento de uma população de bactérias em laboratório. Ele observou que a cada hora o número de bactérias dobrava. No início da observação, havia 100 bactérias na cultura.',
    enunciado: 'Após 5 horas de observação, o número de bactérias na cultura era de:',
    alternativas: {
      A: '500',
      B: '1 000',
      C: '1 600',
      D: '3 200',
      E: '6 400',
    },
    correta: 'D',
    explicacao: 'O crescimento é exponencial: N(t) = N0 × 2^t. Com N0 = 100 e t = 5: N(5) = 100 × 2^5 = 100 × 32 = 3 200 bactérias. Este é um exemplo clássico de crescimento exponencial, comum em populações biológicas em condições ideais.',
    fonte: 'ENEM 2023',
  },
]

/**
 * Abre ou cria o banco IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[questoesLocalDB] Erro ao abrir IndexedDB')
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('area', 'area', { unique: false })
        store.createIndex('disciplina', 'disciplina', { unique: false })
        store.createIndex('ano', 'ano', { unique: false })
        
        // Adiciona questões semente
        QUESTOES_SEMENTE.forEach(q => {
          store.add(q)
        })
      }
    }
  })
}

/**
 * Salva questão no banco local
 * @param {Object} questao - Questão a salvar
 */
export async function salvarQuestao(questao) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(questao)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[questoesLocalDB] Falha ao salvar questão:', error)
  }
}

/**
 * Busca questões por filtros
 * @param {Object} filtros - Filtros de busca
 * @param {string} filtros.area - Área do conhecimento
 * @param {string} filtros.disciplina - Disciplina
 * @param {number} filtros.ano - Ano
 * @param {number} filtros.limit - Limite de resultados
 * @returns {Promise<Array>} Array de questões
 */
export async function buscarQuestoes({ area, disciplina, ano, limit = 50 } = {}) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        let questoes = request.result

        // Aplica filtros
        if (area) {
          questoes = questoes.filter(q => q.area === area)
        }
        if (disciplina) {
          questoes = questoes.filter(q => q.disciplina === disciplina)
        }
        if (ano) {
          questoes = questoes.filter(q => q.ano === ano)
        }

        // Embaralha e limita
        questoes = shuffleArray(questoes).slice(0, limit)
        resolve(questoes)
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[questoesLocalDB] Falha ao buscar questões:', error)
    return []
  }
}

/**
 * Busca questões aleatórias
 * @param {Object} filtros - Filtros
 * @param {string} filtros.area - Área
 * @param {number} filtros.quantidade - Quantidade
 * @returns {Promise<Array>} Questões selecionadas
 */
export async function buscarQuestoesAleatorias({ area, disciplina, quantidade = 5 } = {}) {
  const questoes = await buscarQuestoes({
    area,
    disciplina,
    limit: quantidade + 10, // Busca mais para embaralhar
  })
  
  return shuffleArray(questoes).slice(0, quantidade)
}

/**
 * Conta questões no banco
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<number>} Total de questões
 */
export async function contarQuestoes({ area, disciplina } = {}) {
  try {
    const questoes = await buscarQuestoes({ area, disciplina, limit: 10000 })
    return questoes.length
  } catch {
    return 0
  }
}

/**
 * Popula banco com questões da API ENEM
 * @param {Array} questoes - Questões da API
 */
export async function popularBancoQuestoes(questoes) {
  if (!Array.isArray(questoes) || questoes.length === 0) return

  const promises = questoes.map(q => salvarQuestao({
    ...q,
    id: q.id || `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fonte: q.fonte || 'ENEM API',
    sincronizadoEm: new Date().toISOString(),
  }))

  await Promise.all(promises)
  console.log(`[questoesLocalDB] ${questoes.length} questões sincronizadas`)
}

/**
 * Limpa questões antigas do banco
 * @param {number} diasManter - Dias para manter questões
 */
export async function limparQuestoesAntigas(diasManter = 30) {
  try {
    const db = await openDB()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - diasManter)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const questoes = request.result
        const paraRemover = questoes.filter(q => {
          if (!q.sincronizadoEm) return false // Mantém questões semente
          return new Date(q.sincronizadoEm) < cutoffDate
        })

        paraRemover.forEach(q => store.delete(q.id))
        console.log(`[questoesLocalDB] ${paraRemover.length} questões antigas removidas`)
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[questoesLocalDB] Falha ao limpar questões:', error)
  }
}

// Helper
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
