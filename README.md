# Ápice 🎓

![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)
![Netlify](https://img.shields.io/badge/Netlify-Functions-00c7b7.svg)
![Auth](https://img.shields.io/badge/Auth-Netlify%20Identity-purple.svg)

**Ápice** é uma plataforma web de estudos para o ENEM, com foco em redação, simulados, acompanhamento de desempenho e ferramentas de IA para estudo guiado.

O projeto usa React/Vite no frontend e Netlify Functions no backend. As chamadas de IA, autenticação, pagamentos e sincronização de dados passam por funções serverless para proteger chaves, controlar acesso e centralizar regras de negócio.

---

## 1. Arquitetura e Fluxo Geral do Sistema

A arquitetura do Ápice é estruturada em três camadas principais:

```txt
┌─────────────────────────────────┐
│     React 19 / Vite Client      │
└────────────────┬────────────────┘
                 │
                 │ authFetch() [JWT Header]
                 ▼
┌─────────────────────────────────┐
│        Netlify Functions        │ (utils/auth.js, validate.js, rateLimit.js)
└────────────────┬────────────────┘
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│        netlify/ai/ai.js         │     │         Netlify Blobs           │
└────────────────┬────────────────┘     └─────────────────────────────────┘
                 │ (Fallback Engine)             (Estado e Billing do Usuário)
                 ▼
 ┌───────────────┼───────────────┐
 ▼               ▼               ▼
Groq          Gemini        OpenRouter / xAI / HF
```

1. **Frontend (React 19 & Vite 8)**: Gerencia a interface do usuário, mantém o estado de estudo local do estudante (usando LocalStorage temporário), e interage com o backend através da função utilitária `authFetch()`, que anexa automaticamente o token JWT do Netlify Identity nas requisições.
2. **Backend (Netlify Functions - Serverless)**: Centraliza as regras de negócio, valida os dados de entrada, executa autenticação estrita, aplica políticas de rate limit e gerencia a conexão com serviços de terceiros (Provedores de IA e gateway de pagamento AbacatePay).
3. **Persistência (Netlify Blobs)**: Banco de dados chave-valor serverless de alta consistência usado para persistir o estado do usuário, histórico de uso do modo convidado e controle de rate limiting em tempo de execução.

---

## 2. Funcionamento Interno da Camada de IA

O orquestrador central de IA está localizado no arquivo `netlify/ai/ai.js`. Ele expõe APIs simplificadas para as funções serverless e executa diversas etapas complexas por trás de cada requisição.

### A. Mecanismo de Fallback e Ordem de Provedores
La camada de IA suporta 5 provedores externos: **Groq**, **Gemini**, **OpenRouter**, **xAI (Grok)** e **Hugging Face**.
* **Seleção Dinâmica**: O sistema lê as variáveis de ambiente `AI_<PROVIDER>_ENABLED` e `AI_<PROVIDER>_ORDER` para construir dinamicamente a cadeia de fallback.
* **Execução**: Se o provedor primário falhar (por limite de cota, erro de rede ou timeout), a engine intercepta o erro, registra a falha no console e tenta automaticamente o próximo provedor disponível na fila de prioridades, garantindo alta disponibilidade ao usuário final.

### B. Ferramentas Integradas (Function Calling)
O chat do **Professor IA** utiliza a função `runGroqProfessorWithTools` para habilitar chamadas de ferramentas diretamente na inteligência artificial:
1. **Definição de Ferramentas**: São expostas ferramentas como `search_web` (pesquisa factual de atualidades) e `generate_quiz` (geração de quizzes interativos).
2. **Ciclo de Execução**:
   * O modelo recebe a pergunta do usuário e decide se precisa chamar alguma ferramenta.
   * Se sim, a função serverless intercepta a requisição, executa a busca contextual (usando a API Google Custom Search integrada em `searchContext`) e devolve os dados estruturados de volta ao modelo.
   * O modelo gera a resposta final baseada no contexto injetado pelas ferramentas.

### C. Higienização de Respostas e Parsing JSON
Os prompts instruem os modelos de linguagem a retornar exclusivamente objetos JSON válidos para que a interface possa renderizar de forma rica (separando texto, explicações e metadados).
* **Sanitização**: Como os modelos frequentemente envolvem o JSON em blocos de código Markdown (\`\`\`json ... \`\`\`), a camada de IA do backend limpa esses caracteres antes de tentar efetuar o `JSON.parse`.
* **Fallback de Validação**: Se o retorno ainda for inválido, o sistema aciona expressões regulares e limpadores de strings para recuperar o JSON quebrado.

### D. Validação de Entrada (Inputs)
Para evitar abusos de consumo de tokens (Prompt Injection de tamanho massivo ou estouro de memória), todas as rotas passam pelo utilitário `netlify/functions/utils/validate.js`, que rejeita a requisição antes de enviá-la para a IA se os limites abaixo forem excedidos:
* **Mensagem do Usuário**: Máximo de 15.000 caracteres.
* **Histórico de Conversas**: Limite no número de mensagens anteriores enviadas no contexto.
* **Texto de Redação**: Máximo de 8.000 caracteres.

---

## 3. Processo de Pagamento e Assinaturas (AbacatePay)

O fluxo de monetização e controle de planos premium é integrado com a API da **AbacatePay** e mantido nas funções serverless sob forte controle de estado.

```txt
[Client]                      [Netlify Functions]                     [AbacatePay]
   │                                   │                                    │
   │ POST /abacatepay-checkout         │                                    │
   ├──────────────────────────────────>│                                    │
   │                                   │ 1. Valida plano local              │
   │                                   │ 2. Cria Customer ID                │
   │                                   │ 3. Valida Produto Remoto           │
   │                                   │ 4. Cria checkout                   │
   │                                   ├───────────────────────────────────>│
   │                                   │                                    │
   │ <─────────────────────────────────┼────────────────────────────────────┤
   │    Retorna URL do Checkout        │                                    │
   │                                   │                                    │
   │ (Cliente efetua o pagamento)      │                                    │
   │                                   │                                    │
   │ Webhook POST                      │                                    │
   │ ──────────────────────────────────┼───────────────────────────────────>│
   │                                   │                                    │
   │                                   │ 1. Valida WEBHOOK_SECRET           │
   │                                   │ 2. Decodifica externalId           │
   │                                   │ 3. Grava "paid" no Netlify Blobs   │
   │                                   │<───────────────────────────────────┤
```

### A. Fluxo de Criação do Checkout (`abacatepay-checkout.js`)
1. **Validação de Plano**: O backend verifica se o `planKey` enviado existe na tabela estática `PRICING_PLANS`.
2. **Criação do Cliente**: O sistema consulta as informações cadastrais e gera um `customerId` único na AbacatePay para rastreabilidade de faturas.
3. **Validação de Produto**: Para evitar descompassos entre o código e o painel da AbacatePay:
   * **Assinaturas**: Valida se o produto está ativo e se o ciclo cadastrado corresponde ao esperado pelo plano (`MONTHLY`, `SEMIANNUALLY` ou `ANNUALLY`).
   * **Pagamentos Únicos**: Garante que o produto não possua ciclo de recorrência associado.
4. **Construção do Payload**: O checkout é criado com metadados cruciais criptografados/codificados no `externalId` (formato atual: `apice:<userId>:<planKey>:<timestamp>`; o parser ainda aceita o formato legado com underscores para compatibilidade).

### B. Processamento do Webhook de Pagamento (`payment-webhook.js`)
* **Autenticação**: O webhook é protegido por um segredo exclusivo. A função rejeita qualquer payload em que o parâmetro `webhookSecret` não coincida com `WEBHOOK_SECRET` do Netlify.
* **Processamento do Evento**: Ao receber `checkout.completed`, `subscription.completed` ou `subscription.renewed`, a função decodifica o `externalId` para obter o `userId` correspondente.
* **Atualização do Blob**: A função serverless atualiza o Netlify Blobs com o novo estado de billing verificado (`status: 'paid'`), tornando o backend a única autoridade confiável de acesso.

---

## 4. Estrutura de Armazenamento e Estado da Conta

O Ápice adota uma arquitetura híbrida de autenticação e persistência para garantir alta performance e conformidade de segurança.

### A. Separação de Identidade e Estado
* **Netlify Identity (JWT)**: Usado apenas para atestar a identidade criptográfica do usuário. O JWT expõe dados básicos (`sub`, `email`). Não armazenamos o progresso do aluno ou o estado de pagamento no `user_metadata` do JWT para evitar tokens excessivamente grandes e lentidão no tráfego de requisições.
* **Netlify Blobs**: Armazena o estado real. Toda mutação de dados é feita gravando no Netlify Blobs do projeto sob a chave `user-state:${userId}`.

### B. Schema do Estado do Usuário no Blob
O arquivo JSON armazenado possui a seguinte estrutura técnica:

```json
{
  "accountOwnerId": "uuid-do-usuario-no-identity",
  "savedAt": "2026-05-23T17:00:00.000Z",
  "planTier": "free" | "paid",
  "planStatus": "free" | "paid",
  "planKey": "monthly" | "annual" | "semiannual" | "monthly_one_time" | "welcome_one_time" | "",
  "billing": {
    "status": "free" | "paid",
    "planKey": "monthly" | "annual" | "semiannual" | "monthly_one_time" | "welcome_one_time",
    "billingMode": "subscription" | "one_time",
    "gateway": "abacatepay-v2",
    "paidAt": "2026-05-23T17:00:00.000Z",
    "subscriptionActive": true,
    "cancelAtPeriodEnd": false,
    "checkoutId": "ap-checkout-id",
    "subscriptionId": "ap-subscription-id",
    "accessEndsAt": "2027-05-23T17:00:00.000Z",
    "remoteStatus": "ACTIVE",
    "updatedAt": "2026-05-23T17:00:00.000Z"
  },
  "history": {
    "redacoes": [],
    "simulados": [],
    "conquistas": []
  }
}
```

### C. Sincronização Segura
* **carregar-estado.js**: Obtém o JSON acima do Blob com consistência forte e o retorna ao frontend.
* **salvar-estado.js**: Mescla o histórico de estudos do frontend com o estado da nuvem. **Regra de Segurança**: Esta rota bloqueia qualquer tentativa de mutação manual do bloco `"billing"`, `"planTier"`, ou `"planStatus"` enviada pelo cliente. O estado financeiro é alterado apenas por rotas internas verificadas e pelos webhooks oficiais assinados da AbacatePay.

---

## 5. Variáveis de Ambiente Oficiais (Netlify)

O backend do projeto depende das seguintes variáveis de ambiente cadastradas no painel da Netlify:

| Nome da Variável | Função |
| :--- | :--- |
| **`ABACATE_PAY`** | Chave API da AbacatePay (Usada como fallback secundário) |
| **`ABACATE_V2`** | Chave API Principal da AbacatePay (V2) |
| **`CLIMA`** | Chave de API do OpenWeatherMap para o widget meteorológico |
| **`GEMINI`** | Chave de API do Google Gemini |
| **`GROK`** | Chave de API do xAI Grok |
| **`GROQ`** | Chave de API do Groq Cloud |
| **`HF`** | Chave de API da Hugging Face |
| **`OR`** | Chave de API do OpenRouter |
| **`WEBHOOK_SECRET`** | Token secreto para autenticação das requisições do webhook da AbacatePay |
| **`NETLIFY_AUTH_TOKEN`** | Token de acesso para deploys automáticos e CLI |

Se você quiser validar produtos e cupons com mais rigor no checkout, também existem variáveis opcionais como `ABACATE_VALIDATE_PRODUCTS`, `ABACATE_AUTO_LIST_COUPONS` e `ABACATE_CHECKOUT_COUPONS` / `ABACATE_ALLOWED_COUPONS`.

---

## 6. Desenvolvimento Local

### Pré-requisitos
* Node.js 22+.
* Netlify CLI instalado globalmente: `npm install -g netlify-cli`.

### Inicialização
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicialize o servidor local integrado do Netlify Dev:
   ```bash
   netlify dev
   ```
3. O frontend estará disponível em `http://localhost:8888` com proxy automático para as funções serverless em `/.netlify/functions/`.

### Teste do pagamento sem cobrança real
O fluxo da AbacatePay tem Dev mode próprio, então dá para simular checkout, pagamento e webhook sem usar cartão real. Para isso, use uma chave de Dev mode no painel da AbacatePay, cadastre o webhook em modo de testes e valide o retorno em `/planos`. A ativação premium acontece por dois caminhos: o retorno do checkout confere o status e o webhook grava o estado pago no Blob, então o acesso permanece ativo mesmo se a pessoa fechar a aba antes do retorno.
