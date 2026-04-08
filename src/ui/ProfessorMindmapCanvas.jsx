import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'

function _buildNodeLayoutLegacy(tree) {
  const nodes = Array.isArray(tree?.nodes) ? tree.nodes : []
  if (nodes.length === 0) return new Map()

  const byParent = new Map()
  const roots = []
  const nodeMap = new Map()

  nodes.forEach((node) => {
    const normalized = {
      id: String(node.id),
      label: String(node.label || 'Nó'),
      parentId: node.parentId ? String(node.parentId) : null,
    }
    nodeMap.set(normalized.id, normalized)

    if (!normalized.parentId) {
      roots.push(normalized)
    } else {
      const siblings = byParent.get(normalized.parentId) || []
      siblings.push(normalized)
      byParent.set(normalized.parentId, siblings)
    }
  })

  const positions = new Map()
  const HORIZONTAL_SPACING = 350
  const VERTICAL_SPACING = 150

  // Cálculo de altura total de cada subárvore para centralizar pais — com proteção contra loops
  const subTreeHeight = new Map()
  const calculateHeight = (id, depth = 0) => {
    if (depth > 25) return VERTICAL_SPACING // Proteção contra recursão infinita
    const children = byParent.get(id) || []
    if (children.length === 0) {
      subTreeHeight.set(id, VERTICAL_SPACING)
      return VERTICAL_SPACING
    }
    const h = children.reduce((acc, child) => acc + calculateHeight(child.id, depth + 1), 0)
    subTreeHeight.set(id, h)
    return h
  }

  roots.forEach(r => calculateHeight(r.id))

  const layout = (id, x, startY) => {
    const h = subTreeHeight.get(id)
    positions.set(id, { x, y: startY + h / 2 - 36 }) // -36 para compensar metade da altura do nó

    const children = byParent.get(id) || []
    let currentY = startY
    children.forEach(child => {
      layout(child.id, x + HORIZONTAL_SPACING, currentY)
      currentY += subTreeHeight.get(child.id)
    })
  }

  let globalY = 0
  roots.forEach(r => {
    layout(r.id, 0, globalY)
    globalY += subTreeHeight.get(r.id) + VERTICAL_SPACING
  })

  return positions
}

const MINDMAP_BRANCH_COLORS = ['blue', 'green', 'orange', 'violet', 'red', 'light-blue', 'light-green', 'light-violet', 'light-red', 'yellow']

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

    const id = String(node.id || `${parentId || 'node'}-${index}-${Date.now()}`)
    const label = String(node.label || node.text || node.titulo || node.title || node.topico || node.topic || 'Nó').trim() || 'Nó'
    output.push({ id, label, parentId: parentId ? String(parentId) : null })

    const childNodes = getMindmapChildNodes(node)
    if (childNodes.length > 0) {
      walkMindmapNodes(childNodes, id, output)
    }
  })

  return output
}

function pickMindmapNodeSize(depth) {
  if (depth === 0) return { w: 340, h: 108 }
  if (depth === 1) return { w: 250, h: 76 }
  if (depth === 2) return { w: 214, h: 66 }
  return { w: 190, h: 58 }
}

function buildRadialMindmapLayout(tree) {
  const rawNodes = Array.isArray(tree?.nodes) ? walkMindmapNodes(tree.nodes) : []
  const collectedNodes = rawNodes.length > 0 ? rawNodes : walkMindmapNodes(getMindmapChildNodes(tree))
  if (collectedNodes.length === 0) {
    return {
      nodes: [],
      positions: new Map(),
      metaById: new Map(),
      rootId: null,
    }
  }

  const title = String(
    tree?.titulo
    || tree?.title
    || tree?.topicoCentral
    || tree?.label
    || collectedNodes[0]?.label
    || 'Mapa central',
  ).trim() || 'Mapa central'

  let nodes = collectedNodes.map((node) => ({ ...node }))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const roots = nodes.filter((node) => !node.parentId || !nodeIds.has(node.parentId))
  const rootId = roots[0]?.id || `root-${Date.now()}`

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

    const weight = children.reduce((sum, child) => sum + getLeafWeight(child.id, nextSeen), 0)
    leafWeightCache.set(id, weight)
    return weight
  }

  const positions = new Map()
  const metaById = new Map()
  const orderedNodes = []
  const baseRadius = 290
  const radiusStep = 180
  const sectorStart = -Math.PI / 2
  const sectorEnd = sectorStart + Math.PI * 2

  const layoutNode = (id, depth, startAngle, endAngle, branchColor = MINDMAP_BRANCH_COLORS[0], siblingIndex = 0) => {
    const node = nodes.find((item) => item.id === id)
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
      color: depth === 0 ? 'yellow' : branchColor,
      size,
    })
    orderedNodes.push(node)

    if (children.length === 0) return

    const totalWeight = children.reduce((sum, child) => sum + getLeafWeight(child.id), 0) || children.length
    let currentAngle = startAngle

    children.forEach((child, index) => {
      const weight = getLeafWeight(child.id)
      const span = (endAngle - startAngle) * (weight / totalWeight)
      const padding = Math.min(0.16, span * 0.12)
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
    nodes: orderedNodes,
    positions,
    metaById,
    rootId,
  }
}

export function ProfessorMindmapCanvas({
  tree,
  onExpandNode,
  isExpanding = false,
}) {
  const [editor, setEditor] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const wrapperRef = useRef(null)
  const shapeIdByNodeRef = useRef(new Map())
  const nodeIdByShapeRef = useRef(new Map())

  const layout = useMemo(() => buildRadialMindmapLayout(tree), [tree])
  const normalizedNodes = layout.nodes

  useEffect(() => {
    if (!editor) return

    const existingShapeIds = editor.getCurrentPageShapeIds()
    if (existingShapeIds.length > 0) {
      editor.deleteShapes(existingShapeIds)
    }

    shapeIdByNodeRef.current = new Map()
    nodeIdByShapeRef.current = new Map()

    if (normalizedNodes.length === 0) return

    const shapeIds = []
    const shapeBatch = []

    normalizedNodes.forEach((node) => {
      const nodeId = String(node.id)
      const shapeId = createShapeId(`mindmap-node-${nodeId}`)
      const pos = layout.positions.get(nodeId) || { x: 0, y: 0 }
      const meta = layout.metaById.get(nodeId) || { depth: 1, branchColor: 'blue', size: { w: 240, h: 72 } }

      shapeIdByNodeRef.current.set(nodeId, shapeId)
      nodeIdByShapeRef.current.set(shapeId, nodeId)
      shapeIds.push(shapeId)

      shapeBatch.push({
        id: shapeId,
        type: 'geo',
        x: pos.x,
        y: pos.y,
        props: {
          geo: meta.depth === 0 ? 'ellipse' : 'rectangle',
          w: meta.size.w,
          h: meta.size.h,
          text: String(node.label || 'Nó'),
          fill: meta.depth === 0 ? 'solid' : 'semi',
          color: meta.color,
          labelColor: 'black',
          size: 'm',
          align: 'middle',
          verticalAlign: 'middle',
        },
      })
    })

    normalizedNodes.forEach((node) => {
      if (!node.parentId) return
      const parentShape = shapeIdByNodeRef.current.get(String(node.parentId))
      const childShape = shapeIdByNodeRef.current.get(String(node.id))
      const parentPos = layout.positions.get(String(node.parentId))
      const childPos = layout.positions.get(String(node.id))
      const childMeta = layout.metaById.get(String(node.id))
      if (!parentShape || !childShape || !parentPos || !childPos) return

      const arrowId = createShapeId(`mindmap-link-${node.parentId}-${node.id}`)
      shapeIds.push(arrowId)
      shapeBatch.push({
        id: arrowId,
        type: 'arrow',
        x: 0,
        y: 0,
        props: {
          start: { type: 'point', x: parentPos.centerX, y: parentPos.centerY },
          end: { type: 'point', x: childPos.centerX, y: childPos.centerY },
          arrowheadEnd: 'arrow',
          color: childMeta?.branchColor || 'grey',
        },
      })
    })

    try {
      editor.createShapes(shapeBatch)
      const frameId = requestAnimationFrame(() => {
        const bounds = editor.getShapesPageBounds(shapeIds)
        if (bounds) {
          editor.zoomToBounds(bounds, { inset: 160, animation: { duration: 450 } })
        } else {
          editor.zoomToFit({ animation: { duration: 450 } })
        }
      })
      return () => window.cancelAnimationFrame(frameId)
    } catch (err) {
      console.error('Falha ao renderizar mapa no tldraw:', err)
    }
  }, [editor, layout, normalizedNodes])

  const getSelectedNodeId = useCallback(() => {
    if (!editor) return null
    const selectedShape = editor.getOnlySelectedShape()
    if (!selectedShape) return null
    return nodeIdByShapeRef.current.get(selectedShape.id) || null
  }, [editor])

  const handleExpandSelected = useCallback(async () => {
    const selectedNodeId = getSelectedNodeId()
    if (!selectedNodeId) {
      window.alert('Selecione um nó para expandir com IA.')
      return
    }
    await onExpandNode(selectedNodeId)
  }, [getSelectedNodeId, onExpandNode])

  const exportPng = useCallback(async () => {
    if (!wrapperRef.current) return
    setIsExporting(true)
    try {
      const dataUrl = await toPng(wrapperRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `mapa-mental-${Date.now()}.png`
      link.click()
    } catch (error) {
      console.error('Falha ao exportar PNG:', error)
      window.alert('Não foi possível exportar o mapa em PNG.')
    } finally {
      setIsExporting(false)
    }
  }, [])

  const exportPdf = useCallback(async () => {
    if (!wrapperRef.current) return
    setIsExporting(true)
    try {
      const dataUrl = await toPng(wrapperRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      })
      const image = new Image()
      image.src = dataUrl
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
      })

      const landscape = image.width >= image.height
      const pdf = new jsPDF({
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'a4',
      })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pageW / image.width, pageH / image.height)
      const outW = image.width * ratio
      const outH = image.height * ratio
      const x = (pageW - outW) / 2
      const y = (pageH - outH) / 2
      pdf.addImage(dataUrl, 'PNG', x, y, outW, outH)
      pdf.save(`mapa-mental-${Date.now()}.pdf`)
    } catch (error) {
      console.error('Falha ao exportar PDF:', error)
      window.alert('Não foi possível exportar o mapa em PDF.')
    } finally {
      setIsExporting(false)
    }
  }, [])

  return (
    <div className="prof-mindmap-canvas-wrap">
      <div className="prof-tldraw-container" ref={wrapperRef}>
        <Tldraw onMount={setEditor} hideUi={true} />
      </div>

      <div className="prof-mindmap-floating-menu">
        <button
          type="button"
          className="prof-mindmap-action"
          onClick={handleExpandSelected}
          disabled={isExpanding || normalizedNodes.length === 0}
        >
          {isExpanding ? 'Expandindo...' : 'Expandir nó com IA'}
        </button>
        <button
          type="button"
          className="prof-mindmap-action"
          onClick={exportPng}
          disabled={isExporting || normalizedNodes.length === 0}
        >
          Exportar PNG
        </button>
        <button
          type="button"
          className="prof-mindmap-action"
          onClick={exportPdf}
          disabled={isExporting || normalizedNodes.length === 0}
        >
          Exportar PDF
        </button>
      </div>
    </div>
  )
}
