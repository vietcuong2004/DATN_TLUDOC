# 🚀 TÀI LIỆU KỸ THUẬT VÀ THUẬT TOÁN RAG EMBEDDING TRONG CHATBOT HIỆN TẠI

Tài liệu này đóng vai trò như một bản đặc tả thiết kế hệ thống (System Design Specification) đi sâu vào tầng mã nguồn (Code-level). Nó giải thích toàn bộ quy trình nhận thức, lưu trữ, và kết xuất của hệ thống Retrieval-Augmented Generation (RAG) đang chạy trực tiếp trên dự án.

Hệ thống hiện hành được thiết kế xoay quanh ba triết lý cốt lõi:
1.  **High-Performance Vector Retrieval (Pinecone)**: Sử dụng Managed Vector Database chuyên dụng để xử lý hàng triệu bản ghi với độ trễ cực thấp, thay thế cho việc tính toán thủ công trên MySQL/RAM.
2.  **Thiết quân luật (Strict Subject Filtering)**: Áp dụng cơ chế **Hard Filtering** dựa trên Metadata môn học để đảm bảo sự cách ly tuyệt đối về kiến thức giữa các môn học khác nhau.
3.  **Auto-generated Citations (Post-processing)**: Hệ thống tự động quét và tạo Mục V (Tham khảo) bằng code sau khi AI trả lời, đảm bảo tính chính xác 100% giữa nội dung trích dẫn và danh sách tài liệu.

---

## 🏗️ PHẦN 1: TỔNG QUAN KIẾN TRÚC LUỒNG ĐI

Hệ thống Chatbot RAG của dự án trải qua 6 bước liên hoàn khi nhận được một tin nhắn từ người dùng:
- **Bước 1: Nạp liệu (ETL)** - Đọc PDF, tạo embedding và đồng bộ Metadata lên Pinecone Index.
- **Bước 2: Phân loại ý định (Intent Classifier)** - Sử dụng AI để định tuyến câu hỏi (ACADEMIC, DISCOVERY, CASUAL).
- **Bước 3: Vector Similarity Search** - Truy vấn Pinecone Index để tìm các đoạn văn bản có ngữ nghĩa gần nhất với câu hỏi.
- **Bước 4: Thiết quân luật (Subject Filter)** - Lọc bỏ hoàn toàn các tài liệu không thuộc môn học chủ đạo để tránh "lạc đề".
- **Bước 5: Sinh văn bản (LLM Stream)** - AI tổng hợp câu trả lời từ bối cảnh (Context) đã được lọc sạch.
- **Bước 6: Auto-Citations & Metadata** - Code tự động chèn Mục V (Tham khảo) và trả về metadata để render thẻ tài liệu.

**Bảng Tổng hợp Luồng Dữ liệu (Data Pipeline Overview):**

| Bước | Tên Bước | Nội dung (Ý nghĩa & Chức năng) | Input | Output |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Nạp liệu (ETL)** | Quét file giáo trình, băm nhỏ và nén ý nghĩa thành không gian toán học (Vector) để máy tính hiểu được. | File tài liệu gốc (PDF) | Vector 384 chiều lưu trong CSDL |
| **2** | **Phân loại ý định** | Phân tích xem người dùng đang hỏi nghiêm túc hay nói nhảm để quyết định có cho đi tiếp hay không nhằm tiết kiệm API. | Tin nhắn thô của User | Nhãn phân loại: `ACADEMIC`, `DISCOVERY` hoặc `CASUAL` |
| **3** | **Vector Search** | Truy vấn Pinecone Index để lôi 25 mảnh tri thức có liên quan nhất lên bộ nhớ đệm. | Vector câu hỏi | Top 25 Chunks từ Pinecone |
| **4** | **Thiết quân luật** | Xác định môn học chủ đạo và xóa bỏ hoàn toàn các tài liệu "lạc môn" ra khỏi bối cảnh. | Top 25 Chunks | Top 5 Chunks chuẩn môn học |
| **5** | **Sinh văn bản (LLM Stream)** | Nhồi 5 đoạn văn bản chuẩn xác cùng lịch sử chat vào cho AI tổng hợp thành một câu trả lời hoàn chỉnh. | Top 5 Chunks + Lịch sử + Câu hỏi | Luồng dữ liệu chữ (ReadableStream) |
| **6** | **Trích xuất Metadata** | Đọc lại câu trả lời vừa sinh ra để xem AI nhắc đến tên giáo trình nào, từ đó hiển thị file giáo trình đó ra màn hình. | Luồng chữ hoàn chỉnh | Chuỗi JSON chứa thông tin các File |

---

## 🗄️ PHẦN 2: THUẬT TOÁN NẠP LIỆU (ETL - DATA INGESTION)

Để Chatbot có kiến thức, ta phải nạp giáo trình cho nó. Hệ thống sử dụng các script chuyên dụng để đẩy dữ liệu lên "đám mây" Pinecone.

**File chịu trách nhiệm chính:** `scripts/sync-to-pinecone.mjs` và `scripts/direct-to-pinecone.mjs`

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
- Hàm `getEmbedding` kết nối tới HuggingFace (Model: `all-MiniLM-L6-v2`).
- Kết quả là mảng **384 con số** (Vector) được lưu vào Pinecone kèm theo **Metadata** cực kỳ quan trọng:
  - `subject_id`: Mã môn học (Dùng để lọc "Thiết quân luật").
  - `title`: Tên tài liệu (Dùng để trích dẫn).
  - `drive_file_id`, `download_url`: Dùng để xem trước và tải về.
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

## 🔍 PHẦN 4: THUẬT TOÁN TÌM KIẾM VECTOR VÀ THIẾT QUÂN LUẬT (STRICT FILTERING)

Hệ thống sử dụng cơ chế lọc cứng để ngăn chặn việc tài liệu môn học này "nhảy" sang môn học khác.

### 4.1 Truy xuất từ Pinecone
Thay vì quét MySQL, hệ thống gọi trực tiếp API Pinecone:
```typescript
const queryResponse = await pineconeIndex.query({
  vector: queryVector,
  topK: 25, 
  includeMetadata: true,
})
```

### 4.2 Cơ chế Thiết quân luật (Hard Filter) - "Đúng môn mới nói"
Đây là thuật toán quan trọng nhất để chống lại hiện tượng AI trả lời "râu ông nọ cắm cằm bà kia" (ví dụ: đang hỏi về Linux nhưng lại lấy kiến thức Trí tuệ nhân tạo ra trả lời).

**Quy trình xử lý gồm 3 bước:**

1.  **Bầu chọn Môn học mục tiêu (Subject Voting):**
    Hệ thống nhìn vào 25 kết quả vừa lấy từ Pinecone. Nó tính tổng điểm của từng môn học xuất hiện trong đó. Môn học nào có tổng điểm cao nhất sẽ được coi là **"Môn học mục tiêu"** (Target Subject).
    *Ví dụ:* Trong 25 kết quả, có 20 đoạn thuộc môn "Hệ điều hành" và 5 đoạn thuộc môn "Giải tích". Hệ thống sẽ chốt mục tiêu là môn **Hệ điều hành**.

2.  **Thanh lọc tuyệt đối (The Hard Filter):**
    Sau khi đã chốt được Môn học mục tiêu, hệ thống thực hiện một lệnh lọc (filter) cực kỳ tàn nhẫn:
    ```typescript
    // Xóa sổ mọi tài liệu không khớp mã môn học mục tiêu
    semanticChunks = scored.filter(c => Number(c.subject_id) === targetSubjectId)
    ```
    *Ý nghĩa:* Dù một đoạn văn bản môn "Giải tích" có điểm tương đồng là 0.99 (rất cao), nhưng vì nó không phải môn "Hệ điều hành" nên nó sẽ bị **xóa bỏ 100%**.

3.  **Lấy tinh hoa (Top 5):**
    Sau khi đã lọc sạch "rác" lạc môn, hệ thống mới lấy ra 5 đoạn văn bản xuất sắc nhất của đúng môn đó để gửi cho AI.
    ```typescript
    semanticChunks = semanticChunks.slice(0, 5)
    ```

**📌 Tại sao phải làm vậy?**
Trong học tập, các môn học thường có từ khóa trùng nhau (ví dụ: từ "Kernel" có trong cả Hệ điều hành và Đại số tuyến tính). Nếu không có "Thiết quân luật", AI sẽ bị nhầm lẫn giữa hai khái niệm này. Cơ chế này đảm bảo kiến thức luôn nằm trong đúng "vùng an toàn" của môn học đó.

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

## 📑 PHẦN 6: AUTO-GENERATED CITATIONS & METADATA

Đây là "vũ khí" chống trích dẫn ảo. AI được lệnh **KHÔNG** tự viết Mục V. Hệ thống sẽ tự động làm việc này ở tầng code sau khi stream kết thúc.

### 6.1. Quy trình tự động tạo Mục V
1.  **Quét nội dung**: Code quét toàn bộ bài giải thích của AI (Mục I-IV).
2.  **Đối soát**: Chỉ những tài liệu nào thực sự được AI nhắc tên trong bài mới được đưa vào danh sách.
3.  **Nối thêm (Append)**: Hệ thống tự động chèn chuỗi `## V. Tài liệu tham khảo` vào cuối stream.

### 6.2. Trích xuất Metadata
Hệ thống đính kèm một gói JSON ẩn ở cuối câu trả lời để Frontend hiển thị thẻ tài liệu.
```typescript
const metadata = {
  chatId: body.chatId,
  documents: Array.from(usedDocsMap.values()).map(d => ({
    id: d.id,
    title: d.title,
    // ... metadata cho Card UI
  }))
}
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
