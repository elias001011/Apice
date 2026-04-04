# Tutorial Local com Netlify CLI

Data-base: 26/03/2026

Este guia é para quem vai contribuir no projeto e quer rodar o app localmente com o mesmo backend Netlify já linkado.

## O que você precisa

- Node.js 18.14.0 ou superior
- Git
- Acesso ao projeto no GitHub
- Acesso ao site da Netlify como colaborador do time ou, no mínimo, o `siteID` do projeto

Observação importante:

- Ser colaborador no GitHub não garante acesso ao site na Netlify.
- Para usar `netlify link` apontando para o site já existente, você precisa estar autorizado nesse site/time da Netlify.

## 1) Instalar a Netlify CLI

Instale globalmente:

```bash
npm install -g netlify-cli
```

Teste se instalou:

```bash
netlify
```

Docs oficiais:

- [Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/)

## 2) Entrar na sua conta Netlify

Faça login:

```bash
netlify login
```

Isso abre o navegador para autorizar a CLI.

Se a equipe usar SSO, a conta precisa ter acesso ao time correto na Netlify.

## 3) Clonar o repositório

Depois de clonar o projeto, entre na pasta dele:

```bash
cd /caminho/do/projeto
```

## 4) Linkar o projeto ao site da Netlify

Na raiz do projeto, rode:

```bash
netlify link
```

Escolha `Existing site` e selecione o site correto.

Se o site não aparecer na lista:

- seu usuário ainda não tem acesso ao site/time na Netlify;
- peça para o dono do projeto te adicionar como colaborador no site/time;
- ou peça o `siteID` correto e use o link manualmente.

O `siteID` fica no painel da Netlify em:

- `Project configuration > General > Project information`

## 5) Puxar variáveis de ambiente

O projeto depende de variáveis da Netlify para Identity, IA e outros fluxos.

Para listar as variáveis configuradas no site:

```bash
netlify env:list --plain
```

Se você tiver permissão, isso ajuda a copiar os valores para um `.env` local.

Se preferir, o dono do projeto pode te passar os valores já prontos para um `.env` de desenvolvimento.

Arquivo de referência do projeto:

- `.env`

Variáveis que normalmente importam aqui:

- `VITE_NETLIFY_IDENTITY_URL`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `OR_API_KEY`
- `XAI_API_KEY`
- `HF_API_KEY`
- `AI_*`

## 6) Rodar localmente com a infraestrutura Netlify

Depois de linkar o site e carregar as variáveis:

```bash
netlify dev
```

O projeto sobe em:

- `http://localhost:8888`

O `netlify dev` usa a configuração de `netlify.toml`, sobe as Functions e replica o ambiente da Netlify no local.

Docs oficiais:

- [Local development with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development/)

## 7) Se você só quiser ver a interface

Se você não tiver acesso ao site da Netlify ainda, dá para rodar só o front:

```bash
npm install
npm run dev
```

Mas isso não substitui o `netlify dev`:

- Functions podem não responder igual
- Identity pode não autenticar
- Fluxos de IA podem falhar sem as env vars

## 8) Comandos úteis

```bash
netlify status
netlify unlink
netlify env:get NOME_DA_VAR
netlify env:unset NOME_DA_VAR
```

Se o link quebrar, rode `netlify unlink` e faça `netlify link` de novo.

## Resumo rápido

1. `npm install -g netlify-cli`
2. `netlify login`
3. `netlify link`
4. `netlify env:list --plain`
5. `netlify dev`

