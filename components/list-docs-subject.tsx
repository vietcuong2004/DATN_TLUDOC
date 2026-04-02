"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Download, Eye, Search, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

type SubjectDocument = {
  id: number
  title: string
  date: string
  views: number
  downloads: number
  rating: number
  image: string
}

interface ListDocsSubjectProps {
  title: string
  subtitle?: string
  documents: SubjectDocument[]
}

export function ListDocsSubject({ title, subtitle, documents }: ListDocsSubjectProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredDocuments = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase()

    if (!normalizedTerm) {
      return documents
    }

    return documents.filter((document) => document.title.toLowerCase().includes(normalizedTerm))
  }, [documents, searchTerm])

  return (
    <section className="mt-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên tài liệu..."
            className="h-12 rounded-full border-slate-200 bg-white pl-11 pr-5 shadow-sm focus-visible:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {filteredDocuments.map((document) => (
          <Card
            key={document.id}
            className="group overflow-hidden border-slate-200 bg-white shadow-[0_12px_30px_-20px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-22px_rgba(15,23,42,0.55)]"
          >
            <Link href={`/document/${document.id}`}>
              <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                <Image
                  src={document.image || "/placeholder.svg"}
                  alt={document.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute left-3 top-3 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                  {document.date}
                </div>
              </div>

              <CardContent className="p-4">
                <h3 className="line-clamp-3 min-h-[4.5rem] text-[17px] font-semibold leading-6 text-slate-950 transition-colors group-hover:text-blue-800">
                  {document.title}
                </h3>
              </CardContent>

              <CardFooter className="flex items-center justify-between px-4 pb-4 text-sm text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span>{document.views}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Download className="h-4 w-4" />
                    <span>{document.downloads}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-slate-600">{document.rating}</span>
                </div>
              </CardFooter>
            </Link>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Không tìm thấy tài liệu phù hợp với từ khóa bạn nhập.
        </div>
      )}
    </section>
  )
}