import { useMemo, useState } from "react"
import { DocumentCard } from "@/components/document-card"

export interface SearchResult {
  id: number
  title: string
  date: string
  views: number
  downloads: number
  rating: number
  image: string
  downloadUrl?: string
  fileExt?: string
  subjectCode?: string
  subjectName?: string
  uploaderName?: string
}

interface SearchResultsProps {
  results: SearchResult[]
}

export function SearchResults({ results }: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<"name" | "newest" | "oldest" | "rating" | "downloads">("newest")

  const sortedResults = useMemo(() => {
    const parseDate = (dateText: string) => {
      const [day, month, year] = dateText.split("-").map((item) => Number.parseInt(item, 10))
      if (!day || !month || !year) {
        return 0
      }
      return new Date(year, month - 1, day).getTime()
    }

    const list = [...results]

    list.sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title, "vi")
      }

      if (sortBy === "oldest") {
        return parseDate(a.date) - parseDate(b.date)
      }

      if (sortBy === "rating") {
        return b.rating - a.rating
      }

      if (sortBy === "downloads") {
        return b.downloads - a.downloads
      }

      return parseDate(b.date) - parseDate(a.date)
    })

    return list
  }, [results, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
          <p className="text-sm font-semibold text-slate-700">Tìm thấy {results.length} tài liệu</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sắp xếp theo:</span>
          <select
            className="text-sm border border-slate-200 rounded-xl px-4 py-2 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-blue-300 transition-colors"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "name" | "newest" | "oldest" | "rating" | "downloads")}
          >
            <option value="newest">Mới nhất</option>
            <option value="rating">Đánh giá tốt nhất</option>
            <option value="downloads">Tải xuống nhiều nhất</option>
            <option value="name">Tên A - Z</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedResults.map((result: SearchResult) => (
          <DocumentCard key={result.id} document={result} />
        ))}
      </div>
    </div>
  )
}
