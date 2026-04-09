"use client"

import type React from "react"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { FileUp, FileText, Brain, Copy, List, AlignLeft } from "lucide-react"

export default function Summarize() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [summaryType, setSummaryType] = useState<SummaryFormat>("paragraph")
  const [summaryLength, setSummaryLength] = useState<number>(30)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [summary, setSummary] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setSummary("")
    }
  }

  const handleSummarize = () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setProcessingProgress(0)
    setSummary("")

    // Simulate processing with progress
    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsProcessing(false)

          // Generate mock summary based on file name and selected options
          const mockSummary = generateMockSummary(selectedFile.name, summaryType, summaryLength)
          setSummary(mockSummary)

          return 100
        }
        return prev + 5
      })
    }, 200)
  }

  type SummaryFormat = "paragraph" | "bullets"

  const generateMockSummary = (fileName: string, type: SummaryFormat, length: number) => {
    // Mock summaries based on type
    if (type === "paragraph") {
      return `Tài liệu "${fileName}" là một nghiên cứu toàn diện về các phương pháp học tập hiện đại và ứng dụng công nghệ trong giáo dục. Tác giả đã phân tích sâu sắc về tác động của công nghệ đối với việc học tập, đặc biệt là trong bối cảnh giáo dục đại học. Nghiên cứu chỉ ra rằng việc tích hợp công nghệ một cách hợp lý có thể cải thiện đáng kể hiệu quả học tập, tăng cường sự tương tác giữa giảng viên và sinh viên, đồng thời phát triển kỹ năng tự học cho người học. Tuy nhiên, tác giả cũng cảnh báo về những thách thức như sự phụ thuộc quá mức vào công nghệ, vấn đề bảo mật thông tin và khoảng cách số giữa các nhóm người học khác nhau. Kết luận của nghiên cứu đề xuất một mô hình học tập kết hợp, trong đó công nghệ đóng vai trò hỗ trợ chứ không thay thế phương pháp giảng dạy truyền thống.`
    } else if (type === "bullets") {
      return `• Tài liệu nghiên cứu về phương pháp học tập hiện đại và ứng dụng công nghệ trong giáo dục.
• Phân tích tác động của công nghệ đối với việc học tập, đặc biệt trong giáo dục đại học.
• Tích hợp công nghệ hợp lý cải thiện hiệu quả học tập và tương tác giảng viên-sinh viên.
• Phát triển kỹ năng tự học thông qua ứng dụng công nghệ.
• Cảnh báo về sự phụ thuộc quá mức vào công nghệ.
• Đề cập đến vấn đề bảo mật thông tin trong học tập trực tuyến.
• Thảo luận về khoảng cách số giữa các nhóm người học.
• Đề xuất mô hình học tập kết hợp (blended learning).
• Công nghệ nên đóng vai trò hỗ trợ, không thay thế phương pháp giảng dạy truyền thống.
• Kết luận nhấn mạnh tầm quan trọng của cân bằng giữa công nghệ và phương pháp truyền thống.`
    }

    return ""
  }

  const handleCopyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary)
      // In a real app, you would show a toast notification here
      alert("Đã sao chép vào clipboard")
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Tóm tắt tài liệu bằng AI</h1>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 via-white to-sky-50 rounded-2xl border border-emerald-100/80 shadow-sm p-6 mb-8">
            <div className="flex items-start space-x-4">
              <div className="bg-emerald-100 p-3 rounded-full">
                <Brain className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium mb-2">Tóm tắt thông minh với AI</h2>
                <p className="text-gray-600">
                  Sử dụng trí tuệ nhân tạo để tóm tắt tài liệu dài thành các đoạn văn ngắn gọn, danh sách gạch đầu dòng
                  hoặc sơ đồ nội dung trực quan. Tiết kiệm thời gian đọc và dễ dàng nắm bắt ý chính của tài liệu.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tải lên tài liệu</CardTitle>
                <CardDescription>Chọn tài liệu cần tóm tắt</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.txt"
                    />
                    <FileUp className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      Kéo thả file vào đây hoặc <span className="text-green-500">chọn file</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Hỗ trợ PDF, DOCX, TXT (tối đa 50MB)</p>
                  </div>

                  {selectedFile && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-10 w-10 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Định dạng tóm tắt</Label>
                      <RadioGroup
                        value={summaryType}
                        onValueChange={(value) => setSummaryType(value as SummaryFormat)}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="paragraph" id="format-paragraph" />
                          <Label htmlFor="format-paragraph" className="flex items-center">
                            <AlignLeft className="h-4 w-4 mr-2" />
                            Đoạn văn
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bullets" id="format-bullets" />
                          <Label htmlFor="format-bullets" className="flex items-center">
                            <List className="h-4 w-4 mr-2" />
                            Danh sách gạch đầu dòng
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Độ dài tóm tắt: {summaryLength}%</Label>
                        <span className="text-sm text-gray-500">
                          {summaryLength < 20
                            ? "Rất ngắn"
                            : summaryLength < 40
                              ? "Ngắn"
                              : summaryLength < 60
                                ? "Trung bình"
                                : summaryLength < 80
                                  ? "Dài"
                                  : "Rất dài"}
                        </span>
                      </div>
                      <Slider
                        defaultValue={[30]}
                        max={100}
                        step={5}
                        value={[summaryLength]}
                        onValueChange={(value) => setSummaryLength(value[0])}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Ngôn ngữ tóm tắt</Label>
                      <Select defaultValue="vi">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ngôn ngữ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vi">Tiếng Việt</SelectItem>
                          <SelectItem value="en">Tiếng Anh</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isProcessing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Đang xử lý...</span>
                          <span>{processingProgress}%</span>
                        </div>
                        <Progress value={processingProgress} className="h-2" />
                      </div>
                    )}

                    <Button
                      className="w-full bg-green-500 hover:bg-green-600"
                      disabled={!selectedFile || isProcessing}
                      onClick={handleSummarize}
                    >
                      {isProcessing ? "Đang xử lý..." : "Tóm tắt ngay"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kết quả tóm tắt</CardTitle>
                <CardDescription>Nội dung tóm tắt từ tài liệu của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                {summary ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 h-80 overflow-y-auto whitespace-pre-line">{summary}</div>

                    <Button variant="outline" className="w-full" onClick={handleCopyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Sao chép
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 h-80 flex flex-col items-center justify-center">
                    <Brain className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Chưa có tóm tắt</h3>
                    <p className="text-gray-500 mb-4">Tải lên tài liệu và nhấn "Tóm tắt ngay" để xem kết quả.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Cách sử dụng tính năng tóm tắt AI</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-2 mt-1">
                  <span className="text-green-600 font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Tải lên tài liệu</h3>
                  <p className="text-gray-600 mt-1">
                    Tải lên tài liệu PDF, Word hoặc văn bản thuần túy mà bạn muốn tóm tắt. Hệ thống hỗ trợ tài liệu có
                    kích thước tối đa 50MB.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-2 mt-1">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Chọn định dạng tóm tắt</h3>
                  <p className="text-gray-600 mt-1">
                    Chọn định dạng tóm tắt phù hợp với nhu cầu của bạn: đoạn văn liền mạch, danh sách gạch đầu dòng hoặc
                    sơ đồ nội dung có cấu trúc.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-2 mt-1">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Điều chỉnh độ dài</h3>
                  <p className="text-gray-600 mt-1">
                    Sử dụng thanh trượt để điều chỉnh độ dài của bản tóm tắt. Giá trị thấp hơn sẽ tạo ra bản tóm tắt
                    ngắn gọn hơn, trong khi giá trị cao hơn sẽ bao gồm nhiều chi tiết hơn.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-2 mt-1">
                  <span className="text-green-600 font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-medium">Xem và sử dụng kết quả</h3>
                  <p className="text-gray-600 mt-1">
                    Sau khi xử lý, bạn có thể xem bản tóm tắt, sao chép vào clipboard hoặc tải sơ đồ tư duy về máy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
