# Guia de Colaboração — Projeto Ápice

Este guia resume as regras de desenvolvimento e o estado atual do repositório para orientar novos colaboradores ou recordar o fluxo de trabalho.

## 📍 Informações do Repositório

- Repositório Remoto: https://github.com/elias001011/Apice.git
- Branch Principal de Trabalho: `dev`

> IMPORTANTE: No momento, todo o desenvolvimento está sendo feito diretamente na branch `dev`. Nenhuma alteração deve ser enviada para a `main` sem alinhamento prévio.

## ⚖️ Regras de Ouro (GitHub)

Para evitar conflitos entre as partes (Pedro e Elias), estabelecemos estas regras:

1. **Sincronização Obrigatória**
   - Sempre execute `git pull origin dev` antes de começar qualquer alteração.
   - Execute novamente `git pull origin dev` imediatamente antes de cada `git push`.

2. **Prevenção de Conflitos**
   - Antes de subir qualquer alteração, verifique se seu parceiro subiu algo recentemente.
   - Se houver um novo commit em `dev`, sincronize e revise as mudanças antes de continuar.

3. **Commits Semânticos**
   - Use mensagens de commit claras e consistentes.
   - Exemplos:
     - `feat(upgrade): ...`
     - `fix(theme): ...`
     - `docs(readme): ...`
     - `refactor(api): ...`

## 💡 Dicas de Fluxo de Trabalho

- Trabalhe sempre em pequenos commits e com mensagens descritivas.
- Use `git status` para revisar alterações antes de fazer `git add`.
- Ao terminar uma tarefa, faça `git push origin dev` somente depois de confirmar que o branch local está atualizado.

## 🔧 Exemplo de sequência segura

```bash
git checkout dev
git pull origin dev
# faça suas alterações
git add .
git commit -m "feat(upgrade): descrição clara da mudança"
git pull origin dev
git push origin dev
```
