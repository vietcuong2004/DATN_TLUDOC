import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BookOpen, Calendar, Filter, Zap } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { ListDocsSubject } from "@/components/list-docs-subject"
import { getHomepageDocuments } from "@/lib/repositories"

export const metadata: Metadata = {
  title: "Tài liệu mới nhất - TLU Docs",
  description: "Cập nhật những tài liệu, bài giảng mới nhất được đăng tải trên hệ thống TLU Docs.",
}

export default async function LatestDocsPage() {
  // Lấy danh sách tài liệu mới nhất
  const documents = await getHomepageDocuments("latest", 50)

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

            <Badge className="rounded-full bg-green-100 px-3 py-1 text-green-900 hover:bg-green-100 flex items-center gap-1.5 border-green-200">
              <Zap className="h-3 w-3 fill-current" />
              Vừa cập nhật
            </Badge>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-green-100 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.1),_transparent_34%),linear-gradient(135deg,_#f0fdf4_0%,_#ffffff_45%,_#f7fee7_100%)] px-6 py-8 shadow-[0_18px_50px_-25px_rgba(34,197,94,0.25)] md:px-8 md:py-10">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-green-200/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white/80 px-4 py-2 text-sm font-semibold text-green-900 shadow-sm backdrop-blur">
                  <Calendar className="h-4 w-4" />
                  Tài liệu mới nhất
                </div>
                <div>
                  <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                    Cập nhật Tài liệu mới mỗi ngày
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    Theo dõi những tài liệu học tập vừa được tải lên để không bỏ lỡ bất kỳ kiến thức hữu ích nào cho kỳ thi sắp tới.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: `${documents.length} tài liệu`, icon: <BookOpen className="h-4 w-4" /> },
                    { label: "Sắp xếp theo thời gian", icon: <Zap className="h-4 w-4" /> },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      <span className="text-green-600">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-3xl border border-green-100 bg-white/85 p-5 shadow-[0_20px_45px_-25px_rgba(34,197,94,0.3)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg shadow-green-500/20">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Trạng thái</p>
                    <p className="text-lg font-bold text-slate-950">Mới cập nhật</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-green-50/50 p-4 border border-green-100/50">
                    <div className="text-slate-500">Tần suất</div>
                    <div className="mt-1 font-semibold text-slate-950">Hàng ngày</div>
                  </div>
                  <div className="rounded-2xl bg-green-50/50 p-4 border border-green-100/50">
                    <div className="text-slate-500">Tổng số</div>
                    <div className="mt-1 font-semibold text-slate-950">{documents.length} bản ghi</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-900 border border-green-100">
                  <Filter className="h-4 w-4" />
                  Dữ liệu được cập nhật liên tục từ cộng đồng.
                </div>
              </div>
            </div>
          </section>

          <ListDocsSubject
            title="Danh sách tài liệu mới"
            subtitle="Khám phá các tài liệu vừa được chia sẻ"
            documents={documents}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
