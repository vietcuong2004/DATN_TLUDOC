import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Download, Eye, Headset, Star } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import DocumentActions from "./DocumentActions"
import DocumentViewer from "./DocumentViewer"
import { ReviewHighlightHandler } from "@/components/ReviewHighlightHandler"
import { getDocumentDetailById, getRelatedDocuments, incrementViews, getReviewsByDocumentId } from "@/lib/repositories"

export const dynamic = "force-dynamic"

export default async function DocumentPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; highlight?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const documentId = Number(resolvedParams.id)
  const activeTab = resolvedSearchParams.tab || "description"
  const shouldHighlight = resolvedSearchParams.highlight === "true"

  if (!Number.isFinite(documentId) || documentId <= 0) {
    notFound()
  }

  // Tăng lượt xem
  await incrementViews(documentId)

  const document = await getDocumentDetailById(documentId)
  if (!document) {
    notFound()
  }

  const relatedDocuments = await getRelatedDocuments(document.id, document.subjectId, 6)
  const reviews = await getReviewsByDocumentId(documentId)

  return (
    <>
      <Navbar />
      <ReviewHighlightHandler />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-[#0b3b8f] rounded-lg w-fit border border-blue-100/50">
                <span className="font-bold text-sm">[{document.subjectCode}] {document.subjectName}</span>
              </div>

              <h1 className="mb-6 text-3xl font-bold text-slate-900 leading-tight">{document.title}</h1>

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

            <Tabs defaultValue={activeTab} className="mb-8" id="reviews">
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
                        <span className="text-gray-500">Môn học:</span>
                        <span className="font-medium text-right">[{document.subjectCode}] {document.subjectName}</span>
                      </li>
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
                  {reviews.length > 0 ? (
                    reviews.map((review: any, index: number) => {
                      const isNew = index === 0 && shouldHighlight
                      return (
                        <div 
                          key={review.id} 
                          className={`relative border-b border-slate-200 pb-4 last:border-b-0 transition-all duration-1000 ${
                            isNew ? "bg-green-50/50 -mx-4 px-4 py-4 rounded-lg border-green-200 shadow-sm animate-in fade-in slide-in-from-top-4" : ""
                          }`}
                        >
                          {isNew && (
                            <div className="absolute bottom-4 right-4 flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Vừa gửi</span>
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <Image
                              src={review.avatar || `https://i.pravatar.cc/150?u=${review.id}`}
                              alt={review.author}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full border border-slate-200"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-slate-900">{review.author}</h4>
                                <span className="text-xs text-slate-500">
                                  {new Date(review.created_at).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              <div className="my-1 flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-sm text-slate-700">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      Chưa có đánh giá nào cho tài liệu này. Hãy là người đầu tiên!
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mb-8 lg:hidden">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <DocumentActions
                  documentId={document.id}
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
                    <span className="text-slate-600">Môn học:</span>
                    <span className="font-medium text-slate-900 text-right ml-4">[{document.subjectCode}] {document.subjectName}</span>
                  </li>
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
                  documentId={document.id}
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
