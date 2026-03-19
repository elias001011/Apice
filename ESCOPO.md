19/20/21/22/23/24/25 - 03/2026 - PLANO DE IMPLEMENTAÇÃO

1- Fazer essa joça rodar localmente e aprontar pra funcionar com a netlify/github;
2- Configurar netlify identity e user data;
3- Configurar a joça da API de IA com free tier (com fallback por ser free)
4- Integrar e fazer um ecossistema com a IA (preparar tools, prompts, planejamento de qual IA e qual instruções/contexto enviar, otimização de tokens, integração com user-data, etc).

---

### ✅ Log Técnico (19/03/26)
Configuração do ambiente local com Node.js e Netlify CLI; limpeza de conflitos de merge críticos em múltiplas páginas; implementação de sistema de autenticação robusto via gotrue-js (Netlify Identity) com AuthProvider centralizado; refinamento da UX com remoção da tela redundante de boas-vindas e integração direta da captura de metadados no cadastro; configuração de ambiente de desenvolvimento via netlify.toml com proxy reverso na porta 8888.

### 🛠️ Tutorial de Desenvolvimento
*   **Rodar Projeto Localmente:** No terminal, execute `netlify dev`. O site estará disponível em `http://localhost:8888`.
*   **Commitar Alterações:** Use `git add .` seguido de `git commit -m "Sua mensagem aqui"`.
*   **Sincronizar (Push):** Envie para a nuvem com `git push origin dev`.
*   **Atualizar Local (Pull):** Baixe as novidades com `git pull origin dev`.

---
