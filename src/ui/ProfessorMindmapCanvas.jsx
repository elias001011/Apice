import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'

function buildNodeLayout(tree) {
  const nodes = Array.isArray(tree?.nodes) ? tree.nodes : []
  const byParent = new Map()
  const roots = []

  nodes.forEach((node) => {
    const normalized = {
      id: String(node.id),
      label: String(node.label || 'Nó'),
      parentId: node.parentId ? String(node.parentId) : null,
    }

    if (!normalized.parentId) {
      roots.push(normalized)
      return
    }

    const siblings = byParent.get(normalized.parentId) || []
    siblings.push(normalized)
    byParent.set(normalized.parentId, siblings)
  })

  const levels = []
  const queue = roots.map((node) => ({ node, depth: 0 }))

  while (queue.length > 0) {
    const { node, depth } = queue.shift()
    if (!levels[depth]) levels[depth] = []
    levels[depth].push(node)
    const children = byParent.get(node.id) || []
    children.forEach((child) => queue.push({ node: child, depth: depth + 1 }))
  }

  const positions = new Map()
  levels.forEach((levelNodes, depth) => {
    const totalHeight = levelNodes.length * 130
    const startY = -Math.max(totalHeight / 2, 0)

    levelNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: depth * 320,
        y: startY + (index * 130),
      })
    })
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

    editor.createShapes(shapeBatch)
    editor.zoomToFit({ animation: { duration: 300 } })
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
    <div className="prof-mindmap-canvas-wrap" ref={wrapperRef}>
      <Tldraw onMount={setEditor} />

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
