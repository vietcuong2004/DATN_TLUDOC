"use client"

import type React from "react"

import { useState, useRef } from "react"
// ...existing code...
import { jsPDF } from "jspdf"
import { FileUp, FileText, Network, Sparkles, Info } from "lucide-react"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MindmapViewer } from "./mindmap-viewer"
import PreviewDocument from "@/components/PreviewDocument"
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

type OnDownloadData = {
  format: "png" | "jpg" | "pdf"
  nodes: Array<MindmapNode & { x: number; y: number; depth: number }>
  edges: Array<{ id: string; source: string; target: string }>
  width: number
  height: number
}

function createMindmapSvg(root: MindmapNode, layout: Omit<OnDownloadData, "format">) {
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
      const fill = node.depth === 0 ? "#059669" : node.important ? "#fef3c7" : "#ffffff"
      const stroke = node.depth === 0 ? "#34d399" : node.important ? "#f59e0b" : "#cbd5e1"
      const textFill = node.depth === 0 ? "#ffffff" : "#0f172a"
      const nodeLabel = escapeXml(node.title)

      const maxCharsPerLine = 22
      const words = nodeLabel.split(" ")
      let line1 = ""
      let line2 = ""
      for (const word of words) {
        if (line1.length + word.length < maxCharsPerLine) {
          line1 += (line1 ? " " : "") + word
        } else if (line2.length + word.length < maxCharsPerLine - 2) {
          line2 += (line2 ? " " : "") + word
        } else {
          line2 += "..."
          break
        }
      }

      return `
        <g>
          <rect x="${node.x}" y="${node.y}" rx="18" ry="18" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />
          <text x="${node.x + 16}" y="${line2 ? node.y + 32 : node.y + 42}" fill="${textFill}" font-family="Arial, sans-serif" font-size="14" font-weight="700">
            ${line1}
          </text>
          ${line2 ? `<text x="${node.x + 16}" y="${node.y + 54}" fill="${textFill}" font-family="Arial, sans-serif" font-size="14" font-weight="700">${line2}</text>` : ""}
        </g>
      `
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
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

async function downloadMindmap(root: MindmapNode, data: OnDownloadData) {
  const svgMarkup = createMindmapSvg(root, data)
  const canvas = await svgToCanvas(svgMarkup)

  if (data.format === "png" || data.format === "jpg") {
    const mimeType = data.format === "png" ? "image/png" : "image/jpeg"
    const quality = data.format === "jpg" ? 0.92 : undefined
    const dataUrl = canvas.toDataURL(mimeType, quality)
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `${shortenFileName(root.title).replace(/\s+/g, "-").toLowerCase()}.${data.format}`
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
  const [processingProgress, setProcessingProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setMindmap(null)
    setErrorMessage("")
    setIsPreviewOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    const isPdf = file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))

    // Bỏ qua giới hạn size của PDF vì PDF đã được xử lý phía client
    if (file && !isPdf && file.size > 4.5 * 1024 * 1024) {
      setErrorMessage("Rất tiếc, máy chủ hiện tại chỉ hỗ trợ tệp tin có dung lượng tối đa 4.5 MB. Vui lòng nén tài liệu trước khi tải lên.")
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setSelectedFile(file)
    setMindmap(null)
    setErrorMessage("")
  }

  const handleOpenPreview = async () => {
    if (!selectedFile) return
    setIsPreviewOpen(true)
  }

  const handleCreateMindmap = async () => {
    if (!selectedFile) return
    setIsGenerating(true)
    setErrorMessage("")
    setProcessingProgress(5)
    const progressTimer = window.setInterval(() => {
      setProcessingProgress((prev) => (prev >= 90 ? 90 : prev + 6))
    }, 250)
    try {
      let fileToProcess = selectedFile
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")

      if (isPdf) {
        const { extractTextFromPDFFile } = await import("@/lib/client-pdf-parser")
        const extractedText = await extractTextFromPDFFile(selectedFile)
        fileToProcess = new File([extractedText], selectedFile.name.replace(/\.pdf$/i, ".txt"), { type: "text/plain" })
      }

      const extracted = await extractFileText(fileToProcess)
      const sourceText = buildMindmapSourceText(selectedFile, extracted)
      const result = await generateMindmapFromApi(selectedFile.name, sourceText)
      setMindmap(result)
      setProcessingProgress(100)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tạo tài liệu, vui lòng thử lại")
      setProcessingProgress(0)
    } finally {
      window.clearInterval(progressTimer)
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
                <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base text-justify">
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
            <Card className="border-slate-200 shadow-sm w-full min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Tải lên tài liệu</CardTitle>
                <CardDescription>Chọn PDF hoặc Word (.doc, .docx) để bắt đầu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedFile ? (
                  <label
                    htmlFor="mindmap-file"
                    className="w-full flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center transition hover:bg-blue-50"
                  >
                    <FileUp className="mb-3 h-10 w-10 text-blue-600" />
                    <span className="text-sm font-medium text-slate-900">Kéo thả tài liệu của bạn vào đây</span>
                    <span className="mt-1 text-xs text-slate-500">Hỗ trợ: PDF, Word (.doc, .docx)</span>
                  </label>
                ) : (
                  <div className="w-full max-w-full min-w-0 relative flex cursor-pointer flex-col items-stretch justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center" onClick={() => fileInputRef.current?.click()}>
                    <button
                      type="button"
                      aria-label="Bỏ file đã chọn"
                      className="absolute -right-3 -top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-md hover:bg-red-600"
                      onClick={(event) => {
                        event.stopPropagation()
                        clearSelectedFile()
                      }}
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5"><path d="M6 6l8 8M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                    <div className="w-full min-w-0 rounded-xl border border-blue-200 bg-white p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-10 w-10 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate font-semibold text-slate-900">{selectedFile.name}</p>
                          <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <Input
                  id="mindmap-file"
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
                <div className="flex flex-wrap gap-2">
                  {selectedFile && (
                    <Button variant="outline" className="flex-1" onClick={handleOpenPreview}>
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Xem tài liệu
                    </Button>
                  )}
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!selectedFile || isGenerating} onClick={handleCreateMindmap}>
                    {isGenerating ? "Đang tạo..." : "Tạo sơ đồ"}
                  </Button>
                </div>
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Đang xử lý...</span>
                      <span>{processingProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-blue-100">
                      <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${processingProgress}%` }} />
                    </div>
                  </div>
                )}
                {errorMessage ? <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-100">{errorMessage}</p> : null}

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800 flex items-start gap-3 shadow-sm">
                  <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 flex-shrink-0">
                    <Info className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-blue-900">Lưu ý:</p>
                    <p className="leading-relaxed opacity-90">
                      Tính năng này hoạt động tốt với định dạng file <span className="font-semibold underline decoration-blue-200 underline-offset-2">PDF</span> và <span className="font-semibold underline decoration-blue-200 underline-offset-2">DOCX</span>. Với file PDF lớn, thời gian xử lý có thể lâu hơn. Bạn nên nén file dưới <span className="font-bold text-blue-700">4.5 MB</span> để có trải nghiệm mượt mà nhất.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {isPreviewOpen && (
              <PreviewDocument
                document={{
                  title: selectedFile?.name || "Xem tài liệu",
                  file: selectedFile || undefined
                }}
                onClose={() => setIsPreviewOpen(false)}
              />
            )}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Sơ đồ tư duy</CardTitle>
                <CardDescription>Mindmap của bạn được hiển thị tại đây</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-4">
                {!mindmap ? (
                  <div className="flex h-[373px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <Network className="h-12 w-12 text-slate-300" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">Chưa có sơ đồ</h3>
                    <p className="mt-1 max-w-md text-sm text-slate-500">Tải tài liệu từ bên trái và bấm "Tạo sơ đồ" để xem sơ đồ tư duy tại đây.</p>
                  </div>
                ) : (
                  <MindmapViewer
                    root={mindmap}
                    onDownload={(data) => downloadMindmap(mindmap, data)}
                    onSave={async (newMindmap) => {
                      setMindmap(newMindmap);
                      try {
                        const res = await fetch("/api/mindmap/edit", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mindmap: newMindmap }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Save failed");
                      } catch (error) {
                        console.error("Failed to save mindmap remotely:", error);
                        throw error;
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

