"use client"

import { LogOut, Settings, User, CreditCard, Bell, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface UserNavProps {
  user: {
    name: string
    avatar: string
  }
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    window.location.href = "/auth/login" // Refresh to clear state properly
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all cursor-pointer group outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95">
          <div className="h-9 w-9 rounded-full border-2 border-white shadow-sm overflow-hidden ring-2 ring-blue-500/10 transition-transform group-hover:scale-105">
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col items-start hidden lg:flex text-left">
            <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{user.name}</span>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 p-0 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-slate-100 overflow-hidden" align="end" sideOffset={10}>
        {/* Header Section with subtle gradient */}
        <div className="relative p-6 text-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Shield size={64} className="text-blue-600" />
          </div>

          <div className="relative flex flex-col items-center">
            <div className="h-20 w-20 rounded-full border-4 border-white shadow-xl overflow-hidden ring-4 ring-blue-500/5 transition-transform hover:rotate-3">
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{user.name}</h3>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                Sinh viên Thủy Lợi
              </div>
            </div>
          </div>
        </div>

        <div className="p-2 space-y-1">
          <DropdownMenuGroup>
            <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:text-blue-600 transition-all group/item">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all">
                <User size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-sm">Thông tin cá nhân</span>
                <span className="text-[10px] text-slate-400 font-medium">Cập nhật hồ sơ & ảnh đại diện</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:text-blue-600 transition-all group/item">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all">
                <Settings size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-sm">Cài đặt hệ thống</span>
                <span className="text-[10px] text-slate-400 font-medium">Bảo mật & Tùy chỉnh</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </div>

        <div className="p-4 bg-slate-50/50">
          <Button
            onClick={handleLogout}
            className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-[0_8px_20px_rgba(239,68,68,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Đăng xuất
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
