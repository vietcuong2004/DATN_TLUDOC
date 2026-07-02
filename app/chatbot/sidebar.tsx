import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, BookOpen, Clock, Trash2, PlusCircle } from "lucide-react"

interface HistoryItem {
  id: number
  question: string
  answer: string
  createdAt: string
  document: {
    id: number
    title: string
    image: string
    downloadUrl?: string
  } | null
}

interface ChatbotSidebarProps {
  dbHistory: HistoryItem[]
  isLoadingHistory: boolean
  handleDeleteAllHistory: (e: React.MouseEvent) => Promise<void>
  handleLoadHistory: (item: HistoryItem) => void
  handleDeleteHistoryItem: (e: React.MouseEvent, id: number) => Promise<void>
  handleQuickQuestion: (text: string) => void
  handleNewChat: () => void
  isCreatingNewChat?: boolean
}

export function ChatbotSidebar({
  dbHistory,
  isLoadingHistory,
  handleDeleteAllHistory,
  handleLoadHistory,
  handleDeleteHistoryItem,
  handleQuickQuestion,
  handleNewChat,
  isCreatingNewChat = false,
}: ChatbotSidebarProps) {
  const formatHistoryDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const hours = `${d.getHours()}`.padStart(2, "0")
    const minutes = `${d.getMinutes()}`.padStart(2, "0")
    const day = `${d.getDate()}`.padStart(2, "0")
    const month = `${d.getMonth() + 1}`.padStart(2, "0")
    const year = d.getFullYear()
    return `${hours}:${minutes} - ${day}/${month}/${year}`
  }

  return (
    <>
      <Card className="rounded-2xl border-0 md:border border-blue-100 shadow-none md:shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] bg-transparent md:bg-white">
        <CardContent className="p-0 md:p-4">
          <Tabs defaultValue="suggestions">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="suggestions">Gợi ý</TabsTrigger>
              <TabsTrigger value="history">Lịch sử</TabsTrigger>
            </TabsList>

            <TabsContent value="suggestions" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-orange-500" />
                  Câu hỏi gợi ý
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm h-auto py-2 px-3 break-words text-left whitespace-normal"
                    onClick={() => handleQuickQuestion("Bạn đang có kiến thức về những môn học nào?")}
                  >
                    <span className="break-words whitespace-normal text-left block font-medium text-blue-700">
                      Bạn đang có kiến thức về những môn học nào?
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm h-auto py-2 px-3 break-words text-left whitespace-normal"
                    onClick={() => handleQuickQuestion("Mình cần tài liệu môn CSE492 (Trí tuệ nhân tạo), gợi ý 3 tài liệu mẫu tốt nhất.")}
                  >
                    <span className="break-words whitespace-normal text-left block">
                      Mình cần tài liệu môn CSE492 (Trí tuệ nhân tạo), gợi ý 3 tài liệu mẫu tốt nhất.
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm h-auto py-2 px-3 break-words text-left whitespace-normal"
                    onClick={() => handleQuickQuestion("Con trỏ trong C++ là gì")}
                  >
                    <span className="break-words whitespace-normal text-left block">
                      Con trỏ trong C++ là gì
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm h-auto py-2 px-3 break-words text-left whitespace-normal"
                    onClick={() => handleQuickQuestion("Bảng băm là gì")}
                  >
                    <span className="break-words whitespace-normal text-left block">
                      Bảng băm là gì
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm h-auto py-2 px-3 break-words text-left whitespace-normal"
                    onClick={() => handleQuickQuestion("Tìm kiếm DFS hoạt động thế nào")}
                  >
                    <span className="break-words whitespace-normal text-left block">
                      Tìm kiếm DFS hoạt động thế nào
                    </span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-green-500" />
                  Chủ đề phổ biến
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleQuickQuestion("Tài liệu môn CSE492")}
                  >
                    CSE492 - TTNT
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleQuickQuestion("Tài liệu môn CSE484")}
                  >
                    CSE484 - CSDL
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleQuickQuestion("Tài liệu môn MATH111")}
                  >
                    MATH111
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleQuickQuestion("Nên học gì trước môn CSE205")}
                  >
                    CSE205 - LTNC
                  </Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-blue-500" />
                    Cuộc trò chuyện gần đây
                  </h3>
                  {dbHistory.length > 0 && (
                    <button
                      onClick={handleDeleteAllHistory}
                      className="text-[10px] text-red-500 hover:text-red-700 font-semibold uppercase tracking-wider flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Xóa hết
                    </button>
                  )}
                </div>
                <div className="space-y-3 mt-4 max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {isLoadingHistory ? (
                    <div className="text-sm text-gray-500 p-2 text-center flex flex-col items-center justify-center space-y-2">
                      <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                      <span>Đang tải lịch sử...</span>
                    </div>
                  ) : dbHistory.length > 0 ? (
                    dbHistory.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between text-sm p-3 hover:bg-slate-50 border border-slate-100/50 hover:border-slate-200 bg-white rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow"
                        onClick={() => handleLoadHistory(item)}
                        title={`${formatHistoryDate(item.createdAt)}: ${item.question}`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-slate-700 font-semibold truncate text-sm">
                            {item.question.split("\n\n---MESSAGE_SEP---\n\n")[0]}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            {formatHistoryDate(item.createdAt)}
                          </span>
                        </div>
                        <div
                          onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 opacity-100 md:opacity-0 group-hover:opacity-100 shrink-0"
                          title="Xóa cuộc trò chuyện này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 p-2 text-center">Chưa có lịch sử hội thoại.</div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Button
        onClick={handleNewChat}
        disabled={isCreatingNewChat}
        className="w-full bg-[linear-gradient(110deg,#4f46e5,#3b82f6)] hover:bg-[linear-gradient(110deg,#4338ca,#2563eb)] text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(79,70,229,0.5)] transition-all duration-300 rounded-xl py-6 flex items-center justify-center gap-2 group disabled:opacity-85"
      >
        {isCreatingNewChat ? (
          <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <>
            <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-semibold text-base">Tạo cuộc trò chuyện mới</span>
          </>
        )}
      </Button>
    </>
  )
}
