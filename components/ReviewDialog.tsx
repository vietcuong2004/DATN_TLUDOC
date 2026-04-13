"use client"

import { useState } from "react"
import { CheckCircle2, Star } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface ReviewDialogProps {
  documentId: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ReviewDialog({ documentId, isOpen, onOpenChange }: ReviewDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn số sao đánh giá.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/documents/${documentId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment,
        }),
      })

      if (!response.ok) throw new Error("Thất bại khi gửi đánh giá")
      
      setIsSuccess(true)
      
      // Chờ người dùng xem thông báo thành công sau đó mới điều hướng
      setTimeout(() => {
        router.push(`/document/${documentId}?tab=reviews&highlight=true#reviews`)
        router.refresh()
        
        setTimeout(() => {
          onOpenChange(false)
          // Reset state sau khi dialog đóng hoàn toàn
          setTimeout(() => {
            setIsSuccess(false)
            setRating(0)
            setComment("")
          }, 300)
        }, 200)
      }, 1500)
    } catch (error) {
      console.error("Submit review error:", error)
      toast({
        title: "Lỗi hệ thống",
        description: "Không thể gửi đánh giá lúc này. Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#0b3b8f] px-6 py-8 text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Star className="h-24 w-24 rotate-12 fill-white" />
          </div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold text-white">Viết đánh giá tài liệu</DialogTitle>
            <DialogDescription className="text-blue-100 text-base mt-2">
              Chia sẻ trải nghiệm của bạn để cộng đồng cùng học tập tốt hơn.
            </DialogDescription>
          </DialogHeader>
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
              <CheckCircle2 className="h-20 w-20 text-green-500 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Đã gửi đánh giá!</h3>
            <p className="text-slate-500 mb-8">
              Cảm ơn bạn đã đóng góp ý kiến cho cộng đồng. <br />
              Đang điều hướng đến đánh giá của bạn...
            </p>
            <div className="flex items-center gap-2 text-[#0b3b8f] font-medium text-sm">
              <div className="h-4 w-4 border-2 border-[#0b3b8f]/20 border-t-[#0b3b8f] rounded-full animate-spin" />
              Đang tải dữ liệu mới nhất
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-8 space-y-8 bg-white">
              {/* Star Rating Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Mức độ hài lòng của bạn</div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= (hoverRating || rating)
                    const isSelected = star <= rating
                    return (
                      <button
                        key={star}
                        type="button"
                        className={`group relative p-2 transition-all duration-200 transform hover:scale-125 focus:outline-none`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      >
                        <Star
                          className={`h-10 w-10 transition-all duration-300 ${
                            isActive 
                              ? "fill-yellow-400 text-yellow-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" 
                              : "text-slate-200 fill-slate-50 group-hover:text-slate-300"
                          }`}
                        />
                        {isSelected && !hoverRating && (
                          <span className="absolute inset-0 flex items-center justify-center animate-ping opacity-20">
                            <Star className="h-10 w-10 fill-yellow-400" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="h-6 text-sm font-semibold text-[#0b3b8f] animate-fade-in">
                  {rating === 5 && "Cực kỳ xuất sắc! 🌟"}
                  {rating === 4 && "Tài liệu rất tốt 👍"}
                  {rating === 3 && "Bình thường, đủ dùng 👌"}
                  {rating === 2 && "Cần cải thiện thêm ⚠️"}
                  {rating === 1 && "Không hài lòng 👎"}
                  {rating === 0 && "Chọn số sao phía trên"}
                </div>
              </div>

              {/* Comment Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Label htmlFor="comment" className="cursor-pointer">Chi tiết đánh giá</Label>
                  <span className="text-xs text-slate-400 font-normal">(Không bắt buộc)</span>
                </div>
                <div className="relative group">
                  <Textarea
                    id="comment"
                    placeholder="Tài liệu này giúp ích cho mình ở phần... Nội dung trình bày rất..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[120px] resize-none border-slate-200 focus:border-[#0b3b8f] focus:ring-[#0b3b8f]/20 transition-all duration-200 rounded-xl bg-slate-50/50 group-hover:bg-white"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                    {comment.length} ký tự
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-slate-50 flex items-center gap-3 sm:gap-0">
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                disabled={isSubmitting}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              >
                Để sau
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-[#0b3b8f] hover:bg-[#072f75] text-white px-8 py-6 rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang gửi...
                  </div>
                ) : (
                  "Gửi đánh giá ngay"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
