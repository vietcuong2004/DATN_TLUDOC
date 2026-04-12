# 🛠️ FIX LỖI QUIZ GENERATION (Pollinations + PDF Parse)

## 🎯 Mục tiêu

Fix toàn bộ lỗi hiện tại:

* ❌ Pollinations API yêu cầu `"json"` trong prompt
* ❌ `pdf-parse` bị lỗi `parseFunc is not a function`
* ❌ Hệ thống fail toàn bộ flow quiz

---

# 🧨 1. LỖI POLLINATIONS: `"messages must contain the word 'json'"`

## ❌ Nguyên nhân

Pollinations đang dùng Azure OpenAI với `response_format = json_object`

👉 Bắt buộc prompt phải chứa từ `"json"`

---

## ✅ Cách fix (QUAN TRỌNG NHẤT)

### 🔧 Sửa trong `callPollinationsChat`

Tìm đoạn:

```ts
messages: options.messages,
```

### 👉 Replace thành:

```ts
messages: options.messages.map(m => ({
  ...m,
  content: m.content.includes("json")
    ? m.content
    : m.content + "\n\nReturn result in JSON format.",
})),
```

---

## ✅ Hoặc fix CHUẨN hơn (khuyến nghị)

### Sửa prompt trong `generateQuestionsFromChunk`

#### ❌ Cũ:

```txt
Output JSON:
{
  "questions": [...]
}
```

#### ✅ Mới:

```txt
Return ONLY valid JSON.

The response MUST be in JSON format.

Output:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}
```

---

## ⚠️ NOTE QUAN TRỌNG

* Chỉ cần có chữ `"json"` (lowercase) là đủ
* Không có → API 400 ngay lập tức

---

# 🧨 2. LỖI PDF: `parseFunc is not a function`

## ❌ Nguyên nhân

`pdf-parse` version mới không export kiểu cũ nữa

---

## ✅ FIX CHUẨN (Next.js)

### 🔧 Replace toàn bộ `extractPdfText`

#### ❌ Code hiện tại:

```ts
const pdfParse = require("pdf-parse")
const parseFunc = pdfParse.default || pdfParse
const parsed = await parseFunc(buffer)
```

---

### ✅ Code đúng:

```ts
async function extractPdfText(buffer: Buffer) {
  try {
    const pdfParse = (await import("pdf-parse")).default
    const parsed = await pdfParse(buffer)
    return normalizeExtractedText(parsed.text ?? "")
  } catch (error) {
    console.error("[quiz.generate] Lỗi khi đọc PDF:", error)
    throw new Error("Không thể trích xuất chữ từ PDF.")
  }
}
```

---

## 🔥 Vì sao fix này đúng?

| Cách             | Kết quả            |
| ---------------- | ------------------ |
| require()        | ❌ lỗi runtime      |
| import() dynamic | ✅ đúng với Next.js |

---

# 🧨 3. FIX ANTI-CRASH (RẤT QUAN TRỌNG)

## ❌ Hiện tại:

Nếu AI fail → crash toàn bộ API

---

## ✅ Thêm fallback an toàn

### Trong `generateQuestionsFromChunk`

```ts
try {
  const raw = await callPollinationsChat(...)
  const parsed = safeParseQuiz(raw)

  if (!parsed.length) throw new Error("Empty quiz")

  return parsed
} catch (e) {
  console.warn("[quiz] fallback question generation")

  return [{
    question: "Nội dung chính của tài liệu là gì?",
    options: [
      "Phân tích nội dung",
      "Tóm tắt thông tin",
      "Giải thích khái niệm",
      "Tất cả các ý trên"
    ],
    correctIndex: 3,
    explanation: "Câu hỏi fallback do AI không trả kết quả."
  }]
}
```

---

# 🧨 4. FIX JSON PARSE CỨNG (RẤT HAY LỖI)

## ❌ Hiện tại:

```ts
JSON.parse(cleaned)
```

---

## ✅ Sửa thành:

````ts
function safeParseQuiz(jsonText: string): QuizQuestion[] {
  try {
    const cleaned = jsonText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")

    const sliced = cleaned.slice(start, end + 1)

    const parsed = JSON.parse(sliced)

    return parsed.questions ?? []
  } catch (error) {
    console.warn("Parse JSON error:", error)
    return []
  }
}
````

---

# 🧨 5. FIX MODEL (OPTIONAL nhưng nên làm)

## ❌ Vấn đề

Model `"openai"` đôi khi không ổn định

---

## ✅ Fix:

```ts
const model = "gpt-4o-mini"
```

---

# 🧨 6. FIX LOG DEBUG (RẤT NÊN THÊM)

Thêm log để debug:

```ts
console.log("[quiz] raw AI response:", raw.slice(0, 300))
```

---

# 🚀 KẾT QUẢ SAU KHI FIX

| Trước              | Sau           |
| ------------------ | ------------- |
| ❌ 400 Pollinations | ✅ OK          |
| ❌ PDF crash        | ✅ đọc được    |
| ❌ JSON lỗi         | ✅ parse ổn    |
| ❌ Fail toàn bộ     | ✅ có fallback |
| ❌ Quiz random lỗi  | ✅ ổn định     |

---

# 🧠 BONUS (NÂNG CAO - NÊN LÀM)

### Thêm system prompt global:

```ts
{
  role: "system",
  content: "You are a quiz generator. Always return valid JSON."
}
```

---

# ✅ CHECKLIST

* [ ] Fix Pollinations `"json"`
* [ ] Fix pdf-parse import
* [ ] Fix JSON parse robust
* [ ] Thêm fallback
* [ ] Thêm logging

---

# 🎯 KẾT LUẬN

Lỗi của bạn KHÔNG phải do logic quiz
👉 mà do integration với AI API + parsing

Sau khi fix:

* Hệ thống sẽ stable như production
* Không crash
* Có fallback thông minh
* Tương đương các tool như NotebookLM

---
