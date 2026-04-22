import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BookOpen, Calendar, Filter, Star } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { ListDocsSubject } from "@/components/list-docs-subject"
import { getHomepageDocuments } from "@/lib/repositories"

export const metadata: Metadata = {
  title: "Tài liệu nổi bật - TLU Docs",
  description: "Tổng hợp những tài liệu được đánh giá cao nhất và hữu ích nhất tại TLU Docs.",
}

export default async function FeaturedDocsPage() {
  // Lấy danh sách tài liệu nổi bật (đánh giá cao nhất)
  const documents = await getHomepageDocuments("featured", 50)

  return (
    <>
      <Navbar />
      <main className="bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8 lg:py-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:text-blue-700">
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang chủ
            </Link>

            <Badge className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 hover:bg-amber-100 flex items-center gap-1.5 border-amber-200">
              <Star className="h-3 w-3 fill-current" />
              Tài liệu chọn lọc
            </Badge>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-amber-100 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.1),_transparent_34%),linear-gradient(135deg,_#fffbeb_0%,_#ffffff_45%,_#fffcf0_100%)] px-6 py-8 shadow-[0_18px_50px_-25px_rgba(245,158,11,0.25)] md:px-8 md:py-10">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-amber-200/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-orange-200/30 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm backdrop-blur">
                  <Star className="h-4 w-4 fill-current" />
                  Top Tài liệu nổi bật
                </div>
                <div>
                  <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                    Tài liệu nổi bật & Được đánh giá cao
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    Đây là những tài liệu chất lượng nhất, được cộng đồng sinh viên TLU tin dùng và đánh giá cao nhất.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: `${documents.length} tài liệu`, icon: <BookOpen className="h-4 w-4" /> },
                    { label: "Cập nhật mới nhất", icon: <Calendar className="h-4 w-4" /> },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      <span className="text-amber-600">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-3xl border border-amber-100 bg-white/85 p-5 shadow-[0_20px_45px_-25px_rgba(245,158,11,0.3)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Phân loại</p>
                    <p className="text-lg font-bold text-slate-950">Chất lượng cao</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-100/50">
                    <div className="text-slate-500">Tiêu chí</div>
                    <div className="mt-1 font-semibold text-slate-950">Đánh giá 4.5+ ★</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-100/50">
                    <div className="text-slate-500">Số lượng</div>
                    <div className="mt-1 font-semibold text-slate-950">{documents.length} bản ghi</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 border border-amber-100">
                  <Filter className="h-4 w-4" />
                  Tài liệu được sắp xếp theo độ hữu ích giảm dần.
                </div>
              </div>
            </div>
          </section>

          <ListDocsSubject
            title="Tất cả tài liệu nổi bật"
            subtitle="Danh sách các tài liệu được tuyển chọn kỹ lưỡng"
            documents={documents}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
