"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function ReviewHighlightHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    // Nếu phát hiện có tham số highlight=true trong URL
    if (searchParams.get("highlight") === "true") {
      // Đợi 5 giây (đủ để người dùng thấy chấm xanh và cuộn trang)
      const timer = setTimeout(() => {
        // Tạo đối tượng params mới từ searchParams hiện tại
        const params = new URLSearchParams(searchParams.toString())
        
        // Xóa tham số highlight
        params.delete("highlight")
        
        // Tạo URL mới (giữ lại các params khác như tab=reviews nếu có)
        const query = params.toString() ? `?${params.toString()}` : ""
        const newUrl = `${pathname}${query}${window.location.hash}`
        
        // Thay đổi URL mà không làm tải lại trang và không ảnh hưởng đến vị trí cuộn
        router.replace(newUrl, { scroll: false })
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [searchParams, pathname, router])

  return null
}
