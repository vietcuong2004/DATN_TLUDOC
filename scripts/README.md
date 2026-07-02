# Thư mục Scripts - Các công cụ Quản lý và Đồng bộ dữ liệu

Thư mục này chứa các kịch bản (scripts) chạy độc lập bằng Node.js dùng để quản lý cơ sở dữ liệu, đồng bộ tài liệu từ Google Drive và xử lý Vector Database (Pinecone) phục vụ cho hệ thống RAG Chatbot.

---

## 📋 Danh sách các file script và công dụng

### 1. `import-drive-folder.mjs`
* **Công dụng:** Tự động đồng bộ và import thông tin tài liệu từ một thư mục Google Drive gốc vào bảng `documents` trong MySQL.
* **Cách hoạt động:**
  * Quét đệ quy cấu trúc thư mục trên Google Drive (mỗi thư mục con là một môn học tương ứng với `folder_key` trong MySQL).
  * Trích xuất thông tin các file PDF/DOCX (bao gồm Drive File ID, tiêu đề, link tải, link xem trước).
  * Thực hiện lệnh `INSERT INTO documents` để lưu thông tin tài liệu vào database MySQL một cách tự động, không cần admin phải upload thủ công.
* **Lệnh chạy:**
  ```bash
  node scripts/import-drive-folder.mjs
  ```

### 2. `sync-to-pinecone.mjs`
* **Công dụng:** Đồng bộ trực tiếp tri thức từ các tài liệu PDF đã có trong MySQL lên **Pinecone Vector Database** để chatbot sử dụng phục vụ RAG.
* **Cách hoạt động:**
  * Đọc danh sách các file PDF từ bảng `documents` của MySQL.
  * Tải file từ Drive, dùng `pdf-parse` để trích xuất toàn bộ văn bản.
  * Sử dụng thuật toán băm mảnh (Chunking) theo ký tự (`size: 1000`, `overlap: 200`).
  * Gọi Hugging Face Inference API (`sentence-transformers/all-MiniLM-L6-v2`) để sinh các vector nhúng (embedding) 384 chiều.
  * Đẩy (upsert) các vector cùng metadata (title, content, subject_id, document_id) lên Pinecone.
* **Lệnh chạy:**
  ```bash
  node scripts/sync-to-pinecone.mjs
  ```

### 3. `synced-docs.json`
* **Công dụng:** File cache dạng JSON dùng để lưu vết các `id` tài liệu đã được nạp thành công lên Pinecone.
* **Cách hoạt động:**
  * Khi `sync-to-pinecone.mjs` nạp thành công 1 tài liệu, ID của tài liệu đó sẽ được ghi thêm vào file này.
  * Ở các lần chạy tiếp theo, script sẽ đọc file này để **bỏ qua ngay lập tức** các tài liệu đã nạp trước đó, giúp tối ưu hóa thời gian và băng thông API.

### 4. `get_doc_chunks.js`
* **Công dụng:** Công cụ hỗ trợ truy xuất nhanh dữ liệu mẫu bao gồm nội dung văn bản (chunk) và vector embedding thực tế của một tài liệu từ Pinecone.
* **Cách hoạt động:** Lọc dữ liệu trên index Pinecone theo `document_id` bằng bộ lọc metadata, in ra chi tiết nội dung chunk và các giá trị số thực của vector. Rất hữu ích cho việc kiểm tra dữ liệu hoặc xuất báo cáo minh họa.
* **Lệnh chạy:**
  ```bash
  node scripts/get_doc_chunks.js
  ```

### 5. `backup-db.mjs`
* **Công dụng:** Tạo bản sao lưu (backup) toàn bộ cấu trúc và dữ liệu của cơ sở dữ liệu MySQL.
* **Cách hoạt động:** Kết nối đến database MySQL cấu hình trong `.env.local`, đọc cấu trúc và dữ liệu của tất cả các bảng, sinh ra một tệp tin sao lưu dạng `.sql` nằm trong thư mục `backups/`.
* **Lệnh chạy:**
  ```bash
  node scripts/backup-db.mjs
  ```

### 6. `sync-file-hashes.mjs`
* **Công dụng:** Đồng bộ mã băm (MD5 Checksum) của các tệp tin từ Google Drive vào database MySQL.
* **Cách hoạt động:** Sử dụng Google Drive API để truy vấn trường `md5Checksum` của từng file tài liệu và lưu lại vào database nhằm theo dõi biến động nội dung file để đồng bộ lại khi cần thiết.
* **Lệnh chạy:**
  ```bash
  node scripts/sync-file-hashes.mjs
  ```

---

## ⚙️ Cấu hình chạy các script
Để chạy các script trên, hãy chắc chắn bạn đã điền đầy đủ các thông tin kết nối và API Key trong file cấu hình môi trường **`.env.local`** ở thư mục gốc của dự án.
