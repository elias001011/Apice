import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { corrigirRedacao, salvarNoHistorico, gerarTemaDinamico } from '../services/aiService.js'
import { clearCorretorDraft, loadCorretorDraft, saveCorretorDraft } from '../services/corretorDraft.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { useUpgradeModal } from '../ui/UpgradeModal.jsx'
import '../styles/corretor.css'
import {
  isQuotaBlocked,
  shouldShowSoftUpgradeTrigger,
  UPGRADE_REASONS,
} from '../services/upgradeTrigger.js'

function createRigidParticles(count = 18) {
  const createdAt = Date.now()

  return Array.from({ length: count }, (_, index) => {
    const size = 1.3 + Math.random() * 2
    const left = Math.random() * 100
    const drift = (Math.random() * 2 - 1) * 24
    const duration = 2.8 + Math.random() * 1.8
    const delay = Math.random() * 1.4
    const opacity = 0.35 + Math.random() * 0.5
    const top = -10 - Math.random() * 30

    return {
      id: `${createdAt}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      style: {
        '--particle-left': `${left}%`,
        '--particle-size': `${size}px`,
        '--particle-drift': `${drift}px`,
        '--particle-duration': `${duration}s`,
        '--particle-delay': `${delay}s`,
        '--particle-opacity': opacity.toFixed(2),
        '--particle-top': `${top}px`,
      },
    }
  })
}

export function CorretorPage() {
  const navigate = useNavigate()
  const { beginBusy, endBusy } = useAppBusy()
  const { openUpgradeModal } = useUpgradeModal()
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
  const [rigidParticles, setRigidParticles] = useState([])
  const themeRequestSeq = useRef(0)
  const correctionRequestSeq = useRef(0)
  const rigidBurstTimerRef = useRef(null)
  const previousRigidoRef = useRef(Boolean(draftBootstrap?.isRigido))

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

  useEffect(() => {
    const wasRigido = previousRigidoRef.current
    previousRigidoRef.current = isRigido

    if (!isRigido) {
      setRigidParticles((current) => (current.length ? [] : current))
      if (rigidBurstTimerRef.current) {
        window.clearTimeout(rigidBurstTimerRef.current)
        rigidBurstTimerRef.current = null
      }
      return
    }

    if (wasRigido) return

    setRigidParticles(createRigidParticles(42))
    if (rigidBurstTimerRef.current) {
      window.clearTimeout(rigidBurstTimerRef.current)
    }
    rigidBurstTimerRef.current = window.setTimeout(() => {
      setRigidParticles([])
      rigidBurstTimerRef.current = null
    }, 5200)
  }, [isRigido])

  useEffect(() => () => {
    if (rigidBurstTimerRef.current) {
      window.clearTimeout(rigidBurstTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement

    if (isRigido) {
      html.setAttribute('data-rigid-mode', 'on')
    } else {
      html.removeAttribute('data-rigid-mode')
    }

    return () => {
      html.removeAttribute('data-rigid-mode')
    }
  }, [isRigido])

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
    // Verifica cota antes de processar (Gatilho 1)
    if (isQuotaBlocked()) {
      openUpgradeModal({ reason: UPGRADE_REASONS.QUOTA_BLOCKED })
      return
    }

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
    // Gatilho 1: cota esgotada → modal de upgrade (bloqueante)
    if (isQuotaBlocked()) {
      openUpgradeModal({ reason: UPGRADE_REASONS.QUOTA_BLOCKED })
      return
    }

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
      const savedHistoryEntry = salvarNoHistorico(resultado, tema, redacao)
      const historyId = savedHistoryEntry?.id ? String(savedHistoryEntry.id) : ''

      // Gatilho 2: convite suave após X correções no dia (não bloqueante)
      if (shouldShowSoftUpgradeTrigger('essayCorrection')) {
        openUpgradeModal({ reason: UPGRADE_REASONS.SOFT_INVITE })
      }

      navigate(
        historyId ? `/resultado-redacao?id=${encodeURIComponent(historyId)}` : '/resultado-redacao',
        {
          state: {
            resultado,
            historyId,
          },
        },
      )
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
    )
  }

    return (
      <div className="view-container--wide">
        <div className={`corretor-container ${isRigido ? 'modo-rigido' : ''}`}>
          {rigidParticles.length > 0 && (
            <div className="corretor-rigid-particles" aria-hidden="true">
              {rigidParticles.map((particle) => (
                <span
                  key={particle.id}
                  className="corretor-rigid-particle"
                  style={particle.style}
                />
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

        <div className="dashboard-grid">
          {/* Coluna de Input */}
          <div className="dashboard-column-main">
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
          <div className="dashboard-column-side">
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
  )
}
