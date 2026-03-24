export async function gerarTemaDinamico() {
  const res = await fetch('/.netlify/functions/gerar-tema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    throw new Error('Falha ao gerar tema dinâmico.');
  }

  return await res.json();
}

export async function corrigirRedacao({ redacao, tema, material, isRigido }) {
  const promptTema = tema?.trim() ? tema : 'Não informado.';
  const promptMaterial = material ? `\nMaterial de Apoio fornecido ao aluno:\n${material}\n` : '';
  const promptModo = isRigido ? 'Rígido (extremamente criterioso)' : 'Padrão (fiel ao ENEM)';

  const systemPrompt = ` Modo: ${promptModo}.
 Tema: ${promptTema}.${promptMaterial}
 
 CRÍTICO: Se a redação apresentar FUGA TOTAL AO TEMA (não mencionar o assunto principal ou falar de algo completamente diferente), a nota de todas as competências DEVE SER 0. NÃO seque o exemplo se for fuga.
 
 Avalie a redação seguindo rigorosamente os critérios do ENEM. Responda APENAS com um JSON válido:
 {
   "notaTotal": 0-1000,
   "competencias": [
     { "nome": "C1 — Norma culta", "nota": 0-200, "descricao": "Breve feedback individual..." },
     { "nome": "C2 — Tema e repertório", "nota": 0-200, "descricao": "..." },
     { "nome": "C3 — Organização da tese", "nota": 0-200, "descricao": "..." },
     { "nome": "C4 — Coesão textual", "nota": 0-200, "descricao": "..." },
     { "nome": "C5 — Proposta de intervenção", "nota": 0-200, "descricao": "..." }
   ],
   "pontoForte": "...",
   "atencao": "...",
   "principalMelhorar": "...",
   "errosPt": [
     { "errado": "...", "corrigido": "...", "motivo": "..." }
   ]
 }`;

  const userMessages = [{ role: 'user', content: redacao }];

  const res = await fetch('/.netlify/functions/corrigir-redacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessages })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro na comunicação com a IA.');
  }

  return await res.json();
}

export function salvarNoHistorico(resultadoJSON, temaStr) {
  try {
    const historico = JSON.parse(localStorage.getItem('apice:historico') || '[]');
    
    const novoItem = {
      id: Date.now(),
      data: new Date().toISOString(),
      tema: temaStr || 'Tema livre',
      preview: (temaStr || 'Tema livre').substring(0, 60) + '...',
      nota: resultadoJSON.notaTotal,
      feedback: resultadoJSON
    };

    historico.unshift(novoItem);
    if (historico.length > 30) historico.length = 30;
    localStorage.setItem('apice:historico', JSON.stringify(historico));
  } catch (err) {
    console.error('Erro ao salvar histórico', err);
  }
}
