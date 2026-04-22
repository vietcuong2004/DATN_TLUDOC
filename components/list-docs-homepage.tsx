import Link from "next/link"
import Image from "next/image"
import { Download, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getHomepageDocuments } from "@/lib/repositories"

interface ListDocsHomepageProps {
  title: string
}

import { DocumentCard } from "@/components/document-card"

export async function ListDocsHomepage({ title }: ListDocsHomepageProps) {
  const normalizedTitle = title.toLowerCase()
  const mode = normalizedTitle.includes("nổi bật") ? "featured" : normalizedTitle.includes("mới") ? "latest" : "popular"
  const documents = await getHomepageDocuments(mode, 6)

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
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