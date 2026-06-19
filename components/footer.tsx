"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Facebook, Instagram, Mail, MapPin, Phone, Send, Youtube } from "lucide-react"

export function Footer() {
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  return (
    <footer className={`mt-16 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 ${isHomePage ? "block" : "hidden md:block"}`}>
      <div className="container mx-auto px-4 pb-5 pt-12">
        <div className="mb-10 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-bold italic text-green-600">
            TLU Document
          </span>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Nền tảng chia sẻ tài liệu học tập dành cho sinh viên Đại học Thủy Lợi, giúp việc tra cứu và học tập trở nên nhanh chóng hơn.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Liên hệ</h3>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span>info@tludocument.vn</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-indigo-600" />
                <span>1900 6868</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <span>175 Tây Sơn, Đống Đa, Hà Nội</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Giúp đỡ</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#" className="text-slate-700 transition-colors hover:text-indigo-600">Câu hỏi thường gặp</Link>
              </li>
              <li>
                <Link href="#" className="text-slate-700 transition-colors hover:text-indigo-600">Điều khoản sử dụng</Link>
              </li>
              <li>
                <Link href="#" className="text-slate-700 transition-colors hover:text-indigo-600">Chính sách quyền riêng tư</Link>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Giới thiệu</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#" className="text-slate-700 transition-colors hover:text-indigo-600">TLU Document là gì?</Link>
              </li>
              <li>
                <Link href="#" className="text-slate-700 transition-colors hover:text-indigo-600">Hướng dẫn sử dụng</Link>
              </li>
              <li>
                <Link href="#" className="text-slate-700 transition-colors hover:text-indigo-600">Đóng góp nội dung</Link>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-indigo-700">Kết nối</h3>
            <div className="mb-4 flex items-center gap-2">
              <a href="#" aria-label="Facebook" className="rounded-full border border-indigo-200 bg-white p-2 text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Instagram" className="rounded-full border border-indigo-200 bg-white p-2 text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:text-white">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Youtube" className="rounded-full border border-indigo-200 bg-white p-2 text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:text-white">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
              <Send className="h-4 w-4" />
              Gửi phản hồi
            </button>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
          Copyright © 2026 TLU Document. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
