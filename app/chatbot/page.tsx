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
import { Send, Sparkles, BookOpen, Search, Clock, PlusCircle, Eye, Trash2, Square } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import ChatbotAnswer, { getDriveThumbnail } from "@/components/chatbot/ChatbotAnswer"
import PreviewDocument from "@/components/PreviewDocument"

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
  chatId?: number | null
  documents: Array<{
    id: number
    title: string
    image: string
    downloadUrl?: string
  }>
}

type HistoryItem = {
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
  const [selectedDoc, setSelectedDoc] = useState<{ id: number, title: string, image?: string, downloadUrl?: string } | null>(null)
  const [dbHistory, setDbHistory] = useState<HistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true) // Đánh dấu đã mount trên client
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true)
      const userId = 1 // Giả lập user ID hiện tại, thực tế lấy từ auth session
      const res = await fetch(`/api/chatbot/history?userId=${userId}`)
      if (!res.ok) throw new Error("Failed to load history")
      const data = await res.json()
      if (data.history) {
        setDbHistory(data.history)
      }
    } catch (err) {
      console.error("Failed to fetch history:", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

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
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  // Keyboard Shortcuts: Ctrl+C to Stop, Enter to Send (Enter is native for form submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + C to Stop
      if (e.ctrlKey && e.key.toLowerCase() === 'c' && isLoading) {
        e.preventDefault()
        handleStopGeneration()
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading]);

  const handleDeleteAllHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không?")) return;

    try {
      const res = await fetch(`/api/chatbot/history?userId=1`, { method: "DELETE" });
      if (res.ok) {
        setDbHistory([]);
      }
    } catch (err) {
      console.error("Failed to delete all history:", err);
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Xóa cuộc hội thoại này?")) return;
    try {
      const res = await fetch(`/api/chatbot/history?userId=1&id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setDbHistory(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

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

    // Khởi tạo AbortController mới
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: question,
          userId: 1, // Giả lập user ID hiện tại, thực tế lấy từ auth session
          chatId: currentChatId,
          history: messages.slice(-8).map((item) => ({
            role: item.role,
            content: item.content,
            documents: (item.documents || []).map((doc) => ({ title: doc.title })),
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Không thể lấy phản hồi chatbot")
      }
      if (!response.body) throw new Error("Stream body missing")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let textBuffer = ""
      let metadataStr = ""
      let isMetadataPhase = false

      const botMessageId = Date.now().toString()
      setMessages((prev) => [
        ...prev,
        { id: botMessageId, role: "assistant", content: "", timestamp: new Date(), documents: [] },
      ])

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })

          if (isMetadataPhase) {
            metadataStr += chunk
          } else {
            const metadataSplit = chunk.split("__METADATA__")
            if (metadataSplit.length > 1) {
              textBuffer += metadataSplit[0]
              isMetadataPhase = true
              metadataStr += metadataSplit[1]
            } else {
              textBuffer += chunk
            }
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: textBuffer.trim() }
                : msg
            )
          )
        }
      }

      if (metadataStr) {
        try {
          const meta = JSON.parse(metadataStr.trim())
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, documents: meta.documents }
                : msg
            )
          )
          if (meta.chatId) setCurrentChatId(meta.chatId)
        } catch (e) { }
      }

      fetchHistory()
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("[Chatbot] Generation aborted by user")
      } else {
        console.error("[Chatbot] Error:", err)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
  }

  const handleNewChat = async () => {
    // Chỉ lưu nếu đã có ít nhất 1 cặp câu hỏi - câu trả lời (ngoài câu chào đầu tiên)
    if (messages.length > 1) {
      try {
        const separator = "\n\n---MESSAGE_SEP---\n\n"
        const questions = messages.filter(m => m.role === "user").map(m => m.content).join(separator)
        const answers = messages
          .filter(m => m.role === "assistant" && m.id !== "1" && m.id !== "intro-message" && !m.id.toString().startsWith("intro-")) // Loại bỏ câu chào
          .map(m => m.content)
          .join(separator)

        // Lấy document cuối cùng được trích dẫn nếu có
        const lastDocId = messages.slice().reverse().find(m => m.documents && m.documents.length > 0)?.documents?.[0]?.id || null

        if (questions && answers) {
          console.log("[Chatbot] Saving session to history...", { questions, answers });
          const res = await fetch("/api/chatbot/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: 1,
              question: questions,
              answer: answers,
              documentId: lastDocId
            })
          })
          if (res.ok) {
            console.log("[Chatbot] History saved successfully");
            fetchHistory()
          } else {
            console.error("[Chatbot] Failed to save history:", await res.text());
          }
        }
      } catch (err) {
        console.error("Failed to save session history:", err)
      }
    }

    setMessages([
      {
        id: "intro-" + Date.now(),
        role: "assistant",
        content:
          "Xin chào! Mình là trợ lý học tập của TLU Document. Mình có thể giúp bạn tìm đúng tài liệu theo môn học, gợi ý thứ tự học phù hợp và hỗ trợ giải thích khái niệm theo ngữ cảnh học tập của bạn.",
        timestamp: new Date(),
      },
    ])
    setInput("")
    setCurrentChatId(null)
  }

  const handleLoadHistory = (item: HistoryItem) => {
    const separator = "\n\n---MESSAGE_SEP---\n\n"
    const questions = item.question.split(separator)
    const answers = item.answer.split(separator)

    const reconstructedMessages: Message[] = [
      {
        id: "intro-message",
        role: "assistant",
        content:
          "Xin chào! Mình là trợ lý học tập của TLU Document. Mình có thể giúp bạn tìm đúng tài liệu theo môn học, gợi ý thứ tự học phù hợp và hỗ trợ giải thích khái niệm theo ngữ cảnh học tập của bạn.",
        timestamp: new Date(item.createdAt),
      }
    ]

    // Ghép các cặp câu hỏi và câu trả lời
    questions.forEach((q, index) => {
      if (q.trim()) {
        reconstructedMessages.push({
          id: `user-${item.id}-${index}`,
          role: "user",
          content: q,
          timestamp: new Date(item.createdAt),
        })

        if (answers[index]) {
          reconstructedMessages.push({
            id: `bot-${item.id}-${index}`,
            role: "assistant",
            content: answers[index],
            timestamp: new Date(item.createdAt),
            // Lưu ý: Tài liệu gắn với item gốc sẽ được gắn cho câu trả lời CUỐI CÙNG
            documents: (index === questions.length - 1 && item.document) ? [item.document] : [],
          })
        }
      }
    })

    setMessages(reconstructedMessages)
    setCurrentChatId(item.id)
  }

  const formatTime = (date: Date) => {
    const hours = `${date.getHours()}`.padStart(2, "0")
    const minutes = `${date.getMinutes()}`.padStart(2, "0")
    return `${hours}:${minutes}`
  }

  const formatHistoryDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const hours = `${d.getHours()}`.padStart(2, "0")
    const minutes = `${d.getMinutes()}`.padStart(2, "0")
    const day = `${d.getDate()}`.padStart(2, "0")
    const month = `${d.getMonth() + 1}`.padStart(2, "0")
    const year = d.getFullYear()
    return `[${hours}:${minutes}_${day}/${month}/${year}]`
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
                    Mình là trợ lý học tập của TLU Document. Mình sẽ giúp bạn tìm ra tài liệu học tập tốt nhất và trả lời những thắc mắc về kiến thức môn học của bạn.
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4">
                <div className="sticky top-24 space-y-4">
                  <Card className="rounded-2xl border-blue-100 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
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
                                    className="group flex items-start text-sm p-3 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl cursor-pointer transition-all duration-200"
                                    onClick={() => handleLoadHistory(item)}
                                    title={`${formatHistoryDate(item.createdAt)} ${item.question}`}
                                  >
                                    <div
                                      onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                                      className="p-1.5 mr-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                      title="Xóa cuộc trò chuyện này"
                                    >
                                      <Trash2 className="h-4 w-4 flex-shrink-0" />
                                    </div>
                                    <span className="flex-1 min-w-0 text-slate-700 font-medium truncate flex items-center gap-2">
                                      <span className="text-[11px] text-slate-500 font-normal bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">{formatHistoryDate(item.createdAt)}</span>
                                      <span className="truncate">{item.question.split("\n\n---MESSAGE_SEP---\n\n")[0]}</span>
                                    </span>
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
                    className="w-full bg-[linear-gradient(110deg,#4f46e5,#3b82f6)] hover:bg-[linear-gradient(110deg,#4338ca,#2563eb)] text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(79,70,229,0.5)] transition-all duration-300 rounded-xl py-6 flex items-center justify-center gap-2 group"
                  >
                    <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="font-semibold text-base">Tạo cuộc trò chuyện mới</span>
                  </Button>
                </div>
              </div>

              <div className="md:col-span-8">
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
                            <div className="space-y-2 max-w-full overflow-hidden">
                              <div
                                className={`p-3 md:p-4 rounded-2xl overflow-hidden max-w-full ${message.role === "user"
                                  ? "bg-indigo-700 text-white shadow-md rounded-tr-none"
                                  : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none"
                                  }`}
                              >
                                {message.role === "assistant" ? (
                                  <div className="max-w-full overflow-hidden">
                                    <ChatbotAnswer content={message.content} />
                                  </div>
                                ) : (
                                  <p className="whitespace-pre-line break-words">{message.content}</p>
                                )}
                              </div>

                              {message.documents && (
                                <div className="space-y-2 mt-2">
                                  <p className="text-sm text-gray-500 ml-1">Tài liệu liên quan:</p>
                                  <div className="space-y-2">
                                    {message.documents.map((doc) => (
                                      <div
                                        key={doc.id}
                                        onClick={() => setSelectedDoc(doc)}
                                        className="cursor-pointer flex items-center bg-white border rounded-lg p-2 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition-all duration-200"
                                      >
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
                                          <p className="text-blue-600 text-xs mt-1 font-medium flex items-center">
                                            <Eye className="w-3 h-3 mr-1" /> Nhấn để xem trước
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div
                                className={`flex ${message.role === "user" ? "justify-start" : "justify-end"} text-xs text-gray-500`}
                              >
                                <span>{mounted ? formatTime(message.timestamp) : "--:--"}</span>
                              </div>


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
                      {isLoading ? (
                        <Button
                          type="button"
                          size="icon"
                          onClick={handleStopGeneration}
                          className="relative h-10 w-10 flex items-center justify-center bg-white hover:bg-red-50 border-2 border-red-500 rounded-full transition-all duration-300 group shadow-sm overflow-visible"
                        >
                          <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-20"></div>
                          <Square className="h-4 w-4 text-red-600 fill-red-600 group-hover:scale-110 transition-transform" />
                          <span className="sr-only">Dừng</span>
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!input.trim()}
                          className="bg-indigo-700 hover:bg-indigo-800 transition-all duration-300 shadow-md hover:shadow-lg rounded-xl h-10 w-10"
                        >
                          <Send className="h-4 w-4" />
                          <span className="sr-only">Gửi</span>
                        </Button>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      {/* Document Preview Modal */}
      <PreviewDocument
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </>
  )
}
