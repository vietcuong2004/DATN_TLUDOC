"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchResults, type SearchResult } from "@/components/search-results"
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react"

type SidebarGroup = {
  group: string
  courses: Array<{ code: string; name: string }>
}

type AdvancedSearchResponse = {
  items: SearchResult[]
}

const DOC_TYPE_OPTIONS = [
  { value: "exam", label: "Đề thi & Kiểm tra" },
  { value: "research", label: "Luận văn & Báo cáo" },
  { value: "slides", label: "Bài giảng & Slide" },
  { value: "lecture", label: "Giáo trình" },
  { value: "other", label: "Biểu mẫu & Tài liệu khác" },
]

const FILTER_CONTROL_CLASS =
  "border-blue-600 text-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white focus-visible:ring-blue-500"

export default function AdvancedSearchPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const [groups, setGroups] = useState<SidebarGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState("all")
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("all")
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])
  const [selectedRating, setSelectedRating] = useState("any")
  const [updatedWithin, setUpdatedWithin] = useState("any")

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadGroups() {
      try {
        const response = await fetch("/api/subjects/groups", { cache: "no-store" })
        const data = (await response.json()) as { groups?: SidebarGroup[] }
        if (isMounted) {
          setGroups(data.groups ?? [])
        }
      } catch {
        if (isMounted) {
          setGroups([])
        }
      }
    }

    void loadGroups()

    return () => {
      isMounted = false
    }
  }, [])

  const allSubjects = useMemo(() => {
    return groups.flatMap((group) => group.courses)
  }, [groups])

  const subjectOptions = useMemo(() => {
    if (selectedGroup === "all") {
      return allSubjects
    }

    const foundGroup = groups.find((group) => group.group === selectedGroup)
    return foundGroup?.courses ?? []
  }, [allSubjects, groups, selectedGroup])

  const runSearch = async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const params = new URLSearchParams()

      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim())
      }

      if (selectedGroup !== "all") {
        params.set("groupName", selectedGroup)
      }

      if (selectedSubjectCode !== "all") {
        params.set("subjectCode", selectedSubjectCode)
      }

      if (selectedDocTypes.length > 0) {
        params.set("docTypes", selectedDocTypes.join(","))
      }

      if (selectedRating !== "any") {
        const minRating = Number.parseInt(selectedRating, 10)
        if (!Number.isNaN(minRating)) {
          params.set("minRating", String(minRating))
        }
      }

      if (updatedWithin !== "any") {
        params.set("updatedWithin", updatedWithin)
      }

      const response = await fetch(`/api/search/advanced?${params.toString()}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Không thể lấy dữ liệu tìm kiếm")
      }

      const data = (await response.json()) as AdvancedSearchResponse
      setSearchResults(data.items ?? [])
    } catch {
      setSearchResults([])
      setErrorMessage("Có lỗi khi tìm kiếm. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void runSearch()
  }

  const toggleDocType = (docType: string, checked: boolean) => {
    setSelectedDocTypes((previous) => {
      if (checked) {
        if (previous.includes(docType)) {
          return previous
        }
        return [...previous, docType]
      }
      return previous.filter((item) => item !== docType)
    })
  }

  const clearFilters = () => {
    setSelectedGroup("all")
    setSelectedSubjectCode("all")
    setSelectedDocTypes([])
    setSelectedRating("any")
    setUpdatedWithin("any")
  }

  const handleGroupChange = (nextGroup: string) => {
    setSelectedGroup(nextGroup)

    if (nextGroup === "all") {
      return
    }

    const nextSubjects = groups.find((group) => group.group === nextGroup)?.courses ?? []
    const currentExists = nextSubjects.some((course) => course.code === selectedSubjectCode)

    if (!currentExists) {
      setSelectedSubjectCode("all")
    }
  }

  return (
    <>
      <Navbar />
      <main className="bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%),radial-gradient(circle_at_85%_20%,_rgba(14,165,233,0.12),_transparent_40%),linear-gradient(to_bottom,_#f8fbff,_#f1f5f9)]">
        <div className="container mx-auto px-4 py-8 lg:py-10">
          <section className="relative mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white/85 p-6 shadow-[0_20px_50px_-28px_rgba(30,64,175,0.35)] backdrop-blur md:p-8">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />

            <div className="relative mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Truy vấn thông minh
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Tìm kiếm nâng cao</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                  Kết hợp từ khóa và bộ lọc để tìm đúng tài liệu bạn cần nhanh hơn.
                </p>
              </div>

              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 md:hidden"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Bộ lọc
              </Button>
            </div>

            <form onSubmit={handleSearch} className="relative z-10">
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Nhập từ khóa tìm kiếm (tên tài liệu, tên môn học, mã môn...)"
                    className="h-11 border-0 bg-transparent pl-11 shadow-none focus-visible:ring-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 rounded-xl bg-blue-700 px-6 font-semibold hover:bg-blue-800"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang tìm..." : "Tìm kiếm"}
                </Button>
              </div>
              {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
            </form>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="hidden md:block">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex flex-col">
                <div className="sticky top-0 z-50 flex items-center justify-between border-b border-blue-100 bg-[radial-gradient(circle_at_top_left,_#f0f7ff_0%,_#ffffff_100%)] px-6 py-4 shadow-sm backdrop-blur-md">
                  <h2 className="text-lg font-extrabold tracking-tight text-blue-900">Bộ lọc tìm kiếm</h2>
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 active:scale-95 group"
                  >
                    <X className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 group-hover:scale-110" />
                    <span>Xóa bộ lọc</span>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Ngành học</Label>
                    <Select value={selectedGroup} onValueChange={handleGroupChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả ngành học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả ngành học</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.group} value={group.group}>
                            {group.group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Môn học</Label>
                    <Select value={selectedSubjectCode} onValueChange={setSelectedSubjectCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả môn học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả môn học</SelectItem>
                        {subjectOptions.map((course) => (
                          <SelectItem key={course.code} value={course.code}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Loại tài liệu</Label>
                    <div className="space-y-2">
                      {DOC_TYPE_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`doc-type-${option.value}`}
                            className={FILTER_CONTROL_CLASS}
                            checked={selectedDocTypes.includes(option.value)}
                            onCheckedChange={(checked) => toggleDocType(option.value, checked === true)}
                          />
                          <Label htmlFor={`doc-type-${option.value}`} className="text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Đánh giá</Label>
                    <RadioGroup value={selectedRating} onValueChange={setSelectedRating}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="any" id="rating-any" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="rating-any" className="text-sm">
                          Tất cả
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="4" id="rating-4" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="rating-4" className="text-sm">
                          4 sao trở lên
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3" id="rating-3" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="rating-3" className="text-sm">
                          3 sao trở lên
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="rating-2" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="rating-2" className="text-sm">
                          2 sao trở lên
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Thời gian cập nhật</Label>
                    <RadioGroup value={updatedWithin} onValueChange={setUpdatedWithin}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="any" id="time-any" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="time-any" className="text-sm">
                          Tất cả
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="week" id="time-week" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="time-week" className="text-sm">
                          Trong tuần
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="month" id="time-month" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="time-month" className="text-sm">
                          Trong tháng
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="year" id="time-year" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="time-year" className="text-sm">
                          Trong năm
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-6">
                    <Button className="w-full bg-blue-700 hover:bg-blue-800 font-bold h-11 rounded-xl shadow-lg ring-1 ring-blue-700/10 shadow-blue-700/20" onClick={runSearch}>
                      Áp dụng bộ lọc
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {isFilterOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-white md:hidden flex flex-col">
                <div className="sticky top-0 z-50 flex items-center justify-between border-b border-blue-100 bg-[radial-gradient(circle_at_top_left,_#f0f7ff_0%,_#ffffff_100%)] px-6 py-5 shadow-sm">
                  <h2 className="text-xl font-extrabold tracking-tight text-blue-900">Bộ lọc tìm kiếm</h2>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-lg border-2 border-white hover:bg-red-600 transition-all hover:scale-105"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Ngành học</Label>
                    <Select value={selectedGroup} onValueChange={handleGroupChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả ngành học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả ngành học</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.group} value={group.group}>
                            {group.group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Môn học</Label>
                    <Select value={selectedSubjectCode} onValueChange={setSelectedSubjectCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả môn học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả môn học</SelectItem>
                        {subjectOptions.map((course) => (
                          <SelectItem key={course.code} value={course.code}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Loại tài liệu</Label>
                    <div className="space-y-2">
                      {DOC_TYPE_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`m-doc-type-${option.value}`}
                            className={FILTER_CONTROL_CLASS}
                            checked={selectedDocTypes.includes(option.value)}
                            onCheckedChange={(checked) => toggleDocType(option.value, checked === true)}
                          />
                          <Label htmlFor={`m-doc-type-${option.value}`} className="text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Đánh giá</Label>
                    <RadioGroup value={selectedRating} onValueChange={setSelectedRating}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="any" id="m-rating-any" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-rating-any" className="text-sm">
                          Tất cả
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="4" id="m-rating-4" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-rating-4" className="text-sm">
                          4 sao trở lên
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3" id="m-rating-3" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-rating-3" className="text-sm">
                          3 sao trở lên
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="m-rating-2" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-rating-2" className="text-sm">
                          2 sao trở lên
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Thời gian cập nhật</Label>
                    <RadioGroup value={updatedWithin} onValueChange={setUpdatedWithin}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="any" id="m-time-any" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-time-any" className="text-sm">
                          Tất cả
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="week" id="m-time-week" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-time-week" className="text-sm">
                          Trong tuần
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="month" id="m-time-month" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-time-month" className="text-sm">
                          Trong tháng
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="year" id="m-time-year" className={FILTER_CONTROL_CLASS} />
                        <Label htmlFor="m-time-year" className="text-sm">
                          Trong năm
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-3 pt-6 border-t mt-6 mb-8">
                    <Button
                      className="w-full bg-blue-700 hover:bg-blue-800 font-bold h-12 rounded-xl shadow-lg shadow-blue-700/20"
                      onClick={() => {
                        runSearch()
                        setIsFilterOpen(false)
                      }}
                    >
                      Áp dụng bộ lọc
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-slate-500 hover:text-red-500 hover:bg-red-50 font-bold h-12 rounded-xl transition-all flex items-center justify-center gap-2"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4" />
                      Làm mới bộ lọc
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-3">
              {searchResults.length > 0 ? (
                <SearchResults results={searchResults} />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
                  <Search className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium">Chưa có kết quả tìm kiếm</h3>
                  <p className="mb-4 text-gray-500">
                    Hãy nhập từ khóa và sử dụng bộ lọc để tìm kiếm tài liệu phù hợp với nhu cầu của bạn.
                  </p>
                  <p className="text-sm text-gray-500">Gợi ý: Thử tìm kiếm với từ khóa ngắn hơn hoặc sử dụng từ khóa khác.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
