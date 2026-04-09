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
  const viewerRef = useRef<HTMLDivElement | null>(null)

  const layout = useMemo(() => layoutMindmap(root), [root])
  const nodeMap = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes])

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
          <Button variant="ghost" size="icon" onClick={() => setZoom(1)} aria-label="Đặt lại zoom">
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
              <DropdownMenuContent align="end">
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

      <div className={cn("relative bg-white", isFullscreen ? "h-[calc(100vh-84px)]" : "min-h-[720px]")}>
        <div className={cn("absolute inset-0 overflow-auto", isFullscreen ? "p-0" : "px-4 pb-6 pt-2")}>
          <div
            className="relative"
            style={{ width: `${layout.width * zoom}px`, height: `${layout.height * zoom}px` }}
          >
            <div
              className="relative"
              style={{
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              <svg
                className="pointer-events-none absolute inset-0 z-20"
                width={layout.width}
                height={layout.height}
                viewBox={`0 0 ${layout.width} ${layout.height}`}
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

              {layout.nodes.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    "absolute z-10 flex h-[72px] w-[220px] items-center rounded-2xl border px-4 py-3 text-left shadow-sm",
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
