"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, X, BrainCircuit, Info, Search, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

const SUBJECTS = [
  { value: "CAU_TRUC_DU_LIEU_VA_GIAI_THUAT", label: "CSE281 - Cấu trúc dữ liệu và giải thuật" },
  { value: "CO_SO_DU_LIEU", label: "CSE484 - Cơ sở dữ liệu" },
  { value: "DAI_SO_TUYEN_TINH", label: "MATH333 - Đại số tuyến tính" },
  { value: "GIAI_TICH_HAM_MOT_BIEN", label: "MATH111 - Giải tích hàm một biến" },
  { value: "GIAI_TICH_HAM_NHIEU_BIEN", label: "MATH122 - Giải tích hàm nhiều biến" },
  { value: "KY_NANG_MEM_VA_TINH_THAN_KHOI_NGHIEP", label: "SSE111 - Kỹ năng mềm và tinh thần khởi nghiệp" },
  { value: "LAP_TRINH_NANG_CAO", label: "CSE205 - Lập trình nâng cao" },
  { value: "LAP_TRINH_PYTHON", label: "CSE204 - Lập trình Python" },
  { value: "LINUX_VA_PHAN_MEM_MA_NGUON_MO", label: "CSE311 - Linux và phần mềm mã nguồn mở" },
  { value: "NHAP_MON_LAP_TRINH", label: "CSE111 - Nhập môn lập trình" },
  { value: "PHAN_TICH_THIET_KE_HE_THONG_THONG_TIN", label: "CSE480 - Phân tích và thiết kế hệ thống thông tin" },
  { value: "TOAN_ROI_RAC", label: "CSE213 - Toán rời rạc" },
  { value: "TRI_TUE_NHAN_TAO", label: "CSE492 - Trí tuệ nhân tạo" },
]

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024

  // Custom dropdown state cho môn học
  const [subjectSearch, setSubjectSearch] = useState("")
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState("")
  const subjectDropdownRef = useRef<HTMLDivElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "vectorizing" | "success" | "error">("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [successDocumentId, setSuccessDocumentId] = useState<number | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (uploadStatus === "uploading") {
      setUploadProgress(10)
      interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 400)
    } else if (uploadStatus === "vectorizing") {
      setUploadProgress(95) // Đứng im ở 95% trong lúc vector hóa
    } else if (uploadStatus === "success") {
      setUploadProgress(100)
    } else if (uploadStatus === "error") {
      setUploadProgress(0)
    }
    return () => clearInterval(interval)
  }, [uploadStatus])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredSubjects = SUBJECTS.filter(s =>
    s.label.toLowerCase().includes(subjectSearch.toLowerCase()) ||
    s.value.toLowerCase().includes(subjectSearch.toLowerCase())
  )
  const selectedSubjectLabel = SUBJECTS.find(s => s.value === selectedSubject)?.label || "Chọn môn học"

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedSubject) {
      alert("Vui lòng chọn môn học.")
      return
    }
    if (!file) {
      alert("Vui lòng chọn tài liệu để tải lên.")
      return
    }

    if (file.size >= MAX_FILE_SIZE_BYTES) {
      setUploadStatus("error")
      setErrorMsg("Rất tiếc, máy chủ hiện tại chỉ hỗ trợ tệp tin có dung lượng tối đa 4.5 MB. Vui lòng nén tài liệu trước khi tải lên.")
      return
    }

    setIsUploading(true)
    setUploadStatus("uploading")
    setErrorMsg("")
    setSuccessDocumentId(null)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set("file", file)
      formData.set("subject", selectedSubject)

      // Lấy user_id từ phiên đăng nhập (lưu dưới dạng object JSON với key 'user')
      let uploaderId = '1'
      if (typeof window !== 'undefined') {
        try {
          const userStr = localStorage.getItem('user')
          console.log('[Upload] Raw localStorage user:', userStr) // DEBUG
          if (userStr) {
            const userObj = JSON.parse(userStr)
            console.log('[Upload] Parsed user object:', userObj) // DEBUG
            uploaderId = String(userObj.id || userObj.user_id || 1)
          }
        } catch { }
      }
      console.log('[Upload] Final uploaderId being sent:', uploaderId) // DEBUG
      formData.set("uploader_id", uploaderId)

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi tải tài liệu.")
      }

      if (data.document_id) {
        setSuccessDocumentId(data.document_id)

        // Gọi hàm vectorize ngầm
        setUploadStatus("vectorizing")
        try {
          fetch("/api/documents/vectorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document_id: data.document_id })
          }).catch(e => console.warn("Vectorize failed", e))
        } catch (e) {
          console.warn(e)
        }

        // Vẫn báo success sau 1 giây (không bắt User chờ Pinecone)
        setTimeout(() => setUploadStatus("success"), 1000)
      } else {
        setUploadStatus("success")
      }
    } catch (err: any) {
      setUploadStatus("error")
      setErrorMsg(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col relative z-0">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Top Banner */}
          <div className="rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#e0f2fe_100%)] px-6 py-6 shadow-sm animate-fade-in">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                  DOCUMENT UPLOAD
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Tải tài liệu lên hệ thống</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
                  Đóng góp tài liệu học tập của bạn để chia sẻ kiến thức với cộng đồng sinh viên Thủy Lợi. Tài liệu sẽ được AI phân tích và đưa vào nguồn tri thức chung.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <BrainCircuit className="h-4 w-4 text-blue-600" />
                  Tích hợp AI
                </div>
                <p className="mt-1">Tự động trích xuất nội dung và tạo nguồn tri thức cho Chatbot.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">

            {/* Left Column: Upload File */}
            <Card className="border-slate-200 shadow-sm h-fit">
              <CardContent className="space-y-4 p-6">
                <div className="mb-2">
                  <h3 className="font-semibold text-slate-900">Tải lên tài liệu</h3>
                  <p className="text-sm text-slate-500">Chọn PDF hoặc Word để đóng góp.</p>
                </div>

                {!file ? (
                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center transition hover:bg-blue-50"
                  >
                    <Upload className="mb-3 h-10 w-10 text-blue-600" />
                    <span className="text-sm font-medium text-slate-900">Kéo thả tài liệu vào đây</span>
                    <span className="mt-1 text-xs text-slate-500">Hỗ trợ: PDF, DOCX (Tối đa 4.5MB)</span>
                  </label>
                ) : (
                  <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center" onClick={() => fileInputRef.current?.click()}>
                    <button
                      type="button"
                      aria-label="Bỏ file đã chọn"
                      className="absolute -right-3 -top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-md hover:bg-red-600"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeFile()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="w-full rounded-xl border border-blue-200 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-10 w-10 text-blue-600" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate font-semibold text-slate-900">{file.name}</p>
                          <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800 flex items-start gap-3 shadow-sm mt-4">
                  <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 flex-shrink-0">
                    <Info className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-blue-900">Lưu ý:</p>
                    <p className="leading-relaxed opacity-90">
                      Hệ thống sẽ tự động kiểm tra trùng lặp nội dung với cơ sở dữ liệu. Vui lòng không upload lại các file đã có sẵn trên hệ thống.
                    </p>
                  </div>
                </div>

                {uploadStatus !== "idle" && (
                  <div className="mt-6 space-y-3">
                    {uploadStatus === "uploading" && (
                      <div className="animate-fade-in">
                        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                          <span>Đang tải lên...</span>
                          <span className="text-blue-600">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2 bg-slate-100 [&>div]:bg-blue-600" />
                      </div>
                    )}
                    {uploadStatus === "vectorizing" && (
                      <div className="animate-fade-in">
                        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                          <span className="animate-pulse">Đang trích xuất tri thức (Vector hóa AI)...</span>
                          <span className="text-blue-600">95%</span>
                        </div>
                        <Progress value={95} className="h-2 bg-slate-100 [&>div]:bg-indigo-600" />
                        <p className="mt-2 text-xs text-slate-500">Quá trình này chạy ngầm, bạn có thể xem tài liệu ngay.</p>
                      </div>
                    )}
                    {uploadStatus === "error" && (
                      <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-left">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-700">Tải lên thất bại</p>
                          <p className="mt-1 text-xs text-red-600 leading-relaxed">{errorMsg || "Tài liệu này đã tồn tại trên hệ thống, vui lòng tải tài liệu khác!"}</p>
                        </div>
                      </div>
                    )}
                    {uploadStatus === "success" && (
                      <div className="animate-fade-in rounded-xl border border-green-200 bg-green-50 p-4 space-y-3 shadow-sm">
                        <div className="flex items-start gap-3 text-left">
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-green-800">Tải lên thành công!</p>
                            <p className="mt-1 text-xs text-green-700 leading-relaxed">Tài liệu đã được tải lên hệ thống.Cảm ơn bạn đã đóng góp.</p>
                          </div>
                        </div>
                        {successDocumentId && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full bg-white border-green-200 text-green-700 hover:bg-green-100"
                            onClick={() => router.push(`/document/${successDocumentId}`)}
                          >
                            Xem tài liệu ngay
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column: Form Information */}
            <Card className="border-slate-200 shadow-sm min-h-[400px]">
              <CardContent className="p-6 h-full flex flex-col space-y-6">

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-900 font-semibold">Tiêu đề tài liệu <span className="text-red-500">*</span></Label>
                  <Input id="title" name="title" placeholder="Nhập tiêu đề rõ ràng, mô tả đúng nội dung file" required className="border-slate-200 focus-visible:ring-blue-500" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-900 font-semibold">Mô tả tài liệu <span className="text-red-500">*</span></Label>
                  <Textarea id="description" name="description" placeholder="Viết mô tả chi tiết khoảng vài câu để người khác hiểu được tài liệu này nói về nội dung gì..." rows={4} required className="border-slate-200 focus-visible:ring-blue-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-slate-900 font-semibold">Loại tài liệu <span className="text-red-500">*</span></Label>
                    <Select name="category" required>
                      <SelectTrigger className="border-slate-200 focus:ring-blue-500">
                        <SelectValue placeholder="Chọn Loại tài liệu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lecture">Bài giảng & Slide (lecture/slides)</SelectItem>
                        <SelectItem value="exam">Đề thi & Kiểm tra (exam)</SelectItem>
                        <SelectItem value="assignment">Bài tập (assignment)</SelectItem>
                        <SelectItem value="research">Nghiên cứu & Báo cáo (research)</SelectItem>
                        <SelectItem value="other">Tài liệu khác (other)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-900 font-semibold">Môn học <span className="text-red-500">*</span></Label>
                    <div className="relative" ref={subjectDropdownRef}>
                      <div
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                      >
                        <span className={selectedSubject ? "text-slate-900" : "text-slate-500 truncate mr-2"}>{selectedSubjectLabel}</span>
                        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                      </div>

                      {isSubjectDropdownOpen && (
                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white text-slate-950 shadow-md">
                          <div className="sticky top-0 z-10 bg-white p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                              <input
                                type="text"
                                className="w-full rounded-sm border border-slate-200 bg-slate-50 px-8 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="Tìm theo tên môn hoặc mã..."
                                value={subjectSearch}
                                onChange={(e) => setSubjectSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="p-1">
                            {filteredSubjects.length === 0 ? (
                              <div className="py-4 text-center text-sm text-slate-500">Không tìm thấy môn học</div>
                            ) : (
                              filteredSubjects.map((subject) => (
                                <div
                                  key={subject.value}
                                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-blue-50 ${selectedSubject === subject.value ? "bg-blue-50 font-semibold text-blue-700" : ""}`}
                                  onClick={() => {
                                    setSelectedSubject(subject.value)
                                    setSubjectSearch("")
                                    setIsSubjectDropdownOpen(false)
                                  }}
                                >
                                  {subject.label}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                      {/* Hidden input to ensure form submission logic if needed */}
                      <input type="hidden" name="subject" value={selectedSubject} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-slate-900 font-semibold">Từ khóa (tùy chọn)</Label>
                  <Input id="tags" placeholder="Ví dụ: đại học, kinh tế, marketing (cách nhau bởi dấu phẩy)" className="border-slate-200 focus-visible:ring-blue-500" />
                </div>

                <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-slate-100">
                  <Button type="button" variant="outline" className="border-slate-200 hover:bg-slate-50" onClick={() => router.back()}>
                    Hủy bỏ
                  </Button>
                  <Button type="submit" disabled={!file || isUploading} className="bg-blue-600 text-white hover:bg-blue-700 min-w-[120px]">
                    {isUploading ? "Đang xử lý..." : "Đăng tải tài liệu"}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </form>
        </div>
      </div>

      <Footer />
    </main>
  )
}
