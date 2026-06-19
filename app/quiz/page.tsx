"use client"

import { useState, useRef, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
  RefreshCw,
  Trophy,
  Sparkles,
  X,
  Eye,
  Info,
} from "lucide-react"
import PreviewDocument from "@/components/PreviewDocument"

function renderTextWithBold(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

type QuizState = "idle" | "uploading" | "generating" | "playing" | "result"

export default function QuizPage() {
  const [file, setFile] = useState<File | null>(null)
  const [quizState, setQuizState] = useState<QuizState>("idle")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  // Game state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({})
  const [score, setScore] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(0)

  // Preview & Error State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)



  const clearSelectedFile = () => {
    setFile(null)
    setQuizState("idle")
    setQuestions([])
    setUserAnswers({})
    setRevealedAnswers({})
    setScore(0)
    setProcessingProgress(0)
    setErrorMessage(null)
    setIsPreviewOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleOpenPreview = async () => {
    if (!file) return
    setIsPreviewOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setErrorMessage(null)
      const selectedFile = e.target.files[0]
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")
      
      // Bỏ qua check file PDF vì nó đã được xử lý phía client
      if (!isPdf && selectedFile.size > 4.5 * 1024 * 1024) {
        setErrorMessage("Rất tiếc, máy chủ hiện tại chỉ hỗ trợ tệp tin có dung lượng tối đa 4.5 MB. Vui lòng nén tài liệu trước khi tải lên.")
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }
      setFile(selectedFile)
      setQuizState("idle")
    }
  }

  const startGeneration = async (selectedFile: File) => {
    setQuizState("generating")
    setProcessingProgress(5)

    const progressTimer = window.setInterval(() => {
      setProcessingProgress((prev) => (prev >= 90 ? 90 : prev + 3))
    }, 800)

    try {
      let fileToUpload = selectedFile
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")

      if (isPdf) {
        setProcessingProgress(8)
        const { extractTextFromPDFFile } = await import("@/lib/client-pdf-parser")
        const extractedText = await extractTextFromPDFFile(selectedFile)
        
        fileToUpload = new File([extractedText], selectedFile.name.replace(/\.pdf$/i, ".txt"), { type: "text/plain" })
        if (fileToUpload.size > 4.5 * 1024 * 1024) {
           throw new Error("Tài liệu quá dài (vượt quá 4.5MB chữ). Vui lòng cắt nhỏ văn bản hơn nữa.")
        }
      }

      const formData = new FormData()
      formData.append("file", fileToUpload)

      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Có lỗi khi xử lý API.")
      }

      const data = await response.json()
      if (data.questions && data.questions.length > 0) {
        setProcessingProgress(100)
        setTimeout(() => {
          setQuestions(data.questions)
          setCurrentQuestionIdx(0)
          setScore(0)
          setUserAnswers({})
          setRevealedAnswers({})
          setQuizState("playing")
        }, 400)
      } else {
        throw new Error("Không thể tạo câu hỏi từ tài liệu này.")
      }
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống")
      setQuizState("idle")
      setProcessingProgress(0)
    } finally {
      window.clearInterval(progressTimer)
    }
  }

  const handleOptionSelect = (index: number) => {
    // Ngăn chặn việc chọn lại nếu câu hỏi đã được trả lời xong
    if (revealedAnswers[currentQuestionIdx]) return
    setUserAnswers(prev => ({ ...prev, [currentQuestionIdx]: index }))
  }

  const handleConfirmAnswer = () => {
    const selectedObj = userAnswers[currentQuestionIdx]
    if (selectedObj === undefined) return

    setRevealedAnswers(prev => ({ ...prev, [currentQuestionIdx]: true }))

    if (selectedObj === questions[currentQuestionIdx].correctIndex) {
      setScore((s) => s + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      // Chuyển tới câu mờ chưa trả lời gần nhất, hoặc chỉ là câu tiếp theo
      let nextUnanswered = currentQuestionIdx + 1
      while (nextUnanswered < questions.length - 1 && revealedAnswers[nextUnanswered]) {
        nextUnanswered++
      }
      setCurrentQuestionIdx(nextUnanswered)
    } else {
      setQuizState("result")
    }
  }

  const restart = () => {
    clearSelectedFile()
  }

  const selectedOption = userAnswers[currentQuestionIdx] ?? null
  const isAnswerRevealed = Boolean(revealedAnswers[currentQuestionIdx])

  return (
    <>
      <main className="min-h-screen bg-slate-50 flex flex-col relative z-0">
        <Navbar />

        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Top Banner */}
            <div className="rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#e0f2fe_100%)] px-6 py-6 shadow-sm animate-fade-in">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                    AI Quiz Generator
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Chuyển đổi tài liệu thành bài kiểm tra</h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base text-justify">
                    Tải tài liệu của bạn lên, hệ thống sẽ tự động phát hiện kiến thức trọng tâm và tạo bộ câu hỏi trắc nghiệm có kèm giải thích chi tiết.
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <BrainCircuit className="h-4 w-4 text-blue-600" />
                    Học Tập & Luyện Tập
                  </div>
                  <p className="mt-1">Kiểm tra kiến thức và giải thích chi tiết cho từng câu hỏi.</p>
                </div>
              </div>
            </div>

            <div className={`grid gap-6 ${(quizState === 'playing' || quizState === 'result') && questions.length > 0 ? "lg:grid-cols-[300px_minmax(0,1fr)_300px]" : "lg:grid-cols-[360px_minmax(0,1fr)]"}`}>

              {/* Left Column: Upload & Setup */}
              <Card className="border-slate-200 shadow-sm h-fit w-full min-w-0 overflow-hidden">
                <CardContent className="space-y-4 p-6">
                  <div className="mb-2">
                    <h3 className="font-semibold text-slate-900">Tải lên tài liệu</h3>
                    <p className="text-sm text-slate-500">Chọn PDF hoặc Word để bắt đầu tạo Quiz.</p>
                  </div>

                  {!file ? (
                    <label
                      htmlFor="quiz-file"
                      className="w-full flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center transition hover:bg-blue-50"
                    >
                      <Upload className="mb-3 h-10 w-10 text-blue-600" />
                      <span className="text-sm font-medium text-slate-900">Kéo thả tài liệu vào đây</span>
                      <span className="mt-1 text-xs text-slate-500">Hỗ trợ: PDF, Word (.doc, .docx), TXT</span>
                    </label>
                  ) : (
                    <div className="w-full max-w-full min-w-0 relative flex cursor-pointer flex-col items-stretch justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center" onClick={() => fileInputRef.current?.click()}>
                      <button
                        type="button"
                        aria-label="Bỏ file đã chọn"
                        className="absolute -right-3 -top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-md hover:bg-red-600"
                        onClick={(event) => {
                          event.stopPropagation()
                          clearSelectedFile()
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="w-full min-w-0 rounded-xl border border-blue-200 bg-white p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-10 w-10 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate font-semibold text-slate-900">{file.name}</p>
                            <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    id="quiz-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />

                  {/* Nút Xem và Tạo luôn hiển thị khi có file */}
                  {file && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Button variant="outline" className="flex-1 bg-slate-50 hover:bg-slate-100 min-w-[120px]" onClick={handleOpenPreview}>
                        <Eye className="mr-2 h-4 w-4" />
                        Xem tài liệu
                      </Button>

                      <Button
                        className={`bg-blue-600 hover:bg-blue-700 text-white shadow-md flex-1 min-w-[120px]`}
                        disabled={quizState !== "idle"}
                        onClick={() => startGeneration(file)}
                      >
                        {quizState === "generating" ? "Đang phân tích..." : "Tạo câu hỏi"}
                      </Button>
                    </div>
                  )}

                  {quizState === "generating" && (
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Đang tạo câu hỏi...</span>
                        <span className="font-medium text-blue-600">{processingProgress}%</span>
                      </div>
                      <Progress value={processingProgress} className="h-2" />
                    </div>
                  )}

                  {errorMessage ? <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-100">{errorMessage}</p> : null}

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800 flex items-start gap-3 shadow-sm">
                    <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 flex-shrink-0">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-blue-900">Lưu ý:</p>
                      <p className="leading-relaxed opacity-90">
                        Tính năng này hoạt động tốt với định dạng file <span className="font-semibold underline decoration-blue-200 underline-offset-2">PDF</span> và <span className="font-semibold underline decoration-blue-200 underline-offset-2">DOCX</span>. Với file PDF lớn, thời gian xử lý có thể lâu hơn. Bạn nên nén file dưới <span className="font-bold text-blue-700">4.5 MB</span> để có trải nghiệm mượt mà nhất.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Center Column: Quiz Playground */}
              <Card className="border-slate-200 shadow-sm min-h-[400px]">
                <CardContent className="p-6 h-full flex flex-col">

                  {quizState === "idle" || quizState === "uploading" ? (
                    <div className="flex flex-col items-center justify-center h-full flex-grow text-center text-slate-500 py-20">
                      <BrainCircuit className="h-16 w-16 text-slate-200 mb-4" />
                      <h3 className="text-xl font-semibold text-slate-700">Chưa có bài kiểm tra</h3>
                      <p className="max-w-sm mt-2">Tải tài liệu lên và bấm "Tạo câu hỏi" để bắt đầu ôn luyện kiến thức.</p>
                    </div>
                  ) : quizState === "generating" ? (
                    <div className="flex flex-col items-center justify-center h-full flex-grow text-center py-20">
                      <div className="relative mb-6">
                        <div className="h-16 w-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-700">AI đang phân tích... ({processingProgress}%)</h3>
                      <p className="max-w-sm mt-2 text-slate-500">Đang thiết kế câu hỏi chất lượng nhất cho bạn.</p>
                    </div>
                  ) : quizState === "playing" && questions.length > 0 ? (
                    <div className="animate-fade-in flex flex-col h-full flex-grow">
                      {/* Header Progress */}
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-sm font-semibold text-blue-600 uppercase">
                          Câu {currentQuestionIdx + 1}/{questions.length}
                        </span>
                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                          Điểm: <strong className="text-slate-900">{score}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-1.5 rounded-full mb-8">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Object.keys(revealedAnswers).length / questions.length * 100}%` }} />
                      </div>

                      {/* Question */}
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed">
                        {renderTextWithBold(questions[currentQuestionIdx].question)}
                      </h2>

                      {/* Options */}
                      <div className="space-y-3 mb-8">
                        {questions[currentQuestionIdx].options.map((opt, idx) => {
                          const isSelected = selectedOption === idx
                          const isCorrect = idx === questions[currentQuestionIdx].correctIndex

                          let optionStyles = "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                          let icon = null

                          if (isAnswerRevealed) {
                            // Đã khoá và hiển thị đáp án đúng/sai
                            if (isCorrect) {
                              optionStyles = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500 font-medium"
                              icon = <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            } else if (isSelected && !isCorrect) {
                              optionStyles = "bg-red-50 border-red-500 text-red-900"
                              icon = <XCircle className="h-5 w-5 text-red-600" />
                            } else {
                              optionStyles = "bg-slate-50 border-slate-200 text-slate-400 opacity-70"
                            }
                          } else if (isSelected) {
                            // Đang chọn nhưng chưa Confirm
                            optionStyles = "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500 font-medium cursor-pointer"
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isAnswerRevealed}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between shadow-sm ${optionStyles}`}
                              onClick={() => handleOptionSelect(idx)}
                            >
                              <span className="text-base flex gap-4">
                                <span className={`font-bold ${isAnswerRevealed && isCorrect ? 'text-emerald-700' : 'text-slate-400'}`}>{String.fromCharCode(65 + idx)}.</span>
                                <div>{renderTextWithBold(opt)}</div>
                              </span>
                              {icon && <span className="animate-pop-in">{icon}</span>}
                            </button>
                          )
                        })}
                      </div>

                      {/* Explanation Card */}
                      {isAnswerRevealed && (
                        <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 mb-8 animate-fade-in-up">
                          <h4 className="flex items-center gap-2 font-semibold mb-2 text-sky-900">
                            <Sparkles className="h-5 w-5 text-sky-600" />
                            Giải thích:
                          </h4>
                          <p className="text-sky-800 text-sm md:text-base leading-relaxed">
                            {renderTextWithBold(questions[currentQuestionIdx].explanation)}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto pt-4 flex justify-end border-t border-slate-100">
                        {!isAnswerRevealed ? (
                          <Button
                            size="lg"
                            disabled={selectedOption === null}
                            onClick={handleConfirmAnswer}
                            className="bg-slate-900 text-white hover:bg-slate-800 px-8 disabled:bg-slate-300"
                          >
                            Xác nhận đáp án
                          </Button>
                        ) : (
                          <Button
                            size="lg"
                            onClick={handleNextQuestion}
                            className="bg-blue-600 text-white hover:bg-blue-700 px-8 group"
                          >
                            {Object.keys(revealedAnswers).length === questions.length ? 'Hoàn thành bài' : 'Tiếp tục'}
                            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : quizState === "result" ? (
                    <div className="flex flex-col items-center justify-center h-full flex-grow text-center py-16 animate-fade-in">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                        <Trophy className="h-10 w-10 text-emerald-600" />
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">Xin chúc mừng!</h2>
                      <p className="text-slate-500 mb-8">Bạn đã xuất sắc hoàn thành bài kiểm tra.</p>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-8 w-full max-w-sm">
                        <div className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-2">Điểm số của bạn</div>
                        <div className="text-5xl font-extrabold text-blue-600">
                          {score} <span className="text-3xl text-slate-300">/ {questions.length}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-center w-full max-w-sm">
                        <Button
                          onClick={() => {
                            setCurrentQuestionIdx(0)
                            setScore(0)
                            setUserAnswers({})
                            setRevealedAnswers({})
                            setQuizState("playing")
                          }}
                          variant="outline"
                          className="border-blue-200 text-blue-700 w-full hover:bg-blue-50"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Làm lại bài này
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Third Column: Index Panel (Only when playing/result) */}
              {(quizState === "playing" || quizState === "result") && questions.length > 0 && (
                <Card className="border-slate-200 shadow-sm h-fit sticky top-6">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex justify-between items-center text-sm">
                      Tiến độ làm bài
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">{Object.keys(revealedAnswers).length}/{questions.length}</span>
                    </h3>
                    <div className="grid grid-cols-5 gap-2 mb-6">
                      {questions.map((q, i) => {
                        const isRevealed = revealedAnswers[i]
                        const isCorrect = userAnswers[i] === q.correctIndex
                        const isCurrent = i === currentQuestionIdx && quizState === "playing"

                        let btnClass = "bg-slate-50 text-slate-400 border-slate-200"
                        if (isRevealed) {
                          btnClass = isCorrect ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm hover:bg-emerald-200" : "bg-red-100 text-red-700 border-red-300 shadow-sm hover:bg-red-200"
                        } else if (isCurrent) {
                          btnClass = "bg-blue-50 text-blue-600 border-blue-300 shadow-sm"
                        }

                        return (
                          <button
                            key={i}
                            title={isRevealed ? (isCorrect ? "Trả lời đúng" : "Trả lời sai") : "Chưa trả lời"}
                            onClick={() => {
                              if (isRevealed) {
                                setCurrentQuestionIdx(i)
                                if (quizState === "result") setQuizState("playing")
                              }
                            }}
                            disabled={!isRevealed}
                            className={`w-full aspect-square rounded-lg border font-semibold flex items-center justify-center transition-all ${btnClass} ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 scale-105' : ''} ${!isRevealed ? 'cursor-not-allowed opacity-70' : ''}`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>

                    {/* Nút Xem Tổng điểm */}
                    {Object.keys(revealedAnswers).length === questions.length && quizState === "playing" && (
                      <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={() => setQuizState("result")}>
                        <Trophy className="mr-2 h-4 w-4" />
                        Xem Kết Quả
                      </Button>
                    )}

                    {quizState === "result" && (
                      <div className="text-sm text-center text-slate-500 mt-2">
                        Bạn có thể click vào các ô số trên để xem lại đáp án và giải thích.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </main>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <PreviewDocument 
          document={{
            title: file?.name || "Xem tài liệu",
            file: file || undefined
          }}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  )
}