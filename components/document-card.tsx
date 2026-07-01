import Link from "next/link"
import Image from "next/image"
import { Download, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export interface DocumentData {
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
  similarity?: number
}

interface DocumentCardProps {
  document: DocumentData
}

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <Card className="group overflow-hidden border-slate-200 hover:border-blue-300 transition-all duration-300 hover:shadow-[0_15px_35px_-12px_rgba(30,64,175,0.15)] bg-white rounded-2xl flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Image Section */}
        <div className="relative h-48 w-full shrink-0 overflow-hidden bg-slate-50 border-b border-blue-100 ring-1 ring-blue-600/10 group-hover:ring-blue-600/30 transition-all">
          <Image
            src={document.image || "/placeholder.svg"}
            alt={document.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-0 left-0 w-full h-full border-4 border-white/20 pointer-events-none"></div>
          <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
            {document.fileExt && document.fileExt !== "FILE" ? document.fileExt.replace(".", "").toUpperCase() : "Tài liệu"}
          </div>
          {typeof document.similarity === "number" && (
            <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1.5 rounded shadow-lg backdrop-blur-sm border border-emerald-500/20 tracking-wider">
              Độ phù hợp {document.similarity}%
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex-1">
            {/* Subject Info */}
            <div className="mb-3">
              <span className="inline-block bg-blue-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm truncate max-w-full">
                {document.subjectCode === "OTHER" ? "Không rõ" : `[${document.subjectCode}] ${document.subjectName}`}
              </span>
            </div>

            {/* Title */}
            <Link href={`/document/${document.id}`} className="block">
              <h3 className="font-bold text-base mb-4 text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-tight h-10">
                {document.title}
              </h3>
            </Link>

            {/* Stats Block */}
            <div className="flex items-center justify-between gap-1 mb-6 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 min-h-[54px]">
              <div className="flex flex-col items-center flex-1">
                <Eye className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-sm font-bold text-slate-700 leading-none mb-1">{document.views}</span>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Lượt xem</span>
              </div>
              <div className="w-px h-10 bg-slate-200 shrink-0"></div>
              <div className="flex flex-col items-center flex-1">
                <Download className="h-4 w-4 text-green-600 mb-1" />
                <span className="text-sm font-bold text-slate-700 leading-none mb-1">{document.downloads}</span>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Lượt tải</span>
              </div>
              <div className="w-px h-10 bg-slate-200 shrink-0"></div>
              <div className="flex flex-col items-center flex-1">
                <Star className="h-4 w-4 text-amber-500 fill-current mb-1" />
                <span className="text-sm font-bold text-slate-700 leading-none mb-1">{document.rating}</span>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Đánh giá</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex flex-col gap-4 mt-auto">
            <div className="flex flex-col text-[10px] text-slate-500 gap-0.5">
              <p><span className="font-semibold text-slate-700">Ngày đăng:</span> {document.date}</p>
              <p className="truncate"><span className="font-semibold text-slate-700">Người đăng:</span> {document.uploaderName || "Quản trị viên"}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full">
              <Button variant="outline" className="flex-1 border-slate-200 hover:bg-slate-50 hover:text-blue-700 font-bold rounded-xl h-10 text-xs px-2" asChild>
                <Link href={`/document/${document.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Xem
                </Link>
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg ring-1 ring-blue-700/10 shadow-blue-700/20 h-10 text-xs px-2" asChild>
                <a href={document.downloadUrl || `/document/${document.id}`}>
                  <Download className="mr-2 h-4 w-4" />
                  Tải về
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
