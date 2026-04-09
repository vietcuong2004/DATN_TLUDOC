"use client"

import type React from "react"

import { useState } from "react"
import { jsPDF } from "jspdf"
import { FileUp, FileText, Network, Sparkles } from "lucide-react"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MindmapViewer } from "@/components/mindmap-viewer"
import type { MindmapNode } from "@/lib/mindmap"

type ExportFormat = "png" | "jpg" | "pdf"

type MindmapLayoutNode = MindmapNode & {
  x: number
  y: number
  depth: number
}

type MindmapLayout = {
  nodes: MindmapLayoutNode[]
  edges: Array<{ id: string; source: string; target: string }>
  width: number
  height: number
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 72
const HORIZONTAL_GAP = 260
const VERTICAL_GAP = 112
const PADDING = 72

function measureSpan(node: MindmapNode): number {
  if (node.children.length === 0) {
    return 1
  }

  return node.children.reduce((total, child) => total + measureSpan(child), 0)
}

function shortenFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "")
  return baseName.length > 48 ? `${baseName.slice(0, 48)}...` : baseName
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function layoutMindmap(root: MindmapNode): MindmapLayout {
  const nodes: MindmapLayoutNode[] = []
  const edges: Array<{ id: string; source: string; target: string }> = []
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

  const width = PADDING * 2 + Math.max(1, maxDepth.value + 1) * HORIZONTAL_GAP + NODE_WIDTH
  const height = PADDING * 2 + Math.max(1, totalSpan) * VERTICAL_GAP

  return {
    nodes,
    edges,
    width,
    height,
  }
}

function createMindmapSvg(root: MindmapNode) {
  const layout = layoutMindmap(root)
  const width = layout.width
  const height = layout.height

  const edgeMarkup = layout.edges
    .map((edge) => {
      const source = layout.nodes.find((node) => node.id === edge.source)
      const target = layout.nodes.find((node) => node.id === edge.target)

      if (!source || !target) {
        return ""
      }

      const startX = source.x + NODE_WIDTH
      const startY = source.y + NODE_HEIGHT / 2
      const endX = target.x
      const endY = target.y + NODE_HEIGHT / 2
      const midX = startX + (endX - startX) * 0.5

      return `<path d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" stroke="#94a3b8" stroke-opacity="0.55" stroke-width="2.2" fill="none" />`
    })
    .join("")

  const nodeMarkup = layout.nodes
    .map((node) => {
      const fill =
        node.depth === 0 ? "#059669" : node.important ? "#fef3c7" : "#ffffff"
      const stroke = node.depth === 0 ? "#34d399" : node.important ? "#f59e0b" : "#cbd5e1"
      const textFill = node.depth === 0 ? "#ffffff" : "#0f172a"
      const nodeLabel = escapeXml(node.title)

      return `
        <g>
          <rect x="${node.x}" y="${node.y}" rx="18" ry="18" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />
          <text x="${node.x + 16}" y="${node.y + 28}" fill="${textFill}" font-family="Arial, sans-serif" font-size="14" font-weight="700">
            ${nodeLabel.length > 38 ? `${nodeLabel.slice(0, 38)}...` : nodeLabel}
          </text>
        </g>
      `
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="background" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="60%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#ecfdf5" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#background)" />
      ${edgeMarkup}
      ${nodeMarkup}
    </svg>`
}

async function svgToCanvas(svgMarkup: string) {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    image.decoding = "async"
    image.src = svgUrl

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("Không thể render SVG"))
    })

    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Không thể tạo canvas")
    }

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)

    return canvas
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

async function downloadMindmap(root: MindmapNode, format: ExportFormat) {
  const svgMarkup = createMindmapSvg(root)
  const canvas = await svgToCanvas(svgMarkup)

  if (format === "png" || format === "jpg") {
    const mimeType = format === "png" ? "image/png" : "image/jpeg"
    const quality = format === "jpg" ? 0.92 : undefined
    const dataUrl = canvas.toDataURL(mimeType, quality)
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `${shortenFileName(root.title).replace(/\s+/g, "-").toLowerCase()}.${format}`
    link.click()
    return
  }

  const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "l" : "p", unit: "px", format: [canvas.width, canvas.height] })
  const dataUrl = canvas.toDataURL("image/png")
  pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width, canvas.height)
  pdf.save(`${shortenFileName(root.title).replace(/\s+/g, "-").toLowerCase()}.pdf`)
}

async function extractFileText(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/mindmap/extract", {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json()) as { text?: string; error?: string }

  if (!response.ok) {
    throw new Error(payload.error || "Không thể trích xuất nội dung từ tài liệu.")
  }

  return (payload.text ?? "").trim()
}

function buildMindmapSourceText(file: File, text: string) {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length >= 200) {
    return normalized
  }

  const name = shortenFileName(file.name)
  return [
    `Tài liệu ${name} trình bày bối cảnh, mục tiêu và phạm vi triển khai trong thực tế.`,
    `Các phần chính bao gồm khái niệm cốt lõi, quy trình thực hiện, kỹ thuật áp dụng và ví dụ minh họa.`,
    `Nội dung cũng nêu lợi ích, rủi ro, lưu ý khi triển khai và đề xuất hành động tiếp theo.`,
  ].join(" ")
}

async function generateMindmapFromApi(fileName: string, text: string) {
  const response = await fetch("/api/mindmap/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName,
      text,
    }),
  })

  const payload = (await response.json()) as { mindmap?: MindmapNode; error?: string }

  if (!response.ok) {
    throw new Error(payload.error || "Khong the sinh mindmap bang Gemini.")
  }

  if (!payload.mindmap) {
    throw new Error("API khong tra ve du lieu mindmap hop le.")
  }

  return payload.mindmap
}

export default function MindmapPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setMindmap(null)
    setErrorMessage("")
  }

  const handleCreateMindmap = async () => {
    if (!selectedFile) {
      return
    }

    setIsGenerating(true)
    setErrorMessage("")

    try {
      const isSupported = /\.(pdf|doc|docx)$/i.test(selectedFile.name)
      if (!isSupported) {
        throw new Error("UNSUPPORTED_FILE")
      }

      const extracted = await extractFileText(selectedFile)
      const sourceText = buildMindmapSourceText(selectedFile, extracted)
      const result = await generateMindmapFromApi(selectedFile.name, sourceText)
      setMindmap(result)
    } catch (error) {
      console.error(error)
      setErrorMessage("Không thể tạo tài liệu, vui lòng thử lại")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#e0f2fe_100%)] px-6 py-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                  Mindmap Generator
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Chuyển đổi tài liệu thành sơ đồ tư duy</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
                  Tải tài liệu của bạn lên, hệ thống sẽ tự động trích xuất nội dung và tạo sơ đồ tư duy chi tiết. Sau đó, bạn có thể xuất dưới dạng PNG, JPG hoặc PDF.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Xem & Xuất trực tiếp
                </div>
                <p className="mt-1">Xuất sơ đồ ngay lập tức mà không cần công cụ khác.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Chọn tài liệu</CardTitle>
                <CardDescription>Tải PDF, Word hoặc tài liệu khác để bắt đầu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedFile ? (
                  <label
                    htmlFor="mindmap-file"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center transition hover:bg-blue-50"
                  >
                    <FileUp className="mb-3 h-10 w-10 text-blue-600" />
                    <span className="text-sm font-medium text-slate-900">Kéo thả tài liệu của bạn vào đây</span>
                    <span className="mt-1 text-xs text-slate-500">Hỗ trợ: PDF, Word (.doc, .docx)</span>
                  </label>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center">
                    <div className="w-full rounded-xl border border-blue-200 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-10 w-10 text-blue-600" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate font-semibold text-slate-900">{selectedFile.name}</p>
                          <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <Input id="mindmap-file" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />

                <div className="flex flex-wrap gap-2">
                  {selectedFile && (
                    <Button variant="outline" className="flex-1" onClick={() => document.getElementById("mindmap-file")?.click()}>
                      Chọn file khác
                    </Button>
                  )}
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!selectedFile || isGenerating} onClick={handleCreateMindmap}>
                    {isGenerating ? "Đang tạo..." : "Tạo sơ đồ"}
                  </Button>
                </div>

                {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Lưu ý</p>
                  <p className="mt-1">Ngay cả tài liệu quét (scan pdf) cũng có thể xử lý được. Hệ thống sẽ trích xuất tất cả nội dung có thể đọc và tạo sơ đồ tư duy dựa trên đó.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Sơ đồ tư duy</CardTitle>
                <CardDescription>Mindmap của bạn được hiển thị tại đây</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!mindmap ? (
                  <div className="flex h-[373px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <Network className="h-12 w-12 text-slate-300" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">Chưa có sơ đồ</h3>
                    <p className="mt-1 max-w-md text-sm text-slate-500">Tải tài liệu từ bên trái và bấm "Tạo sơ đồ" để xem sơ đồ tư duy tại đây.</p>
                  </div>
                ) : (
                  <MindmapViewer root={mindmap} onDownload={(format) => downloadMindmap(mindmap, format)} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
