## 8. Chi tiết cấu trúc các bảng

Dưới đây là bảng giải thích chi tiết mục đích, kiểu dữ liệu và các ràng buộc của từng trường cho 6 bảng trong cơ sở dữ liệu:

### 8.1. Bảng `users` (Quản lý người dùng)

| Thuộc Tính | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| id | int(11) | Khóa chính, Tự tăng, NOT NULL | Mã định danh duy nhất của người dùng |
| email | varchar(255) | UNIQUE, NOT NULL | Địa chỉ email đăng nhập hệ thống |
| password_hash | varchar(255) | NOT NULL | Mật khẩu đã được mã hóa |
| full_name | varchar(255) | NOT NULL | Họ và tên đầy đủ của người dùng |
| avatar_url | varchar(500) | DEFAULT NULL | Đường dẫn gốc / liên kết ảnh đại diện |
| phone | varchar(20) | DEFAULT NULL | Số điện thoại liên hệ |
| role | enum('student','teacher','admin') | DEFAULT 'student' | Vai trò trong hệ thống |
| status | enum('active','inactive','suspended') | DEFAULT 'active' | Trạng thái tài khoản |
| student_id | varchar(50) | UNIQUE, DEFAULT NULL | Mã sinh viên |
| department | varchar(100) | DEFAULT NULL | Khoa / Viện / Chuyên ngành bộ môn trực thuộc |
| bio | text | DEFAULT NULL | Thông tin tiểu sử hoặc mô tả thêm về cá nhân |
| created_at | timestamp | NOT NULL, DEFAULT current_timestamp() | Dấu thời gian hệ thống tạo tài khoản lúc đầu |
| updated_at | timestamp | NOT NULL, DEFAULT current_timestamp() ON UPDATE current_timestamp() | Dấu thời gian khi bản ghi được cập nhật/sửa chữa |
| last_login_at | timestamp | DEFAULT NULL | Thời gian ghi nhận lần đăng nhập cuối cùng |

### 8.2. Bảng `subjects` (Quản lý môn học)

| Thuộc Tính | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| id | int(11) | Khóa chính, Tự tăng, NOT NULL | Mã định danh duy nhất của môn học |
| code | varchar(50) | UNIQUE, NOT NULL | Mã học phần môn học (VD: CSE484) |
| name | varchar(255) | NOT NULL | Tên môn học hiển thị |
| folder_key | varchar(100) | UNIQUE, NOT NULL | Tên thư mục / định danh lưu trữ trên Google Drive |
| description | text | DEFAULT NULL | Thông tin mô tả chi tiết môn học |
| group_name | varchar(100) | DEFAULT NULL | Nhóm kiến thức của bộ môn (Cơ sở khối ngành, Kỹ năng,...) |
| semester | varchar(20) | DEFAULT NULL | Tên kỳ học mà môn học này được dạy |
| is_required | tinyint(1) | DEFAULT 0 | Đánh dấu là học phần bắt buộc (1) hay tự chọn (0) |
| created_at | timestamp | NOT NULL, DEFAULT current_timestamp() | Dấu thời gian được tạo trong CSDL |
| updated_at | timestamp | NOT NULL, DEFAULT current_timestamp() ON UPDATE current_timestamp() | Dấu thời gian bản ghi cập nhật |

### 8.3. Bảng `documents` (Thông tin tài liệu)

| Thuộc Tính | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| id | int(11) | Khóa chính, Tự tăng, NOT NULL | Mã định danh duy nhất (khóa chính) tự động sinh ra cho mỗi tài liệu khi được đưa vào hệ thống. |
| user_id | int(11) | Khóa ngoại (users.id), NULL | ID người dùng upload (nếu là tài liệu cá nhân). |
| title | varchar(500) | FULLTEXT, NOT NULL | Tiêu đề hoặc tên hiển thị chính thức của tài liệu. Hỗ trợ Fulltext cho tính năng tìm kiếm văn bản. |
| description | text | FULLTEXT, DEFAULT NULL | Lời mô tả chi tiết, phân tích nội dung cốt lõi của tài liệu để người xem đọc lướt trước khi tải. |
| subject_id | int(11) | Khóa ngoại (subjects.id), NULL | Mã định danh giúp hệ thống phân loại xem tài liệu này thuộc môn học nào (có thể NULL nếu là upload tự do). |
| uploader_id | int(11) | Khóa ngoại (users.id), NOT NULL | ID của tài khoản Admin hoặc người đóng góp chính thức. |
| is_private | tinyint(1) | DEFAULT 0 | 0: Công khai (Hệ thống), 1: Riêng tư (Tài liệu do user cá nhân tải lên). |
| doc_type | enum('exam','lecture','slides','assignment','research','other') | DEFAULT 'other' | Phân loại thể loại tập tin để dễ lọc: thi thử (exam), bài giảng (lecture), bài trình chiếu (slides)... |
| storage_provider | enum('gdrive','other') | DEFAULT 'gdrive' | Nền tảng phân phối Cloud đang chứa file gốc. Mặc định là 'gdrive' (Google Drive). |
| drive_folder_key | varchar(100) | NOT NULL | Tên Khóa (Key) của thư mục Google Drive đang chứa tệp (Ví dụ: TRI_TUE_NHAN_TAO). Dùng để auto-sync. |
| drive_file_id | varchar(255) | NOT NULL | Chuỗi ID độc quyền do Google Drive cấp riêng cho file để phục vụ trích xuất API, iframe và RAG Chatbot. |
| file_name | varchar(255) | DEFAULT NULL | Tên phần mềm gốc của tệp chuẩn trên máy tính hệ điều hành lúc tải lên Drive (Vd: BaiTapNhom.pdf). |
| file_ext | varchar(20) | DEFAULT NULL | Đuôi định dạng kỹ thuật số (pdf, docx, pptx). Dùng để front-end sinh ra các icon minh họa chuẩn xác. |
| file_hash | varchar(64) | DEFAULT NULL | Mã băm (MD5 hoặc SHA-256) của nội dung file. Dùng để kiểm tra trùng lặp chính xác 100%. |
| file_url | varchar(1000) | DEFAULT NULL | Đường dẫn chia sẻ trực tiếp bản gốc web trên Drive. Sử dụng để Share Link hệ ngoài lề nều cần thiết. |
| preview_url | varchar(1000) | DEFAULT NULL | URL đã nhúng để chèn thẳng vào bảng <iframe> của web, để user xem trực tiếp văn bản mà không phải nhảy tab. |
| download_url | varchar(1000) | DEFAULT NULL | Hành động đường liên kết API Endpoint. Khi nhấp vào, trình duyệt tự động tải ngầm file cứng về máy tính. |
| views_count | int(11) | DEFAULT 0 | Tổng số lượt user đã Mở / Click xem chi tiết tài liệu. Hệ thống đếm cơ học realtime mỗi khi load. |
| downloads_count| int(11) | DEFAULT 0 | Tổng số lượng khách đã nhấp tải thành công tài liệu về máy cứng. Giải thuật đo đếm xếp hạng tài liệu HOT. |
| favorites_count| int(11) | DEFAULT 0 | Số lượt người dùng bấm thả tim, nhằm lưu và theo dõi bài viết vào hộp Bookmark cá nhân (Personal Library). |
| avg_rating | decimal(3,2) | DEFAULT 0.00 | Điểm sao đánh giá chất lượng học thuật trung bình. Biến động từ 0.00 (Chưa nhận xét) đến mốc 5.00 phân mảnh. |
| review_count | int(11) | DEFAULT 0 | Đếm hệ thống tay thủ công số lượng comment từ các con người đọc thật đã viết phản hồi tại trang tài liệu này. |
| status | enum('draft','published','archived','removed') | DEFAULT 'draft' | Trạng thái luân chuyển biên tập duyệt văn bản: Bản nháp (draft), công khai (published), lưu kho (archived), gỡ bỏ (removed). |
| is_featured | tinyint(1) | DEFAULT 0 | Công tắc cờ Boolean (0,1). Cài đặt về 1 cho tài liệu siêu xuất sắc để vinh danh trên Băng chuyền trung tâm Top trang chủ. |
| created_at | timestamp | NOT NULL, DEFAULT current_timestamp() | Bản TimeStamp mốc thời gian hệ thống nhận thêm tài liệu đầu tiên. Giúp sắp xếp tính 'Mới nhất' của tài liệu. |
| updated_at | timestamp | NOT NULL, DEFAULT current_timestamp() ON UPDATE current_timestamp() | Con dấu Auto theo dõi chỉnh sửa DB. Chỉ cần 1 thuộc tính trên thay đổi, cơ sở dữ liệu sẽ cập nhật thời gian lại ở đây. |

### 8.4. Bảng `document_reviews` (Lưu đánh giá tài liệu)

| Thuộc Tính | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| id | int(11) | Khóa chính, Tự tăng, NOT NULL | Mã ID chuyên biệt cho lời nhận xét |
| document_id | int(11) | Khóa ngoại (documents.id), UNIQUE (với user_id), NOT NULL | Tài liệu tiếp nhận review |
| user_id | int(11) | Khóa ngoại (users.id), UNIQUE (với document_id), NOT NULL | ID của người dùng viết ra bình luận này |
| rating | tinyint(3) UNSIGNED | NOT NULL | Thang điểm từ 1 đến 5 |
| comment | text | DEFAULT NULL | Nội dung chia sẻ cảm nghĩ / bình luận |
| helpful_count | int(11) | DEFAULT 0 | Số lượt người khác vote "Hữu ích" cho bình luận |
| unhelpful_count| int(11) | DEFAULT 0 | Số lượt người khác vote "Không hữu ích" |
| created_at | timestamp | NOT NULL, DEFAULT current_timestamp() | Thời gian bắt đầu viết đánh giá |
| updated_at | timestamp | NOT NULL, DEFAULT current_timestamp() ON UPDATE current_timestamp() | Cuối cùng người dùng sửa đánh giá khi nào |

### 8.5. Bảng `document_summaries` (Tóm tắt tài liệu qua AI)

| Thuộc Tính | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| id | int(11) | Khóa chính, Tự tăng, NOT NULL | ID bản ghi tóm tắt |
| user_id | int(11) | Khóa ngoại (users.id), NOT NULL | Người thực hiện tóm tắt (để quản lý lịch sử cá nhân) |
| document_id | int(11) | Khóa ngoại (documents.id), NULL | Liên kết tới file trong hệ thống (nếu có) |
| document_name | varchar(255) | NOT NULL | Tên tệp tin gốc để hiển thị nhanh trên UI |
| summary_text | longtext | NOT NULL | Nội dung chữ tổng hợp từ AI |
| summary_type | enum('paragraph','bullets') | DEFAULT 'paragraph' | Kiểu hiển thị kết quả (đoạn văn/gạch đầu dòng) |
| ai_model | varchar(100) | DEFAULT NULL | Phiên bản AI sinh ra kết quả |
| created_at | timestamp | NOT NULL, DEFAULT current_timestamp() | Thời điểm ghi nhận vào hệ thống |

### 8.6. Bảng `chatbot_history` (Dữ liệu hội thoại AI)

| Thuộc Tính | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| id | int(11) | Khóa chính, Tự tăng, NOT NULL | ID cho phiên/dòng hội thoại |
| user_id | int(11) | Khóa ngoại (users.id), NOT NULL | Nhận diện cuộc hội thoại của ai |
| document_id | int(11) | Khóa ngoại (documents.id), DEFAULT NULL | Sinh viên đang hỏi về tài liệu cụ thể nào (có thể rỗng) |
| question | text | NOT NULL | Câu hỏi sinh viên đưa ra cho AI |
| answer | longtext | NOT NULL | Lời giải trích xuất do Bot trả lời |
| ai_model | varchar(100) | DEFAULT NULL | Phiên bản AI xử lý giải đáp |
| created_at | timestamp | NOT NULL, DEFAULT current_timestamp() | Lưu giữ thời gian vấn đáp |

### 8.7. Cơ sở dữ liệu Vector (Pinecone Database)

Hệ thống **không** lưu trữ vector nhúng (embeddings) và các mảnh văn bản (chunks) trong MySQL. Để tối ưu hóa hiệu suất tìm kiếm ngữ nghĩa (Semantic Search) cho Chatbot RAG, dữ liệu được lưu trữ trên dịch vụ **Pinecone Vector Database**.

**Cấu trúc lưu trữ mỗi Vector (Record) trên Pinecone:**

| Thuộc Tính | Kiểu Dữ Liệu | Mô Tả |
| :--- | :--- | :--- |
| **id** | String | Mã định danh riêng cho mỗi mảnh văn bản (VD: `doc_12_chunk_1`) |
| **values** | Float Array | Mảng số thực đa chiều (Vector) sinh từ Embedding Model để tính toán khoảng cách (Cosine Similarity) |
| **metadata** | JSON Object | Các thông tin đi kèm để lọc (Filter) và làm ngữ cảnh, bao gồm:<br>- `content` (String): Đoạn văn bản chữ thuần để ghép vào prompt cho LLM.<br>- `document_id` (Number): Liên kết với ID tài liệu gốc trong MySQL.<br>- `subject_id` (Number): ID môn học của tài liệu để bộ lọc AI lọc theo ngữ cảnh môn học.<br>- `title` (String): Tên tài liệu hiển thị phần gợi ý nguồn.<br>- `download_url` (String): Link tải trực tiếp file PDF để trỏ nguồn.<br>- `drive_file_id` (String): ID của file trên Google Drive (nếu có). |
