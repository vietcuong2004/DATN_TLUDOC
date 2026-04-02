import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen, Calendar, Filter } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { ListDocsSubject } from "@/components/list-docs-subject"
import { getCourseByCode } from "@/lib/curriculum"

type SubjectPageProps = {
  params: Promise<{ subjectID: string }>
}

function buildDocuments(subjectID: string, subjectName: string) {
  return [
    {
      id: 1,
      title: `${subjectID} - Bộ đề cương và câu hỏi trọng tâm cho ${subjectName}`,
      date: "08-5-2024",
      views: 1250,
      downloads: 320,
      rating: 4.7,
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 2,
      title: `${subjectID} - Bài tập và hướng dẫn tự học ${subjectName}`,
      date: "07-8-2024",
      views: 980,
      downloads: 245,
      rating: 4.4,
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 3,
      title: `${subjectID} - Slide bài giảng tổng hợp ${subjectName}`,
      date: "15-10-2024",
      views: 1560,
      downloads: 410,
      rating: 4.8,
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 4,
      title: `${subjectID} - Tài liệu ôn thi ${subjectName} có đáp án`,
      date: "10-3-2024",
      views: 890,
      downloads: 210,
      rating: 4.2,
      image: "/placeholder.svg?height=200&width=300",
    },
  ]
}

export async function generateMetadata({ params }: SubjectPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const subjectData = getCourseByCode(resolvedParams.subjectID)

  if (!subjectData) {
    return {
      title: "Tài liệu môn học",
    }
  }

  return {
    title: `Tài liệu của môn ${subjectData.course.code} - ${subjectData.course.name}`,
    description: `Danh sách tài liệu, bài giảng và đề cương cho môn ${subjectData.course.name}.`,
  }
}

export default async function SubjectDocumentsPage({ params }: SubjectPageProps) {
  const resolvedParams = await params
  const subjectData = getCourseByCode(resolvedParams.subjectID)

  if (!subjectData) {
    notFound()
  }

  const { course, group } = subjectData
  const documents = buildDocuments(course.code, course.name)

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

            <Badge className="rounded-full bg-blue-100 px-3 py-1 text-blue-900 hover:bg-blue-100">{group.group}</Badge>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.16),_transparent_34%),linear-gradient(135deg,_#eff6ff_0%,_#ffffff_45%,_#f8fbff_100%)] px-6 py-8 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.35)] md:px-8 md:py-10">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm backdrop-blur">
                  <BookOpen className="h-4 w-4" />
                  Tài liệu của môn {course.code}
                </div>
                <div>
                  <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                    Tài liệu của môn {course.code} - {course.name}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    Tổng hợp tài liệu học tập, slide bài giảng, đề cương và bộ câu hỏi ôn thi dành riêng cho môn học này.
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
                      <span className="text-blue-800">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-3xl border border-blue-100 bg-white/85 p-5 shadow-[0_20px_45px_-25px_rgba(37,99,235,0.35)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900 text-white">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Môn học</p>
                    <p className="text-lg font-bold text-slate-950">{course.code}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Nhóm môn</div>
                    <div className="mt-1 font-semibold text-slate-950">{group.group}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Danh sách tài liệu</div>
                    <div className="mt-1 font-semibold text-slate-950">4 bài gợi ý</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <Filter className="h-4 w-4" />
                  Có thể lọc nhanh theo loại tài liệu ở các phiên bản tiếp theo.
                </div>
              </div>
            </div>
          </section>

          <ListDocsSubject
            title="Danh sách tài liệu"
            subtitle="Chọn tài liệu phù hợp với nhu cầu học tập của bạn"
            documents={documents}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}