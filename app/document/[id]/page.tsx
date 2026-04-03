import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Download, Eye, Headset, Star } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import DocumentActions from "./DocumentActions"
import { getDocumentDetailById, getRelatedDocuments } from "@/lib/repositories"

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const documentId = Number(resolvedParams.id)

  if (!Number.isFinite(documentId) || documentId <= 0) {
    notFound()
  }

  const document = await getDocumentDetailById(documentId)
  if (!document) {
    notFound()
  }

  const relatedDocuments = await getRelatedDocuments(document.id, document.subjectId, 6)

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="mb-4 text-2xl font-bold md:text-3xl">{document.title}</h1>

            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                <span>{document.date}</span>
              </div>
              <div className="flex items-center">
                <Eye className="mr-1 h-4 w-4" />
                <span>{document.views}</span>
              </div>
              <div className="flex items-center">
                <Download className="mr-1 h-4 w-4" />
                <span>{document.downloads}</span>
              </div>
              <div className="flex items-center">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(document.rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : i < document.rating
                            ? "fill-yellow-400 text-yellow-400 opacity-50"
                            : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-1">
                  {document.rating} ({document.reviews} đánh giá)
                </span>
              </div>
            </div>

            <div className="mb-8 overflow-hidden rounded-lg bg-white shadow-sm">
              <a href={document.previewUrl} target="_blank" rel="noreferrer" className="block">
                <Image
                  src={document.previewImage || "/placeholder.svg"}
                  alt={document.title}
                  width={1200}
                  height={700}
                  className="h-auto w-full object-cover"
                />
              </a>
            </div>

            <Tabs defaultValue="description" className="mb-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Mô tả</TabsTrigger>
                <TabsTrigger value="details">Chi tiết</TabsTrigger>
                <TabsTrigger value="actions">Xem nhanh</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="rounded-b-lg bg-white p-4 shadow-sm">
                <p className="leading-relaxed text-gray-700">{document.description}</p>
              </TabsContent>
              <TabsContent value="details" className="rounded-b-lg bg-white p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Thông tin cơ bản</h3>
                    <ul className="mt-2 space-y-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Định dạng:</span>
                        <span className="font-medium">{document.format}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Ngày đăng:</span>
                        <span className="font-medium">{document.date}</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Thống kê</h3>
                    <ul className="mt-2 space-y-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Lượt xem:</span>
                        <span className="font-medium">{document.views}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Lượt tải:</span>
                        <span className="font-medium">{document.downloads}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Đánh giá:</span>
                        <span className="font-medium">{document.rating}/5</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="actions" className="rounded-b-lg bg-white p-4 shadow-sm">
                <div className="space-y-3 text-sm">
                  <a
                    href={document.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                  >
                    Xem trực tuyến
                  </a>
                  <a
                    href={document.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 inline-flex items-center rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Tải xuống
                  </a>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mb-8">
              <h2 className="mb-4 text-xl font-bold">Tài liệu liên quan</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/document/${doc.id}`}
                    className="block overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-32">
                      <Image src={doc.image || "/placeholder.svg"} alt={doc.title} fill className="object-cover" />
                      <div className="absolute left-2 top-2 rounded bg-green-500 px-2 py-1 text-xs text-white">{doc.date}</div>
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-2 text-sm font-medium transition-colors hover:text-green-500">{doc.title}</h3>
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <div className="mr-3 flex items-center">
                          <Eye className="mr-1 h-3 w-3" />
                          <span>{doc.views}</span>
                        </div>
                        <div className="flex items-center">
                          <Download className="mr-1 h-3 w-3" />
                          <span>{doc.downloads}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {relatedDocuments.length === 0 && (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Chưa có tài liệu liên quan trong cùng môn học.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-lg bg-white p-6 shadow-sm">
              <DocumentActions />

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="font-medium">Thông tin tài liệu</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">Định dạng:</span>
                    <span>{document.format}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">Ngày đăng:</span>
                    <span>{document.date}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">Lượt xem:</span>
                    <span>{document.views}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-gray-500">Lượt tải:</span>
                    <span>{document.downloads}</span>
                  </li>
                </ul>
              </div>

              <Separator className="my-6" />

              <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <Headset className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-blue-900">Hỗ trợ người dùng</h3>
                </div>
                <p className="mb-3 text-sm text-slate-600">
                  Nếu bạn gặp vấn đề khi xem hoặc tải tài liệu, đội ngũ hỗ trợ sẽ phản hồi nhanh để giúp bạn xử lý.
                </p>
                <div className="mb-3 text-xs text-slate-500">Thời gian hỗ trợ: 08:00 - 22:00 mỗi ngày</div>
                <button className="inline-flex items-center rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800">
                  Liên hệ hỗ trợ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
