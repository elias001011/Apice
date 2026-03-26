25/03/2026 - PLANO ATUALIZADO

1- Manter o projeto rodando localmente e no deploy da Netlify/GitHub;
2- Manter o Netlify Identity e o user data como base de conta;
3- Operar a infraestrutura de IA com free tier, fallback e search quando necessário;
4- Evoluir o ecossistema de IA com prompts, tools, seleção de provider/modelo, contexto de usuário e integração futura com user-data.

---

### ✅ Log Técnico Atualizado (25/03/26)
Infraestrutura de IA centralizada em `netlify/ai/ai.js`, com separação clara entre `search` factual e geração de texto; criação de endpoint próprio para busca contextual; criação de endpoint genérico para chamada direta de provider/modelo sem search; integração de Groq, Gemini, OpenRouter, Grok e Hugging Face com fallback configurável; suporte a modelo secundário e override por env var; persistência de rascunho do corretor; material de apoio do tema dinâmico renderizado em blocos/cards com fontes; heurística local para detectar cópia do material de apoio; painel de limites do plano free no perfil; remoção completa do fluxo de usuário convidado/local; uso de insights reais do histórico de redações no Home e no Perfil.

---

### 🛠️ Tutorial de Desenvolvimento
*   **Rodar Projeto Localmente:** No terminal, execute `netlify login`, depois `netlify link` e por fim `netlify dev`. O site estará disponível em `http://localhost:8888`.
*   **Testar IA:** O fluxo principal de tema dinâmico usa `search`; a correção usa apenas contexto da tela; a chamada direta sem search está em `netlify/functions/chamar-ia.js` e `src/services/aiService.js`.
*   **Trocar fallback/modelo:** Ajuste as env vars em `netlify/ai/ai.js` (`AI_<PROVIDER>_ENABLED`, `AI_<PROVIDER>_ORDER`, `AI_<PROVIDER>_MODEL_PRIMARY`, `AI_<PROVIDER>_MODEL_SECONDARY`).
*   **Salvar rascunho:** O corretor persiste tema, material, redação e modo rígido automaticamente.
*   **Documentação central da IA:** Veja [`TUTORIAL_INFRA_IA.md`](/home/elias/Downloads/Apis/TUTORIAL_INFRA_IA.md).
*   **Tutorial Netlify local:** Veja [`TUTORIAL_NETLIFY_LOCAL.md`](/home/elias/Downloads/Apis/TUTORIAL_NETLIFY_LOCAL.md).
*   **Commitar Alterações:** Use `git add .` seguido de `git commit -m "Sua mensagem aqui"`.
*   **Sincronizar (Push):** Envie para a nuvem com `git push origin dev`.
*   **Atualizar Local (Pull):** Baixe as novidades com `git pull origin dev`.

---
