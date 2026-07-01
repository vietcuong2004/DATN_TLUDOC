"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Download, Expand, FileImage, FileText, Minimize2, Minus, Plus, RotateCcw, X, Edit2, Save } from "lucide-react"

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

type OnDownloadData = {
  format: "png" | "jpg" | "pdf"
  nodes: Array<MindmapNode & { x: number; y: number; depth: number }>
  edges: Array<{ id: string; source: string; target: string }>
  width: number
  height: number
}

type MindmapViewerProps = {
  root: MindmapNode
  className?: string
  onDownload?: (data: OnDownloadData) => void
  onSave?: (nextMindmap: MindmapNode) => Promise<void> | void
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

type ValidateResult = {
  isValid: boolean
  errors: string[]
}

function updateNodeTitle(node: MindmapNode, nodeId: string, newTitle: string): MindmapNode {
  if (node.id === nodeId) {
    return { ...node, title: newTitle }
  }
  return {
    ...node,
    children: node.children.map((child) => updateNodeTitle(child, nodeId, newTitle)),
  }
}

function addChildNode(node: MindmapNode, parentId: string, newNode: MindmapNode): MindmapNode {
  if (node.id === parentId) {
    return { ...node, children: [...node.children, newNode] }
  }
  return {
    ...node,
    children: node.children.map((child) => addChildNode(child, parentId, newNode)),
  }
}

function removeNode(node: MindmapNode, nodeId: string): MindmapNode {
  return {
    ...node,
    children: node.children
      .filter((child) => child.id !== nodeId)
      .map((child) => removeNode(child, nodeId)),
  }
}

function validateMindmap(root: MindmapNode): ValidateResult {
  const errors: string[] = []
  function walk(node: MindmapNode, depth: number) {
    if (!node.title.trim()) {
      errors.push(`Node "${node.id}" không được để trống tiêu đề.`)
    }
    if (depth > 3) {
      errors.push(`Node "${node.title || node.id}" vượt quá độ sâu tối đa (3).`)
    }
    if (node.children.length > 8) {
      errors.push(`Node "${node.title || node.id}" có quá nhiều node con (tối đa 8).`)
    }
    node.children.forEach((child) => walk(child, depth + 1))
  }
  walk(root, 0)
  return { isValid: errors.length === 0, errors }
}

export function MindmapViewer({ root, className, onDownload, onSave }: MindmapViewerProps) {
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

  const [isEditMode, setIsEditMode] = useState(false)
  const [mindmapData, setMindmapData] = useState<MindmapNode>(root)
  const [draftMindmap, setDraftMindmap] = useState<MindmapNode>(root)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [editError, setEditError] = useState<string>("")

  useEffect(() => {
    setMindmapData(root)
    setDraftMindmap(root)
  }, [root])

  const layout = useMemo(() => layoutMindmap(isEditMode ? draftMindmap : mindmapData), [isEditMode, draftMindmap, mindmapData])

  const getInitialPositions = () => {
    const initialPositions: Record<string, { x: number; y: number }> = {}
    for (const node of layout.nodes) {
      initialPositions[node.id] = { x: node.x, y: node.y }
    }
    return initialPositions
  }

  const lastRootIdRef = useRef<string>(root.id)
  const lastClickRef = useRef<{ nodeId: string; time: number } | null>(null)

  useEffect(() => {
    const initialPositions = getInitialPositions()

    if (root.id !== lastRootIdRef.current) {
      setNodePositions(initialPositions)
      lastRootIdRef.current = root.id
      setSelectedNodeIds([])
      setSelectionRect(null)
      selectionStateRef.current = null
      nodeDragStateRef.current = null
    } else {
      setNodePositions((prev) => ({
        ...initialPositions,
        ...prev,
      }))
    }
  }, [layout.nodes, root.id])

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

  useEffect(() => {
    const syncFullscreenState = () => {
      const isCurrentlyFullscreen = document.fullscreenElement === viewerRef.current || (document as any).webkitFullscreenElement === viewerRef.current;
      setIsFullscreen(isCurrentlyFullscreen)
    }

    document.addEventListener("fullscreenchange", syncFullscreenState)
    document.addEventListener("webkitfullscreenchange", syncFullscreenState)
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState)
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState)
    }
  }, [])

  // Prevent background scroll in virtual fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isFullscreen])

  const toggleFullscreen = async () => {
    const doc = document as any
    const isNativeSupported = document.fullscreenEnabled || doc.webkitFullscreenEnabled;
    if (isNativeSupported) {
      try {
        const isCurrentlyFullscreen = document.fullscreenElement === viewerRef.current || doc.webkitFullscreenElement === viewerRef.current;
        if (isCurrentlyFullscreen) {
          if (document.exitFullscreen) {
            await document.exitFullscreen()
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen()
          }
          return
        }

        const el = viewerRef.current as any
        if (el) {
          if (el.requestFullscreen) {
            await el.requestFullscreen()
          } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen()
          }
        }
      } catch (error) {
        console.error("Failed to toggle native fullscreen:", error)
        setIsFullscreen(!isFullscreen)
      }
    } else {
      setIsFullscreen(!isFullscreen)
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

    const activeEl = document.activeElement as HTMLElement
    if (activeEl && activeEl.tagName === "INPUT") {
      activeEl.blur()
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
    if (!isEditMode) {
      event.stopPropagation()
      const now = Date.now()
      if (lastClickRef.current && lastClickRef.current.nodeId === nodeId && now - lastClickRef.current.time < 300) {
        const currentNode = rawNodeMap.get(nodeId)
        if (currentNode) {
          setDraftMindmap(mindmapData)
          setIsEditMode(true)
          setEditingNodeId(nodeId)
          setEditingValue(currentNode.title)
        }
        lastClickRef.current = null
      } else {
        lastClickRef.current = { nodeId, time: now }
      }
      return
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest("button, input")) {
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

    const activeEl = document.activeElement as HTMLElement
    if (activeEl && activeEl.tagName === "INPUT") {
      activeEl.blur()
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

  const handleNodePointerUpOrCancel = (nodeId: string) => (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = nodeDragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const deltaX = Math.abs(event.clientX - dragState.startX)
    const deltaY = Math.abs(event.clientY - dragState.startY)
    const isClick = deltaX < 5 && deltaY < 5

    if (isClick && isEditMode) {
      const target = event.target as HTMLElement
      if (!target.closest("button, input")) {
        const currentNode = rawNodeMap.get(nodeId)
        if (currentNode) {
          setEditingNodeId(nodeId)
          setEditingValue(currentNode.title)
        }
      }
    }

    nodeDragStateRef.current = null
    event.stopPropagation()
  }

  return (
    <div
      ref={viewerRef}
      className={cn(
        "relative overflow-hidden bg-white",
        isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen rounded-none border-0 shadow-none" : "rounded-[28px] border border-slate-200 shadow-sm",
        className,
      )}
    >
      <div className={cn("flex border-b border-slate-100 px-3 py-2 md:px-6 md:py-5 bg-white", isFullscreen ? "flex-col md:flex-row md:items-center gap-4 md:gap-6" : "flex-col gap-4")}>
        <div className={cn("flex items-center flex-wrap gap-4 shrink-0", isFullscreen && "pr-12")}>
          <p className="text-xl font-bold tracking-tight text-blue-600">Mindmap "{(isEditMode ? draftMindmap.title : mindmapData.title)}"</p>
          {isEditMode && <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">Đang chỉnh sửa</span>}
          {editError && <span className="text-xs text-red-600 font-medium">{editError}</span>}
        </div>

        <div className={cn("flex flex-wrap items-center gap-1 sm:gap-2 text-slate-600", isFullscreen && "flex-1")}>
          <Button variant="outline" className="h-8 w-8 sm:h-9 sm:w-9 p-0" onClick={() => setZoom((current) => Math.max(0.05, +(current - 0.1).toFixed(2)))} aria-label="Thu nhỏ">
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 sm:h-9 sm:w-9 p-0" onClick={() => setZoom((current) => Math.min(1.6, +(current + 0.1).toFixed(2)))} aria-label="Phóng to">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 sm:h-9 sm:w-9 p-0" onClick={handleResetView} aria-label="Đặt lại sơ đồ">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 sm:h-9 sm:w-9 p-0" onClick={toggleFullscreen} aria-label="Toàn màn hình">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </Button>

          <div className="h-5 sm:h-6 w-px bg-slate-200 mx-0.5 sm:mx-2" />

          {isEditMode ? (
            <>
              <button
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 sm:h-9 px-2 sm:px-3 gap-1 sm:gap-2 text-white hover:bg-red-700"
                style={{ backgroundColor: "#dc2626" }}
                onClick={() => {
                  setDraftMindmap(mindmapData)
                  setIsEditMode(false)
                  setEditError("")
                  setEditingNodeId(null)
                }}
                title="Hủy"
              >
                <X className="h-4 w-4" />
                <span className="hidden md:inline">Hủy</span>
              </button>
              <button
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 sm:h-9 px-2 sm:px-3 gap-1 sm:gap-2 text-white hover:bg-green-700"
                style={{ backgroundColor: "#16a34a" }}
                onClick={async () => {
                  const result = validateMindmap(draftMindmap)
                  if (!result.isValid) {
                    setEditError(result.errors[0])
                    return
                  }
                  setMindmapData(draftMindmap)
                  try {
                    await onSave?.(draftMindmap)
                    setIsEditMode(false)
                    setEditError("")
                    setEditingNodeId(null)
                  } catch (err: any) {
                    setEditError("Lỗi khi lưu: " + err.message)
                  }
                }}
                title="Lưu lại"
              >
                <Save className="h-4 w-4" />
                <span className="hidden md:inline">Lưu lại</span>
              </button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="gap-1 sm:gap-2 bg-yellow-400 text-yellow-950 hover:bg-yellow-500 px-2 sm:px-3 h-8 sm:h-9"
              onClick={() => {
                setDraftMindmap(mindmapData)
                setIsEditMode(true)
              }}
              title="Chỉnh sửa"
            >
              <Edit2 className="h-4 w-4" />
              <span className="hidden md:inline">Chỉnh sửa</span>
            </Button>
          )}

          {onDownload ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-1 sm:gap-2 bg-blue-600 text-white hover:bg-blue-700 px-2 sm:px-3 h-8 sm:h-9" title="Tải xuống">
                  <Download className="h-4 w-4" />
                  <span className="hidden md:inline">Tải xuống</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" portalContainer={viewerRef.current}>
                <DropdownMenuItem onClick={() => onDownload({
                  format: "pdf",
                  nodes: renderedNodes,
                  edges: layout.edges,
                  width: canvasWidth,
                  height: canvasHeight
                })}>
                  <FileText className="h-4 w-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload({
                  format: "jpg",
                  nodes: renderedNodes,
                  edges: layout.edges,
                  width: canvasWidth,
                  height: canvasHeight
                })}>
                  <FileImage className="h-4 w-4" />
                  JPG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload({
                  format: "png",
                  nodes: renderedNodes,
                  edges: layout.edges,
                  width: canvasWidth,
                  height: canvasHeight
                })}>
                  <FileImage className="h-4 w-4" />
                  PNG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Exit Fullscreen will be handled by floating button */}
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
                  data-node-draggable={isEditMode ? "true" : "false"}
                  className={cn(
                    "absolute z-10 flex h-[72px] w-[220px] items-center rounded-2xl border px-4 py-3 text-left shadow-sm group",
                    isEditMode ? "cursor-move" : "cursor-default",
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
                  onPointerUp={handleNodePointerUpOrCancel(node.id)}
                  onPointerCancel={handleNodePointerUpOrCancel(node.id)}
                  onDoubleClick={() => {
                    if (!isEditMode) {
                      setDraftMindmap(mindmapData)
                      setIsEditMode(true)
                      setEditingNodeId(node.id)
                      setEditingValue(node.title)
                    }
                  }}
                >
                  {editingNodeId === node.id ? (
                    <input
                      ref={(el) => {
                        if (el) {
                          setTimeout(() => {
                            el.focus()
                            el.select()
                          }, 50)
                        }
                      }}
                      title="Edit Node Title"
                      type="text"
                      className="w-full bg-transparent outline-none text-sm font-medium leading-5"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => {
                        setDraftMindmap((prev) => updateNodeTitle(prev, node.id, editingValue))
                        setEditingNodeId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setDraftMindmap((prev) => updateNodeTitle(prev, node.id, editingValue))
                          setEditingNodeId(null)
                        } else if (e.key === "Escape") {
                          setEditingNodeId(null)
                        }
                      }}
                    />
                  ) : (
                    <span className="block w-full text-sm font-medium leading-5 text-slate-900">{node.title}</span>
                  )}
                  
                  {isEditMode && (
                    <div className="absolute right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center gap-1 translate-x-full pl-2">
                       <button
                         type="button"
                         className="flex items-center justify-center p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded-full shadow-sm border border-slate-200 hover:border-blue-200 transition-colors"
                         onClick={(e) => {
                           e.stopPropagation()
                           const newId = "node-" + Math.random().toString(36).substring(2, 9)
                           setDraftMindmap(prev => addChildNode(prev, node.id, { id: newId, title: "New Node", children: [], important: false, sourceRefs: [] }))
                         }}
                         title="Thêm node con"
                       >
                         <Plus className="w-3.5 h-3.5" />
                       </button>
                       {node.depth > 0 && (
                         <button
                           type="button"
                           className="flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 bg-white rounded-full shadow-sm border border-slate-200 hover:border-red-200 transition-colors"
                           onClick={(e) => {
                             e.stopPropagation()
                             setDraftMindmap(prev => removeNode(prev, node.id))
                           }}
                           title="Xoá node"
                         >
                           <X className="w-3.5 h-3.5" />
                         </button>
                       )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {isFullscreen && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute right-4 top-4 z-[10000] rounded-full h-10 w-10 border-2 border-white shadow-lg bg-red-600 hover:bg-red-700 text-white active:scale-95 transition-transform"
          onClick={toggleFullscreen}
          aria-label="Thoát chế độ toàn màn hình"
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
