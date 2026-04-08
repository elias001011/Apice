import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const MINDMAP_BRANCH_COLORS = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#db2777',
]

const MINDMAP_STAGE_PADDING = 88
const MINDMAP_MIN_STAGE_WIDTH = 920
const MINDMAP_MIN_STAGE_HEIGHT = 560

function normalizeMindmapLabel(value, fallback = 'Mapa central') {
  return String(value || fallback).trim() || fallback
}

function slugifyFileName(value) {
  return String(value || 'mapa-mental')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'mapa-mental'
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || '').replace('#', '')
  if (normalized.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`
  }

  const int = Number.parseInt(normalized, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getMindmapChildNodes(node) {
  const collections = [
    node?.children,
    node?.topicos,
    node?.topics,
    node?.branches,
    node?.ramificacoes,
    node?.subtopics,
  ]
  return collections.find(Array.isArray) || []
}

function walkMindmapNodes(sourceNodes, parentId = null, output = []) {
  if (!Array.isArray(sourceNodes)) return output

  sourceNodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') return

    const label = normalizeMindmapLabel(
      node.label
      || node.text
      || node.titulo
      || node.title
      || node.topico
      || node.topic
      || 'No',
      'No',
    )

    const safeKey = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const id = String(
      node.id
      || `${parentId || 'node'}-${index}-${safeKey || 'item'}-${output.length}`,
    )

    output.push({ id, label, parentId: parentId ? String(parentId) : null })

    const childNodes = getMindmapChildNodes(node)
    if (childNodes.length > 0) {
      walkMindmapNodes(childNodes, id, output)
    }
  })

  return output
}

function pickMindmapNodeSize(depth) {
  if (depth === 0) return { w: 360, h: 120 }
  if (depth === 1) return { w: 260, h: 82 }
  if (depth === 2) return { w: 220, h: 68 }
  return { w: 192, h: 58 }
}

function measureMindmapBounds(layout) {
  const nodes = Array.isArray(layout?.nodes) ? layout.nodes : []
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  nodes.forEach((node) => {
    const pos = layout.positions.get(node.id)
    if (!pos) return

    const width = pos.width || 0
    const height = pos.height || 0
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + width)
    maxY = Math.max(maxY, pos.y + height)
  })

  if (!Number.isFinite(minX)) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function buildConnectorPath(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  const offset = Math.min(130, Math.max(34, distance * 0.18))
  const controlX = midX - ((dy / distance) * offset)
  const controlY = midY + ((dx / distance) * offset)
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
}

function buildRadialMindmapLayout(tree) {
  const rawNodes = Array.isArray(tree?.nodes) ? walkMindmapNodes(tree.nodes) : []
  const collectedNodes = rawNodes.length > 0 ? rawNodes : walkMindmapNodes(getMindmapChildNodes(tree))

  const title = normalizeMindmapLabel(
    tree?.titulo
    || tree?.title
    || tree?.topicoCentral
    || tree?.label
    || collectedNodes[0]?.label,
    'Mapa central',
  )

  if (collectedNodes.length === 0) {
    return {
      title,
      nodes: [],
      positions: new Map(),
      metaById: new Map(),
      rootId: null,
      bounds: measureMindmapBounds({ nodes: [], positions: new Map(), metaById: new Map() }),
    }
  }

  let nodes = collectedNodes.map((node) => ({ ...node }))
  let nodeIds = new Set(nodes.map((node) => node.id))
  let roots = nodes.filter((node) => !node.parentId || !nodeIds.has(node.parentId))
  let rootId = roots[0]?.id || `root-${slugifyFileName(title)}`

  if (roots.length === 0) {
    nodes = [
      { id: rootId, label: title, parentId: null },
      ...nodes.map((node) => ({ ...node, parentId: rootId })),
    ]
  } else {
    nodes = nodes.map((node) => {
      if (node.id === rootId) {
        return { ...node, label: title, parentId: null }
      }

      if (!node.parentId || !nodeIds.has(node.parentId)) {
        return { ...node, parentId: rootId }
      }

      return node
    })

    nodes = nodes.map((node) => (node.id === rootId ? { ...node, label: title, parentId: null } : node))
  }

  nodeIds = new Set(nodes.map((node) => node.id))
  roots = nodes.filter((node) => !node.parentId || !nodeIds.has(node.parentId))
  if (!roots.some((node) => node.id === rootId)) {
    rootId = roots[0]?.id || rootId
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const childrenByParent = new Map()
  nodes.forEach((node) => {
    if (!node.parentId) return
    const siblings = childrenByParent.get(node.parentId) || []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  })

  const leafWeightCache = new Map()
  const getLeafWeight = (id, seen = new Set()) => {
    if (leafWeightCache.has(id)) return leafWeightCache.get(id)
    if (seen.has(id)) return 1

    const nextSeen = new Set(seen)
    nextSeen.add(id)

    const children = childrenByParent.get(id) || []
    if (children.length === 0) {
      leafWeightCache.set(id, 1)
      return 1
    }

    const weight = children.reduce((sum, child) => sum + getLeafWeight(child.id, nextSeen), 0) || 1
    leafWeightCache.set(id, weight)
    return weight
  }

  const positions = new Map()
  const metaById = new Map()
  const orderedNodes = []
  const baseRadius = 286
  const radiusStep = 168
  const sectorStart = -Math.PI / 2
  const sectorEnd = sectorStart + (Math.PI * 2)

  const layoutNode = (id, depth, startAngle, endAngle, branchColor, siblingIndex) => {
    const node = nodeMap.get(id)
    if (!node) return

    const children = childrenByParent.get(id) || []
    const size = pickMindmapNodeSize(depth)
    const angle = depth === 0 ? -Math.PI / 2 : (startAngle + endAngle) / 2
    const radius = depth === 0 ? 0 : baseRadius + ((depth - 1) * radiusStep)
    const centerX = Math.cos(angle) * radius
    const centerY = Math.sin(angle) * radius

    positions.set(id, {
      x: centerX - (size.w / 2),
      y: centerY - (size.h / 2),
      centerX,
      centerY,
      width: size.w,
      height: size.h,
    })

    metaById.set(id, {
      depth,
      branchColor,
      siblingIndex,
      size,
    })
    orderedNodes.push(node)

    if (children.length === 0) return

    const totalWeight = children.reduce((sum, child) => sum + getLeafWeight(child.id), 0) || children.length
    let currentAngle = startAngle

    children.forEach((child, index) => {
      const weight = getLeafWeight(child.id)
      const span = (endAngle - startAngle) * (weight / totalWeight)
      const padding = Math.min(0.18, Math.max(0.05, span * 0.12))
      const childStart = currentAngle + padding
      const childEnd = currentAngle + span - padding
      const nextBranchColor = depth === 0
        ? MINDMAP_BRANCH_COLORS[index % MINDMAP_BRANCH_COLORS.length]
        : branchColor

      layoutNode(child.id, depth + 1, childStart, childEnd, nextBranchColor, index)
      currentAngle += span
    })
  }

  layoutNode(rootId, 0, sectorStart, sectorEnd, MINDMAP_BRANCH_COLORS[0], 0)

  return {
    title,
    nodes: orderedNodes,
    positions,
    metaById,
    rootId,
    bounds: measureMindmapBounds({ nodes: orderedNodes, positions, metaById }),
  }
}

function getNodeBadge(depth) {
  if (depth === 0) return 'Tema central'
  if (depth === 1) return 'Topico'
  return 'Subtopico'
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })
}

export function ProfessorMindmapCanvas({ tree }) {
  const paperRef = useRef(null)
  const generationTokenRef = useRef(0)
  const [isPreparingPdf, setIsPreparingPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfError, setPdfError] = useState('')

  const layout = useMemo(() => buildRadialMindmapLayout(tree), [tree])
  const normalizedNodes = layout.nodes
  const fileName = useMemo(() => `${slugifyFileName(layout.title)}.pdf`, [layout.title])

  const stageDimensions = useMemo(() => {
    const width = Math.max(
      MINDMAP_MIN_STAGE_WIDTH,
      Math.ceil(layout.bounds.width + (MINDMAP_STAGE_PADDING * 2)) + 1,
    )
    const height = Math.max(
      MINDMAP_MIN_STAGE_HEIGHT,
      Math.ceil(layout.bounds.height + (MINDMAP_STAGE_PADDING * 2)) + 1,
    )

    return {
      width,
      height,
      offsetX: MINDMAP_STAGE_PADDING - layout.bounds.minX,
      offsetY: MINDMAP_STAGE_PADDING - layout.bounds.minY,
    }
  }, [layout.bounds])

  const renderedNodes = useMemo(() => {
    return normalizedNodes.map((node) => {
      const pos = layout.positions.get(node.id)
      const meta = layout.metaById.get(node.id)
      if (!pos || !meta) return null

      const left = pos.x + stageDimensions.offsetX
      const top = pos.y + stageDimensions.offsetY

      return {
        id: node.id,
        label: node.label,
        depth: meta.depth,
        branchColor: meta.branchColor,
        left,
        top,
        width: meta.size.w,
        height: meta.size.h,
      }
    }).filter(Boolean)
  }, [layout.metaById, layout.positions, normalizedNodes, stageDimensions.offsetX, stageDimensions.offsetY])

  const renderedLinks = useMemo(() => {
    return normalizedNodes
      .filter((node) => node.parentId)
      .map((node) => {
        const parentPos = layout.positions.get(String(node.parentId))
        const childPos = layout.positions.get(String(node.id))
        const childMeta = layout.metaById.get(String(node.id))
        if (!parentPos || !childPos || !childMeta) return null

        const from = {
          x: parentPos.centerX + stageDimensions.offsetX,
          y: parentPos.centerY + stageDimensions.offsetY,
        }
        const to = {
          x: childPos.centerX + stageDimensions.offsetX,
          y: childPos.centerY + stageDimensions.offsetY,
        }

        return {
          id: `${node.parentId}-${node.id}`,
          d: buildConnectorPath(from, to),
          color: childMeta.branchColor,
          width: childMeta.depth === 1 ? 4 : 3,
          opacity: childMeta.depth === 1 ? 0.24 : 0.18,
        }
      })
      .filter(Boolean)
  }, [layout.metaById, layout.positions, normalizedNodes, stageDimensions.offsetX, stageDimensions.offsetY])

  const clearPdfUrl = useCallback(() => {
    setPdfUrl('')
  }, [])

  const generatePdf = useCallback(async () => {
    const generationToken = generationTokenRef.current + 1
    generationTokenRef.current = generationToken

    if (!normalizedNodes.length) {
      clearPdfUrl()
      setPdfError('')
      setIsPreparingPdf(false)
      return null
    }

    if (!paperRef.current) return null

    setIsPreparingPdf(true)
    setPdfError('')

    try {
      await waitForNextPaint()

      if (document.fonts?.ready) {
        try {
          await document.fonts.ready
        } catch {
          // Ignored on purpose.
        }
      }

      const dataUrl = await toPng(paperRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f6f0e6',
      })

      const image = new Image()
      image.src = dataUrl
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
      })

      const pdf = new jsPDF({
        orientation: image.width >= image.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true,
      })

      pdf.setProperties({
        title: layout.title,
        subject: 'Mapa mental gerado pela IA',
        author: 'Apice',
      })

      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pageW / image.width, pageH / image.height)
      const outW = image.width * ratio
      const outH = image.height * ratio
      const x = (pageW - outW) / 2
      const y = (pageH - outH) / 2

      pdf.addImage(dataUrl, 'PNG', x, y, outW, outH)

      const blob = pdf.output('blob')
      const nextUrl = URL.createObjectURL(blob)

      if (generationTokenRef.current !== generationToken) {
        URL.revokeObjectURL(nextUrl)
        return null
      }

      setPdfUrl(nextUrl)
      return nextUrl
    } catch (error) {
      console.error('Falha ao gerar PDF do mapa mental:', error)
      clearPdfUrl()
      setPdfError('Nao foi possivel gerar o PDF agora.')
      return null
    } finally {
      if (generationTokenRef.current === generationToken) {
        setIsPreparingPdf(false)
      }
    }
  }, [clearPdfUrl, layout.title, normalizedNodes])

  useEffect(() => {
    void generatePdf()
  }, [generatePdf])

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
  }, [pdfUrl])

  const handleDownloadPdf = useCallback(() => {
    if (!pdfUrl) return

    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }, [fileName, pdfUrl])

  const handleViewPdf = useCallback(() => {
    if (!pdfUrl) return
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
  }, [pdfUrl])

  if (normalizedNodes.length === 0) {
    return (
      <div className="prof-mindmap-canvas-wrap">
        <div className="prof-mindmap-toolbar">
          <div className="prof-mindmap-toolbar-copy">
            <span className="prof-mindmap-toolbar-title">Mapa mental</span>
            <span className="prof-mindmap-toolbar-subtitle">
              Aguardando a IA gerar os topicos do mapa.
            </span>
          </div>
        </div>
        <div className="prof-mindmap-preview-shell">
          <div className="prof-mindmap-empty">
            <p>Nenhum mapa mental foi gerado ainda.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="prof-mindmap-canvas-wrap">
      <div className="prof-mindmap-toolbar">
        <div className="prof-mindmap-toolbar-copy">
          <span className="prof-mindmap-toolbar-title">Mapa mental escolar</span>
          <span className="prof-mindmap-toolbar-subtitle">
            O PDF e a visualizacao sao gerados automaticamente assim que o mapa fica pronto.
          </span>
        </div>

        <div className="prof-mindmap-toolbar-actions">
          <span className={`prof-mindmap-toolbar-status ${isPreparingPdf ? 'is-loading' : 'is-ready'}`}>
            {isPreparingPdf ? 'Gerando PDF' : 'PDF pronto'}
          </span>
          <button
            type="button"
            className="prof-mindmap-action prof-mindmap-action--ghost"
            onClick={handleViewPdf}
            disabled={!pdfUrl || isPreparingPdf}
          >
            Visualizar PDF
          </button>
          <button
            type="button"
            className="prof-mindmap-action"
            onClick={handleDownloadPdf}
            disabled={!pdfUrl || isPreparingPdf}
          >
            Baixar PDF
          </button>
        </div>
      </div>

      {pdfError && (
        <div className="prof-mindmap-error">
          <span>{pdfError}</span>
          <button
            type="button"
            className="prof-mindmap-error-action"
            onClick={() => {
              void generatePdf()
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="prof-mindmap-preview-shell">
        <div
          ref={paperRef}
          className="prof-mindmap-preview-paper"
          style={{ width: `${stageDimensions.width}px` }}
        >
          <div className="prof-mindmap-preview-header">
            <div className="prof-mindmap-preview-copy">
              <span className="prof-mindmap-preview-kicker">Mapa mental pronto</span>
              <h3 className="prof-mindmap-preview-title">{layout.title}</h3>
              <p className="prof-mindmap-preview-note">
                {normalizedNodes.length} nos organizados em torno do tema central.
              </p>
            </div>

            <div className="prof-mindmap-preview-badge">
              <span>Gerado pela IA</span>
            </div>
          </div>

          <div
            className="prof-mindmap-stage"
            style={{
              width: `${stageDimensions.width}px`,
              height: `${stageDimensions.height}px`,
            }}
          >
            <svg
              className="prof-mindmap-links"
              viewBox={`0 0 ${stageDimensions.width} ${stageDimensions.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {renderedLinks.map((link) => (
                <path
                  key={link.id}
                  d={link.d}
                  fill="none"
                  stroke={link.color}
                  strokeWidth={link.width}
                  strokeOpacity={link.opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>

            <div className="prof-mindmap-rings" aria-hidden="true">
              <span className="prof-mindmap-rings__ring" />
              <span className="prof-mindmap-rings__ring prof-mindmap-rings__ring--outer" />
            </div>

            {renderedNodes.map((node) => {
              const isRoot = node.depth === 0
              const badge = getNodeBadge(node.depth)
              const nodeStyle = isRoot
                ? {
                    left: `${node.left}px`,
                    top: `${node.top}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }
                : {
                    left: `${node.left}px`,
                    top: `${node.top}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                    borderColor: node.branchColor,
                    boxShadow: `0 16px 34px ${hexToRgba(node.branchColor, 0.16)}`,
                  }

              return (
                <article
                  key={node.id}
                  className={`prof-mindmap-node ${isRoot ? 'is-root' : `is-level-${Math.min(node.depth, 3)}`}`}
                  style={{
                    ...nodeStyle,
                    '--mindmap-color': node.branchColor,
                  }}
                >
                  <span className="prof-mindmap-node-badge">{badge}</span>
                  <span className="prof-mindmap-node-label">{node.label}</span>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
