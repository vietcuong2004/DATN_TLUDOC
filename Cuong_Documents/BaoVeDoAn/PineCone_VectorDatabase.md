# 🌲 PINECONE VECTOR DATABASE - "BỘ NÃO" TRI THỨC CỦA CHATBOT

Tài liệu này giải thích vai trò và cách vận hành của CSDL Vector Pinecone trong đồ án TLU Document.

---

## 1. Pinecone là gì?
**Pinecone** là một cơ sở dữ liệu Vector (Vector Database) chuyên dụng. Khác với MySQL lưu trữ dữ liệu dạng bảng (chữ, số), Pinecone lưu trữ dữ liệu dưới dạng các **Vector** (những mảng số thực nhiều chiều).

## 2. Tại sao lại dùng Pinecone trong đồ án này?
Trong hệ thống RAG (Retrieval-Augmented Generation), Chatbot cần phải "tìm" được đoạn văn bản liên quan nhất trong hàng ngàn trang tài liệu chỉ trong vài mil giây. 
- MySQL không thể tìm kiếm theo "ngữ nghĩa" một cách hiệu quả.
- **Pinecone** cho phép thực hiện thuật toán **Vector Similarity Search** (Tìm kiếm tương đồng) cực nhanh để lấy ra đúng kiến thức cần thiết dựa trên ý nghĩa câu hỏi, chứ không chỉ dựa trên từ khóa.

## 3. Vai trò cụ thể trong hệ thống
Pinecone đóng vai trò là **"Bộ nhớ tri thức"**:
1.  **Giai đoạn nạp liệu (ETL):** Toàn bộ giáo trình PDF được băm nhỏ thành các đoạn văn (Chunks), sau đó dùng AI chuyển thành các Vector 384 chiều và đẩy lên Pinecone.
2.  **Giai đoạn truy vấn (Retrieval):** Khi người dùng hỏi, câu hỏi cũng được chuyển thành Vector. Pinecone sẽ so sánh Vector câu hỏi này với hàng ngàn Vector tài liệu để tìm ra Top 5 đoạn văn bản có nội dung gần nhất.

## 4. Cách quản lý và Theo dõi
Bạn có thể quản lý "bộ não" này trực tiếp trên Dashboard của Pinecone.

### 🔗 Liên kết quản lý:
- **Duyệt dữ liệu thực tế:** [Xem tại đây](https://app.pinecone.io/organizations/-OqGbxPcUt7_CDccCDUF/projects/c9cfdcfc-876a-4e46-b1fe-3c223e49531b/indexes/tlu-document-chatbot/browser)
- **Thông số cấu hình:**
    - **Dimensions:** 384 (Khớp với model Embedding `all-MiniLM-L6-v2`).
    - **Metric:** Cosine (Đo độ tương đồng bằng góc giữa các Vector).

### 📊 Các chỉ số cần lưu ý (Dành cho báo cáo):
- **Storage:** Dung lượng lưu trữ (Gói miễn phí cho phép 2GB).
- **WUs (Write Units):** Số lượt nạp tài liệu.
- **RUs (Read Units):** Số lượt Chatbot đi tìm kiến thức để trả lời người dùng.

---
> [!TIP]
> **Câu hỏi Hội đồng thường gặp:** "Tại sao không dùng MySQL cho nhanh mà phải dùng Pinecone?"
> **Trả lời:** MySQL tìm kiếm theo từ khóa chính xác (Keyword search), còn Pinecone tìm kiếm theo ý nghĩa (Semantic search). Pinecone giúp Chatbot hiểu được ngữ cảnh ngay cả khi người dùng không dùng từ ngữ giống hệt trong sách giáo khoa.