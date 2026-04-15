import Link from "next/link"
import Image from "next/image"
import { Download, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getHomepageDocuments } from "@/lib/repositories"

interface ListDocsHomepageProps {
  title: string
}

export async function ListDocsHomepage({ title }: ListDocsHomepageProps) {
  const normalizedTitle = title.toLowerCase()
  const mode = normalizedTitle.includes("nổi bật") ? "featured" : normalizedTitle.includes("mới") ? "latest" : "popular"
  const documents = await getHomepageDocuments(mode, 8)

  return (
    <section className="py-8">
      <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-green-500"></div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        <Link href={`/${mode === "featured" ? "featured-docs" : mode === "latest" ? "latest-docs" : "popular-docs"}`}>
          <Button variant="outline" size="sm" className="rounded-full border-blue-200 px-4 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
            Xem tất cả
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="group overflow-hidden border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_-15px_rgba(15,23,42,0.4)]">
            <Link href={`/document/${doc.id}`}>
              <div className="relative h-40 w-full overflow-hidden">
                <Image src={doc.image || "/placeholder.svg"} alt={doc.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute left-2 top-2 rounded bg-green-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm">{doc.date}</div>
              </div>

              <CardContent className="p-4">
                <h3 className="line-clamp-2 font-medium transition-colors hover:text-green-500">{doc.title}</h3>
              </CardContent>

              <CardFooter className="flex items-center justify-between p-4 pt-0 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{doc.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span>{doc.downloads}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="font-medium text-slate-600">{doc.rating}</span>
                </div>
              </CardFooter>
            </Link>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Chưa có tài liệu nào trong cơ sở dữ liệu cho danh mục này.
        </div>
      )}
    </section>
  )
}