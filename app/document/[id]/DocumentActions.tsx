"use client"
import { Button } from "@/components/ui/button"
import { Download, PenTool, Share2 } from "lucide-react"

export default function DocumentActions() {
  return (
    <div>
      <div className="space-y-4">
        <Button className="w-full bg-green-500 hover:bg-green-600 text-lg font-bold">
          <Download className="h-5 w-5 mr-2" />
          Tải xuống
        </Button>
        <Button variant="outline" className="w-full">
          <PenTool className="h-4 w-4 mr-2" />
          Viết đánh giá
        </Button>
        <Button variant="outline" className="w-full">
          <Share2 className="h-4 w-4 mr-2" />
          Chia sẻ
        </Button>
      </div>
    </div>
  )
} 