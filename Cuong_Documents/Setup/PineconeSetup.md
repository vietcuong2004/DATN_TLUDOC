# Hướng dẫn tích hợp Pinecone vào Chatbot TLU Document

Tài liệu này hướng dẫn cách thay thế việc tìm kiếm vector thủ công trong MySQL bằng **Pinecone Vector Database**, kết hợp với **HuggingFace Embedding** và **Pollinations AI**.

## 1. Chuẩn bị trên Pinecone Dashboard
1. Truy cập [pinecone.io](https://www.pinecone.io/) và tạo tài khoản.
2. Tạo một **Index** mới:
   - **Name:** `tlu-document-index` (hoặc tùy chọn).
   - **Dimensions:** `384` (Đây là kích thước của model `all-MiniLM-L6-v2` bạn đang dùng).
   - **Metric:** `cosine`.
3. Lấy **API Key** và **Environment** từ mục API Keys.

## 2. Cập nhật biến môi trường (.env.local)
Thêm các dòng sau vào file `.env.local`:
```env
PINECONE_API_KEY=your_api_key_here
PINECONE_INDEX_NAME=tlu-document-index
```

## 3. Cài đặt thư viện
Chạy lệnh sau trong terminal:
```bash
npm install @pinecone-database/pinecone
```

## 4. Cấu trúc Code mới (Logic xử lý)

### Bước A: Tạo file kết nối Pinecone (`lib/pinecone.ts`)
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY is missing');
}

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const index = pinecone.index(process.env.PINECONE_INDEX_NAME || '');
```

### Bước B: Logic Retrieval trong `app/api/chatbot/route.ts`
Thay thế đoạn code truy vấn MySQL và tính toán `fastDot` bằng đoạn sau:

```typescript
import { index as pineconeIndex } from "@/lib/pinecone";

// ... trong hàm POST ...

if (intent === "ACADEMIC") {
    // 1. Tạo vector cho câu hỏi (Vẫn dùng HuggingFace hiện tại của bạn)
    const queryVector = await getCachedEmbedding(message);

    // 2. Truy vấn trực tiếp từ Pinecone
    const queryResponse = await pineconeIndex.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true, // Để lấy content và title của tài liệu
    });

    // 3. Chuyển đổi kết quả Pinecone về định dạng cũ để không phải sửa logic bên dưới
    semanticChunks = queryResponse.matches.map((match: any) => ({
        content: match.metadata.content,
        title: match.metadata.title,
        id: match.metadata.document_id,
        score: match.score,
        // Các trường khác nếu cần
    }));
}
```

## 5. Quy trình Index dữ liệu (Cần làm một lần)
Bạn cần tạo một Script (trong thư mục `scripts/`) để đẩy toàn bộ dữ liệu từ `document_chunks` của MySQL lên Pinecone.

**Cấu trúc dữ liệu đẩy lên Pinecone:**
- **ID:** `chunk_id` từ MySQL.
- **Vector:** Mảng 384 số thực.
- **Metadata:** `{ title: "...", content: "...", document_id: 123 }` (Dùng để hiển thị nguồn và trích dẫn).

## 6. Tại sao sự kết hợp này lại mạnh?
1. **Pollinations AI:** Tiếp tục xử lý logic ngôn ngữ (miễn phí/ổn định).
2. **Pinecone:** Xử lý việc "nhớ" và "tìm" kiến thức cực nhanh (thay thế cho việc quét MySQL chậm chạp).
3. **Hybrid:** Bạn vẫn có thể giữ logic lọc `systemMap` từ MySQL để giới hạn phạm vi môn học cho AI.

---
> [!TIP]
> Khi dùng Pinecone, bạn không cần dùng `MATCH AGAINST` trong MySQL cho mục đích RAG nữa. Điều này giúp server giảm tải đáng kể!

## 7. Hướng dẫn chuyển sang tài khoản Pinecone mới
Nếu bạn dùng hết giới hạn của tài khoản hiện tại hoặc muốn chuyển sang một tài khoản Pinecone khác, hãy làm theo các bước sau:

### Bước 1: Chuẩn bị trên tài khoản Pinecone mới
1. Đăng ký tài khoản Pinecone mới.
2. Tạo một **Index** mới với cấu hình tương tự:
   - **Name:** (Ví dụ: `tlu-index-v2`)
   - **Dimensions:** `384`
   - **Metric:** `cosine`
3. Sao chép **API Key** mới.

### Bước 2: Cập nhật biến môi trường
Mở file `.env.local` và thay thế giá trị của 2 biến sau bằng thông tin mới:
```env
PINECONE_API_KEY=api_key_moi_cua_ban
PINECONE_INDEX_NAME=ten_index_moi_cua_ban
```

### Bước 3: Đồng bộ lại dữ liệu
Tùy thuộc vào việc bạn còn giữ bảng `document_chunks` trong MySQL hay không mà chọn một trong hai cách:

*   **Trường hợp 1: Nếu còn bảng `document_chunks` trong MySQL:**
    Chạy lại script đồng bộ cũ:
    ```bash
    node scripts/sync-to-pinecone.mjs
    ```

*   **Trường hợp 2: Nếu đã xóa bảng `document_chunks` (Nên dùng):**
    Sử dụng script nạp dữ liệu trực tiếp từ Google Drive mà tôi đã viết cho bạn:
    ```bash
    node scripts/direct-to-pinecone.mjs
    ```
    *Script này sẽ đọc danh sách file từ MySQL, tải về từ Drive, tạo vector và đẩy lên tài khoản Pinecone mới hoàn toàn tự động.*

### Bước 4: Khởi động lại Server
Sau khi đồng bộ xong, bạn cần khởi động lại ứng dụng để nhận biến môi trường mới:
```bash
# Nhấn Ctrl + C để dừng, sau đó chạy lại
npm run dev
```

---
> [!IMPORTANT]
> - Pinecone gói miễn phí cho phép lưu khoảng 100.000 records, quá đủ cho toàn bộ tài liệu của một trường đại học.
> - Mỗi lần chuyển tài khoản, hãy nhớ kiểm tra lại **Dimensions** phải luôn là `384` để khớp với model embedding HuggingFace.
