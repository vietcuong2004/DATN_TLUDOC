import Link from "next/link"
import Image from "next/image"
import { Download, Eye } from "lucide-react"
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button variant="link" className="text-green-500 hover:text-green-600">
          Xem tất cả
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="overflow-hidden border transition-shadow hover:shadow-md">
            <Link href={`/document/${doc.id}`}>
              <div className="relative h-40 w-full">
                <Image src={doc.image || "/placeholder.svg"} alt={doc.title} fill className="object-cover" />
                <div className="absolute left-2 top-2 rounded bg-green-500 px-2 py-1 text-xs text-white">{doc.date}</div>
              </div>

              <CardContent className="p-4">
                <h3 className="line-clamp-2 font-medium transition-colors hover:text-green-500">{doc.title}</h3>
              </CardContent>

              <CardFooter className="flex items-center p-4 pt-0 text-sm text-gray-500">
                <div className="mr-4 flex items-center">
                  <Eye className="mr-1 h-4 w-4" />
                  <span>{doc.views}</span>
                </div>
                <div className="flex items-center">
                  <Download className="mr-1 h-4 w-4" />
                  <span>{doc.downloads}</span>
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