 # UC3 - Hướng dẫn code chi tiết tính năng Chatbot Tutor

## 1) Mục tiêu của UC3

Xây chatbot để:
- Trả lời câu hỏi học tập.
- Gợi ý tài liệu liên quan ngay trong kho tài liệu của hệ thống.
- Lưu lịch sử hội thoại để xem lại.

Yêu cầu thêm: triển khai nhanh, chi phí thấp, không xây chatbot từ đầu.

Giải pháp phù hợp nhất cho đồ án hiện tại:
- Dùng API của model có giá rẻ/free tier (khuyến nghị Gemini Flash).
- Làm "RAG nhẹ" bằng MySQL keyword search (không cần vector database).
- Viết 1 API route trung tâm để frontend gọi.

---

## 2) Kiến trúc triển khai (MVP)

Luồng tổng quát:
1. Người dùng nhập câu hỏi ở trang chatbot.
2. Frontend gọi `POST /api/chatbot`.
3. Backend truy vấn MySQL để lấy 3-5 tài liệu liên quan (theo title/description).
4. Backend ghép context từ các tài liệu đó + câu hỏi người dùng thành prompt.
5. Backend gọi AI API (Gemini/OpenRouter/OpenAI đều được).
6. Backend trả về:
	 - `answer`: câu trả lời tự nhiên.
	 - `documents`: tài liệu gợi ý (id, title, image, downloadUrl).
7. Backend lưu lịch sử vào bảng `chatbot_history`.

Điểm mạnh của hướng này:
- Không cần dựng pipeline embedding/vector DB.
- Tận dụng schema có sẵn (`documents`, `chatbot_history`).
- Đủ tốt để demo, bảo vệ, và có thể mở rộng sau.

---

## 3) Mapping với codebase hiện tại

### Hiện trạng
- Giao diện đã có ở `app/chatbot/page.tsx` nhưng đang dùng dữ liệu mock.
- DB đã có bảng `chatbot_history` trong tài liệu schema.
- Dự án đã có repository layer (`lib/repositories.ts`) và API route pattern (`app/api/.../route.ts`).

### Cần thêm
1. API route mới: `app/api/chatbot/route.ts`.
2. Hàm truy vấn tài liệu cho chatbot trong `lib/repositories.ts`.
3. Hàm lưu lịch sử chat vào DB trong `lib/repositories.ts`.
4. Sửa `app/chatbot/page.tsx` để gọi API thật thay vì `generateBotResponse()`.

---

## 4) Chọn nhà cung cấp AI tiết kiệm chi phí

Khuyến nghị ưu tiên:
1. Gemini Flash (Google AI Studio): thường có free tier, tốc độ tốt, đủ cho chatbot học thuật.
2. OpenRouter: dễ đổi model theo ngân sách.
3. OpenAI: chất lượng tốt nhưng thường tốn hơn nếu gọi nhiều.

Đề xuất thực tế cho đồ án:
- Bắt đầu bằng Gemini Flash.
- Giới hạn token đầu ra để giảm chi phí.
- Chỉ gửi tối đa 3-5 tài liệu liên quan làm context.

Biến môi trường nên có:

```env
GEMINI_API_KEY=your_key_here
CHATBOT_MODEL=gemini-2.0-flash
CHATBOT_MAX_OUTPUT_TOKENS=400
```

---

## 5) Thiết kế API cho UC3

### Endpoint
- `POST /api/chatbot`

### Input từ frontend

```json
{
	"message": "Giải thích hiệu ứng mỏ neo và gợi ý tài liệu",
	"userId": 1
}
```

### Output trả về frontend

```json
{
	"answer": "Hiệu ứng mỏ neo là...",
	"documents": [
		{
			"id": 8,
			"title": "Hành vi người tiêu dùng...",
			"image": "https://drive.google.com/thumbnail?...",
			"downloadUrl": "https://drive.google.com/uc?..."
		}
	]
}
```

### Quy ước lỗi
- `400`: thiếu message.
- `500`: lỗi nội bộ hoặc lỗi gọi AI.
- Khi lỗi, trả câu fallback thân thiện để UX không bị "chết".

---

## 6) Cách code backend (chi tiết)

### Bước 1: Tạo hàm truy vấn tài liệu liên quan

Thêm vào `lib/repositories.ts` một hàm kiểu:

```ts
export type ChatbotCandidateDoc = {
	id: number
	title: string
	description: string
	image: string
	downloadUrl: string
}

export async function searchDocumentsForChatbot(query: string, limit = 5): Promise<ChatbotCandidateDoc[]> {
	// Gợi ý SQL đơn giản, dễ làm:
	// - WHERE status = 'published'
	// - title LIKE ? OR description LIKE ?
	// - ORDER BY views_count DESC, downloads_count DESC
	// - LIMIT ?
	// Trả về các trường đủ để gợi ý tài liệu.
	return []
}
```

Mẹo tối ưu nhanh:
- Cắt query về 100 ký tự đầu để tránh prompt quá dài.
- Nếu không có kết quả LIKE, có thể fallback lấy top tài liệu phổ biến.

### Bước 2: Tạo hàm lưu lịch sử chat

Thêm vào `lib/repositories.ts`:

```ts
export async function saveChatbotHistory(params: {
	userId: number
	question: string
	answer: string
	aiModel?: string
	documentId?: number | null
}) {
	// INSERT INTO chatbot_history (user_id, document_id, question, answer, ai_model)
	// VALUES (?, ?, ?, ?, ?)
}
```

Lưu ý:
- `document_id` có thể null nếu không gợi ý tài liệu nào.
- Nếu gợi ý nhiều tài liệu, có thể lưu tài liệu đầu tiên (MVP) để đơn giản.

### Bước 3: Tạo API route `app/api/chatbot/route.ts`

Skeleton dễ triển khai:

```ts
import { NextResponse } from "next/server"
import { searchDocumentsForChatbot, saveChatbotHistory } from "@/lib/repositories"

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const message = String(body?.message ?? "").trim()
		const userId = Number(body?.userId ?? 0)

		if (!message) {
			return NextResponse.json({ error: "Thiếu message" }, { status: 400 })
		}

		const docs = await searchDocumentsForChatbot(message, 5)

		const contextText = docs
			.map((d, i) => `${i + 1}. ${d.title}\n${d.description || ""}`)
			.join("\n\n")

		const prompt = [
			"Bạn là trợ lý học tập. Trả lời bằng tiếng Việt dễ hiểu, ngắn gọn.",
			"Nếu có tài liệu liên quan, hãy gợi ý đúng trọng tâm.",
			"Nếu không chắc, nói rõ mức độ chắc chắn.",
			"=== CÂU HỎI ===",
			message,
			"=== NGỮ CẢNH TÀI LIỆU ===",
			contextText || "Không có tài liệu khớp trong kho."
		].join("\n")

		// Gọi AI API bằng fetch (Gemini/OpenRouter/OpenAI)
		const answer = "...kết quả từ AI..."

		if (userId > 0) {
			await saveChatbotHistory({
				userId,
				question: message,
				answer,
				aiModel: process.env.CHATBOT_MODEL,
				documentId: docs[0]?.id ?? null,
			})
		}

		return NextResponse.json({
			answer,
			documents: docs.map((d) => ({
				id: d.id,
				title: d.title,
				image: d.image,
				downloadUrl: d.downloadUrl,
			})),
		})
	} catch (error) {
		console.error("[api/chatbot]", error)
		return NextResponse.json(
			{
				answer: "Hệ thống đang bận. Bạn thử lại sau ít phút nhé.",
				documents: [],
			},
			{ status: 500 },
		)
	}
}
```

---

## 7) Cách code frontend (chuyển từ mock sang API thật)

Trong `app/chatbot/page.tsx`, thay đoạn `setTimeout + generateBotResponse()` bằng gọi API thật.

Ý tưởng:
- Vẫn giữ UI chat như hiện tại.
- Khi bấm gửi:
	1. Add user message vào state.
	2. Gọi `fetch('/api/chatbot', { method: 'POST', body: ... })`.
	3. Nhận `answer`, `documents`.
	4. Add assistant message vào state.

Ví dụ đoạn xử lý gửi tin:

```ts
const response = await fetch("/api/chatbot", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		message: input,
		userId: 1, // MVP: hardcode. Chuẩn hơn thì lấy từ session.
	}),
})

const data = await response.json()

setMessages((prev) => [
	...prev,
	{
		id: Date.now().toString(),
		role: "assistant",
		content: data.answer || "Chưa có câu trả lời",
		timestamp: new Date(),
		documents: data.documents || [],
	},
])
```

Lưu ý quan trọng:
- `Message.documents` hiện đang có `price`; với chatbot học thuật nên bỏ `price` để đồng bộ với dữ liệu thật.
- Nếu muốn giữ card tài liệu, chỉ cần `id`, `title`, `image`, `downloadUrl` là đủ.

---

## 8) Prompt nâng cao cho kết quả tốt nhất (phiên bản khuyến nghị)

Mục tiêu của prompt nâng cao:
- Trả lời đúng trọng tâm học tập, không lan man.
- Có định hướng học (khái niệm -> ví dụ -> cách tự luyện).
- Hạn chế bịa thông tin khi context không đủ.
- Đầu ra ổn định để dễ render trên UI.

### 8.1 System Prompt (dùng cố định ở backend)

```text
Bạn là TutorAI - trợ giảng học thuật cho sinh viên đại học Việt Nam.

NHIỆM VỤ CỐT LÕI:
1) Giải thích kiến thức rõ ràng, dễ hiểu, có tính sư phạm.
2) Ưu tiên sử dụng NGỮ CẢNH TÀI LIỆU được cung cấp.
3) Đưa ra gợi ý học tập thực hành được ngay.

NGUYÊN TẮC TRẢ LỜI:
- Trả lời bằng tiếng Việt, văn phong thân thiện nhưng học thuật.
- Trình bày theo cấu trúc ngắn, rõ, có tiêu đề nhỏ.
- Nếu câu hỏi khó: chia nhỏ vấn đề thành các bước.
- Nếu liên quan bài thi: nêu mẹo làm bài và lỗi thường gặp.
- Nếu người dùng hỏi mơ hồ: đặt 1-2 câu hỏi làm rõ.

RÀNG BUỘC ĐỘ TIN CẬY:
- Chỉ khẳng định mạnh khi có dữ liệu trong NGỮ CẢNH TÀI LIỆU hoặc kiến thức nền phổ thông đáng tin.
- Không bịa tài liệu, không bịa số liệu, không bịa nguồn.
- Nếu dữ liệu chưa đủ, phải nói rõ: "Hiện chưa đủ dữ liệu trong kho tài liệu để kết luận chắc chắn".

ƯU TIÊN CÁ NHÂN HÓA CHO SINH VIÊN:
- Tùy theo mục đích người học (ôn thi, làm bài tập, hiểu khái niệm).
- Kết thúc bằng "Bước tiếp theo" thật cụ thể (ví dụ: nên đọc tài liệu nào trước, luyện gì trong 20 phút).

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
1) Tóm tắt ngắn (2-4 câu)
2) Giải thích chi tiết (gạch đầu dòng)
3) Ví dụ minh họa (nếu phù hợp)
4) Bước tiếp theo để học (2-3 ý)
5) Mức độ chắc chắn: Cao / Trung bình / Thấp (kèm lý do 1 câu)

Nếu có tài liệu liên quan trong context, thêm mục:
6) Tài liệu nên đọc tiếp: liệt kê theo mức ưu tiên.
```

### 8.2 User Prompt Template (ghép động theo từng câu hỏi)

```text
MỤC TIÊU NGƯỜI HỌC: {learning_goal}
MỨC ĐỘ HIỆN TẠI: {student_level}
CÂU HỎI: {question}

NGỮ CẢNH TÀI LIỆU TRUY XUẤT:
{context}

YÊU CẦU THÊM:
- Nếu có nhiều hướng trả lời, ưu tiên hướng dễ hiểu trước.
- Tránh trả lời quá dài, tập trung vào điều sinh viên cần để học ngay.
```

### 8.3 Gợi ý giá trị biến để dùng ngay (MVP)

- `learning_goal`: mặc định `"Hiểu khái niệm và áp dụng làm bài tập"`
- `student_level`: mặc định `"Đại học năm 1-2"`
- `context`: ghép từ top 3-5 tài liệu tìm được trong DB

### 8.4 Ví dụ output tốt mong muốn

```text
Tóm tắt ngắn:
Hiệu ứng mỏ neo là xu hướng bị ảnh hưởng bởi thông tin đầu tiên khi ra quyết định...

Giải thích chi tiết:
- ...
- ...

Ví dụ minh họa:
- ...

Bước tiếp theo để học:
- Đọc tài liệu A trước để nắm nền tảng.
- Làm 3 câu bài tập tình huống về định giá.

Mức độ chắc chắn: Cao (vì có dữ liệu trùng khớp trong 3 tài liệu truy xuất).

Tài liệu nên đọc tiếp:
1. ...
2. ...
```

Lưu ý tích hợp:
- Prompt này nên đặt ở backend (`app/api/chatbot/route.ts`) để frontend không lộ logic điều khiển model.
- Khi chi phí tăng, giảm độ dài `context` trước, không giảm chất lượng format output.

---

## 9) Kiểm soát chi phí (rất quan trọng)

Checklist bắt buộc:
1. Dùng model rẻ (`Flash`/`mini`).
2. Giới hạn `max_output_tokens` (300-500).
3. Chỉ gửi top 3-5 tài liệu làm context.
4. Cắt bớt description quá dài (ví dụ mỗi tài liệu tối đa 500 ký tự).
5. Chặn spam gửi liên tiếp từ frontend (disable nút gửi khi đang loading).

Tối ưu thêm nếu cần:
- Cache câu hỏi lặp lại trong 5-10 phút.
- Lưu câu trả lời vào DB để tái sử dụng.

---

## 10) Lộ trình triển khai 1-2 ngày

### Ngày 1 (MVP chạy được)
1. Tạo `POST /api/chatbot`.
2. Tạo `searchDocumentsForChatbot()`.
3. Gọi AI API và trả `answer + documents`.
4. Nối frontend chat với API thật.

### Ngày 2 (hoàn thiện demo)
1. Lưu `chatbot_history`.
2. Bổ sung xử lý lỗi/fallback message.
3. Tinh chỉnh prompt và quality câu trả lời.
4. Dọn UI card tài liệu (bỏ price, thêm link tải/xem).

---

## 11) Tiêu chí nghiệm thu UC3

UC3 đạt khi:
1. Người dùng gửi câu hỏi và nhận phản hồi AI trong <= 5 giây (mạng ổn định).
2. Có gợi ý tối thiểu 1-3 tài liệu liên quan nếu tìm thấy.
3. Trường hợp không có dữ liệu vẫn trả lời thân thiện, không crash.
4. Lịch sử chat được lưu vào `chatbot_history`.
5. Không dùng dữ liệu mock trong luồng chính.

---

## 12) Mẫu trả lời khi bảo vệ

> Em triển khai chatbot theo hướng tiết kiệm chi phí: dùng API model có free tier, kết hợp RAG nhẹ bằng truy vấn MySQL theo từ khóa, không cần dựng vector database. Luồng chạy là frontend gửi câu hỏi -> API route truy xuất tài liệu liên quan -> gọi AI tổng hợp -> trả lời kèm tài liệu gợi ý -> lưu lịch sử chat. Cách này triển khai nhanh, chi phí thấp, và vẫn bám dữ liệu thật của hệ thống.

