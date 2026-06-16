# CÁC SƠ ĐỒ TUẦN TỰ HỆ THỐNG TLU DOCUMENT (SEQUENCE DIAGRAMS - BCE MODEL)

Tài liệu này chứa mã nguồn Mermaid vẽ Sơ đồ tuần tự (Sequence Diagram) cho 13 Use Case của hệ thống **TLU Document** theo mô hình thiết kế nghiệp vụ **BCE (Boundary - Control - Entity)** với các ký hiệu hình dạng UML chuẩn hóa của Mermaid.

---

### Sơ đồ tuần tự 1: UC01 – Đăng ký tài khoản
Mô tả luồng người dùng đăng ký tài khoản mới trên hệ thống.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Đăng ký (Boundary)"
    participant Control@{ "type": "control" } as "API Đăng ký (Control)"
    participant Entity@{ "type": "entity" } as "User (Entity)"

    User->>UI: 1. Nhập thông tin (Email, Mật khẩu, Họ tên, Mã SV...)
    User->>UI: 2. Nhấn nút "Đăng ký"
    activate UI
    UI->>UI: 3. Kiểm tra tính hợp lệ của dữ liệu (validation)
    UI->>Control: 4. Gửi POST /api/auth/register (payload)
    activate Control
    Control->>Entity: 5. Truy vấn kiểm tra Email hoặc Mã SV đã tồn tại?
    activate Entity
    Entity-->>Control: 6. Trả về kết quả kiểm tra
    deactivate Entity
    
    alt Thông tin đã tồn tại (Email/Mã SV trùng)
        Control-->>UI: 7. Trả phản hồi 400 Bad Request (Đã tồn tại)
        UI-->>User: 8. Hiển thị thông báo lỗi trên giao diện
    else Thông tin hợp lệ
        Control->>Control: 9. Mã hóa mật khẩu (Bcrypt hashing)
        Control->>Entity: 10. Thực hiện INSERT dữ liệu người dùng mới
        activate Entity
        Entity-->>Control: 11. Xác nhận thêm thành công
        deactivate Entity
        Control-->>UI: 12. Trả phản hồi 201 Created (Thành công)
        deactivate Control
        UI-->>User: 13. Hiển thị thông báo thành công & chuyển hướng đến trang Đăng nhập
    end
    deactivate UI
```

---

### Sơ đồ tuần tự 2: UC02 – Đăng nhập
Mô tả luồng xác thực thông tin đăng nhập của người dùng để cấp quyền truy cập hệ thống.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Đăng nhập (Boundary)"
    participant Control@{ "type": "control" } as "API Đăng nhập (Control)"
    participant Entity@{ "type": "entity" } as "User (Entity)"

    User->>UI: 1. Nhập Email và Mật khẩu
    User->>UI: 2. Nhấn nút "Đăng nhập"
    activate UI
    UI->>Control: 3. Gửi POST /api/auth/login (email, password)
    activate Control
    Control->>Entity: 4. Truy vấn SELECT user WHERE email = email_nhap
    activate Entity
    Entity-->>Control: 5. Trả về thông tin bản ghi User (kèm password_hash)
    deactivate Entity
    
    alt Không tìm thấy User hoặc Tài khoản bị khóa
        Control-->>UI: 6. Trả phản hồi 401/403 (Không hợp lệ/Bị khóa)
        UI-->>User: 7. Hiển thị thông báo đăng nhập thất bại
    else Tìm thấy User
        Control->>Control: 8. So sánh password_nhap với password_hash (Bcrypt compare)
        alt Mật khẩu không trùng khớp
            Control-->>UI: 9. Trả phản hồi 401 Unauthorized
            UI-->>User: 10. Báo lỗi sai mật khẩu
        else Mật khẩu khớp
            Control->>Control: 11. Sinh JWT Session Token (chứa id, role)
            Control->>Entity: 12. UPDATE last_login_at = current_timestamp()
            activate Entity
            Entity-->>Control: 13. Xác nhận cập nhật
            deactivate Entity
            Control-->>UI: 14. Trả phản hồi 200 OK (JWT Token + User info)
            deactivate Control
            UI->>UI: 15. Lưu session thông tin và cập nhật giao diện
            UI-->>User: 16. Chuyển hướng người dùng về trang chủ / Dashboard
        end
    end
    deactivate UI
```

---

### Sơ đồ tuần tự 3: UC03 – Tìm kiếm tài liệu nâng cao
Mô tả luồng người dùng tìm kiếm tài liệu kết hợp giữa từ khóa ngữ nghĩa và các bộ lọc môn học, học phần.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Tìm kiếm (Boundary)"
    participant Control@{ "type": "control" } as "API Tìm kiếm (Control)"
    participant HF@{ "type": "control" } as "Dịch vụ Hugging Face (Control)"
    participant PC@{ "type": "entity" } as "Vector DB Pinecone (Entity)"
    participant Entity@{ "type": "entity" } as "Document (Entity)"

    User->>UI: 1. Nhập từ khóa, chọn bộ lọc (Môn học, loại, đánh giá)
    User->>UI: 2. Nhấn nút "Tìm kiếm"
    activate UI
    UI->>Control: 3. Gửi GET /api/documents/search (query, filters)
    activate Control
    
    alt Tìm kiếm thường (Chỉ khớp từ khóa / SQL LIKE)
        Control->>Entity: 4. Truy vấn SELECT kết hợp bộ lọc (MySQL)
        activate Entity
        Entity-->>Control: 5. Trả về danh sách tài liệu khớp
        deactivate Entity
    else Tìm kiếm ngữ nghĩa (Semantic Search)
        Control->>HF: 6. Gọi API sinh vector nhúng cho câu query (all-MiniLM-L6-v2)
        activate HF
        HF-->>Control: 7. Trả về mảng vector 384 chiều
        deactivate HF
        Control->>PC: 8. Truy vấn tương đồng Cosine (vector, metadata filter)
        activate PC
        PC-->>Control: 9. Trả về danh sách Document ID tương đồng nhất
        deactivate PC
        Control->>Entity: 10. SELECT * FROM documents WHERE id IN (danh_sach_id)
        activate Entity
        Entity-->>Control: 11. Trả về chi tiết metadata các tài liệu
        deactivate Entity
    end

    Control-->>UI: 12. Trả phản hồi 200 OK (Danh sách tài liệu)
    deactivate Control
    UI-->>User: 13. Hiển thị các thẻ tài liệu (Document Cards) lên UI
    deactivate UI
```

---

### Sơ đồ tuần tự 4: UC04 – Trợ lý học tập AI (Chatbot Tutor)
Mô tả luồng hỏi đáp ngữ cảnh dựa trên tài liệu sử dụng kỹ thuật RAG và stream phản hồi từ OpenAI LLM.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Chatbot (Boundary)"
    participant Control@{ "type": "control" } as "API Chatbot (Control)"
    participant HF@{ "type": "control" } as "Dịch vụ Hugging Face (Control)"
    participant PC@{ "type": "entity" } as "Vector DB Pinecone (Entity)"
    participant AI@{ "type": "control" } as "Dịch vụ OpenAI (Control)"
    participant Entity@{ "type": "entity" } as "Chatbot (Entity)"

    User->>UI: 1. Nhập câu hỏi vào khung Chat
    User->>UI: 2. Nhấn gửi (hoặc Enter)
    activate UI
    UI->>Control: 3. Gửi POST /api/chatbot (message, documentId)
    activate Control
    Control->>HF: 4. Gửi câu hỏi đầu vào để sinh vector nhúng 384 chiều
    activate HF
    HF-->>Control: 5. Trả về vector biểu diễn câu hỏi
    deactivate HF
    Control->>PC: 6. Truy vấn Pinecone (queryVector, topK=5, filter: documentId)
    activate PC
    PC-->>Control: 7. Trả về danh sách các đoạn văn bản (chunks) chứa nội dung liên quan nhất
    deactivate PC
    Control->>Control: 8. Ghép nội dung chunks thành chuỗi Context
    Control->>Control: 9. Thiết lập Prompt (Hệ thống + Context + Câu hỏi sinh viên)
    Control->>AI: 10. Gọi API OpenAI với Prompt (chế độ stream)
    activate AI
    AI-->>Control: 11. Trả về luồng dữ liệu (ReadableStream chunks)
    deactivate AI
    Control-->>UI: 12. Truyền luồng response về UI (realtime stream chunks)
    loop Đọc luồng chunks
        UI->>UI: 13. Render text từng phần ra giao diện Chatbox
    end
    UI-->>User: 14. Hiển thị câu trả lời hoàn thiện dần trên màn hình
    
    Control->>Entity: 15. Thực hiện lưu câu hỏi, câu trả lời vào chatbot_history (MySQL)
    activate Entity
    Entity-->>Control: 16. Xác nhận lưu lịch sử chat
    deactivate Entity
    deactivate Control
    deactivate UI
```

---

### Sơ đồ tuần tự 5: UC05 – Quản lý lịch sử trò chuyện AI
Mô tả luồng người dùng truy xuất, xem lại hoặc xóa các phiên hội thoại cũ với trợ lý AI.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Chatbot (Boundary)"
    participant Control@{ "type": "control" } as "API Lịch sử Chatbot (Control)"
    participant Entity@{ "type": "entity" } as "Chatbot (Entity)"

    User->>UI: 1. Chọn mục "Lịch sử trò chuyện"
    activate UI
    UI->>Control: 2. Gửi GET /api/chatbot/history (userId)
    activate Control
    Control->>Entity: 3. SELECT * FROM chatbot_history WHERE user_id = userId
    activate Entity
    Entity-->>Control: 4. Trả về danh sách các đoạn chat cũ
    deactivate Entity
    Control-->>UI: 5. Trả phản hồi 200 OK (Danh sách lịch sử)
    deactivate Control
    UI-->>User: 6. Hiển thị danh sách các phiên trò chuyện lên giao diện

    User->>UI: 7. Nhấp vào biểu tượng "Xóa" một phiên chat
    UI->>Control: 8. Gửi DELETE /api/chatbot/history?id=chatId
    activate Control
    Control->>Entity: 9. DELETE FROM chatbot_history WHERE id = chatId
    activate Entity
    Entity-->>Control: 10. Xác nhận xóa thành công
    deactivate Entity
    Control-->>UI: 11. Trả phản hồi 200 OK (Xóa thành công)
    deactivate Control
    UI->>UI: 12. Cập nhật lại danh sách trên UI
    UI-->>User: 13. Báo tin nhắn đã được xóa khỏi hệ thống
    deactivate UI
```

---

### Sơ đồ tuần tự 6: UC06 – Tóm tắt tài liệu bằng AI
Mô tả luồng hệ thống gọi mô hình AI tóm tắt tài liệu tự động theo cấu hình người dùng.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Tóm tắt (Boundary)"
    participant Control@{ "type": "control" } as "API Tóm tắt (Control)"
    participant AI@{ "type": "control" } as "Dịch vụ OpenAI (Control)"
    participant Entity@{ "type": "entity" } as "Document (Entity)"

    User->>UI: 1. Chọn chế độ tóm tắt (đoạn văn / gạch đầu dòng)
    User->>UI: 2. Nhấn nút "Tóm tắt tài liệu"
    activate UI
    UI->>Control: 3. Gửi POST /api/documents/summarize (documentId, summaryType)
    activate Control
    Control->>Entity: 4. SELECT * FROM documents WHERE id = documentId (để lấy drive_file_id)
    activate Entity
    Entity-->>Control: 5. Trả về thông tin tài liệu
    deactivate Entity
    
    Control->>Control: 6. Bóc tách text hoặc truy xuất context từ văn bản
    Control->>Control: 7. Xây dựng Prompt yêu cầu tóm tắt
    Control->>AI: 8. Gửi Prompt yêu cầu tóm tắt đến OpenAI API
    activate AI
    AI-->>Control: 9. Trả về nội dung tóm tắt hoàn chỉnh
    deactivate AI
    
    Control->>Entity: 10. INSERT INTO document_summaries (userId, documentId, summaryText, summaryType)
    activate Entity
    Entity-->>Control: 11. Xác nhận lưu trữ lịch sử tóm tắt
    deactivate Entity
    
    Control-->>UI: 12. Trả phản hồi 200 OK (summaryText)
    deactivate Control
    UI-->>User: 13. Hiển thị phần văn bản tóm tắt lên giao diện đọc
    deactivate UI
```

---

### Sơ đồ tuần tự 7: UC07 – Tạo bài kiểm tra trắc nghiệm (AI Quiz Generator)
Mô tả luồng hệ thống gọi AI phân tích văn bản để thiết kế câu hỏi trắc nghiệm tương tác cho sinh viên.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Làm bài Quiz (Boundary)"
    participant Control@{ "type": "control" } as "API Sinh Quiz (Control)"
    participant AI@{ "type": "control" } as "Dịch vụ OpenAI (Control)"

    User->>UI: 1. Chọn mục "Làm bài ôn tập (Quiz)" của tài liệu
    activate UI
    UI->>Control: 2. Gửi POST /api/quiz/generate (documentId)
    activate Control
    Control->>Control: 3. Đọc text thô đã lưu hoặc bóc tách từ file tài liệu
    Control->>Control: 4. Lập cấu trúc Prompt yêu cầu tạo bộ câu hỏi dưới định dạng JSON chuẩn
    Control->>AI: 5. Gửi yêu cầu sinh Quiz đến OpenAI API
    activate AI
    AI-->>Control: 6. Trả về chuỗi JSON chứa danh sách câu hỏi, các phương án và giải thích
    deactivate AI
    Control->>Control: 7. Chạy hàm parseJsonWithRepairs() sửa lỗi cú pháp JSON (nếu có)
    Control-->>UI: 8. Trả phản hồi 200 OK (Mảng câu hỏi JSON)
    deactivate Control
    UI->>UI: 9. Render bộ câu hỏi tương tác lên màn hình
    UI-->>User: 10. Hiển thị giao diện làm bài Quiz trực quan
    
    User->>UI: 11. Làm bài, chọn đáp án và nhấn "Nộp bài"
    UI->>UI: 12. Tự động tính toán điểm số và hiển thị đáp án đúng/sai kèm giải thích chi tiết tại chỗ
    UI-->>User: 13. Hiển thị bảng điểm và nút làm lại bài
    deactivate UI
```

---

### Sơ đồ tuần tự 8: UC08 – Chuyển đổi tài liệu thành Sơ đồ tư duy (Mindmap Generator)
Mô tả luồng hệ thống gọi AI chuyển đổi dàn ý tài liệu thành cây sơ đồ tư duy phân cấp.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Sơ đồ tư duy (Boundary)"
    participant Control@{ "type": "control" } as "API Sinh Mindmap (Control)"
    participant AI@{ "type": "control" } as "Dịch vụ OpenAI (Control)"

    User->>UI: 1. Nhấp chọn mục "Tạo Sơ đồ tư duy (Mindmap)"
    activate UI
    UI->>Control: 2. Gửi POST /api/mindmap/generate (documentId)
    activate Control
    Control->>Control: 3. Bóc tách hoặc đọc text thô của tài liệu học tập
    Control->>Control: 4. Tạo Prompt hướng dẫn AI trích xuất các ý chính dạng cây (JSON Node Tree)
    Control->>AI: 5. Gửi Prompt yêu cầu thiết kế sơ đồ đến OpenAI API
    activate AI
    AI-->>Control: 6. Trả về chuỗi JSON chứa cây sơ đồ tư duy phân cấp
    deactivate AI
    Control->>Control: 7. Thực hiện sửa lỗi cấu trúc JSON qua hàm sửa lỗi
    Control-->>UI: 8. Trả phản hồi 200 OK (Cây node sơ đồ tư duy)
    deactivate Control
    UI->>UI: 9. Render sơ đồ dạng nút (React Flow)
    UI-->>User: 10. Hiển thị sơ đồ tư duy dạng cây trực quan tương tác
    deactivate UI
```

---

### Sơ đồ tuần tự 9: UC09 – Chỉnh sửa Sơ đồ tư duy (Edit Mindmap)
Mô tả luồng người dùng thao tác chỉnh sửa trực tiếp các node trên sơ đồ tư duy (tự động lưu trạng thái mới lên máy chủ).

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Sơ đồ tư duy (Boundary)"
    participant Control@{ "type": "control" } as "API Chỉnh sửa Mindmap (Control)"
    participant Entity@{ "type": "entity" } as "Mindmap (Entity)"

    User->>UI: 1. Kéo thả các nút (Node) để sắp xếp lại bố cục
    activate UI
    UI->>UI: 2. Cập nhật tọa độ của các nút trên canvas
    UI-->>User: 3. Cập nhật vị trí nút ngay lập tức theo cử chỉ chuột

    User->>UI: 4. Nháy đúp vào một nút và sửa nội dung (Label)
    UI->>UI: 5. Chuyển nút thành ô nhập liệu (Input field)
    User->>UI: 6. Nhập nội dung mới & nhấn Enter (hoặc click ra ngoài)
    UI->>UI: 7. Cập nhật dữ liệu thuộc tính label trong mảng node state
    UI-->>User: 8. Hiển thị nội dung mới của nút trực tiếp

    UI->>Control: 9. Gửi POST /api/mindmap/edit (mindmapId, nodesData)
    activate Control
    Control->>Entity: 10. Cập nhật cấu trúc JSON mới của sơ đồ tư duy
    activate Entity
    Entity-->>Control: 11. Xác nhận lưu thành công
    deactivate Entity
    Control-->>UI: 12. Trả phản hồi 200 OK (Đã lưu ngầm)
    deactivate Control
    
    User->>UI: 13. Nhấp chuột chọn "Tải xuống PNG/PDF"
    UI->>UI: 14. Thực hiện chuyển canvas thành tệp tin ảnh hoặc tài liệu
    UI-->>User: 15. Xuất file tải xuống về máy người dùng thành công
    deactivate UI
```

---

### Sơ đồ tuần tự 10: UC10 – Đánh giá tài liệu (Review Document)
Mô tả luồng người dùng chấm điểm sao và gửi nhận xét đánh giá chất lượng tài liệu học tập.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Chi tiết tài liệu (Boundary)"
    participant Control@{ "type": "control" } as "API Đánh giá (Control)"
    participant Entity@{ "type": "entity" } as "Document (Entity)"

    User->>UI: 1. Chọn số sao (1-5), nhập nội dung đánh giá
    User->>UI: 2. Nhấn nút "Gửi đánh giá"
    activate UI
    UI->>Control: 3. Gửi POST /api/documents/review (documentId, rating, comment)
    activate Control
    Control->>Entity: 4. INSERT INTO document_reviews (document_id, user_id, rating, comment)
    activate Entity
    Entity-->>Control: 5. Xác nhận lưu đánh giá thành công
    deactivate Entity
    Control->>Control: 6. Gọi truy vấn tính toán avg_rating mới cho tài liệu
    Control->>Entity: 7. UPDATE documents SET avg_rating = new_avg, review_count = count WHERE id = documentId
    activate Entity
    Entity-->>Control: 8. Xác nhận cập nhật điểm trung bình của tài liệu
    deactivate Entity
    Control-->>UI: 9. Trả phản hồi 200 OK (Thành công)
    deactivate Control
    UI->>UI: 10. Thêm review mới vào danh sách hiển thị (realtime cập nhật UI)
    UI-->>User: 11. Báo gửi nhận xét thành công & cập nhật hiển thị điểm sao tài liệu
    deactivate UI
```

---

### Sơ đồ tuần tự 11: UC11 – Tải tài liệu lên (Upload Document)
Mô tả luồng tải tệp tin lên hệ thống, đồng bộ Google Drive và đưa vào hàng đợi xử lý Vector hóa.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Tải lên (Boundary)"
    participant Control@{ "type": "control" } as "API Tải lên (Control)"
    participant GD@{ "type": "control" } as "Dịch vụ Google Drive (Control)"
    participant Entity@{ "type": "entity" } as "Document (Entity)"

    User->>UI: 1. Chọn file từ máy tính (PDF/DOCX), nhập mô tả, chọn môn học
    User->>UI: 2. Nhấn nút "Tải lên"
    activate UI
    UI->>Control: 3. Gửi POST /api/documents/upload (FormData: file, metadata)
    activate Control
    
    Note over Control: Giao thức kiểm tra trùng lặp (UC12) bắt đầu ở đây
    Control->>Control: 4. Tính toán mã băm MD5 của tệp tin tải lên (file_hash)
    Control->>Entity: 5. SELECT COUNT(*) FROM documents WHERE file_hash = file_hash
    activate Entity
    Entity-->>Control: 6. Trả về số lượng tệp trùng
    deactivate Entity
    
    alt File hash đã tồn tại (Tài liệu trùng lặp hoàn toàn)
        Control-->>UI: 7. Trả phản hồi 409 Conflict (Tài liệu đã tồn tại)
        UI-->>User: 8. Báo lỗi tài liệu đã tồn tại trên hệ thống, từ chối tải lên
    else File hash hợp lệ (Tài liệu duy nhất)
        Control->>GD: 9. Gọi API Drive tải tệp tin lên (Service Account auth)
        activate GD
        GD-->>Control: 10. Trả về drive_file_id và các đường link (preview/download)
        deactivate GD
        Control->>Entity: 11. INSERT INTO documents (title, description, file_hash, drive_file_id, subject_id, uploader_id, status='published')
        activate Entity
        Entity-->>Control: 12. Xác nhận lưu trữ metadata tài liệu thành công
        deactivate Entity
        
        Note over Control: Bắt đầu tiến trình Vector hóa bất đồng bộ ngầm
        Control->>Control: 13. Gọi tiến trình ngầm /api/vectorize?id=docId (Async task)
        
        Control-->>UI: 14. Trả phản hồi 201 Created (Tải lên thành công)
        deactivate Control
        UI-->>User: 15. Hiển thị thông báo tải lên thành công & hiển thị tài liệu trong danh sách môn học
    end
    deactivate UI
```

---

### Sơ đồ tuần tự 12: UC12 – Kiểm tra trùng lặp nội dung (Duplicate Check)
Mô tả quy trình kiểm tra trùng lặp độc lập ở phía backend phục vụ cho quá trình tải tài liệu lên.

```mermaid
sequenceDiagram
    autonumber
    actor System as System (Hệ thống)
    participant Control@{ "type": "control" } as "API Kiểm tra trùng lặp (Control)"
    participant Entity@{ "type": "entity" } as "Document (Entity)"

    Note over Control: Nhận yêu cầu băm file buffer
    System->>Control: 1. Kích hoạt kiểm tra trùng lặp
    activate Control
    Control->>Control: 2. Tính toán mã hash MD5 từ tệp tin tải lên
    Control->>Entity: 3. SELECT id, title FROM documents WHERE file_hash = hash_vua_tinh LIMIT 1
    activate Entity
    Entity-->>Control: 4. Trả về thông tin bản ghi trùng khớp (nếu có)
    deactivate Entity
    
    alt Tìm thấy bản ghi trùng khớp
        Control->>Control: 5. Xác nhận trùng lặp nội dung 100%
        Control-->>System: 6. Trả về kết quả: TRUE (Trùng lặp, chứa tài liệu gốc ID)
    else Không tìm thấy bản ghi trùng khớp
        Control->>Control: 7. Xác nhận tài liệu là duy nhất
        Control-->>System: 8. Trả về kết quả: FALSE (Không trùng lặp)
        deactivate Control
    end
```

---

### Sơ đồ tuần tự 13: UC13 – Xem/Sửa/Xóa tài liệu (dành cho Admin)
Mô tả quy trình quản trị tài liệu học tập dành riêng cho Quản trị viên (Admin).

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin (Quản trị viên hệ thống)
    participant UI@{ "type": "boundary" } as "Giao diện Admin Dashboard (Boundary)"
    participant Control@{ "type": "control" } as "API Admin Tài liệu (Control)"
    participant Entity@{ "type": "entity" } as "Document (Entity)"
    participant GD@{ "type": "control" } as "Dịch vụ Google Drive (Control)"
    participant PC@{ "type": "entity" } as "Vector DB Pinecone (Entity)"

    Admin->>UI: 1. Truy cập Dashboard quản lý tài liệu
    activate UI
    UI->>Control: 2. Gửi GET /api/admin/documents
    activate Control
    Control->>Entity: 3. SELECT * FROM documents ORDER BY created_at DESC
    activate Entity
    Entity-->>Control: 4. Trả về danh sách tài liệu trong hệ thống
    deactivate Entity
    Control-->>UI: 5. Trả phản hồi 200 OK (Danh sách tài liệu)
    deactivate Control
    UI-->>Admin: 6. Hiển thị bảng danh sách tài liệu kèm các bộ công cụ chỉnh sửa/phê duyệt

    alt Sửa thông tin tài liệu
        Admin->>UI: 7. Thay đổi tiêu đề/môn học -> bấm "Lưu thay đổi"
        UI->>Control: 8. Gửi PUT /api/admin/documents?id=docId (payload)
        activate Control
        Control->>Entity: 9. UPDATE documents SET title=new_title, subject_id=new_subj WHERE id=docId
        activate Entity
        Entity-->>Control: 10. Xác nhận cập nhật thành công
        deactivate Entity
        Control-->>UI: 11. Trả phản hồi 200 OK (Cập nhật thành công)
        deactivate Control
        UI-->>Admin: 12. Hiển thị thông báo lưu thành công & cập nhật bảng dữ liệu
    else Xóa tài liệu khỏi hệ thống
        Admin->>UI: 13. Nhấp nút "Xóa tài liệu" -> Xác nhận xóa
        UI->>Control: 14. Gửi DELETE /api/admin/documents?id=docId
        activate Control
        Control->>Entity: 15. SELECT drive_file_id FROM documents WHERE id = docId
        activate Entity
        Entity-->>Control: 16. Trả về mã file trên Google Drive
        deactivate Entity
        
        Control->>Entity: 17. DELETE FROM documents WHERE id = docId
        activate Entity
        Entity-->>Control: 18. Xác nhận xóa bản ghi MySQL
        deactivate Entity
        
        Control->>GD: 19. Gọi API xóa file theo drive_file_id
        activate GD
        GD-->>Control: 20. Xác nhận xóa tệp trên Drive
        deactivate GD
        
        Control->>PC: 21. Gọi API xóa các vector embeddings theo document_id
        activate PC
        PC-->>Control: 22. Xác nhận xóa vector trên Pinecone Vector DB
        deactivate PC
        
        Control-->>UI: 23. Trả phản hồi 200 OK (Xóa thành công)
        deactivate Control
        UI->>UI: 24. Loại bỏ dòng tài liệu khỏi bảng UI
        UI-->>Admin: 25. Hiển thị thông báo tài liệu đã được gỡ hoàn toàn
    end
    deactivate UI
```
