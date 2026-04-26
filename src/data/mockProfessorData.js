export const CATEGORIES = [
  {
    id: 'duvidas',
    label: 'Dúvidas',
    icon: 'question',
    description: 'Tire suas dúvidas específicas sobre qualquer matéria.',
    welcomeMessage: 'Olá! Qual dúvida está te travando agora? Mande aqui que eu te explico passo a passo.',
  },
  {
    id: 'resumos',
    label: 'Resumos',
    icon: 'book',
    description: 'Crie resumos práticos com os tópicos mais importantes.',
    welcomeMessage: 'Precisa de um resumo sobre qual tema? Seja direto ou me conte o contexto do que está estudando.',
  },
  {
    id: 'pratica',
    label: 'Prática de Questões',
    icon: 'target',
    description: 'Treine com questões inéditas no estilo do ENEM.',
    welcomeMessage: 'Vamos praticar! Me diga qual disciplina ou assunto você quer focar (ex: "Biologia", "Revolução Francesa", "Geometria") e eu monto um mini-teste com 5 questões no estilo ENEM.',
  },
]

export const MOCK_RESPONSES = {
  duvidas: [
    "Excelente pergunta! Para entender isso, precisamos voltar um pouco em...",
    "Essa dúvida é comum. Na verdade, a regra principal diz que...",
    "A resposta curta é sim, mas tem algumas exceções importantes. Vamos ver quais são:",
    "Se você pensar no contexto histórico da época, faz todo sentido que..."
  ],
  resumos: [
    "Aqui está um resumo prático: \n\n1. O marco inicial ocorreu no século XIX.\n2. As principais causas foram econômicas e políticas.\n3. O desfecho alterou profundamente as relações sociais.",
    "Bora focar no que mais cai no ENEM:\n- Fatores demográficos;\n- Impactos ambientais;\n- Soluções aplicadas na época.",
    "Para não esquecer: Pense em 'Causa - Desenvolvimento - Consequência'. O essencial sobre esse tema é..."
  ],
  pratica: [
    "Aqui vai uma questão inédita (Nível: Médio):\n\nDurante o período X, as principais medidas tomadas foram...\nA) ...\nB) ...\nC) ...\nD) ...\nE) ...\n\nQual você acha que é a correta?",
    "Questão estilo ENEM focada na competência 3: ...\n\nResponda e eu te dou um feedback detalhado!",
  ],
  fallback: [
    "Entendi o que você quis dizer. Me dê um momento para estruturar a melhor explicação.",
    "Interessante! Isso envolve muitos conceitos. Pode me dar mais detalhes sobre o que você já sabe?",
    "Ótimo ponto. Vamos destrinchar isso juntos..."
  ]
}

export function getRandomMockResponse(categoryId) {
  const responses = MOCK_RESPONSES[categoryId] || MOCK_RESPONSES.fallback
  const index = Math.floor(Math.random() * responses.length)
  return responses[index]
}
