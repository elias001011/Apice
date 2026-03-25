# Tutorial da Infraestrutura de IA

Data-base: 25/03/2026

Este arquivo centraliza como usar a nova infraestrutura de IA do projeto.

## Visão geral

A IA agora está separada em camadas:

1. `search` dedicado para buscar fatos reais e fontes.
2. Geração de texto com fallback entre provedores.
3. Chamada direta de um provider/modelo específico, sem search.
4. Contexto de usuário baseado no histórico local das redações.
5. Painel de limites do plano free, controlado no front.

Regra prática:

- Use `search` só quando você precisa de informação factual com fonte.
- Use chamada direta sem `search` quando você quer resposta de modelo puro.
- Use fallback quando você quer robustez e não quer depender de um único provedor.

## Arquitetura principal

### Arquivo central

- [`netlify/ai/ai.js`](/home/elias/Downloads/Apis/netlify/ai/ai.js)

Esse arquivo concentra:

- configuração dos providers
- ordem de fallback
- modelos primários e secundários
- lógica de `search`
- lógica de texto
- heurística de cópia do material de apoio
- construção de prompt
- chamada direta de provider/modelo

### Endpoints Netlify

- [`netlify/functions/gerar-tema.js`](/home/elias/Downloads/Apis/netlify/functions/gerar-tema.js)
- [`netlify/functions/buscar-contexto.js`](/home/elias/Downloads/Apis/netlify/functions/buscar-contexto.js)
- [`netlify/functions/corrigir-redacao.js`](/home/elias/Downloads/Apis/netlify/functions/corrigir-redacao.js)
- [`netlify/functions/chamar-ia.js`](/home/elias/Downloads/Apis/netlify/functions/chamar-ia.js)

### Serviços do front

- [`src/services/aiService.js`](/home/elias/Downloads/Apis/src/services/aiService.js)
- [`src/services/essayInsights.js`](/home/elias/Downloads/Apis/src/services/essayInsights.js)
- [`src/services/freePlanUsage.js`](/home/elias/Downloads/Apis/src/services/freePlanUsage.js)
- [`src/services/corretorDraft.js`](/home/elias/Downloads/Apis/src/services/corretorDraft.js)

## Como funciona o search

O `search` é dedicado e separado do fluxo normal.

Ele existe para quando você quer:

- tema dinâmico com dados reais
- material de apoio com fontes clicáveis
- blocos curtos no estilo ENEM

O search não é usado na correção de redação.

### Fluxo do tema dinâmico

1. A tela chama `gerarTemaDinamico()`.
2. O backend chama `searchContext()`.
3. O search tenta os providers habilitados na ordem configurada.
4. O resultado factual vira contexto para o prompt de geração.
5. O modelo gera tema + material estruturado.

### Exemplo de uso do search dedicado

Se você quiser chamar só a busca:

```js
import { searchContext } from './netlify/ai/ai.js'

const result = await searchContext('tema atual sobre desinformação no Brasil')
console.log(result.resumo)
console.log(result.cards)
console.log(result.fontes)
```

## Como chamar IA sem search

Para usar um modelo puro, sem pesquisa, existe o endpoint genérico de chamada direta.

### Helper do front

Use [`chamarIAEspecifica()`](/home/elias/Downloads/Apis/src/services/aiService.js#L57).

Exemplo:

```js
import { chamarIAEspecifica } from './src/services/aiService.js'

const resposta = await chamarIAEspecifica({
  provider: 'groq',
  modelVariant: 'primary',
  systemPrompt: 'Você é um assistente que resume histórico de escrita.',
  userMessages: [
    { role: 'user', content: 'Analise esse texto e identifique padrões.' },
  ],
})
```

### Chamada no backend

O endpoint é [`netlify/functions/chamar-ia.js`](/home/elias/Downloads/Apis/netlify/functions/chamar-ia.js).

Ele aceita:

- `provider`
- `systemPrompt`
- `userMessages`
- `modelVariant`
- `modelOverride`

## Como usar modelo secundário

Cada provider pode ter:

- `primary`
- `secondary`

Defaults atuais:

- Groq: primário normal e secundário alternativo
- Gemini: secundário vazio por padrão
- OpenRouter: default `openrouter/free`
- Grok: primário e secundário configuráveis
- Hugging Face: caminho por modelo

### Exemplo

```js
await chamarIAEspecifica({
  provider: 'groq',
  modelVariant: 'secondary',
  systemPrompt: '...',
  userMessages: [
    { role: 'user', content: 'Teste com modelo secundário.' },
  ],
})
```

Se quiser forçar um modelo específico:

```js
await chamarIAEspecifica({
  provider: 'openrouter',
  modelOverride: 'openrouter/free',
  systemPrompt: '...',
  userMessages: [],
})
```

## Como enviar contexto

O projeto já tem um helper para montar contexto de usuário a partir das últimas redações.

### Helper pronto

Use [`buildContextoParaIADireta()`](/home/elias/Downloads/Apis/src/services/aiService.js#L109).

Exemplo:

```js
import { buildContextoParaIADireta, chamarIAEspecifica } from './src/services/aiService.js'

const userMessages = buildContextoParaIADireta({
  prompt: 'Crie um resumo do perfil de escrita do usuário.',
  historicoLimit: 3,
})

const resposta = await chamarIAEspecifica({
  provider: 'groq',
  modelVariant: 'secondary',
  systemPrompt: `
    Você vai gerar um resumo de usuário.
    Leia o contexto e devolva JSON com:
    - pontos fortes
    - erros recorrentes
    - tema de maior dificuldade
  `,
  userMessages,
})
```

### O que entra nesse contexto

- tema da redação
- nota
- data
- texto integral, se salvo
- preview, se não houver texto completo

Isso vem de [`src/services/essayInsights.js`](/home/elias/Downloads/Apis/src/services/essayInsights.js).

## Como usar com ou sem search

### Com search

Use quando:

- o tema depende de fato atual
- você quer fontes e cards
- o material de apoio precisa ser factual

Fluxo:

```js
await gerarTemaDinamico()
```

### Sem search

Use quando:

- você já tem o contexto
- o texto é só análise/classificação/resumo
- você quer testar um provider/modelo específico

Fluxo:

```js
await chamarIAEspecifica({
  provider: 'gemini',
  modelVariant: 'primary',
  systemPrompt: '...',
  userMessages: [{ role: 'user', content: '...' }],
})
```

## Como trocar a ordem de fallback

A ordem é controlada em [`netlify/ai/ai.js`](/home/elias/Downloads/Apis/netlify/ai/ai.js).

Procure:

- `AI_GROQ_ORDER`
- `AI_GEMINI_ORDER`
- `AI_OPENROUTER_ORDER`
- `AI_GROK_ORDER`
- `AI_HUGGINGFACE_ORDER`

Exemplo:

```env
AI_GROQ_ORDER=10
AI_GEMINI_ORDER=20
AI_OPENROUTER_ORDER=30
AI_GROK_ORDER=40
AI_HUGGINGFACE_ORDER=50
```

Se quiser desligar um provider:

```env
AI_GROQ_ENABLED=false
```

## Como editar os modelos

O arquivo certo é [`netlify/ai/ai.js`](/home/elias/Downloads/Apis/netlify/ai/ai.js).

Defaults:

- `AI_GROQ_MODEL_PRIMARY`
- `AI_GROQ_MODEL_SECONDARY`
- `AI_GEMINI_MODEL_PRIMARY`
- `AI_GEMINI_MODEL_SECONDARY`
- `AI_OPENROUTER_MODEL_PRIMARY`
- `AI_OPENROUTER_MODEL_SECONDARY`
- `AI_GROK_MODEL_PRIMARY`
- `AI_GROK_MODEL_SECONDARY`
- `AI_HF_MODEL_PRIMARY`
- `AI_HF_MODEL_SECONDARY`

Se a env var estiver vazia, o fallback interno do arquivo entra.

## Plano free e limites

Os limites locais ficam em [`src/services/freePlanUsage.js`](/home/elias/Downloads/Apis/src/services/freePlanUsage.js).

Hoje o painel mostra:

- tema dinâmico
- correção de redação
- IA direta
- resumo de usuário

O painel visual fica em [`src/views/PerfilPage.jsx`](/home/elias/Downloads/Apis/src/views/PerfilPage.jsx).

### Observação importante

Isso é um controle local/cliente para dev e MVP.
Se depois quiser limite real por conta, o ideal é mover isso para backend.

## Rascunho persistente

O corretor salva estado local em [`src/services/corretorDraft.js`](/home/elias/Downloads/Apis/src/services/corretorDraft.js).

Ele preserva:

- tema
- material
- redação
- modo rígido
- estado de início da sessão

## Exemplo de fluxo completo

### 1. Geração de tema com search

```js
await gerarTemaDinamico()
```

### 2. Correção sem search

```js
await corrigirRedacao({
  redacao,
  tema,
  material,
  isRigido: false,
})
```

### 3. Resumo de usuário para personalização

```js
const userMessages = buildContextoParaIADireta({
  prompt: 'Resuma o estilo do aluno com base nas últimas 3 redações.',
  historicoLimit: 3,
})

await chamarIAEspecifica({
  provider: 'groq',
  modelVariant: 'secondary',
  systemPrompt: 'Gere JSON com perfil do usuário.',
  userMessages,
})
```

## Onde mexer rápido

- Fallback e providers: [`netlify/ai/ai.js`](/home/elias/Downloads/Apis/netlify/ai/ai.js)
- Search factual: [`netlify/functions/buscar-contexto.js`](/home/elias/Downloads/Apis/netlify/functions/buscar-contexto.js)
- Chamada direta: [`netlify/functions/chamar-ia.js`](/home/elias/Downloads/Apis/netlify/functions/chamar-ia.js)
- Front da IA: [`src/services/aiService.js`](/home/elias/Downloads/Apis/src/services/aiService.js)
- Limites free: [`src/services/freePlanUsage.js`](/home/elias/Downloads/Apis/src/services/freePlanUsage.js)
- Insights: [`src/services/essayInsights.js`](/home/elias/Downloads/Apis/src/services/essayInsights.js)

---

Se quiser modificar algo depois, comece por este arquivo e depois vá para o código correspondente acima.
