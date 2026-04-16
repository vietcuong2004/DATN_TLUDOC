# 🚀 TÀI LIỆU KỸ THUẬT VÀ THUẬT TOÁN RAG EMBEDDING TRONG CHATBOT HIỆN TẠI

Tài liệu này đóng vai trò như một bản đặc tả thiết kế hệ thống (System Design Specification) đi sâu vào tầng mã nguồn (Code-level). Nó giải thích toàn bộ quy trình nhận thức, lưu trữ, và kết xuất của hệ thống Retrieval-Augmented Generation (RAG) đang chạy trực tiếp trên dự án.

Hệ thống hiện hành được thiết kế xoay quanh ba triết lý cốt lõi:
1.  **Low-Cost & Zero-Infrastructure**: Bỏ qua các CSDL Vector chuyên dụng, tận dụng hệ sinh thái MySQL có sẵn kết hợp thuật toán tính Cosine trực tiếp trên RAM (Node.js).
2.  **Precision over Recall**: Đặt thuật toán chống ảo giác (Anti-Hallucination) lên hàng đầu bằng cách bắt buộc đối chiếu kết quả đầu ra của AI với tập dữ liệu gốc.
3.  **AST Rendering**: Không sử dụng Regex để phân tích ngữ pháp. Render giao diện Toán học và cấu trúc dữ liệu hoàn toàn bằng Abstract Syntax Tree (Cây cú pháp trừu tượng).

---

## 🏗️ PHẦN 1: TỔNG QUAN KIẾN TRÚC LUỒNG ĐI

Hệ thống Chatbot RAG của dự án trải qua 5 bước liên hoàn khi nhận được một tin nhắn từ người dùng:
- **Bước 1: Nạp liệu (ETL)** - Đọc PDF, chuyển thành các vector số học và lưu vào DB.
- **Bước 2: Phân loại ý định** - Kiểm tra xem tin nhắn có phải thuộc lĩnh vực học thuật không.
- **Bước 3: Mã hóa câu hỏi & Tìm kiếm Vector** - Biến câu hỏi thành Vector, tính toán khoảng cách toán học để kéo dữ liệu từ CSDL.
- **Bước 4: Sinh văn bản (LLM)** - Trộn tài liệu tìm được với câu hỏi và đưa cho Mô hình Ngôn ngữ Lớn tạo câu trả lời.
- **Bước 5: Render AST (Fontend)** - Biên dịch kết quả chữ thuần thành giao diện hiển thị chuyên nghiệp.

Chúng ta sẽ đi sâu vào từng file và từng dòng code đang vận hành các bước này.

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

## 🧠 PHẦN 3: THUẬT TOÁN TÌM KIẾM NGỮ NGHĨA (SEMANTIC RETRIEVAL)

Khi người dùng hỏi một câu (Ví dụ: *"Đạo hàm là gì?"*), hệ thống Backend bắt đầu kích hoạt bộ máy tính toán Vector trong RAM.

**File chịu trách nhiệm trực tiếp:** `app/api/chatbot/route.ts`

### 3.1 Nhận dạng Vector Câu Hỏi
Tại dòng **504** của `route.ts`:
```typescript
// Tạo Vector cho câu hỏi (HuggingFace)
const questionVector = await getHuggingFaceEmbedding(message)
```
Câu hỏi *"Đạo hàm là gì?"* được chuyển thành bộ Vector truy vấn cũng mang 384 chiều không gian, tương tự như quy trình nạp liệu. Mã nguồn cụ thể của việc tạo vector này nằm tại `lib/hf-embedder.ts` (dòng **9 đến 39**).

### 3.2 Kéo dữ liệu và Tính Khoảng cách Cosine in-memory
Đây là "trái tim" của thuật toán. Do MySQL không hỗ trợ quét Vector bẩm sinh, chúng ta kéo dữ liệu lên và tính toán trực tiếp trong RAM của Node.js.

Tại dòng **507 - 545** của `route.ts`:
```typescript
// Lấy toàn bộ Chunks từ MySQL
const [chunkRows]: any = await pool.execute(`
  SELECT dc.content, dc.embedding, d.id, d.title...
  FROM document_chunks dc
`)

// Tính độ tương đồng cho từng mảnh
const scoredChunks = chunkRows.map((row: any) => {
  const chunkVector = JSON.parse(row.embedding)
  return {
    content: row.content,
    similarity: cosineSimilarity(questionVector, chunkVector),
    title: row.title, ...
  }
})

// Lọc threshold khắt khe
semanticChunks = scoredChunks
  .filter((c: any) => c.similarity > 0.65)
  .sort((a: any, b: any) => b.similarity - a.similarity)
  .slice(0, 5)
```
*Giải thích chi tiết:*
1.  Đầu tiên, hệ thống gửi lệnh `SELECT` truyền thống lấy tất cả chục ngàn đoạn văn lên RAM.
2.  Sau đó, code chạy qua từng đoạn một bằng vòng lặp `map()`.
3.  Nó "so khớp" Vector của đoạn văn với Vector của câu hỏi bằng hàm toán học `cosineSimilarity`.

**Hàm toán học Cosine là gì?** (File `lib/hf-embedder.ts`, Dòng **44 đến 62**)
```typescript
let dotProduct = 0; let normA = 0; let normB = 0;
for (let i = 0; i < vecA.length; i++) {
  dotProduct += vecA[i] * vecB[i];
  normA += vecA[i] * vecA[i];
  normB += vecB[i] * vecB[i];
}
const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
```
- Hai mảng 384 con số đại diện cho 2 mũi tên trong không gian.
- Nếu điểm `similarity` (Cosin) càng gần 1.0, nghĩa là ý của hai câu này chạm sát vào nhau (Tương đồng ngữ nghĩa).
- Quay lại `route.ts`, chúng ta sử dụng **ngưỡng (threshold) siêu cứng là 0.65** (`c.similarity > 0.65`). Nghĩa là chỉ lấy các tài liệu thực sự có ích, nếu độ liên quan dưới 65%, loại thẳng tay.
- Code kết thúc bằng lệnh `.slice(0, 5)` => Lấy đúng 5 đoạn tài liệu đỉnh nhất bơm vào ngữ cảnh.

---

## 🤖 PHẦN 4: THUẬT TOÁN TỔNG HỢP VÀ CHỐNG ẢO GIÁC (LLM GENERATION)

Ta đã có "Tài liệu", nhưng nhét thế nào vào mồm AI để nó không ăn nói luyên thuyên?

### 4.1 Bơm Tri Thức & Gọi API Hệ Thống
Tại dòng **618 - 625** của `route.ts`, chúng ta gọi API Chat completions thông qua mạng phân tán **Pollinations AI**:
```typescript
const { response: llmResponse, model } = await callChatCompletionsWithFallback(
  apiKey,
  message,
  context,
  maxOutputTokens, // 1600 tokens
)
```
Thuật toán Prompt Engineering chạy ngầm sẽ bao bọc câu hỏi trong "System Prompt" ép AI phải sử dụng đúng định dạng Markdown chuẩn (dấu `##` cho thẻ Tiêu đề). Ràng buộc này tạo khung xương vững chắc cho việc Render UI sau này.

### 4.2 Lọc Ảo Giác Mức Nhẹ (Regex Sanitizer)
Khi AI cố tình xen những cụm vô nghĩa (như báo cáo mức độ chắc chắn, dù ta đã cấm nó), code dẹp loạn chúng tại dòng **633 - 635** của `route.ts`:
```typescript
if (answer) {
  answer = answer.replace(/##?\s*Mức độ chắc chắn[\s\S]*?(?=##|$)/gi, "").trim();
  answer = answer.replace(/Mức độ chắc chắn:[\s\S]*?(?=\n\n|$)/gi, "").trim();
}
```

### 4.3 THUẬT TOÁN ĐỐI SOÁT TRÍCH DẪN KHÉP KÍN (Strict Citation Loop)
Đây là công cụ CỐT LÕI nhất để diệt ảo giác!
Thông thường, các Chatbot sẽ đẩy thẳng mọi File tài liệu nó tìm được trong SQL ra cho người dùng tải. Tuy nhiên, nếu tài liệu đó vô nghĩa nhưng vẫn lọt qua bộ lọc Cosine thì sao?
Tại **Dòng 664 đến 681** của `route.ts`, thuật toán đối soát 2 chiều hoạt động:

```typescript
const usedDocsMap = new Map<string | number, any>();
const allCandidates = [...semanticChunks, ...docs];

// Chỉ giữ lại tài liệu nếu tên của tài liệu thực sự xuất hiện trong nội dung trả lời của AI
for (const candidate of allCandidates) {
   const titleLower = candidate.title.toLowerCase();
   
   if (answer.toLowerCase().includes(titleLower)) {
      usedDocsMap.set(candidate.id, candidate);
   }
}
const uniqueSourceDocs = Array.from(usedDocsMap.values());
```
*Giải thích quá trình:*
1. Vòng lặp lấy mọi tấm thẻ tài liệu dự kiến.
2. Nó check xem cái `title` của tài liệu đó **CÓ THỰC SỰ** nằm trong lời nói của AI hay không (`answer.includes(titleLower)`).
3. Lý do: Prompt đã cấu hình ép AI **phải viết tên tài liệu** vào mục "V. Tài Liệu Tham Khảo". Nếu AI nhận thấy tài liệu là rác, nó sẽ không ghi tên vào đó. Và khi vòng lặp check không thấy tên, tấm thẻ tài liệu đó sẽ bị đào thải. Giao diện chỉ Render ra đúng tài liệu hợp chuẩn.

---

## 🖥️ PHẦN 5: CÂY CÚ PHÁP TRỪU TƯỢNG VÀ RENDER GIAO DIỆN

Markdown và Công thức Toán học là cơn ác mộng nếu xử lý bằng chuỗi Regex băm cắt văn bản (Split & Replace). Hệ thống đã bỏ hoàn toàn Regex để sử dụng **AST Pipeline** (Trình Phân Tích Cây Cú Pháp).

**File đảm trách:** `components/chatbot/ChatbotAnswer.tsx`

### 5.1 Giải cứu rác tiếng Việt trong LaTeX
AI thỉnh thoảng sinh ra các ký hiệu rỗng vì "ảo giác" dấu backslash.
Từ dòng **18 đến 24** trong `ChatbotAnswer.tsx`, ta xử lý chuỗi sơ bộ trước khi đưa vào Parser:
```typescript
let processedContent = content
  .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$') // Standardize Block math
  .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')     // Standardize Inline math
  // Xóa blackslash dư thừa do AI bị lẫn lộn giữa Toán và Tiếng Việt
  .replace(/\\(tăng|giảm|tại|với|là|của|trong|được|có|về|và|mô|tả|theo|điểm|hai)/gi, '$1');
```
Ta đổi chuẩn ngoặc `\(` thành `$` để tương thích tuyệt đối 100% với nền tảng Parse của `remark-math`.

### 5.2 Xây dựng Cây Cú Pháp với React Markdown
Từ dòng **40 đến 75** của `ChatbotAnswer.tsx`, ta sử dụng Plugin tiêu chuẩn của ngành công nghiệp Frontend:
```typescript
<ReactMarkdown
  remarkPlugins={[remarkMath]}
  rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
  components={{ ... }}
>
```
*Giải thích cấu trúc:*
1.  **Markdown Text** đi qua `react-markdown` bị đập tan thành các Nút (Nodes) nhỏ.
2.  `remarkMath` rà soát từng bộ Nút, nếu thấy dấu `$` nó đóng mác Nút đó là Nút Toán Học (Math Node).
3.  `rehypeKatex` biến tập hợp Nút Toán Học đó thành mã HTML siêu chuẩn của chuẩn KaTeX (Standard Stanford Math format). Thuộc tính `throwOnError: false` rất vi diệu, nó đảm bảo nếu AI sinh sai công thức Toán một cách nực cười, nó sẽ không văng màn hình đỏ lòm làm sụp website mà chỉ giữ nguyên chữ mộc.

### 5.3 Ghi đè Component (Component Overriding)
Để làm ra huy hiệu La Mã đen tuyền cực kỳ chuyên nghiệp (Thay vì chữ `I.` chán ngắt), ta không động chạm vào chuỗi string, mà ta can thiệp ngay lúc AST chuẩn bị ép khuôn ra HTML!

Tại dòng **43 đến 60** của `ChatbotAnswer.tsx`:
```tsx
h2: ({ node, children, ...props }) => {
  let text = String(children);
  
  // Render giao diện mục La Mã riêng biệt
  const match = text.match(/^(I|II|III|IV|V|VI|VII)[\.\s]+(.*)/);
  if (match) {
    return (
      <div className="mt-8 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 rounded bg-slate-800 text-white font-bold text-xs shadow-sm">
            {match[1]} {/* Render con số La Mã vào ô màu đen */}
          </div>
          <h3 className="text-lg font-bold text-slate-900">{match[2]}</h3>
        </div>
      </div>
    );
  }
  return <h2 ...>{children}</h2>;
}
```
**Đây là chốt chặn cuối cùng làm nên đẳng cấp đồ án:** 
Bất cứ khi nào cây AST phát hiện một Nút chứa nội dung chuẩn bị in ra thành thẻ `<H2>`, Code sẽ bắt luồng của Nút đó lại. Nếu nội dung bên trong bắt đầu bằng "I." hoặc "II.", ta trả ra hẳn một chuỗi Div HTML phức tạp chứa màu sắc, góc bo tròn, thanh ngang Divider đầy đủ thay vì cái text thô sơ. Hệ thống hoạt động cực mượt, không lỗi đứt gãy, chống chịu được tất cả mọi thể loại phá hoại text từ Mô hình ngôn ngữ gốc!

---

## ⚖️ PHẦN LỜI KẾT & MỞ RỘNG

Chiến thuật triển khai hiện tại của Đồ án đã tối ưu hóa ở mức cực độ (Hyper-optimized) với chi phí $0 đồng cho quá trình vận hành, hoàn toàn không phụ thuộc vào công nghệ CSDL Vector đắt đỏ. 
Bằng việc gá code vào Ram Server (In-memory computation) ở phần lõi nhỏ, dồn ép sự ngăn nắp thông tin từ ngay System Prompt, và sử dụng nền tảng AST ở thiết bị người dùng. Luồng RAG này xứng đáng trở thành hình mẫu bền bỉ và dễ hiểu nhất cho bất cứ một lập trình viên mới bắt đầu tìm hiểu quy trình kết nối AI.

---

## 📂 PHẦN 6: TỔNG HỢP BỘ TỪ ĐIỂN CÁC FILE (DIRECTORY MAPPING)

Dưới đây là danh sách toàn bộ các File cấu thành nên hệ thống RAG Chatbot hiện tại. Bất cứ khi nào cần nâng cấp hoặc sửa lỗi, tính năng của từng File đã được quy hoạch cực kỳ rõ ràng:

### 1. Module Dữ Liệu Nền (ETL)
*   **📍 File:** `scripts/sync-to-mysql.mjs`
*   **Nhiệm vụ:** Đây là Script Node.js chạy độc lập. Nhiệm vụ của nó là đọc các file tài liệu định dạng PDF, dùng thư viện băm đoạn văn thành các "Chunk", tạo Vector tương ứng sử dụng hệ thống của HuggingFace và **INSERT** thẳng vào bảng `document_chunks` của CSDL MySQL. File này thường được chạy thủ công mỗi khi quản trị viên up thêm tài liệu mới.

### 2. Module Thư Viện Toán Học & AI (AI Core Lib)
*   **📍 File:** `lib/hf-embedder.ts`
*   **Nhiệm vụ:** Chứa "bộ não" Toán học của RAG. Gồm hàm `getHuggingFaceEmbedding` (nén chữ thành khoảng không vector 384 chiều qua API) và cực kỳ quan trọng: hàm `cosineSimilarity` - thứ biến RAM server thành bộ phân tích Vector tự trị mà không tốn phí mua công nghệ Pinecone.

*   **📍 File:** `lib/chatbot-intent.ts`
*   **Nhiệm vụ:** Dùng AI (Pollinations/Gemini) làm "Bảo vệ gác cổng". Đọc nội dung chat và dán nhãn (Intent): Học thuật, Xin tài liệu, Tâm sự linh tinh,... để hệ thống quyết định tiếp tục tra cứu hay chốt chặn ngay từ đầu.

### 3. Module Database Layer (CSDL MySQL)
*   **📍 File:** `lib/repository_chatbot.ts`
*   **Nhiệm vụ:** Nhóm tất cả các loại truy vấn SQL phức tạp về một nơi. 
    *   Hàm `searchDocumentsForChatbot`: Thuật toán tìm kiếm theo từ khóa (Metadata/Keyword Search) để dự phòng (Fallback) khi Semantic RAG không quét ra, dựa trên Weighted Scoring.
    *   Hàm `saveChatbotHistory`: Lưu trữ lịch sử hỏi đáp của User vào bảng MySQL.

### 4. Module Bộ Điều Khiển Trung Tâm (Brain/Controller)
*   **📍 File:** `app/api/chatbot/route.ts`
*   **Nhiệm vụ:** Trạm điều hướng khổng lồ. 
    1. Nhận tin nhắn.
    2. Gọi `hf-embedder` tạo Vector -> Quét database tính Cosine.
    3. Trộn (Prompt Engineering) khối dữ liệu tìm được cùng với một quy tắc thép (System Prompt) -> Gửi cho LLM sinh đoạn văn.
    4. Trích xuất, chạy vòng lặp Check chống ảo giác tài liệu, và cuối cùng Response file JSON xuống Frontend.

### 5. Module Giao Diện Trực Quan (Frontend / UI)
*   **📍 File:** `app/chatbot/page.tsx`
*   **Nhiệm vụ:** Giao diện khung Chatbot chính cho người dùng. Nơi lưu trữ trạng thái (State) lịch sử mảng `messages`, hiển thị hiệu ứng Loading (`typing...`), và fetch REST API kết nối với `route.ts`.

*   **📍 File:** `components/chatbot/ChatbotAnswer.tsx`
*   **Nhiệm vụ:** Cỗ máy Render Đồ Họa Cú Pháp (AST Renderer Component). Thay vì xả nguyên khối chữ từ AI lên màn hình, component này sẽ bẻ vụn React DOM bằng `react-markdown`, phân tách các đoạn Toán Học (KaTeX), và nhúng đệm các Class Tailwindcss tự chế (như Huy hiệu số La Mã hộp đen tuyền đỉnh cao) để tạo ra trang trợ giảng bóng bẩy, vững chắc.
