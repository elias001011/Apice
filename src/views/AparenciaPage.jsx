import { useTheme, FONT_FAMILIES } from '../theme/ThemeProvider.jsx'
import { Link } from 'react-router-dom'

const ACCENT_OPTIONS = [
  { key: 'lime',   label: 'Verde-lima', light: '#b8e84f', dark: '#c8f060' },
  { key: 'blue',   label: 'Azul elétrico', light: '#4faaf0', dark: '#60c8f0' },
  { key: 'purple', label: 'Roxo', light: '#a84ff0', dark: '#c060f0' },
  { key: 'orange', label: 'Laranja', light: '#f09a4f', dark: '#f0b860' },
  { key: 'red',    label: 'Vermelho', light: '#f04f4f', dark: '#f06060' },
  { key: 'cyan',   label: 'Ciano', light: '#4ff0d6', dark: '#60f0d8' },
  { key: 'pink',   label: 'Rosa', light: '#f04fbc', dark: '#f060d8' },
]

const VISUAL_EFFECT_OPTIONS = [
  {
    key: 'none',
    label: 'Desligado',
    sub: 'Superfícies sólidas, sem efeitos decorativos. Visual minimalista e limpo.',
  },
  {
    key: 'gradients',
    label: 'Gradiente',
    sub: 'Gradientes sutis no fundo do app e nos cards de destaque. Cards comuns permanecem limpos.',
  },
]

export function AparenciaPage() {
  const {
    theme,
    toggleTheme,
    accent,
    setAccent,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    layoutMode,
    setLayoutMode,
    containerSize,
    setContainerSize,
    animationsEnabled,
    setAnimationsEnabled,
    cardHoverEffects,
    setCardHoverEffects,
    visualEffects,
    setVisualEffects,
    cardGradientsEnabled,
    setCardGradientsEnabled,
    isMobileLayout,
  } = useTheme()
  const isDark = theme === 'dark'

  const currentAccentColor = ACCENT_OPTIONS.find(o => o.key === accent)
  const accentHex = currentAccentColor ? (isDark ? currentAccentColor.dark : currentAccentColor.light) : '#b8e84f'

  return (
    <>
      <style>{aparenciaCss}</style>
      <div className="view-container">
        <Link to="/perfil" className="back-link">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          Voltar ao perfil
        </Link>

      <div className="page-header anim anim-d1">
        <div className="page-title">Aparência</div>
        <div className="page-sub">Personalize como o Ápice aparece para você.</div>
      </div>

      <div className="aparencia-grid">
        {/* Coluna esquerda */}
        <div>
          {/* ── TEMA ── */}
          <div className="card anim anim-d2">
            <div className="card-title">Tema</div>
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Modo escuro</div>
                <div className="toggle-sub">{isDark ? 'Tema escuro ativado' : 'Tema claro ativado'}</div>
              </div>
              <button
                className={`toggle ${isDark ? 'on' : ''}`}
                onClick={toggleTheme}
                aria-label="Alternar modo escuro"
              >
                <span className="toggle-knob" />
              </button>
            </div>
            <div className="theme-preview-icons">
              <div className={`theme-icon-opt ${!isDark ? 'selected' : ''}`} onClick={() => isDark && toggleTheme()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                <span>Claro</span>
              </div>
              <div className={`theme-icon-opt ${isDark ? 'selected' : ''}`} onClick={() => !isDark && toggleTheme()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.8A8.5 8.5 0 1111.2 3a6.5 6.5 0 009.8 9.8z"/></svg>
                <span>Escuro</span>
              </div>
            </div>
          </div>

          {/* ── COR DE DESTAQUE ── */}
          <div className="card anim anim-d3">
            <div className="card-title">Cor de destaque</div>
            <div className="ap-color-grid">
              {ACCENT_OPTIONS.map(o => (
                <button
                  key={o.key}
                  className={`ap-color-btn ${accent === o.key ? 'active' : ''}`}
                  style={{ '--c': isDark ? o.dark : o.light }}
                  onClick={() => setAccent(o.key)}
                  title={o.label}
                  aria-label={o.label}
                >
                  <span className="ap-color-circle" />
                  <span className="ap-color-name">{o.label}</span>
                  {accent === o.key && (
                    <span className="ap-color-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── EFEITOS VISUAIS ── */}
          <div className="card anim anim-d4">
            <div className="card-title">Efeitos Visuais</div>
            <div className="ap-fx-options">
              {VISUAL_EFFECT_OPTIONS.map(f => (
                <button
                  key={f.key}
                  className={`ap-fx-btn ${visualEffects === f.key ? 'active' : ''}`}
                  onClick={() => setVisualEffects(f.key)}
                >
                  <div className="ap-fx-content">
                    <div className="ap-fx-label">{f.label}</div>
                    <div className="ap-fx-sub">{f.sub}</div>
                  </div>
                  {visualEffects === f.key && (
                    <span className="ap-color-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
            {visualEffects === 'gradients' && (
              <div className="ap-fx-extra">
                <div className="toggle-row ap-fx-toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-label">Gradiente em todos os cards</div>
                    <div className="toggle-sub">
                      Desative para manter os cards comuns limpos e deixar o gradiente só nos pontos de destaque.
                    </div>
                  </div>
                  <button
                    className={`toggle ${cardGradientsEnabled ? 'on' : ''}`}
                    onClick={() => setCardGradientsEnabled((current) => !current)}
                    aria-label="Alternar gradiente em todos os cards"
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div>
          {/* ── FONTE ── */}
          <div className="card anim anim-d2">
            <div className="card-title">Família de fonte</div>
            <div className="ap-font-options">
              {Object.entries(FONT_FAMILIES).map(([key, ff]) => (
                <button
                  key={key}
                  className={`ap-font-btn ${fontFamily === key ? 'active' : ''}`}
                  style={{ fontFamily: ff.value }}
                  onClick={() => setFontFamily(key)}
                >
                  <span className="ap-font-preview">Aa</span>
                  <span className="ap-font-label">{ff.label}</span>
                  {fontFamily === key && <span className="ap-font-dot" />}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAMANHO ── */}
          <div className="card anim anim-d3">
            <div className="card-title">Tamanho do texto</div>
            <div className="ap-size-row">
              {[
                { key: 'sm', label: 'Pequeno', icon: 'A' },
                { key: 'md', label: 'Padrão', icon: 'A' },
                { key: 'lg', label: 'Grande', icon: 'A' },
              ].map((s, i) => (
                <button
                  key={s.key}
                  className={`ap-size-btn ${fontSize === s.key ? 'active' : ''}`}
                  onClick={() => setFontSize(s.key)}
                >
                  <span style={{ fontSize: [13, 16, 19][i] }}>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* ── MODO DE LAYOUT ── */}
          <div className="card anim anim-d3">
            <div className="card-title">Modo de Layout</div>
            <div className="ap-layout-grid">
              <button
                className={`ap-layout-btn ${layoutMode === 'comfortable' ? 'active' : ''}`}
                onClick={() => setLayoutMode('comfortable')}
              >
                <div className="ap-layout-preview comfortable">
                  <div className="prev-card" />
                  <div className="prev-card" />
                </div>
                <div className="ap-layout-label">Confortável</div>
                <div className="ap-layout-sub">Padrão com mais respiro</div>
                {layoutMode === 'comfortable' && <span className="ap-layout-dot" />}
              </button>
              <button
                className={`ap-layout-btn ${layoutMode === 'compact' ? 'active' : ''}`}
                onClick={() => setLayoutMode('compact')}
              >
                <div className="ap-layout-preview compact">
                  <div className="prev-card" />
                  <div className="prev-card" />
                  <div className="prev-card" />
                </div>
                <div className="ap-layout-label">Compacto</div>
                <div className="ap-layout-sub">Foco em densidade rústica</div>
                {layoutMode === 'compact' && <span className="ap-layout-dot" />}
              </button>
            </div>
          </div>

          {/* ── EXPERIÊNCIA ── */}
          <div className="card anim anim-d3">
            <div className="card-title">Experiência</div>

            <div className="toggle-row ap-experience-row">
              <div className="toggle-info">
                <div className="toggle-label">Animações da interface</div>
                <div className="toggle-sub">
                  {animationsEnabled ? 'Transições, entradas e loaders estão ativas.' : 'Entradas, loaders e transições ficam reduzidas.'}
                </div>
              </div>
              <button
                className={`toggle ${animationsEnabled ? 'on' : ''}`}
                onClick={() => setAnimationsEnabled((current) => !current)}
                aria-label="Alternar animações da interface"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="toggle-row ap-experience-row">
              <div className="toggle-info">
                <div className="toggle-label">Responsividade de cards</div>
                <div className="toggle-sub">
                  {cardHoverEffects ? 'Cards elevam e destacam bordas ao passar o mouse.' : 'Cards permanecem estáticos, útil para toque e mobile.'}
                </div>
              </div>
              <button
                className={`toggle ${cardHoverEffects ? 'on' : ''}`}
                onClick={() => setCardHoverEffects((current) => !current)}
                aria-label="Alternar responsividade dos cards"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="card-footer-tip">
              Essas preferências acompanham sua conta e são reaplicadas na nuvem.
            </div>
          </div>

          {/* ── TAMANHO DO CONTEÚDO (DESKTOP) ── */}
          {!isMobileLayout && (
            <div className="card anim anim-d3 desktop-only-feature">
              <div className="card-title">Tamanho do Conteúdo (Desktop)</div>
              <div className="ap-size-row">
                {[
                  { key: 'sm', label: 'Pequeno', desc: '880px' },
                  { key: 'md', label: 'Médio', desc: '920px' },
                  { key: 'lg', label: 'Grande', desc: '1060px' },
                ].map((s) => (
                  <button
                    key={s.key}
                    className={`ap-size-btn ${containerSize === s.key ? 'active' : ''}`}
                    onClick={() => setContainerSize(s.key)}
                  >
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{s.desc}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
              <div className="card-footer-tip">
                Dica: O Corretor mantém sua largura ideal independente desta escolha.
              </div>
            </div>
          )}

          {/* ── PREVIEW AO VIVO ── */}
          <div className="card ap-preview anim anim-d4">
            <div className="card-title">Iniciar</div>
            <div className="ap-preview-box">
              <div className="ap-preview-badge" style={{ background: accentHex, color: '#0f0f0f' }}>Ápice</div>
              <div className="ap-preview-title">Redação nota 1000</div>
              <div className="ap-preview-text">
                Volte para a home e comece a usar as funções do app com o visual que você acabou de montar.
              </div>
              <Link to="/home" className="ap-preview-btn" style={{ background: accentHex, color: '#0f0f0f' }}>
                Ir para a home →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

const aparenciaCss = `
  /* ── GRADE APARÊNCIA ── */
  /* no mobile: coluna única (aplica-se pelo global.css .aparencia-grid) */

  .card-footer-tip {
    margin-top: 12px;
    font-size: 0.72rem;
    line-height: 1.45;
    opacity: 0.58;
    text-align: center;
  }

  /* ── TEMA ── */
  .theme-preview-icons {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }
  .theme-icon-opt {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border-radius: 12px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 40%), var(--bg3);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
    font-size: 0.8rem;
    color: var(--text2);
    box-shadow: 0 12px 28px rgba(8, 9, 4, 0.05);
  }
  .theme-icon-opt svg {
    width: 22px;
    height: 22px;
    stroke: var(--text2);
  }
  .theme-icon-opt.selected {
    border-color: rgba(var(--accent-rgb), 0.18);
    background: var(--accent-dim);
    color: var(--accent);
  }
  .theme-icon-opt.selected svg { stroke: var(--accent); }
  .theme-icon-opt:hover:not(.selected) { border-color: rgba(var(--accent-rgb), 0.14); background: var(--bg3); opacity: 0.96; transform: translateY(-1px); }

  /* ── CORES ── */
  .ap-color-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ap-color-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 12px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 40%), var(--bg3);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
    width: 100%;
    text-align: left;
    position: relative;
    box-shadow: 0 12px 28px rgba(8, 9, 4, 0.05);
  }
  .ap-color-btn:hover { border-color: rgba(var(--accent-rgb), 0.18); transform: translateY(-1px); }
  .ap-color-btn.active {
    border-color: rgba(var(--accent-rgb), 0.2);
    background: var(--accent-dim);
  }
  .ap-color-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--c);
    flex-shrink: 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }
  .ap-color-name {
    font-size: 0.85rem;
    color: var(--text);
    flex: 1;
  }
  .ap-color-check {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
  }
  .ap-color-check svg { width: 14px; height: 14px; stroke: var(--accent); }

  /* ── FONTES ── */
  .ap-font-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ap-font-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 40%), var(--bg3);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
    width: 100%;
    position: relative;
    box-shadow: 0 12px 28px rgba(8, 9, 4, 0.05);
  }
  .ap-font-btn:hover { border-color: rgba(var(--accent-rgb), 0.18); transform: translateY(-1px); }
  .ap-font-btn.active {
    border-color: rgba(var(--accent-rgb), 0.2);
    background: var(--accent-dim);
  }
  .ap-font-preview {
    font-size: 1.6rem;
    line-height: 1;
    color: var(--text);
    width: 32px;
    text-align: center;
  }
  .ap-font-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    color: var(--text);
    flex: 1;
    text-align: left;
  }
  .ap-font-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  /* ── EFEITOS VISUAIS ── */
  .ap-fx-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ap-fx-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 40%), var(--bg3);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
    width: 100%;
    position: relative;
    text-align: left;
    box-shadow: 0 12px 28px rgba(8, 9, 4, 0.05);
  }
  .ap-fx-btn:hover { border-color: rgba(var(--accent-rgb), 0.18); transform: translateY(-1px); }
  .ap-fx-btn.active {
    border-color: rgba(var(--accent-rgb), 0.2);
    background: var(--accent-dim);
  }
  .ap-fx-content {
    flex: 1;
  }
  .ap-fx-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 2px;
  }
  .ap-fx-sub {
    font-size: 0.72rem;
    color: var(--text3);
    line-height: 1.25;
  }

  .ap-fx-extra {
    margin-top: 12px;
    padding: 0.95rem 1rem;
    border-radius: 18px;
    border: 1px solid var(--border);
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.03), transparent 58%), var(--bg3);
  }
  .ap-fx-toggle-row {
    margin: 0;
    align-items: center;
    gap: 14px;
  }
  .ap-fx-toggle-row .toggle-info {
    min-width: 0;
  }
  .ap-fx-toggle-row .toggle-label {
    font-size: 0.82rem;
  }
  .ap-fx-toggle-row .toggle-sub {
    font-size: 0.7rem;
    line-height: 1.35;
  }

  /* ── TAMANHO ── */
  .ap-size-row {
    display: flex;
    gap: 8px;
  }
  .ap-size-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border-radius: 12px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 40%), var(--bg3);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
    font-family: 'DM Sans', sans-serif;
    color: var(--text2);
    font-size: 0.75rem;
    font-weight: 500;
    box-shadow: 0 12px 28px rgba(8, 9, 4, 0.05);
  }
  .ap-size-btn span:first-child { font-weight: 700; color: var(--text); }
  .ap-size-btn:hover { border-color: rgba(var(--accent-rgb), 0.18); transform: translateY(-1px); }
  .ap-size-btn.active {
    border-color: rgba(var(--accent-rgb), 0.2);
    background: var(--accent-dim);
    color: var(--accent);
  }
  .ap-size-btn.active span:first-child { color: var(--accent); }

  /* ── LAYOUT ── */
  .ap-layout-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .ap-layout-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 10px;
    border-radius: 16px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 40%), var(--bg3);
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    text-align: center;
    width: 100%;
    box-shadow: 0 12px 28px rgba(8, 9, 4, 0.05);
  }
  .ap-layout-btn:hover { border-color: rgba(var(--accent-rgb), 0.18); transform: translateY(-1px); }
  .ap-layout-btn.active {
    border-color: rgba(var(--accent-rgb), 0.2);
    background: var(--accent-dim);
  }
  .ap-layout-preview {
    width: 60px;
    height: 44px;
    background: var(--bg2);
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid var(--border);
  }
  .ap-layout-preview.comfortable { gap: 6px; padding: 8px; }
  .prev-card {
    height: 8px;
    background: var(--border2);
    border-radius: 2px;
  }
  .comfortable .prev-card { height: 10px; }
  .ap-layout-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 2px;
  }
  .ap-layout-sub {
    font-size: 0.72rem;
    color: var(--text3);
    line-height: 1.2;
  }
  .ap-layout-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
  }

  .ap-experience-row + .ap-experience-row {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }

  /* ── PREVIEW ── */
  .ap-preview-box {
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.03), transparent 40%), var(--bg3);
    border-radius: 14px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    box-shadow: 0 14px 32px rgba(8, 9, 4, 0.06);
  }
  .ap-preview-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    width: fit-content;
    letter-spacing: 0.3px;
  }
  .ap-preview-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.35rem;
    color: var(--text);
    line-height: 1.2;
    letter-spacing: -0.3px;
  }
  .ap-preview-text {
    font-size: 0.85rem;
    color: var(--text2);
    line-height: 1.6;
  }
  .ap-preview-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: 10px;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    width: fit-content;
    margin-top: 4px;
    transition: opacity 0.2s;
    text-decoration: none;
  }
  .ap-preview-btn:hover { opacity: 0.85; }

  html[data-fx="none"] .theme-icon-opt,
  html[data-fx="none"] .ap-color-btn,
  html[data-fx="none"] .ap-font-btn,
  html[data-fx="none"] .ap-fx-btn,
  html[data-fx="none"] .ap-size-btn,
  html[data-fx="none"] .ap-layout-btn,
  html[data-fx="none"] .ap-fx-extra,
  html[data-fx="none"] .ap-preview-box {
    background: var(--bg3);
    box-shadow: 0 6px 16px rgba(8, 9, 4, 0.04);
  }

  html[data-fx="none"] .theme-icon-opt.selected,
  html[data-fx="none"] .ap-color-btn.active,
  html[data-fx="none"] .ap-font-btn.active,
  html[data-fx="none"] .ap-fx-btn.active,
  html[data-fx="none"] .ap-size-btn.active,
  html[data-fx="none"] .ap-layout-btn.active {
    background: var(--accent-dim);
  }

  @media (max-width: 900px) {
    .desktop-only-feature { display: none; }
  }
`
