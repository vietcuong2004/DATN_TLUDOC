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
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500">Hiển thị {results.length} kết quả</p>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Sắp xếp theo:</span>
          <select
            className="text-sm border rounded-md px-2 py-1"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "name" | "newest" | "oldest" | "rating" | "downloads")}
          >
            <option value="name">Tên</option>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="rating">Đánh giá</option>
            <option value="downloads">Lượt tải</option>
          </select>
        </div>
      </div>

      {sortedResults.map((result) => (
        <Card key={result.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="relative h-48 sm:h-auto sm:w-48 shrink-0">
                <Image src={result.image || "/placeholder.svg"} alt={result.title} fill className="object-cover" />
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                  <Link href={`/document/${result.id}`} className="hover:text-green-500">
                    <h3 className="font-medium text-lg mb-2">{result.title}</h3>
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-3">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{result.views}</span>
                    </div>
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-1" />
                      <span>{result.downloads}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex mr-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(result.rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : i < result.rating
                                  ? "text-yellow-400 fill-yellow-400 opacity-50"
                                  : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span>{result.rating}</span>
                    </div>
                    <div>Ngày đăng: {result.date}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/document/${result.id}`}>
                        <Eye className="mr-1 h-4 w-4" />
                        Xem chi tiết
                      </Link>
                    </Button>
                    <Button size="sm" className="bg-green-500 hover:bg-green-600" asChild>
                      <a href={result.downloadUrl || `/document/${result.id}`}>
                        <Download className="mr-1 h-4 w-4" />
                        Tải xuống
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
