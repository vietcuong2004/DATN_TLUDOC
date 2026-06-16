"use client"

import Link from "next/link"
import { Search, Bell, Menu, User, Settings, LogOut, Upload } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { UserNav } from "./user-nav"

export function Navbar() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ name: string; avatar: string; role?: string }>({
    name: "Khách",
    avatar: "/avatar.png"
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
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("user")
    window.location.href = "/auth/login"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center">
          <Link href="/" className="mr-6 flex items-center">
            <span className="text-2xl font-bold italic text-green-600">TLU Document</span>
          </Link>
        </div>

        {!isMobile && (
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

        <div className="hidden md:flex flex-1 max-w-sm mx-4 items-center">
          <Link href="/advanced-search" className="relative flex-1 group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#0b3b8f] group-hover:text-[#072f75] transition-colors" />
            <div className="w-full bg-white pl-8 pr-4 h-9 flex items-center text-sm text-gray-500 rounded-lg border border-[#0b3b8f] shadow-sm transition-all group-hover:border-[#072f75] group-hover:bg-blue-50/10 cursor-pointer">
              Tìm kiếm tài liệu...
            </div>
          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-2">
          <Button asChild className="hidden md:flex h-9 bg-[#0b3b8f] text-white hover:bg-[#072f75] hover:shadow-md transition-all font-semibold rounded-lg px-4 shadow-sm border border-transparent hover:scale-[1.02]">
            <Link href="/upload">
              <Upload className="w-4 h-4 mr-1.5" />
              Tải lên
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
            <Bell className="h-5 w-5 fill-current" />
            <span className="sr-only">Thông báo</span>
          </Button>
          {isLoggedIn ? (
            <UserNav user={user} />
          ) : (
            <Button className="hidden md:flex bg-green-500 text-white font-bold hover:bg-green-600" asChild>
              <Link href="/auth/login">Đăng Nhập</Link>
            </Button>
          )}


          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" onOpenAutoFocus={(e) => e.preventDefault()}>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="grid gap-6 text-lg font-medium">
                <div className="mt-12">
                  <Link href="/advanced-search" className="relative w-full block group" onClick={() => (document.querySelector('[data-radix-collection-item]') as any)?.click()}>
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#0b3b8f]" />
                    <div className="w-full bg-white pl-8 pr-4 h-10 flex items-center text-sm text-gray-500 rounded-lg border border-[#0b3b8f] shadow-sm">
                      Tìm kiếm tài liệu, môn học...
                    </div>
                  </Link>
                </div>
                <Link
                  href="/"
                  className={`flex items-center pb-2 transition-colors ${pathname === "/"
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                    }`}
                >
                  Trang chủ
                </Link>
                <Link
                  href="/chatbot"
                  className={`flex items-center pb-2 transition-colors ${isActive("/chatbot")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                    }`}
                >
                  Chatbot
                </Link>
                <Link
                  href="/mindmap"
                  className={`flex items-center pb-2 transition-colors ${isActive("/mindmap")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                    }`}
                >
                  Mindmap
                </Link>
                <Link
                  href="/quiz"
                  className={`flex items-center pb-2 transition-colors ${isActive("/quiz")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                    }`}
                >
                  Quiz
                </Link>
                <Link
                  href="/summarize"
                  className={`flex items-center pb-2 transition-colors ${isActive("/summarize")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                    }`}
                >
                  Tóm tắt
                </Link>
                <div className="flex flex-col gap-4 pt-4 border-t">
                  {isLoggedIn ? (
                    <Button
                      onClick={handleLogout}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-bold h-12 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-auto"
                    >
                      <LogOut className="h-5 w-5" />
                      Đăng xuất
                    </Button>
                  ) : (
                    <Button className="w-full bg-green-500 text-white font-bold h-12 rounded-xl shadow-lg" asChild>
                      <Link href="/auth/login" onClick={() => (document.querySelector('[data-radix-collection-item]') as any)?.click()}>Đăng Nhập</Link>
                    </Button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
