# Tài liệu Kỹ thuật: Tích hợp Pollinations AI

Tài liệu này chi tiết về vai trò, cơ chế hoạt động và cách triển khai **Pollinations AI** trong hệ thống **TLU Document**.

---

## 1. Pollinations AI là gì?

**Pollinations AI** (`pollinations.ai`) là một nền tảng trí tuệ nhân tạo mã nguồn mở (Open-source AI Platform). Khác với các nhà cung cấp đóng như OpenAI hay Google, Pollinations đóng vai trò như một **"Unified AI Hub"**, cung cấp một API duy nhất để truy cập vào hàng loạt các mô hình ngôn ngữ (LLM) và mô hình sinh ảnh/âm thanh hàng đầu thế giới.

### Đặc điểm chính:
- **Hệ sinh thái mã nguồn mở:** Toàn bộ mã nguồn API và các bộ tích hợp đều công khai trên GitHub.
- **Tính linh hoạt cao:** Cho phép chuyển đổi giữa GPT-4o, Claude 3.5, Gemini, DeepSeek... chỉ bằng cách thay đổi tham số `model`.
- **OpenAI-Compatible:** API hoàn toàn tương thích với định dạng của OpenAI SDK, giúp giảm thiểu công sức tích hợp.

---

## 2. Vai trò trong Dự án TLU Document

Hệ thống sử dụng Pollinations AI làm lớp xử lý ngôn ngữ tự nhiên (NLP) cốt lõi cho 3 tính năng quan trọng:

| Tính năng | File xử lý chính | Mô tả kỹ thuật |
| :--- | :--- | :--- |
| **Tóm tắt tài liệu** | `lib/summarize.ts` | Sử dụng pipeline tóm tắt đa giai đoạn (Refine Map-Reduce) để xử lý các tài liệu PDF/Word dài hàng chục trang. |
| **Sinh Sơ đồ tư duy** | `lib/mindmap.ts` | Trích xuất cấu trúc phân tầng (Hierarchical structure) từ văn bản và chuyển đổi sang định dạng JSON chuẩn. |
| **Tạo Bộ câu hỏi (Quiz)** | `lib/quiz.ts` | Phân tích kiến thức trọng tâm và sinh câu hỏi trắc nghiệm kèm đáp án, giải thích chi tiết. |

---

## 3. Kiến trúc Tích hợp (Integration Architecture)

### 3.1. Luồng dữ liệu (Data Flow)
1. **Trích xuất (Extraction):** Dùng `pdf-parse` hoặc `mammoth` trích xuất text thô từ file người dùng upload.
2. **Tiền xử lý (Preprocessing):** Text được làm sạch (loại bỏ ký tự lạ, chuẩn hóa khoảng trắng) và chia thành các đoạn nhỏ (**Chunking**) khoảng 2500 ký tự.
3. **Gọi AI (AI Orchestration):** Backend (Next.js API Route) gọi đến endpoint `https://gen.pollinations.ai/v1/chat/completions`.
4. **Hậu xử lý (Post-processing):** Kết quả từ AI (thường là JSON hoặc Markdown) được parse và chuẩn hóa trước khi trả về Frontend.

### 3.2. Cấu hình & Bảo mật
- **API Key:** Sử dụng Secret Key (`sk_...`) lưu trữ trong biến môi trường `POLLINATIONS_API_KEY`. Tuyệt đối không để lộ key ở phía Client.
- **Model:** Mặc định sử dụng model `openai` (được proxy qua hệ thống Azure OpenAI tốc độ cao).
- **Communication:** Giao tiếp qua giao thức HTTPS bảo mật, dữ liệu truyền đi dưới dạng JSON payload.

---

## 4. Thiết kế Phòng vệ (Defensive Design)

Để đảm bảo hệ thống không bị gián đoạn khi AI gặp sự cố (Network error, Rate limit), dự án triển khai các cơ chế sau:

### 4.1. Cơ chế Thử lại (Retry Logic)
Trong `lib/mindmap.ts` và `lib/quiz.ts`, mỗi yêu cầu AI đều được bọc trong vòng lặp thử lại:
- Thử lại tối đa **3 lần**.
- Tự động thay đổi tham số `temperature` (độ sáng tạo) qua mỗi lần thử để tìm kiếm kết quả khác biệt nếu lần trước thất bại.
- Thời gian chờ tăng dần giữa các lần thử.

### 4.2. Sửa lỗi JSON tự động (JSON Repair)
AI đôi khi trả về JSON kèm theo chữ dẫn đoạn hoặc lỗi cú pháp nhỏ. Hàm `parseJsonWithRepairs` thực hiện:
- Dùng Regex để tách khối JSON ra khỏi text thừa.
- Sử dụng thuật toán cân bằng dấu đóng/mở ngoặc (`{}`) để cắt bỏ các ký tự rác phía sau.
- Tự động sửa lỗi dấu phẩy thừa (trailing commas).

### 4.3. Cơ chế Dự phòng (Deterministic Fallback)
Nếu sau 3 lần thử AI vẫn không phản hồi, hệ thống kích hoạt chế độ **Fallback**:
- **Tóm tắt:** Hệ thống tự động trích xuất các câu đầu tiên của tài liệu để tạo bản tóm tắt cơ bản.
- **Mindmap:** Sinh ra một cấu trúc cây mẫu (Template) dựa trên tên file để người dùng không thấy màn hình lỗi.

---

## 5. Phân tích Chi phí & Giới hạn (Pollen Credits)

Dự án hiện đang vận hành theo cơ chế của Pollinations AI năm 2026:
- **Tài khoản miễn phí:** Được cấp một hạn mức (Tier) nhất định hàng tháng.
- **Pollen Credits:** Hệ thống tính phí dựa trên **Pollen** ($1 ≈ 1 Pollen) cho các model cao cấp hoặc khi vượt hạn mức.
- **Model `openai`:** Là lựa chọn tối ưu vì có độ ổn định cao và tiêu tốn ít credits nhất trong hệ thống Pollinations.

---

## 6. Tại sao chọn Pollinations AI thay vì phương án khác?

1. **Vượt rào cản địa lý:** Một số dịch vụ như Claude AI bị giới hạn tại Việt Nam, Pollinations đóng vai trò proxy giúp truy cập ổn định.
2. **Hỗ trợ đa mô hình:** Dễ dàng chuyển đổi sang model khác (như `deepseek` hoặc `gemini`) chỉ bằng 1 dòng code cấu hình mà không cần viết lại logic pipeline.
3. **Mã nguồn mở:** Phù hợp với tiêu chí minh bạch và học thuật của một đồ án tốt nghiệp.

---
Để kiểm tra chính xác mô hình nào đang chạy đằng sau bí danh "openai" của Pollinations AI, bạn có thể thực hiện kiểm tra theo 2 cách (chạy lệnh trực tiếp từ Terminal/PowerShell hoặc trình duyệt):

Cách 1: Kiểm tra cấu hình ánh xạ hệ thống của Pollinations (Khuyên dùng)
Pollinations AI cung cấp một Endpoint công khai hiển thị toàn bộ danh sách mô hình đang hoạt động và các bí danh (aliases) tương ứng của chúng.

Lệnh chạy trên PowerShell (Windows):

powershell
Invoke-RestMethod -Uri "https://text.pollinations.ai/models" | ConvertTo-Json -Depth 5
Hoặc chạy bằng cURL (mọi nền tảng):

bash
curl -s https://text.pollinations.ai/models
Hoặc mở link trực tiếp trên trình duyệt:

👉 https://text.pollinations.ai/models
Cách đọc kết quả: Hệ thống sẽ trả về một chuỗi JSON. Bạn sẽ thấy một đối tượng mô hình có cấu trúc dạng:

json
[
  {
    "name": "openai-fast",
    "description": "GPT-OSS 20B Reasoning LLM (OVH)",
    "aliases": [
      "openai",
      "gpt-oss",
      "gpt-oss-20b",
      "ovh-reasoning"
    ],
    ...
  }
]
Dòng name / aliases: Chứng minh rằng khi code của bạn truyền tham số "openai", hệ thống Pollinations sẽ tự động ánh xạ nó về mô hình thực tế chạy ở backend là openai-fast (hiện tại do hãng OVH host dưới dạng GPT-OSS Reasoning).
Cách 2: Hỏi trực tiếp "Bộ não AI" thông qua API của dự án
Bạn có thể gửi một câu hỏi thẳng tới mô hình thông qua API Endpoint của Pollinations để xem nó tự nhận diện mình là gì.

Lệnh chạy trên PowerShell/Terminal:

bash
curl.exe -s "https://text.pollinations.ai/What%20model%20are%20you%20exactly?%20Answer%20very%20shortly%20in%20one%20or%20two%20words."
Kết quả nhận được (Response):

text
GPT-4 architecture / OpenAI GPT
(Mô hình tự nhận diện nó được xây dựng và huấn luyện dựa trên kiến trúc GPT của OpenAI).

💡 Gợi ý trả lời Hội đồng Bảo vệ:
"Để kiểm tra chính xác, em có thể truy vấn trực tiếp Endpoint quản lý mô hình của Pollinations AI tại địa chỉ https://text.pollinations.ai/models. Dữ liệu JSON trả về từ hệ thống chứng minh bí danh openai mà em cấu hình trong code thực chất là alias được định tuyến về mô hình openai-fast (dòng GPT-OSS / GPT-4o-mini tương thích OpenAI)."


*Tài liệu này được soạn thảo phục vụ cho hội đồng bảo vệ đồ án tốt nghiệp.*
