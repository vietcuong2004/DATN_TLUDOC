"use client"

import { useState } from "react"
import { ZoomIn, ZoomOut, Maximize2, Minimize2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DocumentViewerProps {
  previewUrl: string
  title: string
  downloadUrl: string
}

export default function DocumentViewer({ previewUrl, title, downloadUrl }: DocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showEmbed, setShowEmbed] = useState(true)

  const isLocal = previewUrl?.startsWith("/uploads/")

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleOpenExternal = () => {
    window.open(previewUrl, "_blank")
  }

  if (!previewUrl) {
    return (
      <div className="mb-8 rounded-lg bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-gray-500">Không có dữ liệu preview</p>
          <Button onClick={handleOpenExternal} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {isLocal ? "Mở tài liệu gốc" : "Xem trên Google Drive"}
          </Button>
        </div>
      </div>
    )
  }

  if (!showEmbed) {
    return (
      <div className="mb-8 rounded-lg bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-gray-500">Không thể tải preview. {isLocal ? "Định dạng này có thể không được hỗ trợ trên trình duyệt." : "Vui lòng mở trên Google Drive."}</p>
          <Button onClick={() => setShowEmbed(true)} className="mr-2">
            Thử lại
          </Button>
          <Button onClick={handleOpenExternal} variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {isLocal ? "Tải xuống / Mở bằng trình duyệt" : "Mở Google Drive"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
              <div className="text-white font-medium truncate">{title}</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFullscreen}
                  className="text-white hover:bg-slate-800"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Preview */}
            <div className="flex-1 bg-slate-950">
              <iframe
                src={previewUrl}
                title={title}
                className="h-full w-full border-0"
                allow="autoplay"
                onError={() => setShowEmbed(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Normal View */}
      <div className="mb-8 overflow-hidden rounded-lg bg-white shadow-sm">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="text-sm font-medium text-slate-700">Xem trước tài liệu</div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenExternal}
              title={isLocal ? "Mở tài liệu gốc" : "Mở trên Google Drive"}
              className="text-blue-600 hover:bg-blue-50"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFullscreen}
              title="Xem toàn màn hình"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="relative bg-slate-100">
          <iframe
            src={previewUrl}
            title={title}
            className="h-[600px] w-full border-0"
            allow="autoplay"
            onError={() => setShowEmbed(false)}
          />
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          <span>Cuộn trong preview để xem tất cả trang</span>
          <span>Hoặc <button onClick={handleOpenExternal} className="text-blue-600 hover:underline">{isLocal ? "mở tài liệu gốc" : "mở trên Google Drive"}</button></span>
        </div>
      </div>
    </>
  )
}
