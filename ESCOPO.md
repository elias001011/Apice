28/03/2026 - PLANO ATUALIZADO

1- Manter o projeto rodando localmente e no deploy da Netlify/GitHub;
2- Manter o Netlify Identity e o user data como base de conta;
3- Operar a infraestrutura de IA com free tier, fallback e search quando necessário;
4- Evoluir o ecossistema de IA com prompts, tools, seleção de provider/modelo, contexto de usuário e integração futura com user-data.

---

### ✅ Log Técnico Atualizado (28/03/26)
Resumo consolidado do que foi feito até aqui: infraestrutura de IA centralizada em `netlify/ai/ai.js`, com separação entre `search` factual e geração de texto; endpoints para busca contextual e chamada direta de provider/modelo; integração com Groq, Gemini, OpenRouter, Grok e Hugging Face com fallback configurável; persistência de rascunho do corretor; material de apoio do tema dinâmico em cards; heurística local para detectar cópia do material; painel de limites do plano free no perfil; remoção do fluxo de usuário convidado/local; uso de insights reais do histórico de redações no Home e no Perfil; estabilização do `netlify dev`/Vite e do cache de service worker; correções de autenticação Netlify Identity (reenvio de verificação, login/sessão, rate limiting, exclusão de conta com confirmação); correção do Radar para exibir o detalhe da IA sem reload; PWA com evento `beforeinstallprompt`, botão de instalação funcional, `Icon.svg` no manifesto e `theme_color` ajustado; tema automático pelo `prefers-color-scheme` com reaplicação do tema salvo na nuvem; ajustes de layout e UX (larguras dos cards, mobile fixo sem resize, spinner/skeleton de carregamento, footer, ícones de pin/lixeira, textarea sem resize, limite de 100 caracteres e confirmações destrutivas); versão da aplicação sincronizada em `1.2` para referência.

---

### 🛠️ Tutorial de Desenvolvimento
*   **Rodar Projeto Localmente:** No terminal, execute `netlify login`, depois `netlify link` e por fim `netlify dev`. O site estará disponível em `http://localhost:8888`.
*   **Testar IA:** O fluxo principal de tema dinâmico usa `search`; a correção usa apenas contexto da tela; a chamada direta sem search está em `netlify/functions/chamar-ia.js` e `src/services/aiService.js`.
*   **Trocar fallback/modelo:** Ajuste as env vars em `netlify/ai/ai.js` (`AI_<PROVIDER>_ENABLED`, `AI_<PROVIDER>_ORDER`, `AI_<PROVIDER>_MODEL_PRIMARY`, `AI_<PROVIDER>_MODEL_SECONDARY`).
*   **Salvar rascunho:** O corretor persiste tema, material, redação e modo rígido automaticamente.
*   **Documentação central da IA:** Veja [`TUTORIAL_INFRA_IA.md`](/home/elias/Downloads/Apice/TUTORIAL_INFRA_IA.md).
*   **Tutorial Netlify local:** Veja [`TUTORIAL_NETLIFY_LOCAL.md`](/home/elias/Downloads/Apice/TUTORIAL_NETLIFY_LOCAL.md).
*   **Commitar Alterações:** Use `git add .` seguido de `git commit -m "Sua mensagem aqui"`.
*   **Sincronizar (Push):** Envie para a nuvem com `git push origin dev`.
*   **Atualizar Local (Pull):** Baixe as novidades com `git pull origin dev`.

---
