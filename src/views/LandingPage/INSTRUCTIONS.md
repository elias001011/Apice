# 🚀 Guia Visual para a Landing Page (V2)

Este guia foi criado para orientar o próximo modelo de IA na construção da Landing Page, garantindo que o visual seja 100% fiel à identidade premium do Ápice.

## 🎨 Identidade Visual (Design Tokens)

O projeto utiliza um sistema de design baseado em variáveis CSS (veja `src/styles/global.css`). Use-as sempre:

- **Tipografia**:
  - Títulos Impactantes: `'DM Serif Display', serif`
  - Textos de Corpo e Botões: `'DM Sans', sans-serif`
- **Cores (Tema Escuro)**:
  - Fundo principal: `#0a0a0a` (`--bg`)
  - Accent (Destaque): `#c8f060` (Verde Limão / `--accent`)
  - Texto Principal: `#ffffff`
  - Texto Secundário: `#c4c2bc`
- **Efeitos Premium**:
  - **Glassmorphism**: Use `backdrop-filter: blur(var(--glass-blur))` e bordas semi-transparentes (`var(--glass-border)`).
  - **Gradients**: O projeto usa gradientes radiais suaves no fundo para dar profundidade.
  - **Bordas**: Arredondamento generoso de `24px` (`--radius`).

## 🏗️ Recomendações de UI

1. **Header**: Deve ser fixo (`sticky`), com fundo embaçado (glassmorphism) e o logo usando a fonte serifada.
2. **Hero Section**: 
   - Título grande e elegante usando `DM Serif Display`.
   - Use o destaque verde limão (`--accent`) para palavras-chave no título.
   - Chamadas de ação (CTAs) devem ser proeminentes, preferencialmente usando o fundo `--accent` e texto escuro para o botão principal.
3. **Cards de Recursos**:
   - Use o estilo de card do projeto (veja `src/views/HomePage.jsx` ou `src/views/ProfessorPage.jsx` para referência).
   - Padding interno generoso e sombras suaves (`--surface-shadow-md`).
4. **Responsividade**:
   - Respeite as larguras de contêiner: `--max-w-lg` (1060px) para seções amplas.
   - Pobreza de design em mobile é inaceitável; garanta que os paddings e fontes se adaptem.

## ✅ Regras de Ouro
- **Mantenha-se na Branch `LandingPage`**: Nunca faça merge ou altere arquivos fora de `src/views/LandingPage/` sem necessidade extrema.
- **Micro-animações**: Adicione transições suaves ao passar o mouse em botões e cards (`transition: all 0.3s ease`).
- **Coerência**: Se houver dúvida sobre um estilo de botão ou input, consulte o `AppShell.jsx` ou a `HomePage.jsx`.

---

*Instrução gerada por Antigravity.*
