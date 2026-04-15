"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Send, FileText, ThumbsUp, ThumbsDown, Sparkles, BookOpen, Search, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import ChatbotAnswer, { getDriveThumbnail } from "@/components/chatbot/ChatbotAnswer"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  documents?: {
    id: number
    title: string
    image: string
    downloadUrl?: string
  }[]
}

type ChatbotApiResponse = {
  answer: string
  documents: {
    id: number
    title: string
    image: string
    downloadUrl?: string
  }[]
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Xin chào! Mình là trợ lý học tập của TLU Document. Mình có thể giúp bạn tìm đúng tài liệu theo môn học, gợi ý thứ tự học phù hợp và hỗ trợ giải thích khái niệm theo ngữ cảnh học tập của bạn.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false) // Thêm trạng thái mounted
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true) // Đánh dấu đã mount trên client
  }, [])
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Tài liệu môn CSE492 - Trí tuệ nhân tạo",
    "Tài liệu môn MATH111 - Giải tích 1",
    "Nên học tài liệu nào trước cho CSE484",
  ])

  useEffect(() => {
    // Tải KaTeX CSS ngay tại trang chủ để tránh lỗi hiển thị nhân đôi công thức
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }

    const container = messagesContainerRef.current
    if (!container) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const question = input.trim()

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setRecentSearches((prev) => [question, ...prev.filter((item) => item !== question)].slice(0, 5))

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          history: messages.slice(-8).map((item) => ({
            role: item.role,
            content: item.content,
            documents: (item.documents || []).map((doc) => ({ title: doc.title })),
          })),
        }),
      })

      const data = (await response.json()) as ChatbotApiResponse & { error?: string }

      if (!response.ok) {
        throw new Error(data.error || "Không thể lấy phản hồi chatbot")
      }

      const botResponse: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        documents: data.documents || [],
      }

      setMessages((prev) => [...prev, botResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
  }

  const formatTime = (date: Date) => {
    const hours = `${date.getHours()}`.padStart(2, "0")
    const minutes = `${date.getMinutes()}`.padStart(2, "0")
    return `${hours}:${minutes}`
  }


  return (
    <>
      <Navbar />
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_40%),radial-gradient(circle_at_85%_15%,_rgba(14,165,233,0.08),_transparent_40%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff)]">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="max-w-6xl mx-auto">
            <div className="relative mb-6 overflow-hidden rounded-3xl border border-blue-100/80 bg-[linear-gradient(120deg,#ffffff_0%,#f8fbff_45%,#eef2ff_100%)] px-6 py-6 shadow-[0_18px_50px_-30px_rgba(37,99,235,0.35)]">
              <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-sky-200/35 blur-3xl" />

              <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_180px]">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    TRỢ LÝ HỌC TẬP AI
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Chatbot Tutor</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
                    Mình là trợ lý học tập của TLU Document. Mình sẽ giúp bạn tìm ra tài liệu học tập tốt nhất theo đúng môn học.
                  </p>
                </div>
                <div className="relative mx-auto hidden h-32 w-32 md:block">
                  <Image
                    src="/chatbot.png"
                    alt="TLU Chatbot"
                    fill
                    className="object-contain drop-shadow-[0_10px_20px_rgba(59,130,246,0.35)]"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <Card className="sticky top-24 rounded-2xl border-blue-100 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
                  <CardContent className="p-4">
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
                              onClick={() => handleQuickQuestion("Mình cần tài liệu môn CSE492 (Trí tuệ nhân tạo), gợi ý 3 tài liệu mẫu tốt nhất.")}
                            >
                              <span className="break-words whitespace-normal text-left block">
                                Mình cần tài liệu môn CSE492 (Trí tuệ nhân tạo), gợi ý 3 tài liệu mẫu tốt nhất.
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-sm h-auto py-2 px-3 break-words text-left whitespace-normal"
                              onClick={() => handleQuickQuestion("Tôi muốn tìm tài liệu môn MATH111 (Giải tích 1).")}
                            >
                              <span className="break-words whitespace-normal text-left block">
                                Tôi muốn tìm tài liệu môn MATH111 (Giải tích 1).
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-sm h-auto py-2 px-3 break-words text-left whitespace-normal"
                              onClick={() => handleQuickQuestion("Tôi nên học tài liệu nào trước cho môn CSE484 (Cơ sở dữ liệu)?")}
                            >
                              <span className="break-words whitespace-normal text-left block">
                                Tôi nên học tài liệu nào trước cho môn CSE484 (Cơ sở dữ liệu)?
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
                          <h3 className="text-sm font-medium flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-blue-500" />
                            Tìm kiếm gần đây
                          </h3>
                          <div className="space-y-2">
                            {recentSearches.map((search, index) => (
                              <div
                                key={index}
                                className="flex items-center text-sm p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                                onClick={() => handleQuickQuestion(search)}
                              >
                                <Search className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="truncate">{search}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-3">
                <Card className="h-[calc(100vh-220px)] rounded-2xl border-blue-100 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] flex flex-col">
                  <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                    <div
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto rounded-xl bg-slate-50/70 border border-slate-100 p-3 pr-2 space-y-4"
                    >
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`flex ${message.role === "user" ? "flex-row-reverse" : "flex-row"} max-w-[80%] gap-3`}
                          >
                            {message.role === "assistant" && (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="/chatbot.png" alt="TLU Chatbot" />
                                <AvatarFallback className="bg-blue-100 text-blue-700">AI</AvatarFallback>
                              </Avatar>
                            )}
                            <div className="space-y-2">
                              <div
                                className={`p-3 md:p-4 rounded-2xl ${message.role === "user"
                                    ? "bg-indigo-700 text-white shadow-md rounded-tr-none"
                                    : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none"
                                  }`}
                              >
                                {message.role === "assistant" ? (
                                  <ChatbotAnswer content={message.content} />
                                ) : (
                                  <p className="whitespace-pre-line break-words">{message.content}</p>
                                )}
                              </div>

                              {message.documents && (
                                <div className="space-y-2 mt-2">
                                  <p className="text-sm text-gray-500 ml-1">Tài liệu liên quan:</p>
                                  <div className="space-y-2">
                                    {message.documents.map((doc) => (
                                      <Link href={`/document/${doc.id}`} key={doc.id}>
                                        <div className="flex items-center bg-white border rounded-lg p-2 hover:shadow-sm transition-shadow">
                                          <div className="relative h-16 w-24 shrink-0">
                                            <Image
                                              src={getDriveThumbnail(doc.image)}
                                              alt={doc.title}
                                              fill
                                              className="object-cover rounded"
                                            />
                                          </div>
                                          <div className="ml-3 flex-1 min-w-0">
                                            <p className="font-medium text-sm line-clamp-2">{doc.title}</p>
                                            <p className="text-green-600 text-sm mt-1">Tài liệu gợi ý</p>
                                          </div>
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div
                                className={`flex ${message.role === "user" ? "justify-start" : "justify-end"} text-xs text-gray-500`}
                              >
                                <span>{mounted ? formatTime(message.timestamp) : "--:--"}</span>
                              </div>

                              {message.role === "assistant" && (
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                                    <ThumbsUp className="h-4 w-4" />
                                    <span className="sr-only">Hữu ích</span>
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                                    <ThumbsDown className="h-4 w-4" />
                                    <span className="sr-only">Không hữu ích</span>
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                                    <FileText className="h-4 w-4" />
                                    <span className="sr-only">Lưu</span>
                                  </Button>
                                </div>
                              )}
                            </div>

                            {message.role === "user" && (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-green-500 text-white">UN</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="flex flex-row max-w-[80%] gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="/chatbot.png" alt="TLU Chatbot" />
                              <AvatarFallback className="bg-blue-100 text-blue-700">AI</AvatarFallback>
                            </Avatar>
                            <div className="p-3 rounded-lg bg-gray-100 text-gray-800">
                              <div className="flex space-x-2">
                                <div
                                  className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                  className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                ></div>
                                <div
                                  className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "600ms" }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="mt-4 flex items-end gap-2 rounded-xl border border-blue-100 bg-white p-2">
                      <Input
                        placeholder="Nhập câu hỏi của bạn..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 border-0 shadow-none focus-visible:ring-0"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className="bg-indigo-700 hover:bg-indigo-800"
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Gửi</span>
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
