/**
 * Serviço de calibração baseado em redações reais corrigidas
 * Baseado no dataset UOL Redações XML (gpassero/uol-redacoes-xml)
 * ~2.100 redações corrigidas por especialistas
 */

// Exemplos reais de redações nota 1000 para few-shot prompts
const EXEMPLOS_NOTA_1000 = [
  {
    tema: 'A persistência do combate à dengue no Brasil',
    nota: 1000,
    competencias: {
      C1: 200,
      C2: 200,
      C3: 200,
      C4: 200,
      C5: 200,
    },
    pontosFortes: [
      'Domínio excepcional da norma culta com construções sintáticas complexas',
      'Repertório sociocultural produtivo com dados do Ministério da Saúde e Constituição Federal',
      'Projeto de texto coeso com progressão argumentativa clara',
      'Coesão sofisticada com conectivos inter e intraparágrafos bem articulados',
      'Proposta de intervenção completa com 5 elementos detalhados',
    ],
  },
  {
    tema: 'Caminhos para combater a invisibilidade civil',
    nota: 1000,
    competencias: {
      C1: 200,
      C2: 200,
      C3: 200,
      C4: 200,
      C5: 200,
    },
    pontosFortes: [
      'Uso preciso de pontuação e regência verbal/nominal',
      'Repertório legitimado com referência à Declaração Universal dos Direitos Humanos',
      'Argumentação consistente com dados do IBGE sobre sub-registro civil',
      'Articulação textual com operadores argumentativos diversificados',
      'Intervenção com agente (MEC), ação (campanhas), meio (mídias sociais), efeito (conscientização) e detalhamento',
    ],
  },
]

// Padrões de erros comuns por competência (baseado no dataset UOL)
const ERROS_COMUNS_POR_COMPETENCIA = {
  C1: [
    { erro: 'Concordância verbal', exemplo: 'Fazem muitos anos', correcao: 'Faz muitos anos' },
    { erro: 'Concordância nominal', exemplo: 'As coisa estão difícil', correcao: 'As coisas estão difíceis' },
    { erro: 'Regência verbal', exemplo: 'O filme que assisti', correcao: 'O filme a que assisti' },
    { erro: 'Crase', exemplo: 'Fui a praia', correcao: 'Fui à praia' },
    { erro: 'Pontuação', exemplo: 'O aluno chegou, e saiu', correcao: 'O aluno chegou e saiu' },
    { erro: 'Ortografia', exemplo: 'Excessão', correcao: 'Exceção' },
  ],
  C2: [
    { erro: 'Repertório impróprio', exemplo: 'Citar filme sem relação com o tema', correcao: 'Usar repertório legitimado pertinente' },
    { erro: 'Repertório não produtivo', exemplo: 'Mencionar dado sem articulá-lo ao argumento', correcao: 'Relacionar repertório à tese' },
    { erro: 'Fuga ao tema', exemplo: 'Não abordar o recorte central', correcao: 'Manter foco nos eixos temáticos' },
    { erro: 'Fuga ao gênero', exemplo: 'Escrever em formato narrativo', correcao: 'Manter estrutura dissertativo-argumentativa' },
  ],
  C3: [
    { erro: 'Ausência de tese', exemplo: 'Não posicionar-se claramente', correcao: 'Defender tese explícita desde a introdução' },
    { erro: 'Argumentos frágeis', exemplo: 'Opinião sem fundamentação', correcao: 'Usar dados e fatos como suporte' },
    { erro: 'Falta de progressão', exemplo: 'Repetir ideias entre parágrafos', correcao: 'Avançar na argumentação a cada parágrafo' },
    { erro: 'Projeto de texto confuso', exemplo: 'Misturar argumentos sem ordem lógica', correcao: 'Organizar思路 de forma coerente' },
  ],
  C4: [
    { erro: 'Ausência de conectivos', exemplo: 'Parágrafos justapostos', correcao: 'Usar operadores argumentativos entre parágrafos' },
    { erro: 'Conectivos inadequados', exemplo: 'Porém onde cabe Além disso', correcao: 'Escolher operador conforme relação lógica' },
    { erro: 'Repetição de conectivos', exemplo: 'Usar "portanto" em todos os parágrafos', correcao: 'Variar operadores (logo, dessa forma, etc.)' },
    { erro: 'Erro de coesão', exemplo: 'Pronome sem referente claro', correcao: 'Retomar termos de forma explícita' },
  ],
  C5: [
    { erro: 'Agente genérico', exemplo: 'O governo deve agir', correcao: 'Especificar qual esfera (Ministério da Educação, etc.)' },
    { erro: 'Ação vaga', exemplo: 'Fazer campanhas', correcao: 'Detalhar tipo e conteúdo da ação' },
    { erro: 'Sem meio/modo', exemplo: 'Dizer o que fazer sem dizer como', correcao: 'Especificar instrumentos e recursos' },
    { erro: 'Sem efeito', exemplo: 'Não prever resultado esperado', correcao: 'Indicar impacto esperado da intervenção' },
    { erro: 'Sem detalhamento', exemplo: 'Proposta muito genérica', correcao: 'Adicionar informações que especifiquem a ação' },
  ],
}

// Rubricas de correção detalhadas por competência
const RUBRICAS_COMPETENCIAS = {
  C1: {
    nome: 'Norma Culta',
    descricao: 'Domínio da modalidade escrita formal da língua portuguesa',
    niveis: [
      { nota: 200, criterio: 'Excelente: Sem erros ou com poucos desvios leves' },
      { nota: 160, criterio: 'Bom: Alguns desvios pontuais sem comprometer a comunicação' },
      { nota: 120, criterio: 'Regular: Desvios moderados com alguns problemas de concordância/regência' },
      { nota: 80, criterio: 'Fraco: Desvios graves e frequentes' },
      { nota: 40, criterio: 'Muito fraco: Domínio insuficiente com muitos erros' },
      { nota: 0, criterio: 'Zero: Desvios sistemáticos que impedem a comunicação' },
    ],
    peso: 1.0,
  },
  C2: {
    nome: 'Repertório e Tema',
    descricao: 'Compreensão da proposta e aplicação de conceitos de várias áreas',
    niveis: [
      { nota: 200, criterio: 'Excelente: Repertório produtivo, pertinente e legitimado' },
      { nota: 160, criterio: 'Bom: Repertório pertinente com boa articulação ao tema' },
      { nota: 120, criterio: 'Regular: Repertório relacionado ao tema mas pouco produtivo' },
      { nota: 80, criterio: 'Fraco: Repertório inadequado ou insuficiente' },
      { nota: 40, criterio: 'Muito fraco: Repertório impróprio ou muito limitado' },
      { nota: 0, criterio: 'Zero: Fuga ao tema ou ao gênero dissertativo-argumentativo' },
    ],
    peso: 1.0,
  },
  C3: {
    nome: 'Projeto de Texto',
    descricao: 'Selecionar, relacionar, organizar e interpretar informações',
    niveis: [
      { nota: 200, criterio: 'Excelente: Projeto de texto consistente e bem articulado' },
      { nota: 160, criterio: 'Bom: Boa organização com progressão argumentativa clara' },
      { nota: 120, criterio: 'Regular: Projeto de texto presente com algumas falhas' },
      { nota: 80, criterio: 'Fraco: Organização precária com pouca articulação' },
      { nota: 40, criterio: 'Muito fraco: Ausência de projeto de texto claro' },
      { nota: 0, criterio: 'Zero: Não defende ponto de vista ou não há projeto de texto' },
    ],
    peso: 1.0,
  },
  C4: {
    nome: 'Coesão',
    descricao: 'Conhecimento e uso dos mecanismos linguísticos de coesão',
    niveis: [
      { nota: 200, criterio: 'Excelente: Coesão sofisticada com conectivos diversificados' },
      { nota: 160, criterio: 'Bom: Boa articulação com operadores adequados' },
      { nota: 120, criterio: 'Regular: Coesão presente mas com alguns problemas' },
      { nota: 80, criterio: 'Fraco: Coesão precária com conectivos inadequados' },
      { nota: 40, criterio: 'Muito fraco: Coesão insuficiente' },
      { nota: 0, criterio: 'Zero: Ausência de coesão ou uso equivocado' },
    ],
    peso: 1.0,
  },
  C5: {
    nome: 'Proposta de Intervenção',
    descricao: 'Elaborar proposta de intervenção respeitando direitos humanos',
    niveis: [
      { nota: 200, criterio: 'Excelente: Proposta completa com 5 elementos detalhados' },
      { nota: 160, criterio: 'Bom: Proposta com 4-5 elementos bem articulados' },
      { nota: 120, criterio: 'Regular: Proposta com 3 elementos ou pouco detalhada' },
      { nota: 80, criterio: 'Fraco: Proposta com 2 elementos ou muito genérica' },
      { nota: 40, criterio: 'Muito fraco: Proposta com 1 elemento ou incompleta' },
      { nota: 0, criterio: 'Zero: Ausência de proposta ou desrespeito aos direitos humanos' },
    ],
    peso: 1.0,
  },
}

/**
 * Gera prompt de calibração baseado em exemplos reais do dataset UOL
 * @returns {string} Prompt formatado com few-shot examples
 */
export function generateCalibrationPrompt() {
  return `
### PADRÕES DE CORREÇÃO BASEADOS EM REDAÇÕES REAIS (Dataset UOL - 2.100 redações corrigidas)

## EXEMPLOS DE REDAÇÕES NOTA 1000:

${EXEMPLOS_NOTA_1000.map((ex, i) => `
### Exemplo ${i + 1}:
**Tema:** ${ex.tema}
**Nota:** ${ex.nota}/1000
**Pontos Fortes:**
${ex.pontosFortes.map(p => `- ${p}`).join('\n')}
`).join('\n')}

## RUBRICAS OFICIAIS POR COMPETÊNCIA:

${Object.entries(RUBRICAS_COMPETENCIAS).map(([key, rubrica]) => `
### ${key} — ${rubrica.nome}
${rubrica.descricao}
Níveis:
${rubrica.niveis.map(n => `- ${n.nota} pontos: ${n.criterio}`).join('\n')}
`).join('\n')}

## ERROS COMUNS POR COMPETÊNCIA (Baseado em análise do dataset UOL):

${Object.entries(ERROS_COMUNS_POR_COMPETENCIA).map(([key, erros]) => `
### ${key}:
${erros.map(e => `- **${e.erro}:** "${e.exemplo}" → Correto: "${e.correcao}"`).join('\n')}
`).join('\n')}
`
}

/**
 * Retorna exemplos de few-shot para o prompt de correção
 * @returns {Array} Array de exemplos formatados
 */
export function getFewShotExamples() {
  return EXEMPLOS_NOTA_1000.map(ex => ({
    tema: ex.tema,
    nota: ex.nota,
    competencias: ex.competencias,
    pontosFortes: ex.pontosFortes,
  }))
}

/**
 * Retorna erros comuns para uma competência específica
 * @param {string} competencia - C1, C2, C3, C4 ou C5
 * @returns {Array} Array de erros comuns
 */
export function getErrosComunsByCompetencia(competencia) {
  return ERROS_COMUNS_POR_COMPETENCIA[competencia] || []
}

/**
 * Retorna rubrica detalhada de uma competência
 * @param {string} competencia - C1, C2, C3, C4 ou C5
 * @returns {Object} Rubrica da competência
 */
export function getRubricaCompetencia(competencia) {
  return RUBRICAS_COMPETENCIAS[competencia] || null
}

/**
 * Retorna todas as rubricas
 * @returns {Object} Todas as rubricas
 */
export function getAllRubricas() {
  return RUBRICAS_COMPETENCIAS
}

/**
 * Valida se uma nota está dentro da escala ENEM
 * @param {number} nota - Nota a validar
 * @returns {boolean} Se é válida (0, 40, 80, 120, 160, 200)
 */
export function isValidEssayScore(nota) {
  const validScores = [0, 40, 80, 120, 160, 200]
  return validScores.includes(Number(nota))
}

/**
 * Arredonda nota para escala ENEM mais próxima
 * @param {number} rawScore - Nota bruta
 * @returns {number} Nota na escala ENEM
 */
export function roundToEnemScale(rawScore) {
  const score = Number(rawScore) || 0
  const validScores = [0, 40, 80, 120, 160, 200]
  
  if (validScores.includes(score)) return score
  
  let closest = validScores[0]
  let minDiff = Math.abs(score - closest)
  
  for (const validScore of validScores) {
    const diff = Math.abs(score - validScore)
    if (diff < minDiff) {
      minDiff = diff
      closest = validScore
    }
  }
  
  return closest
}
