"use client"

import Link from "next/link"
import { Search, Bell, Upload, Home, MessageSquare, Brain, ClipboardList, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { UserNav } from "./user-nav"

export function Navbar() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const router = useRouter()
  const pathname = usePathname()
  const isAdminPath = pathname.startsWith("/admin")

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ name: string; avatar: string; role?: string }>({
    name: "Khách",
    avatar: "/unsigned_user_avatar.png"
  })

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập từ localStorage
    const status = typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true"
    setIsLoggedIn(status)

    if (status) {
      const savedUser = localStorage.getItem("user")
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          setUser({
            name: userData.name || "Người dùng",
            avatar: userData.avatar || "/avatar.png",
            role: userData.role
          })
        } catch (e) {
          console.error("Failed to parse user data from localStorage:", e)
        }
      }
    } else {
      setUser({
        name: "Khách",
        avatar: "/unsigned_user_avatar.png"
      })
    }
  }, [pathname])

  // Thêm padding-top và padding-bottom cho body trên mobile để không bị che bởi header (fixed) và bottom nav
  useEffect(() => {
    if (isMobile && !isAdminPath) {
      document.body.classList.add("pt-16")
      document.body.classList.add("pb-16")
    } else {
      document.body.classList.remove("pt-16")
      document.body.classList.remove("pb-16")
    }
    return () => {
      document.body.classList.remove("pt-16")
      document.body.classList.remove("pb-16")
    }
  }, [isMobile, isAdminPath])

  return (
    <>
      {/* Header chính ở phía trên */}
      <header className="fixed md:sticky top-0 z-50 w-full border-b bg-white transform-gpu will-change-transform">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center shrink-0">
            <Link href={isAdminPath ? "/admin" : "/"} className="mr-2 md:mr-6 flex items-center gap-2 shrink-0">
              <span className="text-lg md:text-2xl font-bold italic text-green-600 whitespace-nowrap">
                TLU Document
              </span>
              {isAdminPath && (
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-blue-700 select-none uppercase tracking-wider">
                  Quản trị viên
                </span>
              )}
            </Link>
          </div>

          {isMobile && !isAdminPath && (
            <Link href="/advanced-search" className="flex-1 mx-2 relative min-w-[80px] max-w-[160px] group">
              <Search className="absolute left-2.5 top-[9px] h-3.5 w-3.5 text-[#0b3b8f]" />
              <div className="w-full bg-white pl-8 pr-1.5 h-8 flex items-center text-[10px] text-gray-400 rounded-lg border border-[#0b3b8f] shadow-sm cursor-pointer">
                <span className="truncate">Tìm kiếm tài liệu...</span>
              </div>
            </Link>
          )}

          {!isMobile && !isAdminPath && (
            <nav className="mx-6 flex items-center space-x-4 lg:space-x-6">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors pb-1 ${pathname === "/"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-700 hover:text-green-500"
                  }`}
              >
                Trang chủ
              </Link>
              <Link
                href="/chatbot"
                className={`text-sm font-medium transition-colors pb-1 ${isActive("/chatbot")
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-700 hover:text-green-500"
                  }`}
              >
                Chatbot
              </Link>
              <Link
                href="/mindmap"
                className={`text-sm font-medium transition-colors pb-1 ${isActive("/mindmap")
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-700 hover:text-green-500"
                  }`}
              >
                Mindmap
              </Link>
              <Link
                href="/quiz"
                className={`text-sm font-medium transition-colors pb-1 ${isActive("/quiz")
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-700 hover:text-green-500"
                  }`}
              >
                Quiz
              </Link>
              <Link
                href="/summarize"
                className={`text-sm font-medium transition-colors pb-1 ${isActive("/summarize")
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-700 hover:text-green-500"
                  }`}
              >
                Tóm tắt
              </Link>
            </nav>
          )}

          {!isAdminPath && (
            <div className="hidden md:flex flex-1 max-w-sm mx-4 items-center">
              <Link href="/advanced-search" className="relative flex-1 group">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#0b3b8f] group-hover:text-[#072f75] transition-colors" />
                <div className="w-full bg-white pl-8 pr-4 h-9 flex items-center text-sm text-gray-500 rounded-lg border border-[#0b3b8f] shadow-sm transition-all group-hover:border-[#072f75] group-hover:bg-blue-50/10 cursor-pointer">
                  Tìm kiếm tài liệu...
                </div>
              </Link>
            </div>
          )}

          <div className="ml-auto flex items-center space-x-2">

            {!isAdminPath && (
              <Button asChild className="hidden md:flex h-9 bg-[#0b3b8f] text-white hover:bg-[#072f75] hover:shadow-md transition-all font-semibold rounded-lg px-4 shadow-sm border border-transparent hover:scale-[1.02]">
                <Link href="/upload">
                  <Upload className="w-4 h-4 mr-1.5" />
                  Tải lên
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
              <Bell className="h-5 w-5 fill-current" />
              <span className="sr-only">Thông báo</span>
            </Button>
            {isLoggedIn ? (
              <UserNav user={user} isLoggedIn={isLoggedIn} />
            ) : (
              <>
                {isMobile ? (
                  <UserNav user={user} isLoggedIn={isLoggedIn} />
                ) : (
                  <Button className="hidden md:flex bg-green-500 text-white font-bold hover:bg-green-600 h-9 rounded-lg px-4" asChild>
                    <Link href="/auth/login">Đăng Nhập</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Bottom Bar dành cho di động (6 tabs, nền trắng, màu chủ đạo xanh dương) */}
      {isMobile && !isAdminPath && (
        <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-1 pb-safe select-none shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transform-gpu will-change-transform">
          {/* Tab 1: Trang chủ */}
          <Link
            href="/"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative"
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all ${pathname === "/" ? "text-blue-600 scale-105" : "text-slate-500 hover:text-blue-600"}`}>
              <Home className="w-[18px] h-[18px]" />
            </div>
            <span className={`text-[9px] font-semibold transition-all ${pathname === "/" ? "text-blue-600 font-bold" : "text-slate-500 font-medium"}`}>
              Trang chủ
            </span>
            {pathname === "/" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>

          {/* Tab 2: Tải lên */}
          <Link
            href="/upload"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative"
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all ${isActive("/upload") ? "text-blue-600 scale-105" : "text-slate-500 hover:text-blue-600"}`}>
              <Upload className="w-[18px] h-[18px]" />
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isActive("/upload") ? "text-blue-600 font-bold" : "text-slate-500 font-medium"}`}>
              Tải lên
            </span>
            {isActive("/upload") && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>

          {/* Tab 3: Chatbot */}
          <Link
            href="/chatbot"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative"
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all ${isActive("/chatbot") ? "text-blue-600 scale-105" : "text-slate-500 hover:text-blue-600"}`}>
              <MessageSquare className="w-[18px] h-[18px]" />
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isActive("/chatbot") ? "text-blue-600 font-bold" : "text-slate-500 font-medium"}`}>
              Chatbot
            </span>
            {isActive("/chatbot") && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>

          {/* Tab 4: Mindmap */}
          <Link
            href="/mindmap"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative"
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all ${isActive("/mindmap") ? "text-blue-600 scale-105" : "text-slate-500 hover:text-blue-600"}`}>
              <Brain className="w-[18px] h-[18px]" />
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isActive("/mindmap") ? "text-blue-600 font-bold" : "text-slate-500 font-medium"}`}>
              Mindmap
            </span>
            {isActive("/mindmap") && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>

          {/* Tab 5: Quiz */}
          <Link
            href="/quiz"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative"
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all ${isActive("/quiz") ? "text-blue-600 scale-105" : "text-slate-500 hover:text-blue-600"}`}>
              <ClipboardList className="w-[18px] h-[18px]" />
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isActive("/quiz") ? "text-blue-600 font-bold" : "text-slate-500 font-medium"}`}>
              Quiz
            </span>
            {isActive("/quiz") && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>

          {/* Tab 6: Tóm tắt */}
          <Link
            href="/summarize"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative"
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all ${isActive("/summarize") ? "text-blue-600 scale-105" : "text-slate-500 hover:text-blue-600"}`}>
              <FileText className="w-[18px] h-[18px]" />
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isActive("/summarize") ? "text-blue-600 font-bold" : "text-slate-500 font-medium"}`}>
              Tóm tắt
            </span>
            {isActive("/summarize") && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>
        </div>
      )}
    </>
  )
}
