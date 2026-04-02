"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Bell, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/advanced-search");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center">
          <Link href="/" className="mr-6 flex items-center">
            <span className="text-2xl font-bold italic text-green-600">TLU Document</span>
          </Link>
        </div>

        {!isMobile && !isSearchOpen && (
          <nav className="mx-6 flex items-center space-x-4 lg:space-x-6">
            <Link href="/advanced-search" className="text-sm font-medium transition-colors hover:text-green-500">
              Tìm kiếm
            </Link>
            <Link href="/summarize" className="text-sm font-medium transition-colors hover:text-green-500">
              Tóm tắt
            </Link>
            <Link href="/chatbot" className="text-sm font-medium transition-colors hover:text-green-500">
              Chatbot
            </Link>
            <Link href="/quiz" className="text-sm font-medium transition-colors hover:text-green-500">
              Quiz
            </Link>
          </nav>
        )}

        <div className={`${isSearchOpen ? "flex-1" : "hidden md:flex md:flex-1"} mx-6`}>
          <form className="relative w-full" onSubmit={handleSearch}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input type="search" placeholder="Tìm kiếm tài liệu..." className="w-full bg-gray-100 pl-8 pr-4" onFocus={() => router.push("/advanced-search")} />
          </form>
        </div>

        {isMobile && !isSearchOpen && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setIsSearchOpen(true)}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Tìm kiếm</span>
          </Button>
        )}

        {isSearchOpen && (
          <Button variant="ghost" size="icon" className="ml-2" onClick={() => setIsSearchOpen(false)}>
            <X className="h-5 w-5" />
            <span className="sr-only">Đóng tìm kiếm</span>
          </Button>
        )}

        <div className={`${isSearchOpen ? "hidden" : "flex"} ml-auto items-center space-x-2`}>
          <Button className="hidden md:flex bg-green-500 text-white font-bold hover:bg-green-600">TẢI LÊN</Button>
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Thông báo</span>
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
                <Link
                  href="/advanced-search"
                  className="flex items-center border-b pb-2 transition-colors hover:text-green-500"
                >
                  Tìm kiếm
                </Link>
                <Link
                  href="/summarize"
                  className="flex items-center border-b pb-2 transition-colors hover:text-green-500"
                >
                  Tóm tắt
                </Link>
                <Link href="/chatbot" className="flex items-center border-b pb-2 transition-colors hover:text-green-500">
                  Chatbot
                </Link>
                <Link href="/quiz" className="flex items-center border-b pb-2 transition-colors hover:text-green-500">
                  Quiz
                </Link>
                <Button variant="outline" className="w-full">
                  Đăng Nhập
                </Button>
                <div className="flex flex-col gap-2 pt-4">
                  <Button className="w-full bg-green-500 text-white font-bold hover:bg-green-600">TẢI LÊN</Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          <Button variant="outline" className="hidden md:flex">
            Đăng Nhập
          </Button>
        </div>
      </div>
    </header>
  )
}
