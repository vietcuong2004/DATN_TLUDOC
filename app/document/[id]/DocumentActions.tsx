"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, PenTool } from "lucide-react"

interface DocumentActionsProps {
  downloadUrl: string
  fileName?: string
}

export default function DocumentActions({ downloadUrl, fileName = "document" }: DocumentActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = () => {
    if (!downloadUrl) {
      alert("Không có link để tải file.")
      return
    }

    try {
      setIsDownloading(true)
      
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
        <Button variant="outline" className="w-full">
          <PenTool className="h-4 w-4 mr-2" />
          Viết đánh giá
        </Button>
      </div>
    </div>
  )
} 