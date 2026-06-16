"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { FileUp, FileText, Brain, Copy, List, AlignLeft, Sparkles, CheckCircle2, Eye, X, Info, Download, Calendar, Star, BookOpen, Clock, ChevronRight, Tag } from "lucide-react"
import PreviewDocument from "@/components/PreviewDocument"

type SummaryLanguage = "vi" | "en"

interface SummaryData {
  title: string
  content: string
  highlights: string[]
  sections: { title: string; summary: string }[]
  keywords: string[]
  wordCount: number
  generatedBy: string
  createdAt: string
}

export default function Summarize() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [summaryLanguage, setSummaryLanguage] = useState<SummaryLanguage>("vi")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [summary, setSummary] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [copyMessage, setCopyMessage] = useState<string>("")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)



  const clearSelectedFile = () => {
    setSelectedFile(null)
    setSummary("")
    setErrorMessage("")
    setCopyMessage("")
    setIsPreviewOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleOpenPreview = async () => {
    if (!selectedFile) return
    setIsPreviewOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

      // Bỏ qua check dung lượng PDF vì nó được phân tích phía client
      if (!isPdf && file.size > 4.5 * 1024 * 1024) {
        setErrorMessage("Rất tiếc, máy chủ hiện tại chỉ hỗ trợ tệp tin có dung lượng tối đa 4.5 MB. Vui lòng nén hoặc chia nhỏ tài liệu trước khi tải lên (Dưới 4.5MB).")
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }
      setSelectedFile(file)
      setSummary("")
      setErrorMessage("")
      setCopyMessage("")
    }
  }

  const handleSummarize = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setErrorMessage("")
    setCopyMessage("")
    setProcessingProgress(5)
    setSummary("")

    const progressTimer = window.setInterval(() => {
      setProcessingProgress((prev) => (prev >= 90 ? 90 : prev + 6))
    }, 250)

    try {
      let fileToUpload = selectedFile
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")

      if (isPdf) {
        setProcessingProgress(8)
        const { extractTextFromPDFFile } = await import("@/lib/client-pdf-parser")
        const extractedText = await extractTextFromPDFFile(selectedFile)

        fileToUpload = new File([extractedText], selectedFile.name.replace(/\.pdf$/i, ".txt"), { type: "text/plain" })
        if (fileToUpload.size > 4.5 * 1024 * 1024) {
          throw new Error("Tài liệu quá dài (vượt quá 4.5MB chữ). Vui lòng cắt nhỏ văn bản hơn nữa.")
        }
      }

      const formData = new FormData()
      formData.append("file", fileToUpload)
      formData.append("summaryType", "paragraph")
      formData.append("summaryLength", "30")
      formData.append("language", summaryLanguage)
      formData.append("documentName", selectedFile.name)

      // Lấy userId từ localStorage để lưu vào lịch sử
      const savedUser = localStorage.getItem("user")
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          if (userData.id) {
            formData.append("userId", String(userData.id))
          }
        } catch (e) {
          console.error("Failed to parse user data from localStorage:", e)
        }
      } else {
        throw new Error("Vui lòng đăng nhập để thực hiện tóm tắt và lưu kết quả.")
      }

      const response = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => ({}))) as { summary?: string; error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Không thể tạo bản tóm tắt")
      }

      setSummary(payload.summary || "")
      setProcessingProgress(100)
    } catch (error) {
      setSummary("")
      setErrorMessage(error instanceof Error ? error.message : "Có lỗi không xác định")
      setProcessingProgress(0)
    } finally {
      window.clearInterval(progressTimer)
      setIsProcessing(false)
    }
  }

  const getParsedSummary = (rawSummary: string): SummaryData | null => {
    if (!rawSummary) return null
    try {
      const parsed = JSON.parse(rawSummary)
      if (parsed && parsed.summary) {
        return parsed.summary
      }
      if (parsed && parsed.title) {
        return parsed
      }
    } catch (e) {
      const paragraphs = rawSummary.split(/\n+/).map(p => p.trim()).filter(Boolean)
      const sentences = rawSummary.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 20)
      
      const content = rawSummary
      const highlights = sentences.slice(0, 5).map(s => s.replace(/^•\s*/, ""))
      
      const sections = paragraphs.map((p, idx) => ({
        title: `${idx + 1}. Phần ${idx + 1}`,
        summary: p.slice(0, 150) + (p.length > 150 ? "..." : "")
      }))

      const commonWords = ["tài liệu", "quy trình", "hướng dẫn", "phương pháp", "học tập", "nghiên cứu", "cơ sở", "dữ liệu", "hệ thống", "ứng dụng", "video", "prompt", "kịch bản", "phân cảnh", "cinematic", "kol"]
      const keywords = commonWords.filter(w => rawSummary.toLowerCase().includes(w)).slice(0, 6)
      if (keywords.length === 0) keywords.push("Tài liệu", "Tóm tắt")

      return {
        title: selectedFile ? `Tóm tắt ${selectedFile.name}` : "Tóm tắt tài liệu",
        content,
        highlights: highlights.length > 0 ? highlights : ["Không có điểm nổi bật nào được trích xuất."],
        sections: sections.length > 0 ? sections : [{ title: "1. Tổng quan", summary: content.slice(0, 150) + "..." }],
        keywords,
        wordCount: rawSummary.split(/\s+/).filter(Boolean).length,
        generatedBy: "Hệ thống",
        createdAt: new Date().toISOString()
      }
    }
    return null
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch (e) {
      return dateStr
    }
  }

  const getCopyText = (data: SummaryData) => {
    let text = `# ${data.title}\n\n`
    text += `**Tài liệu:** ${selectedFile?.name || "Tài liệu"}\n`
    text += `**Thời gian tạo:** ${formatDate(data.createdAt)}\n`
    text += `**Tạo bởi:** ${data.generatedBy}\n\n`
    text += `## NỘI DUNG TÓM TẮT\n${data.content}\n\n`

    if (data.highlights && data.highlights.length > 0) {
      text += `## ĐIỂM NỔI BẬT\n`
      data.highlights.forEach(h => {
        text += `- ${h}\n`
      })
      text += `\n`
    }

    if (data.sections && data.sections.length > 0) {
      text += `## NỘI DUNG CHI TIẾT\n`
      data.sections.forEach(s => {
        text += `### ${s.title}\n${s.summary}\n\n`
      })
    }

    if (data.keywords && data.keywords.length > 0) {
      text += `**Từ khóa:** ${data.keywords.join(", ")}\n`
    }

    text += `**Số lượng từ:** ${data.wordCount} từ\n`
    return text
  }

  const handleCopyToClipboard = (data: SummaryData) => {
    const textToCopy = getCopyText(data)
    void navigator.clipboard.writeText(textToCopy)
    setCopyMessage("Đã sao chép vào clipboard")
    setTimeout(() => setCopyMessage(""), 3000)
  }

  const handleDownloadSummary = (data: SummaryData) => {
    const textContent = getCopyText(data)
    const blob = new Blob([textContent], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `TomTat_${selectedFile?.name?.replace(/\.[^/.]+$/, "") || "TaiLieu"}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
                  Summary Document
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Tóm tắt tài liệu bằng AI</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
                  Tải tài liệu lên và nhận bản tóm tắt rõ ràng theo dạng đoạn văn hoặc gạch đầu dòng. Tối ưu cho việc đọc nhanh, ghi chú và ôn tập.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Đọc nhanh & Ghi chú nhanh
                </div>
                <p className="mt-1">
                  Chọn kiểu tóm tắt phù hợp để học và ôn tập hiệu quả hơn.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="border-slate-200 shadow-sm lg:h-[700px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Tải lên tài liệu</CardTitle>
                <CardDescription>Chọn PDF hoặc Word (.docx) để bắt đầu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    {!selectedFile ? (
                      <label
                        htmlFor="summary-file"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center transition hover:bg-blue-50"
                      >
                        <FileUp className="mb-3 h-10 w-10 text-blue-600" />
                        <span className="text-sm font-medium text-slate-900">Kéo thả tài liệu của bạn vào đây</span>
                        <span className="mt-1 text-xs text-slate-500">Hỗ trợ: PDF, Word (.docx)</span>
                      </label>
                    ) : (
                      <div
                        className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <button
                          type="button"
                          aria-label="Bỏ file đã chọn"
                          className="absolute -right-3 -top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-md hover:bg-red-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            clearSelectedFile()
                          }}
                        >
                          <X className="h-4.5 w-4.5" />
                        </button>
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

                    <Input
                      id="summary-file"
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Ngôn ngữ tóm tắt</Label>
                        <Select value={summaryLanguage} onValueChange={(value) => setSummaryLanguage(value as SummaryLanguage)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn ngôn ngữ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                            <SelectItem value="en">Tiếng Anh</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {isProcessing && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Đang xử lý...</span>
                            <span>{processingProgress}%</span>
                          </div>
                          <Progress value={processingProgress} className="h-2" />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {selectedFile && (
                          <Button variant="outline" className="flex-1" onClick={handleOpenPreview}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem tài liệu
                          </Button>
                        )}
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          disabled={!selectedFile || isProcessing}
                          onClick={handleSummarize}
                        >
                          {isProcessing ? "Đang tóm tắt..." : "Tóm tắt ngay"}
                        </Button>
                      </div>

                      {errorMessage ? <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-100">{errorMessage}</p> : null}
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-800 flex items-start gap-2.5 shadow-sm mt-auto">
                      <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 flex-shrink-0">
                        <Info className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-blue-900">Lưu ý:</p>
                        <p className="leading-relaxed opacity-90">
                          Hệ thống ưu tiên giữ ý chính, quan trọng nhất để bạn có bản tóm tắt nội dung cơ bản, dễ dùng để học tập. Tuy nhiên cũng có thể bị mất một số ý quan trọng, hãy đọc lại tài liệu để nắm rõ hơn, tránh mất kiến thức nhé
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden lg:h-[700px] flex flex-col">
              {!summary && (
                <CardHeader className="flex-shrink-0">
                  <CardTitle>Kết quả tóm tắt</CardTitle>
                  <CardDescription>Nội dung tóm tắt từ tài liệu của bạn</CardDescription>
                </CardHeader>
              )}
              <CardContent className={`flex-1 flex flex-col ${summary ? "p-6 overflow-hidden" : "p-6 justify-center"}`}>
                {summary ? (
                  (() => {
                    const data = getParsedSummary(summary);
                    if (!data) return null;

                    const isWord = selectedFile?.name.toLowerCase().endsWith(".docx");
                    const fileExtText = isWord ? "Word" : "PDF";
                    const fileBgColor = isWord ? "bg-blue-600" : "bg-purple-600";

                    return (
                      <div className="flex flex-col h-full overflow-hidden">
                        {/* Header của giao diện tóm tắt */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 flex-shrink-0">
                          <div className="flex items-center gap-2 text-blue-800 font-bold text-lg">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <span>BẢN TÓM TẮT TÀI LIỆU</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {copyMessage && (
                              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-fade-in flex items-center gap-1 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                {copyMessage}
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                              onClick={() => handleCopyToClipboard(data)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Sao chép
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                              onClick={() => handleDownloadSummary(data)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Tải xuống
                            </Button>
                          </div>
                        </div>

                        {/* Scrollable Container */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 mt-4">
                          {/* Card thông tin tài liệu chính */}
                          <div className="flex items-start gap-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-5">
                            <div className={`relative flex flex-col items-center justify-center h-16 w-12 rounded-lg ${fileBgColor} text-white font-bold text-[10px] shadow-sm flex-shrink-0 select-none`}>
                              <FileText className="h-5 w-5 mb-0.5" />
                              {fileExtText}
                            </div>
                            <div className="space-y-2">
                              <h2 className="text-xl font-bold text-slate-800 leading-tight">
                                {data.title}
                              </h2>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                                  Tài liệu: <span className="text-slate-700 font-semibold max-w-[200px] truncate">{selectedFile?.name || data.title}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  Ngày tạo: <span className="text-slate-700 font-semibold">{formatDate(data.createdAt)}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Brain className="h-3.5 w-3.5 text-slate-400" />
                                  Tạo bởi: <span className="text-slate-700 font-semibold">{data.generatedBy}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* NỘI DUNG TÓM TẮT */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-800 font-bold border-l-4 border-blue-600 pl-3">
                              <List className="h-5 w-5 text-blue-600" />
                              <span className="tracking-wide uppercase text-sm">Nội dung tóm tắt</span>
                            </div>
                            <div className="rounded-2xl border border-blue-50 bg-blue-50/20 p-5 text-slate-700 leading-relaxed text-sm md:text-[15px] whitespace-pre-line shadow-sm">
                              {data.content}
                            </div>
                          </div>

                          {/* ĐIỂM NỔI BẬT */}
                          {data.highlights && data.highlights.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-slate-800 font-bold border-l-4 border-amber-500 pl-3">
                                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                <span className="tracking-wide uppercase text-sm">Điểm nổi bật</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.highlights.map((highlight, idx) => {
                                  const isLastOdd = data.highlights.length % 2 !== 0 && idx === data.highlights.length - 1;
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-start gap-4 rounded-2xl border border-amber-100/60 bg-amber-50/10 p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
                                        isLastOdd ? "md:col-span-2" : ""
                                      }`}
                                    >
                                      <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-amber-100 text-amber-600 flex-shrink-0 shadow-sm">
                                        <CheckCircle2 className="h-5.5 w-5.5 fill-amber-600 text-white" />
                                      </div>
                                      <div className="space-y-1.5 flex-1">
                                        <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Ý chính {idx + 1}</div>
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                          {highlight}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* NỘI DUNG CHI TIẾT */}
                          {data.sections && data.sections.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-slate-800 font-bold border-l-4 border-indigo-600 pl-3">
                                <BookOpen className="h-5 w-5 text-indigo-600" />
                                <span className="tracking-wide uppercase text-sm">Nội dung chi tiết</span>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                {data.sections.map((sec, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-4 p-5 rounded-2xl border border-indigo-50 bg-indigo-50/5 hover:bg-indigo-50/20 hover:border-indigo-100/80 hover:shadow-sm transition-all duration-200"
                                  >
                                    <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-100 text-indigo-600 font-extrabold text-sm flex-shrink-0 shadow-sm">
                                      {idx + 1}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                      <h4 className="font-bold text-slate-800 text-base leading-tight">
                                        {sec.title}
                                      </h4>
                                      <p className="text-sm text-slate-600 leading-relaxed">
                                        {sec.summary}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metadata Bottom Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            {/* Số lượng từ */}
                            <div className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50/10 p-5 shadow-sm hover:shadow-md transition duration-200">
                              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-sky-100 text-sky-600 flex-shrink-0 shadow-sm">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">Độ dài văn bản</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-black text-sky-700 tracking-tight leading-none">{data.wordCount}</span>
                                  <span className="text-xs text-sky-600 font-bold">từ</span>
                                </div>
                              </div>
                            </div>

                            {/* Thời gian tạo */}
                            <div className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50/10 p-5 shadow-sm hover:shadow-md transition duration-200">
                              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex-shrink-0 shadow-sm">
                                <Clock className="h-6 w-6" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Thời gian tạo</span>
                                <span className="text-sm font-extrabold text-amber-700 block leading-tight">
                                  {formatDate(data.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Từ khóa */}
                            <div className="flex items-start gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/10 p-5 shadow-sm hover:shadow-md transition duration-200 md:col-span-2">
                              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex-shrink-0 shadow-sm">
                                <Tag className="h-6 w-6" />
                              </div>
                              <div className="space-y-2.5 flex-1">
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Từ khóa chính</span>
                                <div className="flex flex-wrap gap-2">
                                  {data.keywords && data.keywords.length > 0 ? (
                                    data.keywords.map((kw, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block rounded-xl bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100/50 transition duration-150"
                                      >
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
                                        {kw}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-400">Không có từ khóa</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center p-6">
                    <Brain className="h-12 w-12 text-slate-300" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">Chưa có bản tóm tắt</h3>
                    <p className="mt-1 max-w-md text-sm text-slate-500">Chọn tài liệu ở cột bên trái và bấm "Tóm tắt ngay" để hiển thị kết quả tại đây.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />

      {isPreviewOpen && (
        <PreviewDocument
          document={{
            title: selectedFile?.name || "Xem tài liệu",
            file: selectedFile || undefined
          }}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  )
}
