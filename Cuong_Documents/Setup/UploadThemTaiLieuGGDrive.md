# 📚 Hướng Dẫn Upload Thêm Tài Liệu Mới (Cho Website & Chatbot RAG)

Sau khi deploy xong, việc thêm tài liệu nội bộ mới là rất cần thiết. Để hệ thống có thể vừa hiển thị trên website, vừa nạp kiến thức mới cho Chatbot thông minh, hãy thực hiện chính xác các bước sau.

---

## 📋 Bước 1: Chuẩn Bị Tài Liệu Trên Google Drive

### 1.1. Mở Google Drive
- Truy cập: https://drive.google.com
- Đăng nhập bằng tài khoản lưu trữ hệ thống.

### 1.2. Upload File Vào Đúng Folder
Tìm các folder tương ứng với tên môn học:
```
📁 Cơ Sở Dữ Liệu
📁 Lập Trình Java
📁 Thiết Kế Web
```

1. **Mở folder môn học** tương ứng.
2. **Kéo thả file** (PDF, Word, ZIP) vào.
3. **Chờ upload xong** (hiện dấu tích xanh ✅).

**⚠️ Lưu ý:** 
- Tên file nên rõ ràng (vd: `Bai1_CacDieuKienSQL.pdf`).
- Định dạng PDF được ưu tiên cao nhất vì Chatbot sẽ trích xuất chữ từ PDF để học tập! Hệ thống RAG hiện tại tập trung tối ưu hóa cho định dạng PDF.

---

## 💻 Bước 2: Đồng Bộ Tài Liệu Vào Website (MySQL)

Bước này sẽ lấy dữ liệu từ Google Drive để cập nhật lên thẻ "Tài liệu" và các trang chuyên đề môn học.

### 2.1. Mở Terminal
- Mở project `DATN_TLUDOCUMENT` trong VS Code.
- Nhấn **Ctrl + \`** để mở Terminal.

### 2.2. Chạy Lệnh Import
```powershell
npm run import:drive
```

**Quá trình xử lý:**
1. Quét tài liệu trên Drive 
2. So khớp với CSDL hiện tại thông qua `drive_file_id` (trạng thái an toàn, không lo bị trùng)
3. Cập nhật và lưu các bản ghi mới vào bảng `documents`

---

## 🧠 Bước 3: Đồng Bộ Tri Thức Cho Chatbot RAG (Bắt buộc)

Sau khi có tài liệu mới, **Chatbot vẫn chưa biết gì về nội dung của chúng**. Bạn BẮT BUỘC phải "dạy" AI bằng cách băm nhỏ văn bản (Chunking) và nạp vào vector database (Bảng `document_chunks`).

### 3.1. Chạy Lệnh Embed (HuggingFace)
```powershell
node scripts/sync-to-mysql.mjs
```

### 3.2. Quá Trình Làm Việc Của Script
Script sẽ thực hiện các việc nặng:
- Trích xuất chữ (text) thuần tuý từ các file **PDF**.
- Cắt văn bản ra thành hàng trăm tới hàng nghìn mảnh (chunk).
- Gọi AI Model `all-MiniLM-L6-v2` từ hệ thống **HuggingFace** để biến các chữ này thành mảng vector toán học đa chiều.
- Lưu trữ chuỗi vector tri thức vào bảng `document_chunks`.

**⏱️ Thời gian:** Quá trình này **sẽ khá lâu**! (Khoảng vài phút đến chục phút tuỳ theo độ dày của PDF). Cứ để terminal điện toán chạy miệt mài cho đến khi in ra báo cáo `✨ Hoàn tất đồng bộ tri thức tài liệu vào MySQL!`.

---

## ⚠️ Bước 4: Xử Lý Lỗi (Nếu Có)

### 1. Lỗi "ENOENT: no such file..."
- **Nguyên nhân/Fix:** Không tìm thấy file biến môi trường. Chắc chắn bạn đang đứng ở thư mục gốc chứa file `.env.local`.

### 2. Lỗi HuggingFace 503 / Loading (Trong lúc gọi Vector Embedding)
- **Thông báo:** "Mô hình đang khởi động trên HuggingFace, nghỉ 10s..."
- **Fix:** Đây là bình thường. Máy chủ AI của HuggingFace Inference thỉnh thoảng sẽ rơi vào trạng thái ngủ đông khi ít hoạt động. Script đã cài chế độ thông minh tự động bắt lỗi tạm dừng 10 giây và gọi thử lại (Retry). **Bạn không cần làm gì cả** cứ việc đi pha chút đồ uống.

### 3. Không Kết Nối Được (Lỗi Token / Credentials)
- **Fix:** Kiểm tra lại file `.env.local` của bạn đã khai báo đủ các biến:
  - `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (Cho bước 2)
  - `HUGGINGFACE_TOKEN` (Bắt buộc phải có để chạy bước 3)
  - Database Credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`...)

---

## ✅ Bước 5: Xác Nhận Thành Quả 

1. **Kiểm tra Website:** Mở trang web ứng dụng, truy cập vào menu môn học và đảm bảo tài liệu mới được chia bố cục chuẩn.
2. **Kiểm tra Chatbot:** Hãy thử test RAG! Vào hệ thống Chatbot, đặt một câu hỏi hóc búa để xem AI có tìm thấy thẻ tài liệu (Document Card) vừa được đẩy lên không. Nếu Chatbot trả lời mượt và tag chuẩn xác [Nguồn: PDF bạn vừa update], hệ thống của bạn thực sự tuyệt vời!

---

## 📝 Tóm Tắt Quy Trình Cập Nhật Tổng Lực

| Thứ Tự | Giải Quyết | Thời Gian Dự Kiến |
|------|----------|----------|
| **1.** | Kéo thả lưu trữ file lên **Google Drive** | 1-5 phút |
| **2.** | Shell lệnh: `npm run import:drive` (Tạo hiển thị Website) | 10-30 giây |
| **3.** | Shell lệnh: `node scripts/sync-to-mysql.mjs` (Luyện AI Chatbot RAG) | 2-15 phút |
| **4.** | Cùng kiểm thử Chatbot và UI Page | 1 phút |

**Chúc bạn quản trị hệ thống thành công nhé! 🚀**
