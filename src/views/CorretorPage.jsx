import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { corrigirRedacao, salvarNoHistorico, gerarTemaDinamico } from '../services/aiService.js'
import { clearCorretorDraft, loadCorretorDraft, saveCorretorDraft } from '../services/corretorDraft.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'

export function CorretorPage() {
  const navigate = useNavigate()
  const { beginBusy, endBusy } = useAppBusy()
  const draftBootstrap = loadCorretorDraft()
  // O draft é restaurado no primeiro render para evitar flicker entre reloads.
  // Se você mudar de aba ou voltar depois, a página sobe já no ponto exato onde parou.
  const [hasStarted, setHasStarted] = useState(() => Boolean(draftBootstrap?.hasStarted || draftBootstrap?.tema || draftBootstrap?.redacao || draftBootstrap?.material))
  const [tema, setTema] = useState(() => draftBootstrap?.tema || '')
  const [material, setMaterial] = useState(() => draftBootstrap?.material ?? null)
  const [redacao, setRedacao] = useState(() => draftBootstrap?.redacao || '')
  const [isRigido, setIsRigido] = useState(() => Boolean(draftBootstrap?.isRigido))
  const [temaModo, setTemaModo] = useState(() => {
    if (draftBootstrap?.themeMode) return draftBootstrap.themeMode
    if (draftBootstrap?.material) return 'dynamic'
    if (draftBootstrap?.tema || draftBootstrap?.redacao || draftBootstrap?.hasStarted) return 'manual'
    return 'intro'
  })
  const [loading, setLoading] = useState(false)
  const [generatingTheme, setGeneratingTheme] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [novaRedacaoConfirmOpen, setNovaRedacaoConfirmOpen] = useState(false)
  const themeRequestSeq = useRef(0)
  const correctionRequestSeq = useRef(0)

  // Contador de palavras
  const words = redacao.trim().split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const materialIsObject = Boolean(material && typeof material === 'object' && !Array.isArray(material))
  const materialCards = materialIsObject && Array.isArray(material.cards) ? material.cards : []
  const materialSummary = materialIsObject ? String(material.resumo || '').trim() : ''
  const isDynamicTheme = temaModo === 'dynamic'
  // Se existir qualquer pedaço do conteúdo salvo, o draft continua ativo.
  // Isso evita perder contexto só porque a página recarregou ou trocou de rota.
  const materialFilled = Boolean(materialSummary || materialCards.length > 0 || (typeof material === 'string' && material.trim()))
  const shouldPersistDraft = Boolean(temaModo !== 'intro' || hasStarted || tema.trim() || materialFilled || redacao.trim() || isRigido)
  
  const getCountClass = () => {
    if (wordCount === 0) return 'char-count'
    if (wordCount < 100) return 'char-count warn'
    if (wordCount > 600) return 'char-count warn'
    return 'char-count ok'
  }

  useEffect(() => {
    // Mantém o rascunho salvo localmente para o usuário não perder contexto ao trocar de rota.
    if (!shouldPersistDraft) {
      clearCorretorDraft()
      return
    }

    saveCorretorDraft({
      hasStarted,
      tema,
      material,
      redacao,
      isRigido,
      themeMode: temaModo,
    })
  }, [hasStarted, tema, material, redacao, isRigido, temaModo, shouldPersistDraft])

  const invalidateRequests = () => {
    // Qualquer troca brusca de fluxo invalida requisições pendentes.
    themeRequestSeq.current += 1
    correctionRequestSeq.current += 1
  }

  const handleNovaRedacao = () => {
    // "Nova redação" significa começar do zero mesmo.
    // Então limpamos request pendente, draft salvo e estado visual.
    invalidateRequests()
    clearCorretorDraft()
    setHasStarted(false)
    setTema('')
    setMaterial(null)
    setRedacao('')
    setIsRigido(false)
    setTemaModo('intro')
    setErrorMsg('')
    setLoading(false)
    setGeneratingTheme(false)
  }

  const handleNovaRedacaoRequest = () => {
    setNovaRedacaoConfirmOpen(true)
  }

  const handleManualStart = () => {
    // O modo manual entra sem search e sem tema automático.
    // Você controla o tema na mão e o corretor só acompanha o texto.
    invalidateRequests()
    setHasStarted(true)
    setTemaModo('manual')
    setErrorMsg('')
  }

  const handleGerarTema = async () => {
    // Aqui é o único caminho da UI que dispara search + geração de tema.
    // A IA busca contexto factual antes de montar o material de apoio.
    const requestId = ++themeRequestSeq.current
    beginBusy()
    setGeneratingTheme(true)
    setErrorMsg('')

    try {
      const { tema: novoTema, material: novoMaterial } = await gerarTemaDinamico()
      if (themeRequestSeq.current !== requestId) return
      setTema(novoTema)
      setMaterial(novoMaterial)
      setHasStarted(true)
      setTemaModo('dynamic')
    } catch (err) {
      if (themeRequestSeq.current !== requestId) return
      setErrorMsg(err?.message || 'Não foi possível gerar um tema agora. Tente digitar um manualmente.')
    } finally {
      if (themeRequestSeq.current === requestId) {
        setGeneratingTheme(false)
      }
      endBusy()
    }
  }

  const handleCorrigir = async () => {
    // Correção pura: não busca nada novo.
    // Usa o tema e o material que já estão na tela para avaliar a redação.
    if (wordCount < 15) {
      setErrorMsg('A redação está muito curta para uma análise precisa (mínimo 15 palavras).')
      return
    }

    const requestId = ++correctionRequestSeq.current
    beginBusy()
    setLoading(true)
    setErrorMsg('')

    try {
      const resultado = await corrigirRedacao({ redacao, tema, material, isRigido })
      if (correctionRequestSeq.current !== requestId) return
      salvarNoHistorico(resultado, tema, redacao)
      navigate('/resultado-redacao', { state: { resultado } })
    } catch (err) {
      if (correctionRequestSeq.current !== requestId) return
      setErrorMsg(err.message || 'Erro ao processar a redação. Tente mais tarde.')
    } finally {
      if (correctionRequestSeq.current === requestId) {
        setLoading(false)
      }
      endBusy()
    }
  }

  if (!hasStarted && !tema) {
    return (
      <>
        <style>{corretorCss}</style>
        <div className="view-container--wide">
          <div className="corretor-intro-new anim anim-d1">
          <div className="intro-header">
            <div className="badge-new">Ápice Lab</div>
            <h1 className="intro-title-new">Laboratório de Redação</h1>
            <p className="intro-subtitle-new">Escolha como deseja praticar sua escrita hoje. O tema dinâmico agora usa busca com fontes.</p>
            {errorMsg && <div className="intro-error">{errorMsg}</div>}
          </div>

          <div className="intro-options-grid">
            <button 
              className="intro-card-option anim anim-d2" 
              onClick={handleGerarTema}
              disabled={generatingTheme}
            >
              <div className="option-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div className="option-info">
                <h3>Tema Dinâmico</h3>
                <p>Nossa IA pesquisa fontes reais e gera um tema inédito com material de apoio em cards estilo ENEM.</p>
              </div>
              <div className="option-arrow">
                {generatingTheme ? (
                  <div className="spinner-small" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                )}
              </div>
            </button>

            <button className="intro-card-option anim anim-d3" onClick={handleManualStart}>
              <div className="option-icon-box manual">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div className="option-info">
                <h3>Tema Livre / Próprio</h3>
                <p>Já tem um tema em mente? Cole seu texto e o tema para uma análise instantânea.</p>
              </div>
              <div className="option-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </button>
          </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{corretorCss}</style>
      <div className="view-container--wide">
        <div className={`corretor-container ${isRigido ? 'modo-rigido' : ''}`}>
        {isRigido && (
          <div className="particles-overlay" aria-hidden="true">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="particle" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }} />
            ))}
          </div>
        )}
        <div className="corretor-header anim anim-d1">
          <div className="corretor-header-left">
            <h2 className="corretor-title">Oficina de Escrita</h2>
            <p className="corretor-subtitle">Pronta para a nota máxima no ENEM.</p>
          </div>
          <div className="mode-toggle-pill">
             <button 
               className={`mode-pill-btn ${!isRigido ? 'active' : ''}`} 
               onClick={() => setIsRigido(false)}
             >Padrão</button>
             <button 
               className={`mode-pill-btn ${isRigido ? 'active' : ''}`} 
               onClick={() => setIsRigido(true)}
             >Rígido</button>
          </div>
        </div>

        <div className="corretor-grid">
          {/* Coluna de Input */}
          <div className="corretor-column-main">
            <div className="card anim anim-d2">
              <div className="card-title">Tema Selecionado</div>
              {/* Este input continua editável porque, às vezes, você quer ajustar o tema depois da geração. */}
              <input 
                type="text" 
                className="input-field dynamic-input"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: O impacto da tecnologia na educação..."
              />
              {material && (
                <div className="material-box">
                <div className="material-label">Material de Apoio (ENEM)</div>

                  {materialIsObject ? (
                    <div className="material-rich">
                      {/* O material agora é renderizado em blocos curtos, não em um parágrafo gigante.
                          Isso aproxima mais a tela do formato de prova e facilita editar o layout depois. */}
                      {materialSummary && <div className="material-summary">{materialSummary}</div>}

                      {materialCards.length > 0 && (
                        <div className="material-cards-grid">
                          {materialCards.map((card, index) => (
                            <article className="material-card" key={`${card.titulo || 'card'}-${index}`}>
                              <div className="material-card-title">{card.titulo || `Card ${index + 1}`}</div>
                              <div className="material-card-text">{card.texto || card.trecho || 'Sem texto adicional.'}</div>
                              <div className="material-card-meta">
                                <span>{card.fonte || 'Fonte não informada'}</span>
                                {card.url && (
                                  <a href={card.url} target="_blank" rel="noreferrer">
                                    Abrir fonte
                                  </a>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>

                  ) : (
                    <div className="material-content">{material}</div>
                  )}
                </div>
              )}
            </div>

            <div className="card anim anim-d3">
              <div className="card-title">Seu Texto</div>
              <textarea 
                className="textarea-field main-editor" 
                value={redacao}
                onChange={(e) => setRedacao(e.target.value)}
                placeholder="Desenvolva sua tese aqui..."
              />
              <div className="editor-footer">
                <div className={getCountClass()}>
                  <strong>{wordCount}</strong> palavras
                </div>
                {errorMsg && <div className="inline-error">{errorMsg}</div>}
              </div>
            </div>
          </div>

          {/* Coluna de Guia/Ações */}
          <div className="corretor-column-side">
            <div className="card anim anim-d3 sticky-side">
              <div className="card-title">Status da Análise</div>
              <div className="status-mode">Modo {isDynamicTheme ? 'dinâmico' : 'manual'}</div>
              <div className="status-item">
                <div className={`status-dot ${wordCount > 300 ? 'done' : 'pending'}`}></div>
                <span>Extensão adequada</span>
              </div>
              <div className="status-item">
                <div className={`status-dot ${tema.length > 10 ? 'done' : 'pending'}`}></div>
                <span>Tema definido</span>
              </div>
              <div className="status-item">
                <div className={`status-dot ${materialFilled ? 'done' : 'pending'}`}></div>
                <span>Material rico</span>
              </div>
              
              <div className="side-separator"></div>
              
              <button 
                className="btn-primary main-submit" 
                onClick={handleCorrigir}
                disabled={loading}
              >
                {loading ? 'Analisando...' : 'Finalizar e Corrigir'}
                {!loading && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              </button>

              {isDynamicTheme && (
              <button
                className="btn-ghost-small"
                onClick={handleGerarTema}
                disabled={generatingTheme}
              >
                  {generatingTheme ? 'Gerando...' : 'Trocar tema'}
                </button>
              )}

              <button
                className="btn-primary main-reset-btn"
                onClick={handleNovaRedacaoRequest}
                disabled={loading || generatingTheme}
              >
                {/* Este botão apaga o rascunho atual, então exige confirmação antes de limpar tudo. */}
                Gerar nova redação
              </button>
            </div>

            <div className="card anim anim-d4 criteria-card">
              <div className="card-title">Critérios Avaliados</div>
              <ul className="criteria-list">
                <li><span>C1</span> Gramática e Norma</li>
                <li><span>C2</span> Repertório e Tema</li>
                <li><span>C3</span> Argumentação</li>
                <li><span>C4</span> Coesão</li>
                <li><span>C5</span> Intervenção</li>
              </ul>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={novaRedacaoConfirmOpen}
          title="Começar uma nova redação?"
          message="Isso vai limpar o tema, o material e o texto atual do corretor. A redação já corrigida continua no histórico."
          confirmLabel="Sim, limpar"
          cancelLabel="Continuar escrevendo"
          danger
          onCancel={() => setNovaRedacaoConfirmOpen(false)}
          onConfirm={() => {
            setNovaRedacaoConfirmOpen(false)
            handleNovaRedacao()
          }}
        />
      </div>
      </div>
    </>
  )
}

const corretorCss = `
  .corretor-intro-new {
    margin: 4rem auto;
    padding: 0 1rem;
  }
  .intro-header { text-align: center; margin-bottom: 3rem; }
  .badge-new {
    display: inline-block;
    padding: 4px 12px;
    background: var(--accent-dim2);
    color: var(--accent);
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
  }
  .intro-title-new {
    font-family: 'DM Serif Display', serif;
    font-size: 2.6rem;
    color: var(--text);
    margin-bottom: 0.5rem;
  }
  .intro-subtitle-new {
    font-size: 1.05rem;
    color: var(--text2);
  }

  .intro-error {
    margin-top: 1rem;
    padding: 0.85rem 1rem;
    border-radius: 14px;
    background: rgba(234, 67, 53, 0.08);
    border: 1px solid rgba(234, 67, 53, 0.18);
    color: var(--red);
    font-size: 0.85rem;
    line-height: 1.55;
  }

  .intro-options-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  @media (min-width: 700px) {
    .intro-options-grid { grid-template-columns: 1fr 1fr; }
  }

  .intro-card-option {
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 1.5rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .intro-card-option:hover {
    transform: translateY(-5px);
    border-color: var(--accent);
    box-shadow: 0 15px 40px rgba(0,0,0,0.15);
    background: var(--bg3);
  }
  .option-icon-box {
    width: 52px;
    height: 52px;
    background: var(--accent);
    color: #000;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 16px var(--accent-dim);
  }
  .option-icon-box.manual { background: var(--bg3); color: var(--text); box-shadow: none; border: 1px solid var(--border); }
  
  .option-info h3 { font-family: 'DM Serif Display', serif; font-size: 1.4rem; margin-bottom: 8px; color: var(--text); }
  .option-info p { font-size: 0.95rem; color: var(--text2); line-height: 1.6; }

  .option-arrow {
    margin-top: auto;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text3);
    transition: all 0.2s;
  }
  .intro-card-option:hover .option-arrow { background: var(--accent); color: #000; transform: translateX(5px); }

  /* Corretor Dashboard Area */
  .corretor-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
    padding: 0 4px;
  }
  .corretor-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.7rem;
    color: var(--text);
    margin-bottom: 4px;
  }
  .corretor-subtitle {
    font-size: 0.9rem;
    color: var(--text2);
  }

  .mode-toggle-pill {
    background: var(--bg3);
    padding: 4px;
    border-radius: 99px;
    display: flex;
    gap: 2px;
    border: 1px solid var(--border);
  }
  .mode-pill-btn {
    padding: 6px 16px;
    border-radius: 99px;
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    background: transparent;
    color: var(--text3);
    cursor: pointer;
    transition: all 0.2s;
  }
  .mode-pill-btn.active {
    background: var(--bg2);
    color: var(--accent);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  /* Grid Layout */
  .corretor-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (min-width: 900px) {
    .corretor-grid {
      grid-template-columns: 1.8fr 1fr;
    }
  }

  .dynamic-input {
    background: transparent;
    border: none;
    border-bottom: 2px solid var(--border);
    border-radius: 0;
    padding: 8px 0;
    font-size: 1.2rem;
    font-family: 'DM Serif Display', serif;
    margin-bottom: 12px;
  }
  .dynamic-input:focus {
    border-bottom-color: var(--accent);
  }

  .material-box {
    background: var(--bg3);
    border-radius: var(--radius-sm);
    padding: 1rem;
    margin-top: 1rem;
    border-left: 4px solid var(--accent);
  }
  .material-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }
  .material-content {
    font-size: 0.85rem;
    color: var(--text2);
    line-height: 1.6;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  .material-rich {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .material-summary {
    font-size: 0.9rem;
    color: var(--text);
    line-height: 1.7;
  }

  .material-cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  @media (min-width: 760px) {
    .material-cards-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .material-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 0.95rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .material-card-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .material-card-text {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--text2);
  }

  .material-card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.72rem;
    color: var(--text3);
    flex-wrap: wrap;
  }

  .material-card-meta a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }

  .material-source-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding-top: 0.25rem;
  }

  .material-source-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text3);
    letter-spacing: 0.5px;
  }

  .material-source-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    text-decoration: none;
    color: inherit;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.8rem 0.9rem;
  }

  .material-source-item span {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text);
  }

  .material-source-item small {
    font-size: 0.7rem;
    color: var(--text3);
    word-break: break-all;
  }

  .main-editor {
    min-height: 400px;
    background: transparent;
    border: none;
    padding: 0;
    font-size: 1.05rem;
    line-height: 1.8;
  }
  .main-editor:focus { border: none; }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .char-count { font-size: 0.8rem; color: var(--text3); }
  .char-count.ok { color: var(--accent); }
  .char-count.warn { color: var(--amber); }

  .inline-error { font-size: 0.8rem; color: var(--red); font-weight: 500; }

  .sticky-side {
    position: sticky;
    top: calc(var(--nav-h) + 1.5rem);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    font-size: 0.85rem;
    color: var(--text2);
  }
  .status-mode {
    display: inline-flex;
    margin-bottom: 12px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text3);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border2);
  }
  .status-dot.done { background: var(--accent); box-shadow: 0 0 8px var(--accent-dim2); }

  .side-separator {
    height: 1px;
    background: var(--border);
    margin: 1.5rem 0;
  }

  .main-submit {
    margin-top: 1rem;
    box-shadow: 0 4px 15px var(--accent-dim);
  }

  .main-reset-btn {
    margin-top: 12px;
    background: linear-gradient(135deg, var(--accent-dim), rgba(var(--accent-rgb), 0.18));
    border: 1px solid rgba(var(--accent-rgb), 0.25);
    color: var(--accent);
    box-shadow: none;
  }

  .main-reset-btn:hover {
    background: linear-gradient(135deg, var(--accent-dim2), rgba(var(--accent-rgb), 0.24));
    color: var(--accent);
  }

  .btn-ghost-small {
    background: transparent;
    border: none;
    color: var(--text3);
    font-size: 0.8rem;
    cursor: pointer;
    margin-top: 12px;
    text-decoration: underline;
    width: 100%;
  }

  .criteria-list {
    list-style: none;
    padding: 0;
  }
  .criteria-list li {
    font-size: 0.8rem;
    color: var(--text2);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .criteria-list li span {
    font-weight: 700;
    color: var(--accent);
    width: 20px;
  }

  .intro-card-option:disabled {
    opacity: 0.7;
    cursor: default;
    pointer-events: none;
  }
  .intro-card-option:disabled .option-arrow {
    background: var(--bg2);
  }

  .intro-card-option .option-info {
    max-width: 100%;
  }

  .spinner-small {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .modo-rigido {
    --accent: var(--red);
    --accent-rgb: 255, 82, 82;
  }
  
  .modo-rigido .corretor-title { color: var(--red); }
  .modo-rigido .mode-pill-btn.active { color: var(--red); }
  .modo-rigido .dynamic-input:focus { border-bottom-color: var(--red); }
  .modo-rigido .material-box { border-left-color: var(--red); }
  .modo-rigido .material-label { color: var(--red); }
  .modo-rigido .status-dot.done { background: var(--red); box-shadow: 0 0 8px rgba(255, 82, 82, 0.4); }
  .modo-rigido .main-submit { background: var(--red); box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3); }
  .modo-rigido .criteria-list li span { color: var(--red); }

  .corretor-container { position: relative; }
  
  .particles-overlay {
    position: absolute;
    top: 0;
    left: -20px;
    width: calc(100% + 40px);
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }

  .particle {
    position: absolute;
    top: -20px;
    width: 3px;
    height: 12px;
    background: var(--red, #ff5252);
    opacity: 0.6;
    border-radius: 4px;
    animation: fall linear infinite;
  }

  @keyframes fall {
    0% { transform: translateY(-20px) rotate(15deg); opacity: 0; }
    10% { opacity: 0.8; }
    90% { opacity: 0.8; }
    100% { transform: translateY(110vh) rotate(15deg); opacity: 0; }
  }
`
