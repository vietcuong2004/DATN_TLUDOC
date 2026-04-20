"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, ArrowRight, Github, Chrome, FileText, Bot, Network, ListChecks, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error("Lỗi đăng ký", {
        description: "Xác nhận mật khẩu không khớp.",
      });
      return;
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Đăng ký thành công!", {
          description: "Bạn có thể đăng nhập ngay bây giờ.",
        });
        router.push("/auth/login");
      } else {
        toast.error("Đăng ký thất bại", {
          description: data.message,
        });
      }
    } catch (error) {
      toast.error("Lỗi hệ thống", {
        description: "Không thể kết nối tới máy chủ.",
      });
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 md:p-6 lg:p-8 font-sans bg-slate-50">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 bg-[url('/tlu.png')] bg-cover bg-center"
          style={{ opacity: 0.99 }}
        />
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-indigo-100/40 blur-[120px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-green-100/30 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 overflow-hidden rounded-[2rem] border border-white bg-white/80 shadow-[0_32px_84px_-20px_rgba(15,23,42,0.15)] backdrop-blur-xl transition-all">
        {/* Left Side: Visual/Intro - THỐNG NHẤT VỚI LOGIN */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-900 text-white">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
          </div>

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
              <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-2xl font-black italic text-indigo-700 leading-none">T</span>
              </div>
              <span className="text-2xl font-bold italic tracking-tight">TLU Document</span>
            </Link>

            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-white/10 text-blue-100 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={12} />
                <span>Tài liệu TLU - TLU Document</span>
              </div>
              <h1 className="text-4xl font-extrabold leading-[1.2] tracking-tight">
                Tham gia cộng đồng <br />
                <span className="text-blue-300">sinh viên Thủy Lợi</span>
              </h1>
              <p className="text-slate-200 text-sm leading-relaxed max-w-sm opacity-90">
                Đăng ký ngay để tải tài liệu miễn phí và trải nghiệm bộ công cụ AI hỗ trợ học tập đỉnh cao tại Đại học Thủy Lợi.
              </p>
            </div>
          </div>

          {/* Featured Tools */}
          <div className="relative z-10 grid grid-cols-1 gap-4 mt-8">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200/60 mb-1">Quyền lợi thành viên</p>
            {[
              { icon: FileText, label: "Tóm tắt tài liệu tự động", color: "text-emerald-400" },
              { icon: Bot, label: "Chatbot Tutor hỗ trợ 24/7", color: "text-pink-400" },
              { icon: Network, label: "Tạo sơ đồ tư duy Mindmap", color: "text-orange-400" },
              { icon: ListChecks, label: "Tạo Quiz trắc nghiệm từ tài liệu", color: "text-cyan-400" },
            ].map((tool, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className={`p-2 rounded-lg bg-white/10 ${tool.color}`}>
                  <tool.icon size={18} />
                </div>
                <span className="text-sm font-bold">{tool.label}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 pt-8 border-t border-white/10 flex items-center justify-between">
            <div className="flex -space-x-3">
              {[6, 7, 8].map(i => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-indigo-700 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=reg-${i}`} alt="user" />
                </div>
              ))}
              <div className="h-8 w-8 rounded-full border-2 border-indigo-700 bg-blue-500 flex items-center justify-center text-[10px] font-bold">+5k</div>
            </div>
            <p className="text-[10px] font-medium text-blue-200">+5K user đã tham gia hệ thống</p>
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-white/40 overflow-y-auto max-h-[90vh] lg:max-h-none">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-10 flex items-center justify-between gap-6">
              <div className="text-center lg:text-left space-y-2">
                <div className="relative inline-block">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Đăng ký</h2>
                  <div className="absolute -bottom-3 left-0 w-full h-1.5 bg-blue-600 rounded-full"></div>
                </div>
                <p className="text-slate-500 font-bold text-sm tracking-tight opacity-80 leading-relaxed uppercase pt-4">Tạo tài khoản mới tại <br /><span className="text-blue-600">TLU-Document</span></p>
              </div>
              <div className="shrink-0 hidden sm:block pointer-events-none">
                <img
                  src="/chatbot.png"
                  alt="Chatbot Tutor"
                  className="h-24 w-24 object-contain"
                />
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullname" className="text-slate-700 font-bold ml-1 text-sm">Họ và tên</Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <User size={18} />
                  </div>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    className="pl-11 h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 font-bold ml-1 text-sm">Email sinh viên</Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail size={18} />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@tlu.edu.vn"
                    className="pl-11 h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-700 font-bold ml-1 text-sm">Mật khẩu</Label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock size={18} />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-11 pr-12 h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-bold ml-1 text-sm">Xác nhận mật khẩu</Label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock size={18} />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-11 pr-12 h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-700/25 transition-all active:scale-[0.98] disabled:opacity-70 mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Đăng ký tài khoản
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>



            <p className="mt-8 text-center text-sm text-slate-500 font-medium">
              Đã là thành viên?{" "}
              <Link href="/auth/login" className="font-bold text-blue-600 hover:text-blue-700 underline decoration-2 underline-offset-4 transition-all">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
