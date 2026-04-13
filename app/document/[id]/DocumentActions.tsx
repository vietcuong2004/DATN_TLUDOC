"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, PenTool } from "lucide-react"
import { ReviewDialog } from "@/components/ReviewDialog"

interface DocumentActionsProps {
  documentId: number
  downloadUrl: string
  fileName?: string
}

export default function DocumentActions({ documentId, downloadUrl, fileName = "document" }: DocumentActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)


  const handleDownload = () => {
    if (!downloadUrl) {
      alert("Không có link để tải file.")
      return
    }

    try {
      setIsDownloading(true)
      
      // Gọi API để tăng lượt tải trong cơ sở dữ liệu
      fetch(`/api/documents/${documentId}/download`, { method: "POST" }).catch(err => console.error("Update downloads count failed:", err))

      // Tạo anchor element để download trực tiếp (không bật tab mới)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${fileName}.pdf`
      link.style.display = "none"
      document.body.appendChild(link)
      
      // Click để trigger download
      link.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
      }, 100)
    } catch (error) {
      console.error("Download error:", error)
      alert("Lỗi khi tải file. Vui lòng thử lại.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div>
      <div className="space-y-4">
        <Button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full bg-green-500 hover:bg-green-600 text-lg font-bold"
        >
          <>
            <Download className="h-5 w-5 mr-2" />
            Tải xuống
          </>
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setIsReviewOpen(true)}
        >
          <PenTool className="h-4 w-4 mr-2" />
          Viết đánh giá
        </Button>
      </div>

      <ReviewDialog
        documentId={documentId}
        isOpen={isReviewOpen}
        onOpenChange={setIsReviewOpen}
      />
    </div>
  )
} 