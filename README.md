# 📚 TLU Document - Hệ Thống Quản Lý Tài Liệu Học Tập

> Nền tảng hỗ trợ học tập tích hợp chatbot AI (Gemini) để giúp sinh viên tìm tài liệu và giải đáp thắc mắc học tập.

---

## 🚀 Demo Trực Tiếp

| 📍 Tài Nguyên | 🔗 Link |
|---|---|
| **Live Demo** | [https://datn-tludoc.vercel.app/](https://datn-tludoc.vercel.app/) |
| **CI/CD Pipeline** | [Vercel Dashboard](https://vercel.com/vietcuong2004s-projects/datn-tludoc) |
| **Database** | [Railway MySQL](https://railway.com/project/b5fe13e8-018d-439a-9d19-2044737aa298/service/a8c712cc-c366-4c3a-aa4d-d77eea842d32/database?environmentId=6ee76ecc-c4bc-4615-b1a5-616432dd979f) |

---

## 💰 Monitoring Gemini API

| 📊 Mục Đích | 🌐 Nền Tảng | 🔗 Link |
|---|---|---|
| Xem requests & tokens | Google AI Studio | [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| Chi tiết chi phí | Google Cloud Console | [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) |
| Quota sử dụng | Google Cloud Console | [https://console.cloud.google.com](https://console.cloud.google.com) |

---

## ⚙️ Mindmap Pollinations Config

Thiết lập các biến môi trường sau để bật API sinh mindmap riêng:

- `POLLINATIONS_API_KEY`: API key để gọi Pollinations.
- `MINDMAP_MODEL` (optional): mặc định `openai`.
- `MINDMAP_CHUNK_MAX_CHARS` (optional): mặc định `12000`.
- `MINDMAP_MAX_CHUNKS` (optional): mặc định `8`.

API mới: `POST /api/mindmap/generate`

- Input JSON: `{ "fileName": string, "text": string }`
- Output JSON: `mindmap` (node tree render trực tiếp) + `simpleTree` (schema `name/children`)

---
