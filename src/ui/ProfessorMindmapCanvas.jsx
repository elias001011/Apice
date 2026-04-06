import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'

function buildNodeLayout(tree) {
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

  const normalizedNodes = useMemo(() => Array.isArray(tree?.nodes) ? tree.nodes : [], [tree])

  useEffect(() => {
    if (!editor) return

    const existingShapeIds = editor.getCurrentPageShapeIds()
    if (existingShapeIds.length > 0) {
      editor.deleteShapes(existingShapeIds)
    }

    shapeIdByNodeRef.current = new Map()
    nodeIdByShapeRef.current = new Map()

    if (normalizedNodes.length === 0) return

    const positions = buildNodeLayout(tree)
    const shapeBatch = []

    normalizedNodes.forEach((node) => {
      const nodeId = String(node.id)
      const shapeId = createShapeId(`mindmap-node-${nodeId}`)
      const pos = positions.get(nodeId) || { x: 0, y: 0 }

      shapeIdByNodeRef.current.set(nodeId, shapeId)
      nodeIdByShapeRef.current.set(shapeId, nodeId)

      shapeBatch.push({
        id: shapeId,
        type: 'geo',
        x: pos.x,
        y: pos.y,
        props: {
          geo: 'rectangle',
          w: 240,
          h: 72,
          text: String(node.label || 'Nó'),
          fill: 'semi',
          color: 'blue',
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
      const parentPos = positions.get(String(node.parentId))
      const childPos = positions.get(String(node.id))
      if (!parentShape || !childShape || !parentPos || !childPos) return

      const arrowId = createShapeId(`mindmap-link-${node.parentId}-${node.id}`)
      shapeBatch.push({
        id: arrowId,
        type: 'arrow',
        x: 0,
        y: 0,
        props: {
          start: { type: 'point', x: parentPos.x + 240, y: parentPos.y + 36 },
          end: { type: 'point', x: childPos.x, y: childPos.y + 36 },
          arrowheadEnd: 'arrow',
          color: 'grey',
        },
      })
    })

    try {
      editor.createShapes(shapeBatch)
      requestAnimationFrame(() => {
        editor.zoomToFit({ animation: { duration: 450 } })
      })
    } catch (err) {
      console.error('Falha ao renderizar mapa no tldraw:', err)
    }
  }, [editor, normalizedNodes, tree])

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
