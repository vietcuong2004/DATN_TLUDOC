import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BookOpen, Calendar, Filter, Flame } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { ListDocsSubject } from "@/components/list-docs-subject"
import { getHomepageDocuments } from "@/lib/repositories"

export const metadata: Metadata = {
  title: "Tài liệu phổ biến - TLU Docs",
  description: "Khám phá những tài liệu được sinh viên TLU xem và tải về nhiều nhất.",
}

export default async function PopularDocsPage() {
  // Lấy danh sách tài liệu phổ biến (lượt xem cao nhất)
  const documents = await getHomepageDocuments("popular", 50)

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

            <Badge className="rounded-full bg-orange-100 px-3 py-1 text-orange-900 hover:bg-orange-100 flex items-center gap-1.5 border-orange-200">
              <Flame className="h-3 w-3 fill-current" />
              Đang thịnh hành
            </Badge>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.1),_transparent_34%),linear-gradient(135deg,_#fff7ed_0%,_#ffffff_45%,_#fffaf5_100%)] px-6 py-8 shadow-[0_18px_50px_-25px_rgba(249,115,22,0.25)] md:px-8 md:py-10">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-orange-200/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-red-200/30 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-900 shadow-sm backdrop-blur">
                  <Flame className="h-4 w-4" />
                  Top Tài liệu phổ biến
                </div>
                <div>
                  <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                    Những tài liệu được tìm đọc nhiều nhất
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    Tổng hợp những tài liệu có lượt truy cập và tải về cao nhất, phản ánh nhu cầu thực tế của sinh viên qua các kỳ thi.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: `${documents.length} tài liệu`, icon: <BookOpen className="h-4 w-4" /> },
                    { label: "Sắp xếp theo lượt xem", icon: <Flame className="h-4 w-4" /> },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      <span className="text-orange-600">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-3xl border border-orange-100 bg-white/85 p-5 shadow-[0_20px_45px_-25px_rgba(249,115,22,0.3)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-500/20">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Xu hướng</p>
                    <p className="text-lg font-bold text-slate-950">Đang thịnh hành</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-orange-50/50 p-4 border border-orange-100/50">
                    <div className="text-slate-500">Tiêu chí</div>
                    <div className="mt-1 font-semibold text-slate-950">Lượt xem & Tải</div>
                  </div>
                  <div className="rounded-2xl bg-orange-50/50 p-4 border border-orange-100/50">
                    <div className="text-slate-500">Quy mô</div>
                    <div className="mt-1 font-semibold text-slate-950">{documents.length} bản ghi</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-900 border border-orange-100">
                  <Filter className="h-4 w-4" />
                  Được cộng đồng sinh viên quan tâm nhất hiện nay.
                </div>
              </div>
            </div>
          </section>

          <ListDocsSubject
            title="Danh sách tài liệu phổ biến"
            subtitle="Các tài liệu có giá trị tham khảo cao nhất"
            documents={documents}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
