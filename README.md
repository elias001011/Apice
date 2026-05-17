# Ápice 🎓

![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)
![Netlify](https://img.shields.io/badge/Netlify-Functions-00c7b7.svg)
![Auth](https://img.shields.io/badge/Auth-Netlify%20Identity-purple.svg)

**Ápice** é uma plataforma web de estudos para o ENEM, com foco em redação, simulados, acompanhamento de desempenho e ferramentas de IA para estudo guiado.

O projeto usa React/Vite no frontend e Netlify Functions no backend. As chamadas de IA, autenticação, pagamentos e sincronização de dados passam por funções serverless para proteger chaves, controlar acesso e centralizar regras de negócio.

> Projeto desenvolvido por **Elias Nunes**.

---

## Visão geral

O Ápice foi criado para ajudar estudantes a treinar para o ENEM com uma experiência mais personalizada que um app estático. A aplicação combina:

- correção de redações com IA;
- geração dinâmica de temas;
- Professor IA para dúvidas e exercícios;
- simulados e histórico de desempenho;
- radar de temas;
- conquistas, preferências e progresso;
- login, modo convidado e sincronização em nuvem.

---

## Funcionalidades

### Redação

- Correção de redações no estilo ENEM.
- Tema, material de apoio e modo de correção rígido.
- Heurísticas de segurança e qualidade antes/depois da IA.
- Histórico local e sincronização para usuários logados.
- Análise de desempenho baseada em redações anteriores.

### Professor IA

- Chat educacional voltado ao ENEM.
- Respostas em português do Brasil.
- Suporte a ferramentas internas:
  - pesquisa web quando a resposta depende de atualidades;
  - geração de quizzes interativos;
  - organização da resposta em JSON para a interface.
- Histórico de conversa e geração automática de título.

### Simulados

- Geração de questões por área/disciplina.
- Limite de segurança para quantidade de questões geradas por IA.
- Histórico de simulados e métricas de desempenho.

### Radar de temas

- Sugestões de temas atuais.
- Detalhamento de temas para estudo.
- Materiais com cards, fontes e resumo.

### Conta e sincronização

- Login com Netlify Identity/GoTrue.
- Modo convidado com cota limitada.
- Sincronização em nuvem via Netlify Blobs.
- Estado de conta separado do JWT para evitar tokens inflados.
- Backup/exportação de dados do usuário.

### Planos e billing

- Estrutura de planos/free usage.
- Integração com AbacatePay em Functions dedicadas.
- Webhook de pagamento server-side.
- Backend como autoridade para estado de billing.

---

## Stack

- **Frontend:** React 19, Vite 8, React Router.
- **Autenticação:** Netlify Identity / GoTrue.
- **Backend:** Netlify Functions.
- **Persistência serverless:** Netlify Blobs.
- **IA:** Groq, Gemini, OpenRouter, xAI/Grok e Hugging Face via camada de fallback.
- **Exportação/artefatos:** `jspdf`, `html-to-image`.
- **Canvas/whiteboard:** `tldraw`.

---

## Arquitetura

```txt
React/Vite frontend
  ↓
authFetch()
  ↓
Authorization: Bearer <JWT>
  ↓
Netlify Functions
  ↓
utils/auth.js + validate.js + rateLimit.js
  ↓
netlify/ai/ai.js
  ↓
Providers externos de IA
```

A regra geral é: o frontend não carrega chaves de IA e não decide sozinho a lógica crítica. Ele envia dados para Functions, e as Functions validam autenticação, entrada, cota e segurança antes de chamar os providers.

---

## Principais diretórios

```txt
src/
  auth/                 Provider de autenticação, sessão convidada e contexto
  services/             Camada de dados e integração com Functions
  views/                Telas principais do app
  styles/               CSS global e telas específicas

netlify/functions/
  utils/                Auth, CORS, validação, rate limit, billing guard
  professor-ia.js       Chat educacional com IA
  corrigir-redacao.js   Correção de redação
  gerar-tema.js         Tema dinâmico
  buscar-contexto.js    Busca contextual/factual
  gerar-radar*.js       Radar de temas
  gerar-simulado.js     Geração de simulado
  resumir-usuario.js    Resumo de desempenho
  carregar-estado.js    Pull do estado em nuvem
  salvar-estado.js      Push do estado em nuvem
  abacatepay-*.js       Checkout/billing
  payment-webhook.js    Webhook de pagamentos

netlify/ai/
  ai.js                 Orquestrador central de IA e fallback de providers
```

---

## IA no backend

O arquivo `netlify/ai/ai.js` é o centro da camada de IA.

Ele concentra:

- ordem dos providers por variável de ambiente;
- modelos default por provider;
- fallback quando um provider falha;
- prompts de correção, professor, tema, radar, simulado e resumo;
- normalização de JSON retornado por modelos diferentes;
- ferramentas do Professor IA, como pesquisa web e quiz interativo.

Providers suportados:

```txt
Groq
Gemini
OpenRouter
xAI/Grok
Hugging Face
```

Variáveis de controle comuns:

```env
AI_GROQ_ENABLED=true
AI_GROQ_ORDER=10
AI_GEMINI_ENABLED=true
AI_GEMINI_ORDER=20
AI_OPENROUTER_ENABLED=true
AI_OPENROUTER_ORDER=30
AI_GROK_ENABLED=true
AI_GROK_ORDER=40
AI_HUGGINGFACE_ENABLED=true
AI_HUGGINGFACE_ORDER=50
```

---

## Autenticação e JWT

Ápice usa Netlify Identity/GoTrue. O frontend obtém o token com `currentUser.jwt()` e envia nas Functions:

```http
Authorization: Bearer <JWT>
```

O backend usa `requireAuth()` em `netlify/functions/utils/auth.js` para autenticar as rotas.

Pontos importantes:

- o método principal é o `context.clientContext.user` da Netlify;
- fallback que apenas decodifica JWT sem verificar assinatura é permitido somente em ambiente local controlado;
- `X-User-Id` não é aceito como autenticação de usuário real;
- o modo convidado é aceito apenas em rotas explicitamente liberadas com `allowGuest: true`.

---

## Segurança

### Proteções atuais

- Chaves de IA e pagamento ficam no servidor, via variáveis de ambiente.
- Rotas críticas exigem JWT ou modo convidado explicitamente liberado.
- Inputs têm limite de tamanho para reduzir custo abusivo e payload gigante.
- CORS reflete somente origens conhecidas em produção.
- Rate limit por usuário/convidado/IP em Functions de IA.
- Modo convidado tem cota diária própria.
- `chamar-ia` aceita apenas providers/model variants em allowlist e ignora `modelOverride` vindo do cliente.
- Dados de billing passam por sanitização server-side.
- Estado da conta fica em Netlify Blobs, não em `user_metadata`, evitando JWT inflado.

### Rate limits aplicados

Limites atuais por janela de 10 minutos:

```txt
Professor IA:        guest 6 / usuário 40
Correção redação:    guest 4 / usuário 12
Tema dinâmico:       guest 4 / usuário 15
Busca contexto:      guest 4 / usuário 30
Radar:               guest 4 / usuário 15
Radar detalhe:       guest 4 / usuário 20
Resumo usuário:      guest 4 / usuário 20
Simulado IA:         guest 4 / usuário 15
Chamada direta IA:   guest 3 / usuário 10
```

### Limitações conhecidas

- A validação criptográfica completa do JWT via JWKS ainda pode ser implementada futuramente.
- CSP/headers de segurança ainda devem ser ajustados com cuidado para não quebrar Netlify Identity, PWA ou `tldraw`.
- O modo convidado é propositalmente simples e deve ser tratado como recurso de demonstração, não como autenticação forte.

---

## Variáveis de ambiente

Configure no Netlify e, para desenvolvimento local, no `.env`:

```env
# Netlify Identity
VITE_NETLIFY_IDENTITY_URL=/.netlify/identity

# IA
GROQ_API_KEY=sua_chave_groq
GEMINI_API_KEY=sua_chave_gemini
OR_API_KEY=sua_chave_openrouter
XAI_API_KEY=sua_chave_xai
HF_API_KEY=sua_chave_huggingface

# Controle opcional de providers
AI_GROQ_ENABLED=true
AI_GEMINI_ENABLED=true
AI_OPENROUTER_ENABLED=true
AI_GROK_ENABLED=true
AI_HUGGINGFACE_ENABLED=true

# Billing / pagamentos
ABACATEPAY_API_KEY=sua_chave_abacatepay
ABACATEPAY_WEBHOOK_SECRET=seu_secret_webhook

# Local dev apenas, se necessário
APICE_ALLOW_UNVERIFIED_JWT=false
```

> Não coloque chaves reais em arquivos versionados. Use `.env` local e variáveis do Netlify em produção.

---

## Rodando localmente

### Pré-requisitos

- Node.js 22+ recomendado.
- npm.
- Netlify CLI.

```bash
npm install -g netlify-cli
```

### Instalação

```bash
git clone https://github.com/elias001011/Apice.git
cd Apice
npm install
```

### Desenvolvimento

```bash
netlify dev
```

O app normalmente roda em:

```txt
http://localhost:8888
```

### Build

```bash
npm run build
```

---

## Branches

- `main`: versão estável/produção.
- `dev`: branch ativa de desenvolvimento.

A branch `dev` pode ficar à frente da `main` com alterações de IA, billing, auth, sincronização e segurança. Antes de mergear para produção, revise deploy, logs de Functions e fluxo de login.

---

## Checklist antes de produção

- Testar login/logout e troca de conta.
- Testar modo convidado e bloqueio de cota.
- Testar Professor IA, correção, tema, radar e simulado.
- Conferir se Functions recebem `context.clientContext.user` corretamente.
- Conferir webhooks de pagamento em ambiente seguro.
- Revisar CSP/headers antes de endurecer no `netlify.toml`.
- Verificar consumo/cotas dos providers de IA.

---

## Licença

Projeto pessoal/open source. Defina uma licença formal antes de uso público amplo.
