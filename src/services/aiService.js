export async function corrigirRedacao({ redacao, tema, isRigido }) {
  const promptTema = tema?.trim() ? tema : 'Não informado (avalie como achar adequado, penalizando a falta de direção se necessário).';
  const promptModo = isRigido ? 'Rígido (seja extremamente analítico, procurando falhas como uma banca criteriosa do INEP)' : 'Padrão (fiel ao manual de correção do ENEM)';

  const systemPrompt = `Você é o Ápice, uma IA especialista dedicada a ajudar alunos a tirarem nota máxima na redação do ENEM.
Modo de correção selecionado pelo aluno: ${promptModo}.
Tema da redação: ${promptTema}.

Avalie a redação fornecida pelo usuário. A SUA RESPOSTA DEVE SER ESTRITAMENTE UM JSON VÁLIDO.
NUNCA adicione markdown como \`\`\`json ou explicações fora do corpo do JSON.

Retorne EXATAMENTE esta estrutura de chaves (ajuste os valores conforme sua avaliação analítica):
{
  "notaTotal": 720,
  "competencias": [
    { "nome": "C1 — Norma culta", "nota": 160 },
    { "nome": "C2 — Tema e repertório", "nota": 120 },
    { "nome": "C3 — Organização da tese", "nota": 160 },
    { "nome": "C4 — Coesão textual", "nota": 140 },
    { "nome": "C5 — Proposta de intervenção", "nota": 140 }
  ],
  "pontoForte": "Elogio breve sobre a melhor competência da redação.",
  "atencao": "Aviso sobre algo que faltou ou não ficou tão claro no texto.",
  "principalMelhorar": "Crítica construtiva direta sobre o pior ponto da redação.",
  "errosPt": [
    { "errado": "palavra incorreta usada no texto", "corrigido": "palavra correta", "motivo": "explicacao do erro" }
  ]
}`;

  const userMessages = [
    { role: 'user', content: redacao }
  ];

  const res = await fetch('/.netlify/functions/corrigir-redacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessages })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao se comunicar com os servidores de IA.');
  }

  // Parse inicial. O servidor backend já tentará decodificar strings com \`\`\`json
  const data = await res.json();
  return data;
}

export function salvarNoHistorico(resultadoJSON, temaStr) {
  try {
    const historicoStr = localStorage.getItem('apice:historico') || '[]';
    const historico = JSON.parse(historicoStr);
    
    // Adicionar novo item
    const novoItem = {
      id: Date.now(),
      data: new Date().toISOString(),
      tema: temaStr || 'Tema livre',
      nota: resultadoJSON.notaTotal,
      feedback: resultadoJSON
    };

    historico.unshift(novoItem);
    
    // Manter no maximo os 30 mais recentes
    if (historico.length > 30) {
      historico.length = 30;
    }

    localStorage.setItem('apice:historico', JSON.stringify(historico));
  } catch (err) {
    console.error('Falha ao salvar no histórico', err);
  }
}
