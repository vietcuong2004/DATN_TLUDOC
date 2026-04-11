"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { FileUp, FileText, Brain, Copy, List, AlignLeft, Sparkles, CheckCircle2, Eye, X } from "lucide-react"

type SummaryFormat = "paragraph" | "bullets"
type SummaryLanguage = "vi" | "en"

export default function Summarize() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [summaryType, setSummaryType] = useState<SummaryFormat>("paragraph")
  const [summaryLength, setSummaryLength] = useState<number>(30)
  const [summaryLanguage, setSummaryLanguage] = useState<SummaryLanguage>("vi")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [summary, setSummary] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [copyMessage, setCopyMessage] = useState<string>("")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string>("")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setSummary("")
    setErrorMessage("")
    setCopyMessage("")
    setIsPreviewOpen(false)
    setPreviewText("")
    setPreviewError("")
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleOpenPreview = async () => {
    if (!selectedFile) return

    setIsPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError("")
    setPreviewText("")

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }

    try {
      const fileName = selectedFile.name.toLowerCase()
      const isPdf = selectedFile.type === "application/pdf" || fileName.endsWith(".pdf")

      if (isPdf) {
        const objectUrl = URL.createObjectURL(selectedFile)
        setPreviewUrl(objectUrl)
        return
      }

      const formData = new FormData()
      formData.append("file", selectedFile)
      const response = await fetch("/api/mindmap/extract", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => ({}))) as { text?: string; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Không thể xem trước tài liệu")
      }

      setPreviewText((payload.text || "").trim())
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Không thể xem trước tài liệu")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
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
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("summaryType", summaryType)
      formData.append("summaryLength", String(summaryLength))
      formData.append("language", summaryLanguage)

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

  const handleCopyToClipboard = () => {
    if (summary) {
      void navigator.clipboard.writeText(summary)
      setCopyMessage("Đã sao chép vào clipboard")
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
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Tải lên tài liệu</CardTitle>
                <CardDescription>Chọn PDF hoặc Word (.docx) để bắt đầu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Định dạng tóm tắt</Label>
                    <RadioGroup
                      value={summaryType}
                      onValueChange={(value) => setSummaryType(value as SummaryFormat)}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="paragraph"
                          id="format-paragraph"
                          className="border-blue-300 text-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label htmlFor="format-paragraph" className="flex items-center">
                          <AlignLeft className="h-4 w-4 mr-2" />
                          Đoạn văn
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="bullets"
                          id="format-bullets"
                          className="border-blue-300 text-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label htmlFor="format-bullets" className="flex items-center">
                          <List className="h-4 w-4 mr-2" />
                          Danh sách gạch đầu dòng
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Độ dài tóm tắt: {summaryLength}%</Label>
                      <span className="text-sm text-gray-500">
                        {summaryLength < 20
                          ? "Rất ngắn"
                          : summaryLength < 40
                            ? "Ngắn"
                            : summaryLength < 60
                              ? "Trung bình"
                              : summaryLength < 80
                                ? "Dài"
                                : "Rất dài"}
                      </span>
                    </div>
                    <Slider
                      defaultValue={[30]}
                      max={100}
                      step={5}
                      value={[summaryLength]}
                      className="[&_.bg-primary]:bg-blue-600 [&_.bg-secondary]:bg-blue-100 [&_.border-primary]:border-blue-600"
                      onValueChange={(value) => setSummaryLength(value[0])}
                    />
                  </div>

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

                  {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Lưu ý</p>
                    <p className="mt-1">Hệ thống ưu tiên giữ ý chính, quan trọng nhất để bạn có bản tóm tắt nội dung cơ bản, dễ dùng để học tập. Tuy nhiên cũng có thể bị mất một số ý quan trọng, hãy đọc lại tài liệu để nắm rõ hơn, tránh mất kiến thức nhé</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Kết quả tóm tắt</CardTitle>
                <CardDescription>Nội dung tóm tắt từ tài liệu của bạn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary ? (
                  <div className="space-y-4">
                    <div className="h-[62vh] min-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-line">
                      {summary}
                    </div>

                    <Button variant="outline" className="w-full" onClick={handleCopyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Sao chép
                    </Button>

                    {copyMessage ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {copyMessage}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-[62vh] min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
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
        <div className="fixed inset-0 z-50 bg-black/50 p-4" onClick={() => setIsPreviewOpen(false)}>
          <div
            className="mx-auto flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{selectedFile?.name || "Xem tài liệu"}</p>
                <p className="text-xs text-slate-500">Xem trước tài liệu đã chọn</p>
              </div>
              <div className="flex items-center gap-2">
                {previewUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(previewUrl, "_blank", "noopener,noreferrer")
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Mở trong tab mới
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setIsPreviewOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-600">Đang tải tài liệu...</div>
              ) : previewError ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600">{previewError}</div>
              ) : previewUrl ? (
                <iframe src={previewUrl} title={selectedFile?.name || "Preview"} className="h-full w-full border-0" />
              ) : (
                <div className="h-full overflow-auto p-6">
                  {previewText ? (
                    <article className="mx-auto max-w-3xl whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
                      {previewText}
                    </article>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Không có nội dung xem trước.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
