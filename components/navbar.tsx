"use client"

import Link from "next/link"
import { Search, Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter, usePathname } from "next/navigation"

export function Navbar() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push("/advanced-search")
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
              className={`text-sm font-medium transition-colors pb-1 ${
                pathname === "/"
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-700 hover:text-green-500"
              }`}
            >
              Trang chủ
            </Link>
            <Link 
              href="/summarize" 
              className={`text-sm font-medium transition-colors pb-1 ${
                isActive("/summarize")
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-700 hover:text-green-500"
              }`}
            >
              Tóm tắt
            </Link>
            <Link 
              href="/mindmap" 
              className={`text-sm font-medium transition-colors pb-1 ${
                isActive("/mindmap")
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-700 hover:text-green-500"
              }`}
            >
              Mindmap
            </Link>
            <Link 
              href="/quiz" 
              className={`text-sm font-medium transition-colors pb-1 ${
                isActive("/quiz")
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-700 hover:text-green-500"
              }`}
            >
              Quiz
            </Link>
            <Link 
              href="/chatbot" 
              className={`text-sm font-medium transition-colors pb-1 ${
                isActive("/chatbot")
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-700 hover:text-green-500"
              }`}
            >
              Chatbot
            </Link>
          </nav>
        )}

        <div className="hidden md:flex flex-1 max-w-sm mx-4">
          <form className="relative w-full" onSubmit={handleSearch}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="search" 
              placeholder="Tìm kiếm tài liệu..." 
              className="w-full bg-gray-100 pl-8 pr-4 h-9" 
              onFocus={() => router.push("/advanced-search")} 
            />
          </form>
        </div>

        <div className="ml-auto flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Thông báo</span>
          </Button>
          <Button className="hidden md:flex bg-green-500 text-white font-bold hover:bg-green-600">TẢI LÊN</Button>
          <Button variant="outline" className="hidden md:flex">
            Đăng Nhập
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="grid gap-6 text-lg font-medium">
                <div>
                  <form className="relative w-full mb-4" onSubmit={handleSearch}>
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                      type="search" 
                      placeholder="Tìm kiếm..." 
                      className="w-full bg-gray-100 pl-8 pr-4" 
                      onFocus={() => router.push("/advanced-search")} 
                    />
                  </form>
                </div>
                <Link
                  href="/"
                  className={`flex items-center pb-2 transition-colors ${
                    pathname === "/"
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                  }`}
                >
                  Trang chủ
                </Link>
                <Link
                  href="/summarize"
                  className={`flex items-center pb-2 transition-colors ${
                    isActive("/summarize")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                  }`}
                >
                  Tóm tắt
                </Link>
                <Link
                  href="/mindmap"
                  className={`flex items-center pb-2 transition-colors ${
                    isActive("/mindmap")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                  }`}
                >
                  Mindmap
                </Link>
                <Link 
                  href="/quiz" 
                  className={`flex items-center pb-2 transition-colors ${
                    isActive("/quiz")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                  }`}
                >
                  Quiz
                </Link>
                <Link 
                  href="/chatbot" 
                  className={`flex items-center pb-2 transition-colors ${
                    isActive("/chatbot")
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-700 hover:text-green-500"
                  }`}
                >
                  Chatbot
                </Link>
                <div className="flex flex-col gap-2 pt-4">
                  <Button className="w-full bg-green-500 text-white font-bold hover:bg-green-600">TẢI LÊN</Button>
                  <Button variant="outline" className="w-full">
                    Đăng Nhập
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
