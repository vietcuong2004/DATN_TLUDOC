"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Download, Expand, FileImage, FileText, Minimize2, Minus, Plus, RotateCcw, X } from "lucide-react"

import { cn } from "@/lib/utils"
import type { MindmapNode } from "@/lib/mindmap"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type LayoutNode = MindmapNode & {
  x: number
  y: number
  depth: number
}

type LayoutEdge = {
  id: string
  source: string
  target: string
}

type MindmapViewerProps = {
  root: MindmapNode
  className?: string
  onDownload?: (format: "png" | "jpg" | "pdf") => void
}

type SelectionRect = {
  x: number
  y: number
  width: number
  height: number
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 72
const HORIZONTAL_GAP = 260
const VERTICAL_GAP = 112
const PADDING = 60

function measureSpan(node: MindmapNode): number {
  if (node.children.length === 0) {
    return 1
  }

  return node.children.reduce((total, child) => total + measureSpan(child), 0)
}

function layoutMindmap(root: MindmapNode) {
  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []
  const maxDepth = { value: 0 }
  const totalSpan = measureSpan(root)

  const walk = (node: MindmapNode, depth: number, topIndex: number) => {
    maxDepth.value = Math.max(maxDepth.value, depth)

    const span = measureSpan(node)
    const centerIndex = topIndex + span / 2

    nodes.push({
      ...node,
      x: PADDING + depth * HORIZONTAL_GAP,
      y: PADDING + centerIndex * VERTICAL_GAP - NODE_HEIGHT / 2,
      depth,
    })

    let childTop = topIndex
    for (const child of node.children) {
      const childSpan = measureSpan(child)
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
      })
      walk(child, depth + 1, childTop)
      childTop += childSpan
    }
  }

  walk(root, 0, 0)

  const width = PADDING * 2 + maxDepth.value * HORIZONTAL_GAP + NODE_WIDTH
  const height = PADDING * 2 + totalSpan * VERTICAL_GAP

  return { nodes, edges, width, height }
}

export function MindmapViewer({ root, className, onDownload }: MindmapViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const panStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const selectionStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
  } | null>(null)
  const nodeDragStateRef = useRef<{
    pointerId: number
    nodeIds: string[]
    startX: number
    startY: number
    originPositions: Record<string, { x: number; y: number }>
  } | null>(null)

  const layout = useMemo(() => layoutMindmap(root), [root])

  const getInitialPositions = () => {
    const initialPositions: Record<string, { x: number; y: number }> = {}
    for (const node of layout.nodes) {
      initialPositions[node.id] = { x: node.x, y: node.y }
    }
    return initialPositions
  }

  useEffect(() => {
    setNodePositions(getInitialPositions())
    setSelectedNodeIds([])
    setSelectionRect(null)
    selectionStateRef.current = null
    nodeDragStateRef.current = null
  }, [layout.nodes])

  const handleResetView = () => {
    setZoom(1)
    setNodePositions(getInitialPositions())
    setSelectedNodeIds([])
    setSelectionRect(null)
    setIsPanning(false)
    setIsSelecting(false)
    panStateRef.current = null
    selectionStateRef.current = null
    nodeDragStateRef.current = null

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0
      scrollContainerRef.current.scrollTop = 0
    }
  }

  const positionedNodes = useMemo(
    () =>
      layout.nodes.map((node) => {
        const position = nodePositions[node.id]
        return position
          ? {
              ...node,
              x: position.x,
              y: position.y,
            }
          : node
      }),
    [layout.nodes, nodePositions],
  )

  const rawNodeMap = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node])), [positionedNodes])

  const nodeBounds = useMemo(() => {
    if (positionedNodes.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: layout.width,
        maxY: layout.height,
      }
    }

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const node of positionedNodes) {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + NODE_WIDTH)
      maxY = Math.max(maxY, node.y + NODE_HEIGHT)
    }

    return { minX, minY, maxX, maxY }
  }, [positionedNodes, layout.width, layout.height])

  const canvasWidth = useMemo(
    () => Math.max(layout.width, nodeBounds.maxX - nodeBounds.minX + PADDING * 2),
    [layout.width, nodeBounds],
  )
  const canvasHeight = useMemo(
    () => Math.max(layout.height, nodeBounds.maxY - nodeBounds.minY + PADDING * 2),
    [layout.height, nodeBounds],
  )
  const canvasOffsetX = useMemo(() => PADDING - nodeBounds.minX, [nodeBounds.minX])
  const canvasOffsetY = useMemo(() => PADDING - nodeBounds.minY, [nodeBounds.minY])

  const renderedNodes = useMemo(
    () =>
      positionedNodes.map((node) => ({
        ...node,
        x: node.x + canvasOffsetX,
        y: node.y + canvasOffsetY,
      })),
    [positionedNodes, canvasOffsetX, canvasOffsetY],
  )

  const nodeMap = useMemo(() => new Map(renderedNodes.map((node) => [node.id, node])), [renderedNodes])

  const sourceCount = Math.max(1, new Set(root.sourceRefs).size)

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current)
    }

    document.addEventListener("fullscreenchange", syncFullscreenState)
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === viewerRef.current) {
        await document.exitFullscreen()
        return
      }

      if (viewerRef.current) {
        await viewerRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error("Khong the chuyen doi che do toan man hinh", error)
    }
  }

  const getCanvasPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const content = contentRef.current
    if (!content) {
      return null
    }

    const rect = content.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    }
  }

  const createSelectionRect = (startX: number, startY: number, currentX: number, currentY: number): SelectionRect => ({
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  })

  const intersectsSelection = (rect: SelectionRect, node: LayoutNode) => {
    const nodeLeft = node.x
    const nodeRight = node.x + NODE_WIDTH
    const nodeTop = node.y
    const nodeBottom = node.y + NODE_HEIGHT
    const rectRight = rect.x + rect.width
    const rectBottom = rect.y + rect.height

    return nodeLeft < rectRight && nodeRight > rect.x && nodeTop < rectBottom && nodeBottom > rect.y
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest("button, a, input, textarea, select, [data-no-pan='true'], [data-node-draggable='true']")) {
      return
    }

    if (event.shiftKey) {
      panStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      }
      setIsPanning(true)
    } else {
      const point = getCanvasPoint(event)
      if (!point) {
        return
      }

      selectionStateRef.current = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
      }
      setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 })
      setSelectedNodeIds([])
      setIsSelecting(true)
    }

    container.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current
    const panState = panStateRef.current

    if (container && panState && panState.pointerId === event.pointerId) {
      const deltaX = event.clientX - panState.startX
      const deltaY = event.clientY - panState.startY

      container.scrollLeft = panState.scrollLeft - deltaX
      container.scrollTop = panState.scrollTop - deltaY
      return
    }

    const selectionState = selectionStateRef.current
    if (!selectionState || selectionState.pointerId !== event.pointerId) {
      return
    }

    const point = getCanvasPoint(event)
    if (!point) {
      return
    }

    const rect = createSelectionRect(selectionState.startX, selectionState.startY, point.x, point.y)
    setSelectionRect(rect)

    const selected = renderedNodes
      .filter((node) => intersectsSelection(rect, node))
      .map((node) => node.id)

    setSelectedNodeIds(selected)
  }

  const handlePointerUpOrCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current
    const panState = panStateRef.current

    if (container && panState && panState.pointerId === event.pointerId) {
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId)
      }

      panStateRef.current = null
      setIsPanning(false)
      return
    }

    const selectionState = selectionStateRef.current
    if (!container || !selectionState || selectionState.pointerId !== event.pointerId) {
      return
    }

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId)
    }

    selectionStateRef.current = null
    setSelectionRect(null)
    setIsSelecting(false)
  }

  const handleNodePointerDown = (nodeId: string) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return
    }

    const currentNode = rawNodeMap.get(nodeId)
    if (!currentNode) {
      return
    }

    const activeNodeIds = selectedNodeIds.includes(nodeId) && selectedNodeIds.length > 0 ? selectedNodeIds : [nodeId]
    if (!selectedNodeIds.includes(nodeId) || selectedNodeIds.length <= 1) {
      setSelectedNodeIds([nodeId])
    }

    const originPositions: Record<string, { x: number; y: number }> = {}
    for (const activeNodeId of activeNodeIds) {
      const activeNode = rawNodeMap.get(activeNodeId)
      if (activeNode) {
        originPositions[activeNodeId] = { x: activeNode.x, y: activeNode.y }
      }
    }

    nodeDragStateRef.current = {
      pointerId: event.pointerId,
      nodeIds: activeNodeIds,
      startX: event.clientX,
      startY: event.clientY,
      originPositions,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }

  const handleNodePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = nodeDragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = (event.clientX - dragState.startX) / zoom
    const deltaY = (event.clientY - dragState.startY) / zoom

    setNodePositions((prev) => ({
      ...prev,
      ...Object.fromEntries(
        dragState.nodeIds.map((nodeId) => {
          const origin = dragState.originPositions[nodeId]
          if (!origin) {
            return [nodeId, prev[nodeId] ?? { x: 0, y: 0 }]
          }

          const nextX = origin.x + deltaX
          const nextY = origin.y + deltaY

          return [
            nodeId,
            {
              x: nextX,
              y: nextY,
            },
          ]
        }),
      ),
    }))

    event.stopPropagation()
  }

  const handleNodePointerUpOrCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = nodeDragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    nodeDragStateRef.current = null
    event.stopPropagation()
  }

  return (
    <div
      ref={viewerRef}
      className={cn(
        "relative overflow-hidden bg-white",
        isFullscreen ? "rounded-none border-0 shadow-none" : "rounded-[28px] border border-slate-200 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-xl font-medium tracking-tight text-slate-900">{root.title}</p>
          <p className="mt-1 text-sm text-slate-500">Dựa trên {sourceCount} nguồn</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-slate-600">
          <Button variant="ghost" size="icon" onClick={() => setZoom((current) => Math.max(0.7, +(current - 0.1).toFixed(1)))} aria-label="Thu nhỏ">
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom((current) => Math.min(1.6, +(current + 0.1).toFixed(1)))} aria-label="Phóng to">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetView} aria-label="Đặt lại sơ đồ">
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={toggleFullscreen} aria-label="Toàn màn hình" className="gap-2">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          </Button>

          {onDownload ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                  <Download className="h-4 w-4" />
                  Tải xuống
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" portalContainer={viewerRef.current}>
                <DropdownMenuItem onClick={() => onDownload("pdf")}>
                  <FileText className="h-4 w-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload("jpg")}>
                  <FileImage className="h-4 w-4" />
                  JPG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload("png")}>
                  <FileImage className="h-4 w-4" />
                  PNG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {isFullscreen ? (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-2 border-red-600 bg-red-600 text-white hover:bg-red-700"
              onClick={toggleFullscreen}
              aria-label="Thoat che do toan man hinh"
            >
              <X className="h-5 w-5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className={cn("relative bg-white", isFullscreen ? "h-[calc(100vh-84px)]" : "min-h-[480px]")}>
        <div
          ref={scrollContainerRef}
          className={cn(
            "absolute inset-0 overflow-auto",
            isFullscreen ? "p-0" : "px-4 pb-6 pt-2",
            isPanning ? "cursor-grabbing select-none" : isSelecting ? "cursor-crosshair select-none" : "cursor-crosshair",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
        >
          <div
            className="relative"
            style={{ width: `${canvasWidth * zoom}px`, height: `${canvasHeight * zoom}px` }}
          >
            <div
              ref={contentRef}
              className="relative"
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              {selectionRect ? (
                <div
                  className="pointer-events-none absolute z-30 border-2 border-blue-400 bg-blue-200/20"
                  style={{
                    left: selectionRect.x,
                    top: selectionRect.y,
                    width: selectionRect.width,
                    height: selectionRect.height,
                  }}
                />
              ) : null}

              <svg
                className="pointer-events-none absolute inset-0 z-20"
                width={canvasWidth}
                height={canvasHeight}
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="mindmap-edge" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.45" />
                  </linearGradient>
                </defs>
                {layout.edges.map((edge) => {
                  const source = nodeMap.get(edge.source)
                  const target = nodeMap.get(edge.target)

                  if (!source || !target) {
                    return null
                  }

                  const startX = source.x + NODE_WIDTH
                  const startY = source.y + NODE_HEIGHT / 2
                  const endX = target.x
                  const endY = target.y + NODE_HEIGHT / 2
                  const isSameRow = Math.abs(startY - endY) < 0.5
                  const curveOffset = Math.min(90, Math.max(35, (endX - startX) * 0.35))
                  const pathData = isSameRow
                    ? `M ${startX} ${startY} H ${endX}`
                    : `M ${startX} ${startY} C ${startX + curveOffset} ${startY}, ${endX - curveOffset} ${endY}, ${endX} ${endY}`

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathData}
                        stroke="url(#mindmap-edge)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </g>
                  )
                })}
              </svg>

              {renderedNodes.map((node) => (
                <div
                  key={node.id}
                  data-node-draggable="true"
                  className={cn(
                    "absolute z-10 flex h-[72px] w-[220px] cursor-move items-center rounded-2xl border px-4 py-3 text-left shadow-sm",
                    selectedNodeIds.includes(node.id) ? "ring-2 ring-blue-500 ring-offset-1" : "",
                    node.depth === 0
                      ? "border-violet-200 bg-violet-200 text-slate-900 shadow-violet-100"
                      : node.important
                        ? "border-violet-100 bg-violet-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-800",
                  )}
                  style={{
                    left: node.x,
                    top: node.y,
                  }}
                  onPointerDown={handleNodePointerDown(node.id)}
                  onPointerMove={handleNodePointerMove}
                  onPointerUp={handleNodePointerUpOrCancel}
                  onPointerCancel={handleNodePointerUpOrCancel}
                >
                  <span className="block w-full text-sm font-medium leading-5 text-slate-900">{node.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
