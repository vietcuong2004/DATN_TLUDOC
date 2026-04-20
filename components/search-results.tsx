import Link from "next/link"
import Image from "next/image"
import { useMemo, useState } from "react"
import { Download, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
        {sortedResults.map((result) => (
          <Card key={result.id} className="group overflow-hidden border-slate-200 hover:border-blue-300 transition-all duration-300 hover:shadow-[0_15px_35px_-12px_rgba(30,64,175,0.15)] bg-white rounded-2xl flex flex-col">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="relative h-48 w-full shrink-0 overflow-hidden bg-slate-50 border-b border-blue-100 ring-1 ring-blue-600/10 group-hover:ring-blue-600/30 transition-all">
                <Image
                  src={result.image || "/placeholder.svg"}
                  alt={result.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-0 left-0 w-full h-full border-4 border-white/20 pointer-events-none"></div>
                <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
                  {result.fileExt && result.fileExt !== "FILE" ? result.fileExt.replace(".", "").toUpperCase() : "Tài liệu"}
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex-1">
                  <div className="mb-3">
                    <span className="inline-block bg-blue-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm truncate max-w-full">
                      [{result.subjectCode || "CSE123"}] {result.subjectName || "Tên môn học"}
                    </span>
                  </div>

                  <Link href={`/document/${result.id}`} className="block">
                    <h3 className="font-bold text-base mb-4 text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-tight h-10">
                      {result.title}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between gap-1 mb-6 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 min-h-[54px]">
                    <div className="flex flex-col items-center flex-1">
                      <Eye className="h-4 w-4 text-blue-600 mb-1" />
                      <span className="text-sm font-bold text-slate-700 leading-none mb-1">{result.views}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Lượt xem</span>
                    </div>
                    <div className="w-px h-10 bg-slate-200 shrink-0"></div>
                    <div className="flex flex-col items-center flex-1">
                      <Download className="h-4 w-4 text-green-600 mb-1" />
                      <span className="text-sm font-bold text-slate-700 leading-none mb-1">{result.downloads}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Lượt tải</span>
                    </div>
                    <div className="w-px h-10 bg-slate-200 shrink-0"></div>
                    <div className="flex flex-col items-center flex-1">
                      <Star className="h-4 w-4 text-amber-500 fill-current mb-1" />
                      <span className="text-sm font-bold text-slate-700 leading-none mb-1">{result.rating}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Đánh giá</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-auto">
                  <div className="flex flex-col text-[10px] text-slate-500 gap-0.5">
                    <p><span className="font-semibold text-slate-700">Ngày đăng:</span> {result.date}</p>
                    <p className="truncate"><span className="font-semibold text-slate-700">Người đăng:</span> {result.uploaderName || "Quản trị viên"}</p>
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <Button variant="outline" className="flex-1 border-slate-200 hover:bg-slate-50 hover:text-blue-700 font-bold rounded-xl h-10 text-xs px-2" asChild>
                      <Link href={`/document/${result.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Xem
                      </Link>
                    </Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg ring-1 ring-blue-700/10 shadow-blue-700/20 h-10 text-xs px-2" asChild>
                      <a href={result.downloadUrl || `/document/${result.id}`}>
                        <Download className="mr-2 h-4 w-4" />
                        Tải về
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
