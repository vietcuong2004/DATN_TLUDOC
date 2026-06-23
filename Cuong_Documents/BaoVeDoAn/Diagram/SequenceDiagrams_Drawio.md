# CÁC SƠ ĐỒ TUẦN TỰ HỆ THỐNG TLU DOCUMENT (TỐI ƯU HÓA CHO DRAW.IO)

Tài liệu này chứa mã nguồn Mermaid vẽ Sơ đồ tuần tự (Sequence Diagram) cho 13 Use Case của hệ thống **TLU Document** theo mô hình thiết kế nghiệp vụ **BCE (Boundary - Control - Entity)** với các ký hiệu hình dạng UML chuẩn hóa của Mermaid, đã được **tối ưu hóa đặc biệt để import vào draw.io dưới dạng Editable Shapes** (sử dụng `<br/>` để bẻ dòng các nhãn dài, tránh đè chữ, tràn khung).

---

### Sơ đồ tuần tự 1: UC01 – Đăng ký tài khoản
Mô tả luồng người dùng đăng ký tài khoản mới trên hệ thống.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Đăng ký<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Đăng ký<br/>(Control)"
    participant Entity@{ "type": "entity" } as "User<br/>(Entity)"

    User->>UI: 1. Nhập thông tin (Email, Mật khẩu,<br/>Họ tên, Mã SV...)
    User->>UI: 2. Nhấn nút "Đăng ký"
    activate UI
    UI->>UI: 3. Kiểm tra tính hợp lệ<br/>của dữ liệu (validation)
    UI->>Control: 4. Gửi POST /api/auth/register<br/>(payload)
    activate Control
    Control->>Entity: 5. Truy vấn kiểm tra Email<br/>hoặc Mã SV đã tồn tại?
    activate Entity
    Entity-->>Control: 6. Trả về kết quả kiểm tra
    deactivate Entity
    
    alt Thông tin đã tồn tại (Trùng email/mã SV)
        Control-->>UI: 7. Trả phản hồi 400 Bad Request<br/>(Đã tồn tại)
        UI-->>User: 8. Hiển thị thông báo lỗi trên UI
    else Thông tin hợp lệ
        Control->>Control: 9. Mã hóa mật khẩu (Bcrypt hashing)
        Control->>Entity: 10. Thực hiện INSERT dữ liệu mới
        activate Entity
        Entity-->>Control: 11. Xác nhận thêm thành công
        deactivate Entity
        Control-->>UI: 12. Trả phản hồi 201 Created<br/>(Thành công)
        deactivate Control
        UI-->>User: 13. Hiển thị thông báo thành công<br/>& chuyển hướng đăng nhập
    end
    deactivate UI
```

---

### Sơ đồ tuần tự 2: UC02 – Đăng nhập
Mô tả luồng xác thực thông tin đăng nhập của người dùng để cấp quyền truy cập hệ thống.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Đăng nhập<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Đăng nhập<br/>(Control)"
    participant Entity@{ "type": "entity" } as "User<br/>(Entity)"

    User->>UI: 1. Nhập Email và Mật khẩu
    User->>UI: 2. Nhấn nút "Đăng nhập"
    activate UI
    UI->>Control: 3. Gửi POST /api/auth/login<br/>(email, password)
    activate Control
    Control->>Entity: 4. SELECT user<br/>WHERE email = email_nhap
    activate Entity
    Entity-->>Control: 5. Trả về thông tin User<br/>(kèm password_hash)
    deactivate Entity
    
    alt Không tìm thấy User / Tài khoản bị khóa
        Control-->>UI: 6. Trả phản hồi 401/403<br/>(Không hợp lệ/Bị khóa)
        UI-->>User: 7. Báo đăng nhập thất bại trên UI
    else Tìm thấy User
        Control->>Control: 8. So sánh mật khẩu (Bcrypt compare)
        alt Mật khẩu không khớp
            Control-->>UI: 9. Trả phản hồi 401 Unauthorized
            UI-->>User: 10. Báo lỗi sai mật khẩu
        else Mật khẩu khớp
            Control->>Control: 11. Sinh JWT Session Token<br/>(chứa id, role)
            Control->>Entity: 12. UPDATE last_login_at
            activate Entity
            Entity-->>Control: 13. Xác nhận cập nhật
            deactivate Entity
            Control-->>UI: 14. Trả phản hồi 200 OK<br/>(Token + User info)
            deactivate Control
            UI->>UI: 15. Lưu session & cập nhật giao diện
            UI-->>User: 16. Chuyển hướng về Trang chủ / Dashboard
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
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Tìm kiếm<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Tìm kiếm<br/>(Control)"
    participant HF@{ "type": "boundary" } as "Dịch vụ Hugging Face<br/>(Boundary)"
    participant PC@{ "type": "boundary" } as "Dịch vụ Pinecone DB<br/>(Boundary)"
    participant Entity@{ "type": "entity" } as "Document<br/>(Entity)"

    User->>UI: 1. Nhập từ khóa, chọn bộ lọc<br/>(Môn học, loại, đánh giá)
    User->>UI: 2. Nhấn nút "Tìm kiếm"
    activate UI
    UI->>Control: 3. Gửi GET /api/documents/search<br/>(query, filters)
    activate Control
    
    alt Tìm kiếm thường (SQL LIKE)
        Control->>Entity: 4. SELECT kết hợp bộ lọc (MySQL)
        activate Entity
        Entity-->>Control: 5. Trả về danh sách khớp
        deactivate Entity
    else Tìm kiếm ngữ nghĩa (Semantic Search)
        Control->>HF: 6. Gọi API sinh vector nhúng<br/>(all-MiniLM-L6-v2)
        activate HF
        HF-->>Control: 7. Trả về mảng vector 384 chiều
        deactivate HF
        Control->>PC: 8. Truy vấn tương đồng Cosine<br/>(vector, metadata filter)
        activate PC
        PC-->>Control: 9. Trả về danh sách Document ID
        deactivate PC
        Control->>Entity: 10. SELECT * FROM documents<br/>WHERE id IN (danh_sach_id)
        activate Entity
        Entity-->>Control: 11. Trả về chi tiết metadata
        deactivate Entity
    end

    Control-->>UI: 12. Trả phản hồi 200 OK<br/>(Danh sách tài liệu)
    deactivate Control
    UI-->>User: 13. Hiển thị thẻ tài liệu (Cards) lên UI
    deactivate UI
```

---

### Sơ đồ tuần tự 4: UC04 – Trợ lý học tập AI (Chatbot Tutor)
Mô tả luồng hỏi đáp ngữ cảnh dựa trên tài liệu sử dụng kỹ thuật RAG và stream phản hồi từ OpenAI LLM.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Chatbot<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Chatbot<br/>(Control)"
    participant HF@{ "type": "boundary" } as "Dịch vụ Hugging Face<br/>(Boundary)"
    participant PC@{ "type": "boundary" } as "Dịch vụ Pinecone DB<br/>(Boundary)"
    participant AI@{ "type": "boundary" } as "Dịch vụ OpenAI<br/>(Boundary)"
    participant Entity@{ "type": "entity" } as "Chatbot<br/>(Entity)"

    User->>UI: 1. Nhập câu hỏi vào khung Chat
    User->>UI: 2. Nhấn gửi (hoặc Enter)
    activate UI
    UI->>Control: 3. Gửi POST /api/chatbot<br/>(message, documentId)
    activate Control
    Control->>HF: 4. Gọi API sinh vector nhúng 384 chiều
    activate HF
    HF-->>Control: 5. Trả về vector biểu diễn câu hỏi
    deactivate HF
    Control->>PC: 6. Truy vấn Pinecone<br/>(queryVector, topK=5, filter)
    activate PC
    PC-->>Control: 7. Trả về danh sách đoạn văn (chunks)
    deactivate PC
    Control->>Control: 8. Ghép chunks thành chuỗi Context
    Control->>Control: 9. Thiết lập Prompt (Context + Question)
    Control->>AI: 10. Gọi API OpenAI (stream mode)
    activate AI
    AI-->>Control: 11. Trả về ReadableStream chunks
    deactivate AI
    Control-->>UI: 12. Truyền luồng response về UI (realtime)
    loop Đọc luồng chunks
        UI->>UI: 13. Render text từng phần ra Chatbox
    end
    UI-->>User: 14. Hiển thị câu trả lời hoàn chỉnh dần
    
    Control->>Entity: 15. INSERT history vào chatbot_history (MySQL)
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
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Chatbot<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Lịch sử Chatbot<br/>(Control)"
    participant Entity@{ "type": "entity" } as "Chatbot<br/>(Entity)"

    User->>UI: 1. Chọn "Lịch sử trò chuyện"
    activate UI
    UI->>Control: 2. Gửi GET /api/chatbot/history (userId)
    activate Control
    Control->>Entity: 3. SELECT * FROM chatbot_history<br/>WHERE user_id = userId
    activate Entity
    Entity-->>Control: 4. Trả về danh sách chat cũ
    deactivate Entity
    Control-->>UI: 5. Trả phản hồi 200 OK (Danh sách)
    deactivate Control
    UI-->>User: 6. Hiển thị các phiên trò chuyện lên UI

    User->>UI: 7. Chọn "Xóa" phiên chat
    UI->>Control: 8. Gửi DELETE /api/chatbot/history?id=chatId
    activate Control
    Control->>Entity: 9. DELETE FROM chatbot_history<br/>WHERE id = chatId
    activate Entity
    Entity-->>Control: 10. Xác nhận xóa thành công
    deactivate Entity
    Control-->>UI: 11. Trả phản hồi 200 OK (Thành công)
    deactivate Control
    UI->>UI: 12. Cập nhật danh sách trên UI
    UI-->>User: 13. Thông báo đã xóa thành công
    deactivate UI
```

---

### Sơ đồ tuần tự 6: UC06 – Tóm tắt tài liệu bằng AI
Mô tả luồng hệ thống gọi mô hình AI tóm tắt tài liệu tự động theo cấu hình người dùng.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Tóm tắt<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Tóm tắt<br/>(Control)"
    participant AI@{ "type": "boundary" } as "Dịch vụ OpenAI<br/>(Boundary)"
    participant Entity@{ "type": "entity" } as "Document<br/>(Entity)"

    User->>UI: 1. Chọn chế độ tóm tắt,<br/>bấm "Tóm tắt tài liệu"
    activate UI
    UI->>Control: 3. Gửi POST /api/documents/summarize<br/>(documentId, summaryType)
    activate Control
    Control->>Entity: 4. SELECT * FROM documents<br/>WHERE id = documentId
    activate Entity
    Entity-->>Control: 5. Trả về thông tin tài liệu
    deactivate Entity
    
    Control->>Control: 6. Bóc tách text/context từ văn bản
    Control->>Control: 7. Xây dựng Prompt yêu cầu tóm tắt
    Control->>AI: 8. Gửi Prompt đến OpenAI API
    activate AI
    AI-->>Control: 9. Trả về nội dung tóm tắt
    deactivate AI
    
    Control->>Entity: 10. INSERT INTO document_summaries
    activate Entity
    Entity-->>Control: 11. Xác nhận lưu trữ thành công
    deactivate Entity
    
    Control-->>UI: 12. Trả phản hồi 200 OK (summaryText)
    deactivate Control
    UI-->>User: 13. Hiển thị văn bản tóm tắt lên UI
    deactivate UI
```

---

### Sơ đồ tuần tự 7: UC07 – Tạo bài kiểm tra trắc nghiệm (AI Quiz Generator)
Mô tả luồng hệ thống gọi AI phân tích văn bản để thiết kế câu hỏi trắc nghiệm tương tác cho sinh viên.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Làm bài Quiz<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Sinh Quiz<br/>(Control)"
    participant AI@{ "type": "boundary" } as "Dịch vụ OpenAI<br/>(Boundary)"

    User->>UI: 1. Chọn mục "Làm bài ôn tập (Quiz)"
    activate UI
    UI->>Control: 2. Gửi POST /api/quiz/generate (documentId)
    activate Control
    Control->>Control: 3. Đọc/bóc tách text thô từ tài liệu
    Control->>Control: 4. Tạo Prompt cấu trúc JSON bộ câu hỏi
    Control->>AI: 5. Gọi OpenAI API sinh câu hỏi
    activate AI
    AI-->>Control: 6. Trả về chuỗi JSON chứa câu hỏi & giải thích
    deactivate AI
    Control->>Control: 7. Parse & sửa lỗi cú pháp JSON (nếu có)
    Control-->>UI: 8. Trả phản hồi 200 OK (Mảng câu hỏi JSON)
    deactivate Control
    UI->>UI: 9. Render bộ câu hỏi tương tác lên UI
    UI-->>User: 10. Hiển thị giao diện làm bài
    
    User->>UI: 11. Làm bài và nhấn "Nộp bài"
    UI->>UI: 12. Tính điểm & hiển thị giải thích đáp án
    UI-->>User: 13. Hiển thị kết quả điểm số
    deactivate UI
```

---

### Sơ đồ tuần tự 8: UC08 – Chuyển đổi tài liệu thành Sơ đồ tư duy (Mindmap Generator)
Mô tả luồng hệ thống gọi AI chuyển đổi dàn ý tài liệu thành cây sơ đồ tư duy phân cấp.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Sơ đồ tư duy<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Sinh Mindmap<br/>(Control)"
    participant AI@{ "type": "boundary" } as "Dịch vụ OpenAI<br/>(Boundary)"

    User->>UI: 1. Chọn mục "Tạo Sơ đồ tư duy (Mindmap)"
    activate UI
    UI->>Control: 2. Gửi POST /api/mindmap/generate (documentId)
    activate Control
    Control->>Control: 3. Bóc tách/đọc text thô từ tài liệu
    Control->>Control: 4. Tạo Prompt trích xuất ý chính (JSON Node Tree)
    Control->>AI: 5. Gọi OpenAI API sinh sơ đồ tư duy
    activate AI
    AI-->>Control: 6. Trả về JSON cây sơ đồ tư duy
    deactivate AI
    Control->>Control: 7. Sửa lỗi cấu trúc JSON qua hàm sửa lỗi
    Control-->>UI: 8. Trả phản hồi 200 OK (Cây node sơ đồ)
    deactivate Control
    UI->>UI: 9. Render sơ đồ dạng nút (React Flow)
    UI-->>User: 10. Hiển thị sơ đồ tư duy trên màn hình
    deactivate UI
```

---

### Sơ đồ tuần tự 9: UC09 – Chỉnh sửa Sơ đồ tư duy (Edit Mindmap)
Mô tả luồng người dùng thao tác chỉnh sửa trực tiếp các node trên sơ đồ tư duy (tự động lưu trạng thái mới lên máy chủ).

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Sơ đồ tư duy<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Chỉnh sửa Mindmap<br/>(Control)"
    participant Entity@{ "type": "entity" } as "Mindmap<br/>(Entity)"

    User->>UI: 1. Kéo thả các nút (Node)<br/>để sắp xếp lại bố cục
    activate UI
    UI->>UI: 2. Cập nhật tọa độ trên canvas
    UI-->>User: 3. Cập nhật vị trí nút trực quan

    User->>UI: 4. Nháy đúp vào nút để sửa nội dung
    UI->>UI: 5. Chuyển nút thành ô nhập liệu (Input)
    User->>UI: 6. Nhập nội dung mới & Enter
    UI->>UI: 7. Cập nhật dữ liệu label trong node state
    UI-->>User: 8. Hiển thị nội dung mới của nút

    UI->>Control: 9. Gửi POST /api/mindmap/edit<br/>(mindmapId, nodesData)
    activate Control
    Control->>Entity: 10. Cập nhật cấu trúc JSON của sơ đồ
    activate Entity
    Entity-->>Control: 11. Xác nhận lưu thành công
    deactivate Entity
    Control-->>UI: 12. Trả phản hồi 200 OK (Lưu ngầm)
    deactivate Control
    
    User->>UI: 13. Chọn "Tải xuống PNG/PDF"
    UI->>UI: 14. Chuyển canvas thành file ảnh/tài liệu
    UI-->>User: 15. Tải file về máy thành công
    deactivate UI
```

---

### Sơ đồ tuần tự 10: UC10 – Đánh giá tài liệu (Review Document)
Mô tả luồng người dùng chấm điểm sao và gửi nhận xét đánh giá chất lượng tài liệu học tập.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Chi tiết tài liệu<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Đánh giá<br/>(Control)"
    participant Entity@{ "type": "entity" } as "Document<br/>(Entity)"

    User->>UI: 1. Chọn số sao (1-5) & nhập nhận xét
    User->>UI: 2. Nhấn nút "Gửi đánh giá"
    activate UI
    UI->>Control: 3. Gửi POST /api/documents/review<br/>(documentId, rating, comment)
    activate Control
    Control->>Entity: 4. INSERT INTO document_reviews
    activate Entity
    Entity-->>Control: 5. Xác nhận lưu đánh giá thành công
    deactivate Entity
    Control->>Control: 6. Tính toán điểm avg_rating mới
    Control->>Entity: 7. UPDATE documents SET avg_rating = new_avg
    activate Entity
    Entity-->>Control: 8. Xác nhận cập nhật điểm trung bình
    deactivate Entity
    Control-->>UI: 9. Trả phản hồi 200 OK (Thành công)
    deactivate Control
    UI->>UI: 10. Thêm review mới vào danh sách UI
    UI-->>User: 11. Thông báo thành công & cập nhật điểm sao
    deactivate UI
```

---

### Sơ đồ tuần tự 11: UC11 – Tải tài liệu lên (Upload Document)
Mô tả luồng tải tệp tin lên hệ thống, đồng bộ Google Drive và đưa vào hàng đợi xử lý Vector hóa.

```mermaid
sequenceDiagram
    autonumber
    actor User as User<br/>(Sinh viên/Giảng viên)
    participant UI@{ "type": "boundary" } as "Giao diện Tải lên<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Tải lên<br/>(Control)"
    participant GD@{ "type": "boundary" } as "Dịch vụ Google Drive<br/>(Boundary)"
    participant Entity@{ "type": "entity" } as "Document<br/>(Entity)"

    User->>UI: 1. Chọn file từ máy tính (PDF/DOCX),<br/>nhập mô tả, chọn môn học
    User->>UI: 2. Nhấn nút "Tải lên"
    activate UI
    UI->>Control: 3. Gửi POST /api/documents/upload<br/>(FormData: file, metadata)
    activate Control
    
    Note over Control: Giao thức kiểm tra trùng lặp<br/>(UC12) bắt đầu ở đây
    Control->>Control: 4. Tính toán mã băm MD5<br/>của tệp tin tải lên (file_hash)
    Control->>Entity: 5. SELECT COUNT(*)<br/>FROM documents<br/>WHERE file_hash = file_hash
    activate Entity
    Entity-->>Control: 6. Trả về số lượng tệp trùng
    deactivate Entity
    
    alt File hash đã tồn tại (Trùng lặp hoàn toàn)
        Control-->>UI: 7. Trả phản hồi 409 Conflict<br/>(Tài liệu đã tồn tại)
        UI-->>User: 8. Báo lỗi tài liệu đã tồn tại,<br/>từ chối tải lên
    else File hash hợp lệ (Duy nhất)
        Control->>GD: 9. Gọi API Drive tải tệp tin lên<br/>(Service Account auth)
        activate GD
        GD-->>Control: 10. Trả về drive_file_id<br/>và các link (preview/download)
        deactivate GD
        Control->>Entity: 11. INSERT INTO documents<br/>(title, description, file_hash,<br/>drive_file_id, subject_id, status='published')
        activate Entity
        Entity-->>Control: 12. Xác nhận lưu trữ<br/>metadata thành công
        deactivate Entity
        
        Note over Control: Bắt đầu tiến trình<br/>Vector hóa bất đồng bộ
        Control->>Control: 13. Gọi tiến trình ngầm<br/>/api/vectorize?id=docId (Async task)
        
        Control-->>UI: 14. Trả phản hồi 201 Created<br/>(Tải lên thành công)
        deactivate Control
        UI-->>User: 15. Hiển thị thông báo thành công<br/>& hiển thị tài liệu trên UI
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
    participant Control@{ "type": "control" } as "Controller Kiểm tra trùng lặp<br/>(Control)"
    participant Entity@{ "type": "entity" } as "Document<br/>(Entity)"

    Note over Control: Nhận yêu cầu băm file buffer
    System->>Control: 1. Kích hoạt kiểm tra trùng lặp
    activate Control
    Control->>Control: 2. Tính toán mã hash MD5<br/>từ tệp tin tải lên
    Control->>Entity: 3. SELECT id, title FROM documents<br/>WHERE file_hash = hash_vua_tinh LIMIT 1
    activate Entity
    Entity-->>Control: 4. Trả về thông tin trùng khớp (nếu có)
    deactivate Entity
    
    alt Tìm thấy bản ghi trùng khớp
        Control->>Control: 5. Xác nhận trùng lặp nội dung 100%
        Control-->>System: 6. Trả về kết quả: TRUE<br/>(Trùng lặp, chứa tài liệu gốc ID)
    else Không tìm thấy bản ghi trùng khớp
        Control->>Control: 7. Xác nhận tài liệu là duy nhất
        Control-->>System: 8. Trả về kết quả: FALSE<br/>(Không trùng lặp)
        deactivate Control
    end
```

---

### Sơ đồ tuần tự 13: UC13 – Xem/Sửa/Xóa tài liệu (dành cho Admin)
Mô tả quy trình quản trị tài liệu học tập dành riêng cho Quản trị viên (Admin).

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin<br/>(Quản trị viên hệ thống)
    participant UI@{ "type": "boundary" } as "Giao diện Admin Dashboard<br/>(Boundary)"
    participant Control@{ "type": "control" } as "Controller Admin Tài liệu<br/>(Control)"
    participant Entity@{ "type": "entity" } as "Document<br/>(Entity)"
    participant GD@{ "type": "boundary" } as "Dịch vụ Google Drive<br/>(Boundary)"
    participant PC@{ "type": "boundary" } as "Dịch vụ Pinecone DB<br/>(Boundary)"

    Admin->>UI: 1. Truy cập Dashboard<br/>quản lý tài liệu
    activate UI
    UI->>Control: 2. Gửi GET<br/>/api/admin/documents
    activate Control
    Control->>Entity: 3. SELECT * FROM documents<br/>ORDER BY created_at DESC
    activate Entity
    Entity-->>Control: 4. Trả về danh sách<br/>tài liệu trong hệ thống
    deactivate Entity
    Control-->>UI: 5. Trả phản hồi 200 OK<br/>(Danh sách tài liệu)
    deactivate Control
    UI-->>Admin: 6. Hiển thị bảng danh sách tài liệu<br/>kèm bộ công cụ chỉnh sửa/phê duyệt

    alt Sửa thông tin tài liệu
        Admin->>UI: 7. Thay đổi tiêu đề/môn học<br/>-> bấm "Lưu thay đổi"
        UI->>Control: 8. Gửi PUT<br/>/api/admin/documents?id=docId<br/>(payload)
        activate Control
        Control->>Entity: 9. UPDATE documents<br/>SET title=new_title, subject_id=new_subj<br/>WHERE id=docId
        activate Entity
        Entity-->>Control: 10. Xác nhận cập nhật thành công
        deactivate Entity
        Control-->>UI: 11. Trả phản hồi 200 OK<br/>(Cập nhật thành công)
        deactivate Control
        UI-->>Admin: 12. Hiển thị thông báo lưu thành công<br/>& cập nhật bảng dữ liệu
    else Xóa tài liệu khỏi hệ thống
        Admin->>UI: 13. Nhấp nút "Xóa tài liệu"<br/>-> Xác nhận xóa
        UI->>Control: 14. Gửi DELETE<br/>/api/admin/documents?id=docId
        activate Control
        Control->>Entity: 15. SELECT drive_file_id<br/>FROM documents WHERE id = docId
        activate Entity
        Entity-->>Control: 16. Trả về mã file<br/>trên Google Drive
        deactivate Entity
        
        Control->>Entity: 17. DELETE FROM documents<br/>WHERE id = docId
        activate Entity
        Entity-->>Control: 18. Xác nhận xóa bản ghi MySQL
        deactivate Entity
        
        Control->>GD: 19. Gọi API xóa file<br/>theo drive_file_id
        activate GD
        GD-->>Control: 20. Xác nhận xóa tệp trên Drive
        deactivate GD
        
        Control->>PC: 21. Gọi API xóa các vector embeddings<br/>theo document_id
        activate PC
        PC-->>Control: 22. Xác nhận xóa vector<br/>trên Pinecone Vector DB
        deactivate PC
        
        Control-->>UI: 23. Trả phản hồi 200 OK<br/>(Xóa thành công)
        deactivate Control
        UI->>UI: 24. Loại bỏ dòng tài liệu khỏi bảng UI
        UI-->>Admin: 25. Hiển thị thông báo tài liệu<br/>đã được gỡ hoàn toàn
    end
    deactivate UI
```
