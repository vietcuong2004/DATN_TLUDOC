# 🧠 Hướng Dẫn Chi Tiết: Tạo Sơ Đồ Tư Duy Từ Tài Liệu (UC5)

Tài liệu này mô tả **chi tiết cách code, workflow, thuật toán** để chuyển PDF/DOCX/TXT thành mindmap bằng AI.

---

## 1) Tổng Quan Kiến Trúc

### 1.1 Luồng hoạt động End-to-End

```
Người dùng tải lên tệp (PDF/DOCX/TXT)
        ↓
Giai đoạn 0: Trích xuất nội dung (Text Extraction)
  ├─ PDF: Xử lý tại Client (Browser) bằng pdfjs-dist
  └─ DOCX/TXT: Gửi yêu cầu tới /api/mindmap/extract (Server) bằng mammoth
        ↓
Frontend: Gửi yêu cầu POST /api/mindmap/generate (kèm nội dung văn bản đã trích xuất)
        ↓
Hệ thống xử lý Backend (lib/mindmap.ts):
  1. Tiền xử lý (Làm sạch văn bản, loại bỏ ký tự rác)
  2. Chia nhỏ thông minh (Chia theo đoạn văn, giữ nguyên ranh giới nội dung)
  3. Tóm tắt song song (Xử lý theo lô 2 đoạn để tránh giới hạn API)
  4. Hợp nhất các bản tóm tắt → Tạo ngữ cảnh tổng thể (Global Context)
  5. Sinh Sơ đồ tư duy từ ngữ cảnh (Sử dụng API Gemini/Pollinations)
  6. Sửa lỗi JSON & Xác thực (Thuật toán "vá" JSON, cân bằng dấu ngoặc)
  7. Chuẩn hóa dữ liệu sang MindmapNode (Gán ID, nguồn tham chiếu, logic cây)
        ↓
Frontend: Hiển thị sơ đồ tư duy từ dữ liệu JSON
  - Tính toán bố cục (Xác định vị trí, độ sâu của các nút)
  - Vẽ đường nối SVG (Sử dụng đường cong Bezier)
  - Sắp xếp các nút (Node) hiển thị trên giao diện
  - Các bộ điều khiển: Phóng to/Thu nhỏ, Di chuyển, Toàn màn hình
```

---

## 2) Thuật Toán Chi Tiết (Full Code)

### 3.0 Giai đoạn 0: Trích xuất nội dung (Text Extraction)
Đây là giai đoạn tạo ra **Input** cho toàn bộ Pipeline. Tùy thuộc vào loại file mà hệ thống sẽ xử lý ở Client hoặc Server.

#### 3.0.1 Trích xuất PDF tại Client (Browser)
*   **Vị trí code:** `app/mindmap/page.tsx` và `lib/client-pdf-parser.ts`
*   **Mục đích:** Đọc chữ trực tiếp từ file PDF trên trình duyệt của người dùng.

```typescript
// Trong app/mindmap/page.tsx
if (isPdf) {
  // Import thư viện xử lý PDF tại client
  const { extractTextFromPDFFile } = await import("@/lib/client-pdf-parser")
  // Trích xuất chữ
  const extractedText = await extractTextFromPDFFile(selectedFile)
  // Tạo một file .txt tạm thời chứa nội dung đã trích xuất
  fileToProcess = new File([extractedText], selectedFile.name.replace(/\.pdf$/i, ".txt"), { type: "text/plain" })
}
```

#### 3.0.2 Trích xuất Word (Docx) & Txt tại Server
*   **Vị trí code:** `app/api/mindmap/extract/route.ts`
*   **Giải thích:** Đối với Word, hệ thống sử dụng thư viện `mammoth` để trích xuất văn bản thô.
*   **Input:** File nhị phân (Binary). **Output:** Chuỗi văn bản (String).

```typescript
// Trong app/api/mindmap/extract/route.ts
if (extension === "docx") {
  const buffer = Buffer.from(await file.arrayBuffer())
  // Sử dụng mammoth để đọc chữ từ file Word
  const parsed = await mammoth.extractRawText({ buffer })
  const text = normalizeExtractedText(parsed.value ?? "")
  return NextResponse.json({ text })
}

if (extension === "txt") {
  const text = buffer.toString("utf-8")
  return NextResponse.json({ text })
}
```

---

### 3.1 Giai đoạn 1: Làm sạch văn bản (Preprocessing)
*   **Vị trí code:** `lib/mindmap.ts` (Hàm `cleanMarkdownText`)
*   **Input:** Văn bản thô từ Giai đoạn 0. **Output:** Văn bản đã được chuẩn hóa.

```typescript
function cleanMarkdownText(text: string): string {
  // 1. Loại bỏ các ký tự heading (#)
  text = text.replace(/^#+\s+/gm, "")
  // 2. Loại bỏ các dấu bullet points (•, ○, -, ...)
  text = text.replace(/^[\s]*[•○◯●-]\s+/gm, "")
  // 3. Loại bỏ danh sách đánh số
  text = text.replace(/^\s*\d+\.\s+/gm, "")
  // 4. Ghép các dòng bị cắt nhỏ lại với nhau
  text = text.replace(/([.!?])\n(?=[a-z])/g, "$1 ")
  // 5. Chuyển đổi mọi loại khoảng trắng/xuống dòng thành 1 dấu cách duy nhất
  text = text.replace(/\s+/g, " ")
  return text.trim()
}
```

---

### 3.2 Giai đoạn 2: Chia nhỏ văn bản (Smart Chunking)
*   **Vị trí code:** `lib/mindmap.ts` (Hàm `chunkText` và `splitLargeParagraph`)
*   **Giải thích:** Chia văn bản thành các đoạn nhỏ dưới 12,000 ký tự (mặc định) để gửi cho AI.

```typescript
function chunkText(inputText: string, maxChunkChars: number, maxChunks: number) {
  const text = cleanMarkdownText(inputText)
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]+/g, " ")
    .replace(/\r/g, "")
    .trim()

  if (!text) return [] as string[]
  if (text.length <= maxChunkChars) return [text]

  // Cắt văn bản theo đoạn (\n\n)
  const paragraphs = text.split(/\n{2,}/).flatMap((paragraph) => {
    const trimmed = paragraph.trim()
    if (!trimmed) return [] as string[]

    // Nếu một đoạn văn vẫn quá dài, cắt nhỏ tiếp theo câu
    if (trimmed.length > maxChunkChars) {
      return splitLargeParagraph(trimmed, Math.max(1600, Math.floor(maxChunkChars * 0.92)))
    }
    return [trimmed]
  })

  // Group paragraphs into chunks (Xem chi tiết tại lib/mindmap.ts)
  const chunks: string[] = []
  let current = ""
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > maxChunkChars && current.length > 0) {
      chunks.push(current); current = paragraph
      if (chunks.length >= maxChunks) break
      continue
    }
    current = candidate
  }
  if (current.length > 0 && chunks.length < maxChunks) chunks.push(current)
  return chunks.slice(0, maxChunks)
}

// Hàm bổ trợ: Cắt đoạn văn dài theo dấu chấm câu
function splitLargeParagraph(paragraph: string, maxChars: number) {
  const parts: string[] = []
  const sentences = paragraph
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;:])\s+/) // Cắt theo dấu chấm, chấm phẩy, chấm hỏi, hai chấm
    .filter((item) => item.length > 0)

  let current = ""
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence
    if (next.length > maxChars && current.length > 0) {
      parts.push(current)
      current = sentence
      continue
    }
    current = next
  }
  if (current.length > 0) parts.push(current)
  return parts.length > 0 ? parts : [paragraph.slice(0, maxChars)]
}
```

---

### 3.3 Giai đoạn 3: Tóm tắt song song (Batch Summarization)
*   **Vị trí code:** `lib/mindmap.ts` (Hàm `summarizeChunk`)

```typescript
async function summarizeChunk(chunkText: string, options: { apiKey: string; model: string }): Promise<string> {
  const prompt = `Bạn là chuyên gia phân tích tài liệu. Hãy tóm tắt nội dung chính dạng bullet points, mỗi dòng <= 15 từ.`

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const summaryText = await callPollinationsChat({
        apiKey: options.apiKey,
        model: options.model,
        userPrompt: prompt + "\n\nNội dung:\n" + chunkText,
        temperature: 0.3 + attempt * 0.1,
        maxTokens: 1500,
      })
      if (summaryText) return summaryText
    } catch (error) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }
  return ""
}
```

---

### 3.4 Giai đoạn 4: Thuật toán "Vá" JSON (JSON Repair)
*   **Vị trí code:** `lib/mindmap.ts`
*   **Giải thích:** Đảm bảo trích xuất chính xác JSON từ kết quả trả về của AI.

```typescript
function findBalancedJsonObject(value: string) {
  const start = value.indexOf("{")
  if (start < 0) return ""

  // --- PHẦN LOGGING PHẢN HỒI AI ---
  // Ghi log câu trả lời thô từ AI gửi về terminal để debug
  console.log("--- AI RAW RESPONSE ---");
  console.log(value);
  console.log("-----------------------");

  let depth = 0, inString = false, escaped = false

  // Duyệt qua từng ký tự của chuỗi bắt đầu từ vị trí tìm thấy dấu mở ngoặc '{' đầu tiên
  for (let index = start; index < value.length; index += 1) {
    const char = value[index]

    // 1. Kiểm tra nếu đang ở bên trong một chuỗi văn bản (nằm giữa cặp ngoặc kép "")
    if (inString) {
      if (escaped) { 
        // Bỏ qua ký tự này nếu ký tự trước đó là dấu gạch chéo ngược '\' (Ký tự thoát)
        escaped = false; 
        continue 
      }
      if (char === "\\") { 
        // Đánh dấu ký tự tiếp theo sẽ bị bỏ qua (ví dụ: \")
        escaped = true; 
        continue 
      }
      if (char === '"') {
        // Gặp dấu ngoặc kép kết thúc chuỗi văn bản
        inString = false
      }
      continue // Tiếp tục duyệt ký tự kế tiếp bên trong chuỗi
    }

    // 2. Xử lý khi ở bên ngoài chuỗi văn bản
    if (char === '"') {
      // Bắt đầu một chuỗi văn bản mới
      inString = true
      continue
    }
    if (char === "{") {
      // Gặp một object con bên trong: Tăng độ sâu (depth)
      depth += 1
      continue
    }
    if (char === "}") {
      // Gặp dấu đóng ngoặc: Giảm độ sâu (depth)
      depth -= 1
      // Khi độ sâu quay về 0, nghĩa là ta đã tìm thấy điểm kết thúc hoàn chỉnh của object JSON
      if (depth === 0) return value.slice(start, index + 1)
    }
  }
  // Trả về chuỗi rỗng nếu duyệt hết văn bản mà không tìm được object cân bằng
  return ""
}
```

---

### 3.5 Giai đoạn 5: Chuẩn hóa & Final Logging
*   **Vị trí code:** `lib/mindmap.ts` (Kết thúc hàm `generateMindmapWithGemini`)

```typescript
// Chuyển đổi từ Simple Tree (từ AI) sang cấu trúc MindmapNode (dùng để render UI)
const finalMindmap = toMindmapNode(simpleTree);

// --- PHẦN LOGGING JSON CUỐI CÙNG ---
// Ghi log cấu trúc JSON hoàn chỉnh dùng để render Mindmap ra terminal
console.log("--- FINAL MINDMAP JSON FOR RENDERING ---");
console.log(JSON.stringify(finalMindmap, null, 2));
console.log("----------------------------------------");

return {
  simpleTree,
  mindmap: finalMindmap,
  chunkCount: chunks.length,
}
```

---

## 4) Triển Khai API Route

### File: `app/api/mindmap/generate/route.ts`
API nhận văn bản đã trích xuất và gọi hàm trung tâm để thực hiện toàn bộ Pipeline.

```typescript
export async function POST(request: Request) {
  const body = await request.json()
  const result = await generateMindmapWithGemini({
    fileName: body.fileName,
    text: body.text, // Đây là kết quả từ Giai đoạn 0
    apiKey: process.env.POLLINATIONS_API_KEY,
    model: process.env.MINDMAP_MODEL || "openai",
    maxChunkChars: 12000,
    maxChunks: 8
  })
  return NextResponse.json(result)
}
```
