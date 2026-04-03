import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Download, Eye, Headset, Star } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import DocumentActions from "./DocumentActions"
import DocumentViewer from "./DocumentViewer"
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
            {/* Title Section */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <h1 className="mb-4 text-3xl font-bold text-slate-900">{document.title}</h1>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{document.date}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Eye className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{document.views} lượt xem</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Download className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{document.downloads} lượt tải</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
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
                  <span className="font-medium text-slate-700">
                    {document.rating}/5 ({document.reviews} đánh giá)
                  </span>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="mb-8 rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <DocumentViewer
                previewUrl={document.previewUrl}
                title={document.title}
                downloadUrl={document.downloadUrl}
              />
            </div>

            <Tabs defaultValue="description" className="mb-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Mô tả</TabsTrigger>
                <TabsTrigger value="details">Chi tiết</TabsTrigger>
                <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
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
              <TabsContent value="reviews" className="rounded-b-lg bg-white p-4 shadow-sm">
                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      author: "Nguyễn Văn A",
                      rating: 5,
                      text: "Tài liệu rất hữu ích, nội dung chi tiết và dễ hiểu. Recommend cho mọi người!",
                      date: "20-03-2026",
                      avatar: "https://i.pravatar.cc/150?u=user1"
                    },
                    {
                      id: 2,
                      author: "Trần Thị B",
                      rating: 4,
                      text: "Nội dung tốt nhưng hình ảnh chất lượng không cao. Nhìn chung vẫn ổn.",
                      date: "18-03-2026",
                      avatar: "https://i.pravatar.cc/150?u=user2"
                    },
                    {
                      id: 3,
                      author: "Lê Văn C",
                      rating: 5,
                      text: "Tuyệt vời! Giải thích rất rõ ràng, đã giúp tôi vượt qua môn học này.",
                      date: "15-03-2026",
                      avatar: "https://i.pravatar.cc/150?u=user3"
                    },
                    {
                      id: 4,
                      author: "Phạm Minh D",
                      rating: 3,
                      text: "Được bình thường, còn thiếu một số chủ đề quan trọng.",
                      date: "10-03-2026",
                      avatar: "https://i.pravatar.cc/150?u=user4"
                    }
                  ].map((review) => (
                    <div key={review.id} className="border-b border-slate-200 pb-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <Image
                          src={review.avatar}
                          alt={review.author}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900">{review.author}</h4>
                            <span className="text-xs text-slate-500">{review.date}</span>
                          </div>
                          <div className="my-1 flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-slate-700">{review.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mb-8 lg:hidden">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <DocumentActions
                  downloadUrl={document.downloadUrl}
                  fileName={document.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}
                />
              </div>
            </div>

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
            <div className="space-y-6">
              {/* Section 1: Thông tin tài liệu */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Thông tin tài liệu</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Định dạng:</span>
                    <span className="font-medium text-slate-900">{document.format}</span>
                  </li>
                  <li className="flex justify-between text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Ngày đăng:</span>
                    <span className="font-medium text-slate-900">{document.date}</span>
                  </li>
                  <li className="flex justify-between text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Lượt xem:</span>
                    <span className="font-medium text-slate-900">{document.views}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-slate-600">Lượt tải:</span>
                    <span className="font-medium text-slate-900">{document.downloads}</span>
                  </li>
                </ul>
              </div>

              {/* Section 2: Tải tài liệu & Viết đánh giá */}
              <div className="hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
                <DocumentActions
                  downloadUrl={document.downloadUrl}
                  fileName={document.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}
                />
              </div>

              {/* Section 3: Hỗ trợ người dùng */}
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Headset className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">Hỗ trợ người dùng</h3>
                </div>
                <p className="mb-4 text-sm text-blue-800/80">
                  Gặp sự cố khi xem hoặc tải tài liệu? Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp bạn.
                </p>
                <div className="mb-4 rounded-lg bg-white/60 p-2 text-center text-xs font-medium text-blue-700">
                  ⏰ Hỗ trợ: 08:00 - 22:00 hàng ngày
                </div>
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-95">
                  💬 Liên hệ hỗ trợ
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
