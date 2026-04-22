"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Download, Eye, Search, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type SubjectDocument = {
  id: number
  title: string
  date: string
  views: number
  downloads: number
  rating: number
  image: string
  fileExt?: string
  downloadUrl?: string
  subjectCode?: string
  subjectName?: string
}

interface ListDocsSubjectProps {
  title: string
  subtitle?: string
  documents: SubjectDocument[]
}

import { DocumentCard } from "@/components/document-card"

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDocuments.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="mt-8 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Không tìm thấy tài liệu</h3>
          <p className="text-sm text-slate-500">Thử tìm kiếm với từ khóa khác xem sao bạn nhé.</p>
        </div>
      )}
    </section>
  )
}