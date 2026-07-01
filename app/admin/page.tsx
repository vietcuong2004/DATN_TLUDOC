"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { FileText, Edit2, Trash2, Eye, ArrowLeft, Search, Filter, Loader2, ShieldAlert, BookOpen, Clock, DownloadCloud, EyeOff, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface AdminDocument {
  id: number
  title: string
  description: string | null
  created_at: string
  views_count: number
  downloads_count: number
  file_name: string | null
  file_ext: string | null
  drive_file_id: string | null
  subject_id: number
  subject_name: string
  subject_code: string
  uploader_name: string | null
}

interface Subject {
  id: number
  code: string
  name: string
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const router = useRouter()

  const [documents, setDocuments] = useState<AdminDocument[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Freeze left columns count (default: 1, only ID column)
  const [freezeLeftCount, setFreezeLeftCount] = useState<number>(1)

  // Sorting states
  const [sortBy, setSortBy] = useState<string>("created_at")
  const [sortOrder, setSortOrder] = useState<string>("DESC")

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(field)
      setSortOrder("DESC")
    }
    setCurrentPage(1)
  }

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 inline-block text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
    }
    if (sortOrder === "ASC") {
      return <ArrowUp className="ml-1 h-3.5 w-3.5 inline-block text-blue-600 font-bold" />
    }
    return <ArrowDown className="ml-1 h-3.5 w-3.5 inline-block text-blue-600 font-bold" />
  }

  // For Edit Action
  const [editingDoc, setEditingDoc] = useState<AdminDocument | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editSubjectId, setEditSubjectId] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  // For View Action
  const [viewingDoc, setViewingDoc] = useState<AdminDocument | null>(null)

  // For Delete Action
  const [deletingDoc, setDeletingDoc] = useState<AdminDocument | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true"
      const userData = localStorage.getItem("user")
      if (loggedIn && userData) {
        try {
          const user = JSON.parse(userData)
          if (user.role === "admin") {
            setIsAdmin(true)
            return
          }
        } catch (e) {
          console.error(e)
        }
      }
      setIsAdmin(false)
    }
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", String(currentPage))
      params.append("limit", String(itemsPerPage))
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      if (selectedSubjectFilter !== "all") {
        params.append("subjectId", selectedSubjectFilter)
      }

      const res = await fetch(`/api/admin/documents?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setDocuments(data.documents)
        setTotalCount(data.total ?? 0)
        setSubjects(data.subjects)
      } else {
        toast.error("Lỗi khi tải dữ liệu", { description: data.message })
      }
    } catch (e) {
      toast.error("Lỗi hệ thống", { description: "Không thể kết nối tới máy chủ" })
    } finally {
      setIsLoading(false)
    }
  }

  // Load when filters, page or sorting changes
  useEffect(() => {
    if (isAdmin === true) {
      loadData()
    }
  }, [isAdmin, currentPage, selectedSubjectFilter, sortBy, sortOrder])

  // Debounced search logic to avoid fast keystroke API spam
  useEffect(() => {
    if (isAdmin === true) {
      const handler = setTimeout(() => {
        loadData()
      }, 400)
      return () => clearTimeout(handler)
    }
  }, [searchQuery])

  const handleOpenEdit = (doc: AdminDocument) => {
    setEditingDoc(doc)
    setEditTitle(doc.title)
    setEditDesc(doc.description || "")
    setEditSubjectId(String(doc.subject_id))
  }

  const handleSaveEdit = async () => {
    // Luồng ngoại lệ 4a: Nhập thông tin sửa không hợp lệ (để trống tiêu đề)
    if (!editTitle.trim()) {
      toast.error("Lỗi nhập liệu", { description: "Tiêu đề tài liệu không được để trống." })
      return
    }
    if (!editSubjectId) {
      toast.error("Lỗi nhập liệu", { description: "Vui lòng chọn môn học phù hợp." })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDoc?.id,
          title: editTitle,
          description: editDesc,
          subjectId: Number(editSubjectId)
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Thành công", { description: "Đã cập nhật thông tin tài liệu." })
        setEditingDoc(null)
        loadData()
      } else {
        toast.error("Cập nhật thất bại", { description: data.message })
      }
    } catch (e) {
      toast.error("Lỗi hệ thống", { description: "Không thể gửi dữ liệu tới máy chủ." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingDoc) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/documents?id=${deletingDoc.id}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Xóa tài liệu thành công", { description: "Tài liệu đã được gỡ khỏi hệ thống và Google Drive." })
        setDeletingDoc(null)
        loadData()
      } else {
        // Luồng ngoại lệ 5a: Lỗi kết nối Google Drive API khi xóa, giữ nguyên bản ghi MySQL
        toast.error("Không thể xóa tài liệu", {
          description: data.message,
          duration: 10000
        })
      }
    } catch (e) {
      toast.error("Lỗi hệ thống", { description: "Không thể kết nối để thực hiện thao tác xóa." })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return "--"
      const day = `${d.getDate()}`.padStart(2, "0")
      const month = `${d.getMonth() + 1}`.padStart(2, "0")
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return "--"
    }
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pageNumbers = []
    let startPage = Math.max(1, currentPage - 4)
    let endPage = Math.min(totalPages, startPage + 9)
    if (endPage - startPage < 9) {
      startPage = Math.max(1, endPage - 9)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <div className="flex items-center justify-between px-2 py-3 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm mt-3">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                currentPage === page
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-400 mr-2">
            Trang {currentPage}/{totalPages} ({totalCount} tài liệu)
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent px-3 py-1.5 rounded-lg border border-blue-100 bg-white disabled:border-slate-100 disabled:text-slate-400 shadow-sm transition-all cursor-pointer"
          >
            Trước
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent px-3 py-1.5 rounded-lg border border-blue-100 bg-white disabled:border-slate-100 disabled:text-slate-400 shadow-sm transition-all ml-1 cursor-pointer"
          >
            Tiếp
          </button>
        </div>
      </div>
    )
  }

  // Access Denied Screen
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-100 shadow-[0_18px_50px_-30px_rgba(239,68,68,0.25)]">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Không có quyền truy cập</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Trang web này chỉ dành cho Quản trị viên hệ thống. Vui lòng đăng nhập bằng tài khoản Admin để tiếp tục.
              </p>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 font-semibold" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại Trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading Screen
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Đang xác thực thông tin...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.04),_transparent_40%),linear-gradient(to_bottom,_#f8fafc,_#f1f5f9)] py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header Panel */}
          <div className="relative mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 md:p-8 shadow-[0_12px_40px_-20px_rgba(37,99,235,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                <LayoutGrid size={12} />
                <span>Trang quản trị viên</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">QUẢN LÝ TÀI LIỆU</h1>
              <p className="text-slate-500 text-sm">
                Xem chi tiết, chỉnh sửa thông tin mô tả, hoặc xóa tài liệu học tập khỏi hệ thống.
              </p>
            </div>
            <Button variant="outline" className="border-slate-200 hover:bg-slate-50 shrink-0 font-semibold" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại Trang chủ
            </Button>
          </div>

          {/* Controls Panel (Search, Filter & Pagination) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm tài liệu bằng tiêu đề, mô tả, môn học hoặc người đăng..."
                  className="pl-11 h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <div className="relative w-full">
                  <Select value={selectedSubjectFilter} onValueChange={(val) => {
                    setSelectedSubjectFilter(val)
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <SelectValue placeholder="Lọc theo môn học" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">Tất cả môn học</SelectItem>
                      {subjects.map(sub => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          [{sub.code}] {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="md:col-span-3 flex gap-2">
                <div className="relative w-full">
                  <Select value={String(freezeLeftCount)} onValueChange={(val) => setFreezeLeftCount(Number(val))}>
                    <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-slate-400" />
                        <span>Cố định: {freezeLeftCount === 1 ? "1 cột (ID)" : freezeLeftCount === 2 ? "2 cột (Tên)" : "3 cột (Mô tả)"}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Cố định 1 cột (ID)</SelectItem>
                      <SelectItem value="2">Cố định 2 cột (ID + Tên)</SelectItem>
                      <SelectItem value="3">Cố định 3 cột (ID + Tên + Mô tả)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {renderPagination()}
          </div>

          {/* Main Table Card */}
          <Card className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-md">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-400">Đang tải danh sách tài liệu...</p>
                </div>
              ) : documents.length > 0 ? (
                <div className="overflow-auto max-h-[600px] w-full relative">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th
                          className={`sticky left-0 top-0 bg-slate-50 z-30 px-6 py-4 border-t border-b border-l border-r border-slate-200/60 w-[80px] min-w-[80px] max-w-[80px] text-center ${freezeLeftCount === 1 ? "border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}
                        >
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button className="mx-auto flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-200/60 text-slate-700 hover:text-slate-900 transition-colors focus:outline-none font-bold cursor-pointer">
                                <span>ID</span>
                                <span className="bg-blue-50 border border-blue-200 text-blue-700 p-0.5 rounded shadow-sm flex items-center justify-center shrink-0">
                                  {renderSortIcon("id")}
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-48 bg-white border border-slate-200 shadow-lg rounded-xl p-1 z-[100]">
                              <DropdownMenuItem onClick={() => { setSortBy("id"); setSortOrder("ASC"); setCurrentPage(1); }} className="flex items-center px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg">
                                Sắp xếp tăng dần (1 → 9)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSortBy("id"); setSortOrder("DESC"); setCurrentPage(1); }} className="flex items-center px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg">
                                Sắp xếp giảm dần (9 → 1)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </th>
                        <th
                          className={`sticky top-0 bg-slate-50 px-6 py-4 border-t border-b border-r border-slate-200/60 w-[360px] min-w-[360px] max-w-[360px] text-center ${freezeLeftCount >= 2 ? "sticky left-[80px] z-30" : "z-10"} ${freezeLeftCount === 2 ? "border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}
                        >
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button className="mx-auto flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-200/60 text-slate-700 hover:text-slate-900 transition-colors focus:outline-none font-bold cursor-pointer">
                                <span>TÊN TÀI LIỆU</span>
                                <span className="bg-blue-50 border border-blue-200 text-blue-700 p-0.5 rounded shadow-sm flex items-center justify-center shrink-0">
                                  {renderSortIcon("title")}
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-48 bg-white border border-slate-200 shadow-lg rounded-xl p-1 z-[100]">
                              <DropdownMenuItem onClick={() => { setSortBy("title"); setSortOrder("ASC"); setCurrentPage(1); }} className="flex items-center px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg">
                                Sắp xếp từ A → Z
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSortBy("title"); setSortOrder("DESC"); setCurrentPage(1); }} className="flex items-center px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg">
                                Sắp xếp từ Z → A
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </th>
                        <th className={`sticky top-0 bg-slate-50 px-6 py-4 border-t border-b border-r border-slate-200/60 w-[280px] min-w-[280px] max-w-[280px] text-center ${freezeLeftCount >= 3 ? "sticky left-[440px] z-30" : "z-10"} ${freezeLeftCount === 3 ? "border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}>MÔ TẢ</th>
                        <th className="sticky top-0 bg-slate-50 z-10 px-6 py-4 border-t border-b border-r border-slate-200/60 text-center">MÔN HỌC</th>
                        <th className="sticky top-0 bg-slate-50 z-10 px-6 py-4 border-t border-b border-r border-slate-200/60 text-center">THỐNG KÊ</th>
                        <th className="sticky top-0 bg-slate-50 z-10 px-6 py-4 border-t border-b border-r border-slate-200/60 text-center">NGƯỜI TẢI LÊN</th>
                        <th
                          className="sticky top-0 bg-slate-50 z-10 px-6 py-4 border-t border-b border-r border-slate-200/60 text-center"
                        >
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button className="mx-auto flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-200/60 text-slate-700 hover:text-slate-900 transition-colors focus:outline-none font-bold cursor-pointer">
                                <span>NGÀY TẠO</span>
                                <span className="bg-blue-50 border border-blue-200 text-blue-700 p-0.5 rounded shadow-sm flex items-center justify-center shrink-0">
                                  {renderSortIcon("created_at")}
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-48 bg-white border border-slate-200 shadow-lg rounded-xl p-1 z-[100]">
                              <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortOrder("DESC"); setCurrentPage(1); }} className="flex items-center px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg">
                                Sắp xếp mới nhất
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortOrder("ASC"); setCurrentPage(1); }} className="flex items-center px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg">
                                Sắp xếp cũ nhất
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </th>
                        <th className="sticky top-0 bg-slate-50 z-10 px-6 py-4 border-t border-b border-r border-slate-200/60 text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="group hover:bg-slate-50 transition-colors">
                          <td className={`sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 px-6 py-4 font-mono font-bold text-slate-400 text-xs whitespace-nowrap border-b border-l border-r border-slate-200/60 w-[80px] min-w-[80px] max-w-[80px] ${freezeLeftCount === 1 ? "border-r-2 border-slate-300" : ""}`}>
                            #{doc.id}
                          </td>
                          <td className={`${freezeLeftCount >= 2 ? "sticky left-[80px] bg-white group-hover:bg-slate-50 transition-colors z-10" : ""} px-6 py-4 border-b border-r border-slate-200/60 w-[360px] min-w-[360px] max-w-[360px] ${freezeLeftCount === 2 ? "border-r-2 border-slate-300" : ""}`}>
                            <div className="flex items-start gap-3">
                              <div className="mt-1 h-10 w-10 shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase border border-blue-100">
                                {doc.file_ext || "PDF"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 line-clamp-2 leading-snug" title={doc.title}>
                                  {doc.title}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">
                                  {doc.file_name || "Chưa có file"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={`${freezeLeftCount >= 3 ? "sticky left-[440px] bg-white group-hover:bg-slate-50 transition-colors z-10" : ""} px-6 py-4 border-b border-r border-slate-200/60 w-[280px] min-w-[280px] max-w-[280px] ${freezeLeftCount === 3 ? "border-r-2 border-slate-300" : ""}`}>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed" title={doc.description || ""}>
                              {doc.description?.trim() || <span className="text-slate-300 italic">Không có mô tả</span>}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-b border-r border-slate-200/60">
                            <div className="max-w-[200px]">
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100 mb-1">
                                {doc.subject_code}
                              </span>
                              <p className="text-xs text-slate-500 truncate" title={doc.subject_name}>
                                {doc.subject_name}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap border-b border-r border-slate-200/60">
                            <div className="flex flex-col items-center justify-center text-xs gap-1 font-medium text-slate-500">
                              <span className="flex items-center gap-1">
                                <Eye size={12} className="text-slate-400" />
                                {doc.views_count ?? 0} lượt xem
                              </span>
                              <span className="flex items-center gap-1">
                                <DownloadCloud size={12} className="text-slate-400" />
                                {doc.downloads_count ?? 0} tải về
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-b border-r border-slate-200/60">
                            <span className="font-semibold text-slate-900">
                              {doc.uploader_name || "Khách"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium border-b border-r border-slate-200/60">
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} className="text-slate-400" />
                              {formatDate(doc.created_at)}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-b border-r border-slate-200/60 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                                title="Xem chi tiết & Xem trước"
                                onClick={() => setViewingDoc(doc)}
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl"
                                title="Chỉnh sửa thông tin"
                                onClick={() => handleOpenEdit(doc)}
                              >
                                <Edit2 size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                title="Xóa tài liệu"
                                onClick={() => setDeletingDoc(doc)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                  <FileText className="h-16 w-16 text-slate-200 mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Không tìm thấy tài liệu nào</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    Không có tài liệu nào khớp với từ khóa tìm kiếm hoặc bộ lọc môn học của bạn.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />

      {/* VIEW MODAL (Xem chi tiết & Preview) */}
      <Dialog open={viewingDoc !== null} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl w-full p-6 md:p-8 rounded-3xl [&>button]:right-6 [&>button]:top-6">
          {viewingDoc && (
            <>
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
                    {viewingDoc.subject_code} - {viewingDoc.subject_name}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 uppercase border border-slate-200">
                    {viewingDoc.file_ext || "FILE"}
                  </span>
                </div>
                <DialogTitle className="text-xl md:text-2xl font-extrabold text-slate-900 leading-snug">
                  {viewingDoc.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 font-medium leading-relaxed">
                  Đăng bởi <strong className="text-slate-800">{viewingDoc.uploader_name || "Khách"}</strong> vào ngày {formatDate(viewingDoc.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
                <div className="md:col-span-4 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-600" />
                    Metadata tài liệu
                  </h4>
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wider">Tên tệp gốc</span>
                      <span className="text-slate-700 font-semibold break-all">{viewingDoc.file_name || "--"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wider">ID tệp trên Drive</span>
                      <span className="text-slate-700 font-mono select-all break-all">{viewingDoc.drive_file_id || "--"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t pt-3 mt-3">
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider">Lượt xem</span>
                        <span className="text-slate-800 font-extrabold text-sm">{viewingDoc.views_count}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider">Lượt tải</span>
                        <span className="text-slate-800 font-extrabold text-sm">{viewingDoc.downloads_count}</span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider mb-1">Mô tả</span>
                      <p className="text-slate-600 font-medium leading-normal text-justify max-h-[140px] overflow-y-auto">
                        {viewingDoc.description?.trim() || "Không có mô tả chi tiết cho tài liệu này."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-8 flex flex-col justify-between">
                  <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                    <Eye size={16} className="text-blue-600" />
                    Bản xem trước tài liệu
                  </h4>
                  {viewingDoc.drive_file_id ? (
                    <div className="w-full h-[400px] border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                      <iframe
                        src={`https://drive.google.com/file/d/${viewingDoc.drive_file_id}/preview`}
                        className="w-full h-full border-0"
                        allow="autoplay"
                        title={viewingDoc.title}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[400px] border border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center p-4">
                      <EyeOff className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-500">Không có bản xem trước</p>
                      <p className="text-xs text-slate-400 mt-1">Tài liệu này không chứa mã liên kết tệp Google Drive.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button className="rounded-xl px-5" onClick={() => setViewingDoc(null)}>Đóng</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL (Chỉnh sửa thông tin) */}
      <Dialog open={editingDoc !== null} onOpenChange={(open) => !open && !isSaving && setEditingDoc(null)}>
        <DialogContent className="max-w-md w-full p-6 md:p-8 rounded-3xl">
          {editingDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl font-extrabold text-slate-900">
                  Chỉnh sửa thông tin tài liệu
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium">
                  Cập nhật các thông tin hiển thị cơ bản của tài liệu trên hệ thống.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-slate-700 font-bold">Tiêu đề tài liệu <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập tiêu đề mới..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-subject" className="text-slate-700 font-bold">Môn học tương ứng <span className="text-red-500">*</span></Label>
                  <Select value={editSubjectId} onValueChange={setEditSubjectId}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium">
                      <SelectValue placeholder="Chọn môn học tương ứng" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[220px]">
                      {subjects.map((sub) => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          [{sub.code}] {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-desc" className="text-slate-700 font-bold">Mô tả chi tiết</Label>
                  <Textarea
                    id="edit-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/20 min-h-[100px]"
                    placeholder="Mô tả tóm tắt nội dung tài liệu..."
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" className="rounded-xl font-semibold" onClick={() => setEditingDoc(null)} disabled={isSaving}>
                  Hủy
                </Button>
                <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold px-5" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={deletingDoc !== null} onOpenChange={(open) => !open && !isDeleting && setDeletingDoc(null)}>
        <DialogContent className="max-w-md w-full p-6 md:p-8 rounded-3xl">
          {deletingDoc && (
            <>
              <DialogHeader className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="space-y-1 text-center">
                  <DialogTitle className="text-lg font-extrabold text-slate-900">
                    Xác nhận xóa tài liệu?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                    Hành động này sẽ xóa vĩnh viễn tệp vật lý trên Google Drive và bản ghi của tài liệu này trong CSDL. Thao tác này KHÔNG THỂ khôi phục.
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="my-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                <p className="font-bold text-slate-800 leading-snug">{deletingDoc.title}</p>
                <div className="text-slate-400">
                  <span className="font-semibold text-slate-500">Môn học:</span> {deletingDoc.subject_code} - {deletingDoc.subject_name}
                </div>
                <div className="text-slate-400">
                  <span className="font-semibold text-slate-500">Mã tệp Drive:</span> <span className="font-mono">{deletingDoc.drive_file_id || "N/A"}</span>
                </div>
              </div>

              <DialogFooter className="grid grid-cols-2 gap-2 sm:gap-0">
                <Button variant="ghost" className="rounded-xl font-semibold w-full" onClick={() => setDeletingDoc(null)} disabled={isDeleting}>
                  Hủy
                </Button>
                <Button variant="destructive" className="rounded-xl font-semibold w-full bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    "Xác nhận xóa"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
