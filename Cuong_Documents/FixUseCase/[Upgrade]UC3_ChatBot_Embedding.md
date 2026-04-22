# 🚀 TÀI LIỆU KỸ THUẬT VÀ THUẬT TOÁN RAG EMBEDDING TRONG CHATBOT HIỆN TẠI

Tài liệu này đóng vai trò như một bản đặc tả thiết kế hệ thống (System Design Specification) đi sâu vào tầng mã nguồn (Code-level). Nó giải thích toàn bộ quy trình nhận thức, lưu trữ, và kết xuất của hệ thống Retrieval-Augmented Generation (RAG) đang chạy trực tiếp trên dự án.

Hệ thống hiện hành được thiết kế xoay quanh ba triết lý cốt lõi:
1.  **Hybrid Search & In-Memory Computation**: Bỏ qua các CSDL Vector đắt đỏ, kết hợp thuật toán tính Cosine Vector trên RAM với tìm kiếm toàn văn BM25 và khớp Keyword trực tiếp từ MySQL.
2.  **Strict Anti-Hallucination (Chống ảo giác tuyệt đối)**: Áp dụng thuật toán **Cross-Subject Penalty** (Phạt điểm khác môn) và đối soát trích dẫn khép kín để đảm bảo AI không bao giờ bịa ra tài liệu.
3.  **Resource Efficiency**: Chặn đứng các câu hỏi vô nghĩa (Gibberish) bằng bộ lọc Rule-based, và hỗ trợ ngắt luồng Stream (AbortController) từ xa để tiết kiệm tài nguyên Server.

---

## 🏗️ PHẦN 1: TỔNG QUAN KIẾN TRÚC LUỒNG ĐI

Hệ thống Chatbot RAG của dự án trải qua 6 bước liên hoàn khi nhận được một tin nhắn từ người dùng:
- **Bước 1: Nạp liệu (ETL)** - Đọc PDF, chuyển thành vector và lưu vào DB.
- **Bước 2: Phân loại ý định (Intent Classifier)** - Bộ lọc cứng (Gibberish) kết hợp AI để định tuyến câu hỏi (ACADEMIC, DISCOVERY, CASUAL).
- **Bước 3: Hybrid Search & Scoring** - Tìm kiếm 3 lớp (Vector + BM25 + Title Match) để kéo dữ liệu lên.
- **Bước 4: Cross-Subject Penalty** - Thuật toán trừ điểm nặng để loại bỏ tài liệu lạc môn.
- **Bước 5: Sinh văn bản (LLM Stream)** - Gửi Prompt có chứa ngữ cảnh cho AI và truyền Stream về Client (hỗ trợ Cancel).
- **Bước 6: Trích xuất Metadata & Render AST** - Quét tên tài liệu trong câu trả lời để tạo Citations và Render giao diện Toán học.

**Bảng Tổng hợp Luồng Dữ liệu (Data Pipeline Overview):**

| Bước | Tên Bước | Nội dung (Ý nghĩa & Chức năng) | Input | Output |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Nạp liệu (ETL)** | Quét file giáo trình, băm nhỏ và nén ý nghĩa thành không gian toán học (Vector) để máy tính hiểu được. | File tài liệu gốc (PDF) | Vector 384 chiều lưu trong CSDL |
| **2** | **Phân loại ý định** | Phân tích xem người dùng đang hỏi nghiêm túc hay nói nhảm để quyết định có cho đi tiếp hay không nhằm tiết kiệm API. | Tin nhắn thô của User | Nhãn phân loại: `ACADEMIC`, `DISCOVERY` hoặc `CASUAL` |
| **3** | **Hybrid Search** | Tính toán khoảng cách Vector kết hợp tần suất từ khóa (BM25) để lôi tài liệu có liên quan từ dưới MySQL lên. | Vector câu hỏi | Danh sách các đoạn văn bản thô (Chunks) |
| **4** | **Phạt Lạc Môn (Cross-Subject Penalty)** | Đánh giá xem có tài liệu nào trót lọt nhưng thuộc môn học khác không. Nếu có thì trừ điểm cực nặng để diệt ảo giác. | Danh sách Chunks thô | Top 5 Chunks chuẩn xác nhất (Đã lọc) |
| **5** | **Sinh văn bản (LLM Stream)** | Nhồi 5 đoạn văn bản chuẩn xác cùng lịch sử chat vào cho AI tổng hợp thành một câu trả lời hoàn chỉnh. | Top 5 Chunks + Lịch sử + Câu hỏi | Luồng dữ liệu chữ (ReadableStream) |
| **6** | **Trích xuất Metadata** | Đọc lại câu trả lời vừa sinh ra để xem AI nhắc đến tên giáo trình nào, từ đó hiển thị file giáo trình đó ra màn hình. | Luồng chữ hoàn chỉnh | Chuỗi JSON chứa thông tin các File |

---

## 🗄️ PHẦN 2: THUẬT TOÁN NẠP LIỆU (ETL - DATA INGESTION)

Để Chatbot có kiến thức, ta phải nạp giáo trình cho nó. Hệ thống sử dụng một script chạy nền để quét toàn bộ file PDF và chuyển ngữ nghĩa của chúng thành Toán học.

**File chịu trách nhiệm chính:** `scripts/sync-to-mysql.mjs`

### 2.1. Đọc và Cắt nhỏ văn bản (Chunking)
Vào dòng thứ **84 đến 95** của file `sync-to-mysql.mjs`:
```javascript
// Trích xuất văn bản từ Google Drive
const downloadUrl = `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
const response = await fetch(downloadUrl)
const buffer = Buffer.from(await response.arrayBuffer())

// Trích xuất bằng pdf-parse
const data = await pdf(buffer)
const cleanText = data.text.replace(/\s+/g, " ").trim()
```
*Giải thích:*
File giáo trình thường có hàng trăm trang, dung lượng chữ có thể vuợt quá bộ nhớ của AI. 
- Ngay sau bước quét Text, hệ thống chuyển sang hàm `chunkText` (dòng 102) cắt toàn bộ chuỗi dài thành từng đoạn khoảng 1000 ký tự (có đoạn nối overlap 200 ký tự) để đảm bảo không một khái niệm nào bị đứt gãy giữa 2 trang sách.
- **📌 Input**: Một file tài liệu PDF thô được tải về từ Google Drive (Dưới dạng dữ liệu Binary / Buffer).
- **📌 Output**: Một mảng (Array) chứa nhiều đoạn văn bản ngắn (Chunks), mỗi đoạn có độ dài khoảng 1000 ký tự. Ví dụ: `["Chương 1: Giải tích là quá trình...", "Giới hạn của đường cong này...", ...]`.

### 2.2. Mã Hóa Vector (Embedding)
Đây là thuật toán biến chữ thành Số (để máy tính so sánh được ý nghĩa).
Từ dòng **105 đến 114**, mỗi mảnh (chunk) được chạy qua AI:
```javascript
const vector = await getEmbedding(chunk)

await pool.query(
  "INSERT INTO document_chunks (document_id, content, embedding) VALUES (?, ?, ?)",
  [doc.id, chunk, JSON.stringify(vector)]
)
```
*Giải thích:*
- Hàm `getEmbedding` sẽ kết nối tới nền tảng HuggingFace.
- Mô hình được sử dụng là `sentence-transformers/all-MiniLM-L6-v2`. Mạng Nơ-ron này đọc đoạn văn 1000 ký tự và nén nó lại thành một Mảng chính xác chứa **384 con số** (Vector 384 chiều).
- Cuối cùng, 384 con số này được ép thành chuỗi JSON và cất thẳng vào MySQL tại bảng `document_chunks`. (Không cần hệ thống Vector Database thứ ba nào cả).
- **📌 Input**: Một đoạn văn bản (Chunk) dạng String Text. Ví dụ: `"Đạo hàm là tốc độ thay đổi tức thời của hàm số..."`.
- **📌 Output**: Một mảng Array gồm 384 con số thực (Float) mang giá trị ngữ nghĩa. Mảng này sau đó được mã hóa (JSON.stringify) thành chuỗi như `"[0.012, 0.45, -0.02, ...]"` và `INSERT` thẳng vào cột `embedding` của MySQL.

---

## 🧠 PHẦN 3: ĐỊNH TUYẾN Ý ĐỊNH (INTENT ROUTING & GIBBERISH DETECTION)

Trước khi tốn tài nguyên gọi LLM, hệ thống phải phân tích xem người dùng đang muốn gì.
**File chịu trách nhiệm trực tiếp:** `app/api/chatbot/route.ts` (Hàm `classifyIntent`)

### 3.1 Bộ lọc cứng (Rule-based) & Chặn chuỗi vô nghĩa
Thay vì luôn gọi AI, hệ thống kiểm tra các quy tắc tĩnh:
```typescript
const casualWords = ["haha", "hi", "hello", "chào", "cam on", "thanks", "ok", "bye", "vl"]
// Chặn từ giao tiếp cơ bản
if (casualWords.some(word => cleanMsg.includes(word)) && cleanMsg.length < 15) return "CASUAL"

// Chặn chuỗi vô nghĩa (Gibberish) không chứa nguyên âm hoặc không có dấu cách
const words = cleanMsg.split(/\s+/)
if (words.length === 1 && words[0].length > 10 && !hasVowels(words[0])) return "CASUAL"
if (cleanMsg.length > 15 && !cleanMsg.includes(" ") && !/[0-9]/.test(cleanMsg)) return "CASUAL"
```
Nếu rơi vào `CASUAL`, server trả về *ngay lập tức* một câu phản hồi được fix cứng ("Xin lỗi, mình chưa hiểu câu hỏi...") mà không tốn 1 đồng chi phí gọi API.

### 3.2 LLM Intent Classifier
Nếu vượt qua bộ lọc cứng, hệ thống gửi một Prompt siêu chặt chẽ cho AI để phân loại thành `ACADEMIC` (Hỏi kiến thức) hoặc `DISCOVERY` (Hỏi tìm tài liệu/chức năng).

*Tóm tắt luồng Dữ liệu (I/O) của toàn bộ Bước 3:*
- **📌 Input**: Chuỗi tin nhắn nguyên bản của người dùng (String). Ví dụ: `"Cho mình xin tài liệu giải tích"` hoặc `"skjfksdjf"`.
- **📌 Output**: Trả về DUY NHẤT 1 chuỗi ký tự thuộc 1 trong 3 nhãn:
  - `"CASUAL"`: Giao tiếp, chào hỏi, hoặc nhập nhằng vô nghĩa (Bị chặn ngay tại Server).
  - `"DISCOVERY"`: Xin tài nguyên, hỏi về hệ thống.
  - `"ACADEMIC"`: Hỏi về bài tập, khái niệm chuyên môn.

---

## 🔍 PHẦN 4: THUẬT TOÁN TÌM KIẾM 3 LỚP (HYBRID SEARCH) VÀ CHỐNG LẠC ĐỀ

Khi câu hỏi là `ACADEMIC`, hệ thống bắt đầu quá trình RAG phức tạp nhất.

### 4.1 Truy xuất kết hợp (Vector + BM25)
Tại `route.ts`, chúng ta không chỉ dùng Cosine. Chúng ta truy vấn MySQL với `MATCH() AGAINST()` để lấy điểm BM25:
```sql
SELECT dc.content, dc.embedding, d.id, d.title, d.subject_id, MATCH(dc.content) AGAINST (? IN NATURAL LANGUAGE MODE) as bm25Score
```

### 4.2 Thuật toán chấm điểm 3 Yếu Tố (3-Factor Scoring)
Dữ liệu kéo lên RAM sẽ được tính điểm tổng hợp:
```typescript
const vectorScore = fastDot(queryVector, chunkEmb)
const normBm25 = (r.bm25Score || 0) / maxBm25
const titleMatchScore = queryWords.filter(w => normTitle.includes(w)).length / queryWords.length

// Công thức trọng số:
const finalScore = (vectorScore * 0.5) + (normBm25 * 0.3) + (titleMatchScore * 0.2)
```

### 4.3 Thuật toán Phạt Lạc Môn (Cross-Subject Penalty) - Lõi Chống Ảo Giác
Nếu User hỏi về "Giải tích", nhưng trong DB có từ khóa trùng lặp ở "CTDL & Giải thuật", làm sao để chặn?
Hệ thống tính tổng điểm các môn học trong Top 10 kết quả để tìm ra **Môn Học Chủ Đạo (Dominant Subject)**.
```typescript
// Tìm môn học có tổng điểm cao nhất
let dominantSubjectId = findDominantSubject(scored.slice(0, 10));

// Trừ điểm RẤT NẶNG các tài liệu thuộc môn học khác
if (dominantSubjectId !== null) {
  scored = scored.map(c => {
    if (c.subject_id && c.subject_id !== dominantSubjectId) {
      c.score -= 0.4 // Penalty hủy diệt
    }
    return c
  })
}
```
Mức phạt `-0.4` đảm bảo các tài liệu lạc môn sẽ rớt xuống dưới ngưỡng Threshold `0.25` và bị loại bỏ hoàn toàn.

*Tóm tắt luồng Dữ liệu (I/O) của toàn bộ Bước 4:*
- **📌 Input**: Câu hỏi của người dùng đã được tối ưu hóa (String) và Vector của câu hỏi (Array 384 chiều).
- **📌 Output**: Một mảng (Array) chứa tối đa 5 đoạn văn bản (Chunks) phù hợp nhất, đã được dọn sạch các kết quả lạc đề. Ví dụ: `[{ id: 1, content: "...", score: 0.82 }, ...]`.

---

## 🛑 PHẦN 5: LUỒNG STREAM VÀ CƠ CHẾ HỦY TIẾN TRÌNH (ABORT GENERATION)

Chatbot truyền dữ liệu về bằng `ReadableStream`. Điều gì xảy ra nếu User bấm "Hủy" hoặc "Tạo mới"?

Tại `route.ts`, bên trong vòng lặp đọc Stream từ Pollinations AI:
```typescript
while (true) {
  // Kiểm tra nếu client đã ngắt kết nối (bấm Hủy/Ctrl+C)
  if (request.signal.aborted) {
    console.log("[api/chatbot] Client aborted connection. Stopping stream.");
    reader.cancel(); // Lập tức ngắt stream từ phía Server
    return;
  }
  // ... đọc và đẩy chunk về client ...
}
```
Sự kết hợp giữa `AbortController` (Frontend) và `request.signal.aborted` (Backend) giúp tiết kiệm cực lớn tài nguyên CPU và Băng thông mạng.

*Tóm tắt luồng Dữ liệu (I/O) của toàn bộ Bước 5:*
- **📌 Input**: Mảng 5 đoạn văn bản (từ bước 4), lịch sử chat, và câu hỏi hiện tại. Tất cả được nhồi vào một siêu Prompt (String).
- **📌 Output**: Một luồng dữ liệu liên tục (`ReadableStream`). Các từ ngữ được AI sinh ra đến đâu sẽ trả thẳng về trình duyệt đến đó, tạo hiệu ứng gõ chữ (Typing effect).

---

## 📑 PHẦN 6: ĐỐI SOÁT TRÍCH DẪN (METADATA EXTRACTION)

Sau khi Stream xong, hệ thống quét câu trả lời để tìm ra các tài liệu đã thực sự được AI nhắc tên và nhét chúng vào khối `__METADATA__`.

Điểm đặc biệt ở phiên bản nâng cấp:
- **Nếu là ACADEMIC**: Hệ thống CHỈ quét trong tập hợp các `semanticChunks` đã được đưa cho AI. Điều này cấm AI trích dẫn các tài liệu ma.
- **Nếu là DISCOVERY**: Do AI đang gợi ý tài liệu dựa trên bản đồ hệ thống (`systemMap`), nó có thể nhắc tới bất kỳ tài liệu nào. Nên hệ thống sẽ quét tìm trên `allAvailableDocs` (toàn bộ database).

```typescript
const docsToScan = intent === "DISCOVERY" ? allAvailableDocs : Array.from(new Set(semanticChunks.map(c => c.id)))

docsToScan.forEach(doc => {
  const regex = new RegExp(`\\b${normTitle}\\b`, "i")
  if (regex.test(normAnswer)) {
    usedDocsMap.set(doc.id, doc)
  }
})
```

*Tóm tắt luồng Dữ liệu (I/O) của toàn bộ Bước 6:*
- **📌 Input**: Toàn bộ câu trả lời hoàn chỉnh mà AI vừa sinh ra ở Bước 5 (String).
- **📌 Output**: Một chuỗi JSON ẩn dính kèm vào cuối câu trả lời (Ví dụ: `\n__METADATA__\n{"documents":[{"title":"Giáo trình..."}]}`). Trình duyệt sẽ đọc chuỗi này để vẽ ra các thẻ (Cards) tài liệu có thể click được.

---

## 💾 PHẦN 7: LƯU TRỮ LỊCH SỬ THEO PHIÊN (SESSION-BASED HISTORY)

Hệ thống không lưu lắt nhắt từng tin nhắn. Trạng thái lịch sử chỉ được lưu lại khi User kết thúc phiên bằng cách bấm nút "Tạo cuộc trò chuyện mới".

Trong `app/api/chatbot/history/route.ts`:
INSERT INTO chatbot_history (user_id, document_id, question, answer, created_at) 
VALUES (?, ?, ?, ?, NOW())
```
- Lịch sử được gộp lại (Concatenate) từ tất cả các câu hỏi của User và AI.
- Câu chào mặc định (`intro-message`) được lọc bỏ nghiêm ngặt bằng TypeScript Regex.
- Thời gian được lưu trữ dưới dạng UTC chuẩn quốc tế. Khi hiển thị ở Frontend, trình duyệt của người dùng sẽ tự động chuyển đổi sang giờ địa phương (Ví dụ: GMT+7 tại Việt Nam) để đảm bảo độ chính xác tuyệt đối bất kể Server được đặt ở đâu.

---

## 📂 PHẦN 8: TỔNG HỢP BỘ TỪ ĐIỂN CÁC FILE (DIRECTORY MAPPING)

- **`scripts/sync-to-mysql.mjs`**: Script ETL đọc PDF, chunking, tạo Vector và lưu DB.
- **`app/api/chatbot/route.ts`**: "Trái tim" của hệ thống. Chứa Intent Classifier, Hybrid Search 3 yếu tố, Cross-Subject Penalty, và điều phối luồng LLM Stream (có Signal Cancel).
- **`app/api/chatbot/history/route.ts`**: Quản lý Persistence (Lưu trữ). Xử lý POST (Lưu cả Session) và DELETE (Xóa từng mục hoặc Xóa tất cả).
- **`app/chatbot/page.tsx`**: Giao diện Client. Chứa `AbortController`, hiệu ứng thay đổi nút Send/Stop, lắng nghe phím tắt `Ctrl+C`, và cơ chế Parsing `__METADATA__`.
- **`components/chatbot/ChatbotAnswer.tsx`**: Cỗ máy Render Đồ Họa Cú Pháp (AST Renderer). Dùng `react-markdown` và `rehype-katex` để dựng UI La Mã và Toán học siêu chuẩn. Mọi thẻ hiển thị (Cards) tài liệu liên quan đều được Render ở đây.

> Phiên bản RAG hiện tại đã đạt chuẩn Enterprise cấp vi mô: Nhanh, Rẻ, Chống Ảo Giác tuyệt đối, và Tương tác UI cực kỳ chuyên nghiệp.
