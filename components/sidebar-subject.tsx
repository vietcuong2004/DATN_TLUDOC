"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Filter, Search } from "lucide-react"
import { curriculumGroups } from "@/lib/curriculum"

type FilterMode = "all" | "required" | "elective"

export function SubjectCategoriesSidebar() {
  const [query, setQuery] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [countsByCode, setCountsByCode] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsExpanded(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadCounts = async () => {
      try {
        const response = await fetch("/api/documents/counts", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Cannot load document counts")
        }

        const payload = (await response.json()) as { counts: Record<string, number> }
        if (isMounted) {
          setCountsByCode(payload.counts ?? {})
        }
      } catch {
        if (isMounted) {
          setCountsByCode({})
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCounts()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return curriculumGroups
      .map((group) => {
        const courses = group.courses
          .map((course) => ({
            ...course,
            documentCount: countsByCode[course.code.toUpperCase()] ?? 0,
          }))
          .filter((course) => {
            const isElective = group.group.startsWith("Tự chọn")
            const matchesFilter =
              filterMode === "all" ||
              (filterMode === "required" && !isElective) ||
              (filterMode === "elective" && isElective)

            if (!matchesFilter) return false
            if (!normalizedQuery) return true

            const haystack = `${group.group} ${course.code} ${course.name}`.toLowerCase()
            return haystack.includes(normalizedQuery)
          })

        return { ...group, courses }
      })
      .filter((group) => group.courses.length > 0)
  }, [countsByCode, filterMode, query])

  const totalResults = filteredGroups.reduce(
    (sum, group) => sum + group.courses.reduce((groupSum, course) => groupSum + course.documentCount, 0),
    0,
  )

  return (
    <aside className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] lg:sticky lg:top-24 ${isExpanded ? "lg:h-[1100px]" : "h-fit"}`}>
      <div className="shrink-0 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-5 py-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 pr-2">
            <h2 className="text-xl font-bold">Danh sách tài liệu</h2>
            <p className="text-sm text-white/75 leading-relaxed">
              Tra cứu theo mã học phần, tên môn hoặc nhóm môn học
            </p>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 backdrop-blur-sm"
            title={isExpanded ? "Thu gọn" : "Mở rộng"}
          >
            {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-white/10 p-2 ring-1 ring-white/10 backdrop-blur-sm">
          <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo mã môn, tên môn..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
            <Filter className="h-3.5 w-3.5" />
            <span>Lọc nhanh</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { key: "all", label: "Tất cả" },
              { key: "required", label: "Bắt buộc" },
              { key: "elective", label: "Tự chọn" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilterMode(item.key as FilterMode)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterMode === item.key
                    ? "bg-white text-blue-950"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={isExpanded ? "mt-4 flex items-center justify-between text-sm text-white/80" : "hidden"}>
          <span>Kết quả phù hợp</span>
          <span className="font-semibold text-white">{totalResults}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-slate-50 px-4 py-4 min-h-0 flex-1 overflow-y-auto lg:pb-6">
        <div className="space-y-4">
          {isLoading && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
              Đang tải danh sách môn học...
            </div>
          )}

          {filteredGroups.map((group) => (
            <section key={group.group} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-blue-950">{group.group}</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {group.courses.reduce((sum, course) => sum + course.documentCount, 0)}
                </span>
              </div>

              <ul className="space-y-1.5">
                {group.courses.map((course) => (
                  <li key={course.code}>
                    <Link
                      href={`/subjects/${course.code}`}
                      className="group flex items-start justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-blue-50 hover:text-blue-800"
                    >
                      <span className="pr-3 leading-5 text-slate-700 group-hover:text-blue-900">
                        <span className="font-semibold text-slate-950">{course.code}</span> - {course.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {course.documentCount} tài liệu
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {!isLoading && filteredGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              Không tìm thấy môn học phù hợp hoặc chưa có dữ liệu trong cơ sở dữ liệu.
            </div>
          )}
        </div>
      </div>
    )}
  </aside>
  )
}
