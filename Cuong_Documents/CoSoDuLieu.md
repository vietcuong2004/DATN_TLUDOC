# Tài Liệu Thiết Kế Cơ Sở Dữ Liệu MySQL
## Nền Tảng Chia Sẻ Tài Liệu Học Tập - TLU Document

**Phiên bản:** 1.0  
**Ngày cập nhật:** 02/04/2026  
**Tác giả:** Vương Việt Cường

---

## Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Danh Sách Các Bảng](#danh-sách-các-bảng)
3. [Sơ Đồ Quan Hệ](#sơ-đồ-quan-hệ)
4. [Chi Tiết Các Bảng](#chi-tiết-các-bảng)
5. [Ràng Buộc và Chỉ Mục](#ràng-buộc-và-chỉ-mục)

---

## Tổng Quan

### Mục Đích
Cơ sở dữ liệu được thiết kế cho **DEMO** nên được đơn giản hóa tối đa, bao gồm:
- Quản lý người dùng (sinh viên, giáo viên, admin)
- Lưu trữ tài liệu (PDF, Word, PowerPoint)
- Xử lý các tính năng AI cơ bản (tóm tắt, chatbot) on-demand
- Quản lý đánh giá của người dùng
- **KHÔNG:** Lưu trữ lịch sử hoạt động, mindmap/quiz lâu dài, yêu thích

### Công Nghệ Sử Dụng
- **Database:** MySQL 8.0+
- **Encoding:** UTF8MB4 (hỗ trợ tiếng Việt đầy đủ)
- **Engine:** InnoDB (hỗ trợ transaction và foreign key)

---

## Danh Sách Các Bảng

| STT | Tên Bảng | Mô Tả |
|-----|----------|-------|
| 1 | `users` | Thông tin người dùng hệ thống |
| 2 | `subjects` | Danh sách môn học |
| 3 | `documents` | Thông tin tài liệu trong hệ thống |
| 4 | `document_reviews` | Đánh giá và nhận xét về tài liệu |
| 5 | `document_summaries` | Tóm tắt tài liệu được tạo bởi AI (lưu tạm thời) |
| 6 | `chatbot_history` | Lịch sử chat với AI tutor (demo purposes) |

---

## Sơ Đồ Quan Hệ

```
users (1) ──┬─── (N) documents (tài liệu được tải lên)
            ├─── (N) document_reviews (đánh giá)
            └─── (N) chatbot_history (lịch sử chat)

subjects (1) ──── (N) documents (tài liệu của môn)

documents (1) ──┬─── (N) document_reviews (đánh giá)
                └─── (1) document_summaries (tóm tắt AI)
```

---

## Chi Tiết Các Bảng

### 1. Bảng `users`
**Mô tả:** Lưu trữ thông tin người dùng của hệ thống

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  student_id VARCHAR(50) UNIQUE COMMENT 'Mã sinh viên',
  department VARCHAR(100) COMMENT 'Khoa/Chuyên ngành',
  bio TEXT COMMENT 'Tiểu sử người dùng',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông tin người dùng';
```

**Chi tiết cột:**
- `id`: Định danh duy nhất
- `email`: Email đăng nhập (duy nhất)
- `password_hash`: Hash password (bcrypt hoặc argon2)
- `full_name`: Tên đầy đủ
- `role`: Vai trò (sinh viên/giáo viên/admin)
- `status`: Trạng thái tài khoản
- `student_id`: Mã sinh viên
- `department`: Khoa/Chuyên ngành

---

### 2. Bảng `subjects`
**Mô tả:** Lưu trữ danh sách các môn học/khóa học mà hệ thống cung cấp. Mỗi tài liệu được gán vào một môn học cụ thể để giúp người dùng lọc và tìm kiếm.

```sql
CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã môn học (VD: MATH111)',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_name VARCHAR(100) COMMENT 'Nhóm môn (VD: Khoa học tự nhiên và tin học)',
  semester VARCHAR(20),
  is_required BOOLEAN DEFAULT FALSE COMMENT 'Bắt buộc hay tự chọn',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_group (group_name)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh sách môn học';
```

**Chi tiết cột:**
- `id`: Định danh duy nhất của môn học, tự động tăng
- `code`: Mã môn học duy nhất (VD: MATH111, PHY201). Dùng để nhận dạng môn học trong URL và API
- `name`: Tên đầy đủ của môn học (VD: "Toán Giải Tích 1", "Vật Lý Cơ Bản")
- `description`: Mô tả chi tiết về nội dung và mục tiêu của môn học
- `group_name`: Nhóm phân loại môn học (VD: "Khoa học tự nhiên", "Kỹ thuật", "Khoa học xã hội"). Dùng để tổ chức sidebar
- `semester`: Học kỳ hoặc niên học mà môn được dạy (VD: "2024-2025 Học kỳ 1", "HK2-2024")
- `is_required`: Boolean chỉ định môn bắt buộc hay tự chọn. Ảnh hưởng tới cách hiển thị trên sidebar
- `created_at`: Thời điểm tạo bản ghi (tự động gán)
- `updated_at`: Thời điểm cập nhật cuối cùng (tự động cập nhật khi có thay đổi)

---

### 3. Bảng `documents`
**Mô tả:** Lưu trữ thông tin chính của mỗi tài liệu trong hệ thống. Đây là bảng core - chứa metadata, thống kê views/downloads/ratings, và trạng thái công bố của tài liệu.

```sql
CREATE TABLE documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  subject_id INT NOT NULL,
  uploader_id INT NOT NULL,
  
  COMMENT 'Thông tin tài liệu',
  doc_type ENUM('exam', 'lecture', 'slides', 'assignment', 'research', 'other') 
    DEFAULT 'other' COMMENT '
Thu loại tài liệu',
  
  COMMENT 'Thống kê',
  views_count INT DEFAULT 0,
  downloads_count INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0 COMMENT 'Đánh giá trung bình (0-5)',
  review_count INT DEFAULT 0,
  
  COMMENT 'Trạng thái',
  status ENUM('draft', 'published', 'archived', 'removed') DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT FALSE COMMENT 'Tài liệu nổi bật',
  
  COMMENT 'Thời gian',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_subject (subject_id),
  INDEX idx_uploader (uploader_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_views (views_count),
  INDEX idx_rating (avg_rating),
  FULLTEXT INDEX ft_search (title, description)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông tin tài liệu chính';
```

**Chi tiết cột:**
- `id`: Định danh duy nhất, tự động tăng
- `title`: Tiêu đề tài liệu (VD: "Ôn thi Toán Giải Tích - Kỳ 1"). Dùng cho hiển thị và tìm kiếm
- `description`: Mô tả chi tiết nội dung tài liệu (VD: "Bao gồm đạo hàm, tích phân, giới hạn"). Hỗ trợ tìm kiếm fulltext
- `subject_id`: Khóa ngoài tới bảng subjects. Xác định tài liệu thuộc môn nào
- `uploader_id`: Khóa ngoài tới bảng users. Người tải lên tài liệu (người có quyền chỉnh sửa/xóa)
- `doc_type`: Phân loại loại tài liệu (exam=đề thi, lecture=bài giảng, slides=slide, assignment=bài tập, research=nghiên cứu). Dùng cho lọc
- `views_count`: Số lần tài liệu được xem. Cập nhật mỗi khi user mở tài liệu. Dùng cho sắp xếp "phổ biến nhất"
- `downloads_count`: Số lần tài liệu được tải xuống. Dùng cho sắp xếp và thống kê
- `favorites_count`: Không dùng (demo không có yêu thích)
- `avg_rating`: Đánh giá trung bình (0.00-5.00). Tính từ document_reviews. Dùng cho sắp xếp "đánh giá cao nhất"
- `review_count`: Tổng số đánh giá nhận được. Dùng để tính average rating
- `status`: Trạng thái công bố (draft=chờ duyệt, published=công bố, archived=lưu trữ, removed=xóa). Chỉ published mới hiển thị cho user
- `is_featured`: Boolean chỉ tài liệu nổi bật. Nếu true thì hiển thị trên section "Tài liệu nổi bật" ở trang chủ
- `created_at`: Thời điểm tạo bản ghi (auto)
- `updated_at`: Thời điểm cập nhật cuối cùng (auto)

---

### 4. Bảng `document_reviews`
**Mô tả:** Lưu trữ tất cả đánh giá (rating) và nhận xét (comment) của người dùng về tài liệu. Mỗi người dùng chỉ có thể đánh giá một tài liệu một lần. Dữ liệu này dùng để tính average rating cho bảng documents.

```sql
CREATE TABLE document_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL COMMENT 'Đánh giá 1-5 sao',
  comment TEXT,
  helpful_count INT DEFAULT 0 COMMENT 'Số người thấy hữu ích',
  unhelpful_count INT DEFAULT 0 COMMENT 'Số người thấy không hữu ích',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_document (document_id),
  INDEX idx_user (user_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at),
  UNIQUE KEY uk_unique_review (document_id, user_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đánh giá tài liệu';
```

**Chi tiết cột:**
- `id`: Định danh duy nhất của mỗi đánh giá, tự động tăng
- `document_id`: Khóa ngoài tới bảng documents. Xác định tài liệu nào được đánh giá
- `user_id`: Khóa ngoài tới bảng users. Người dùng nào đánh giá
- `rating`: Mức đánh giá từ 1-5 sao (INT để dễ tính toán). Dùng để tính avg_rating của documents
- `comment`: Nhận xét văn bản từ người dùng (VD: "Tài liệu rất hữu ích, giải thích rõ ràng"). Có thể NULL
- `helpful_count`: Số người bấm "Hữu ích" cho đánh giá này. Giúp xếp hạng đánh giá hữu ích nhất
- `unhelpful_count`: Số người bấm "Không hữu ích" cho đánh giá này
- `created_at`: Thời điểm tạo đánh giá (auto)
- `updated_at`: Thời điểm cập nhật đánh giá (auto)
- **UNIQUE KEY uk_unique_review:** Ràng buộc toàn vẹn - một người dùng chỉ được đánh giá một tài liệu một lần

---

### 5. Bảng `document_summaries`
**Mô tả:** Lưu trữ tóm tắt của tài liệu được tạo bởi AI. Được tạo on-demand khi user yêu cầu, lưu tạm thời để tránh tạo lại. Có thể xóa sau khi user tải xuống hoặc định kỳ cleanup dữ liệu cũ.

```sql
CREATE TABLE document_summaries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL UNIQUE,
  summary_text LONGTEXT NOT NULL COMMENT 'Nội dung tóm tắt',
  summary_type ENUM('short', 'medium', 'long') DEFAULT 'medium',
  ai_model VARCHAR(100) COMMENT 'Model AI được sử dụng',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  
  INDEX idx_document (document_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tóm tắt AI (lưu tạm)';
```

**Chi tiết cột:**
- `id`: Định danh duy nhất, tự động tăng
- `document_id`: Khóa ngoài tới bảng documents, UNIQUE. Mỗi tài liệu chỉ có một tóm tắt. Khi user request tóm tắt, nếu đã có thì lấy, nếu chưa có thì tạo mới
- `summary_text`: Nội dung tóm tắt dạng text (LONGTEXT để hỗ trợ các tài liệu dài). Đây là kết quả từ AI summarization
- `summary_type`: Loại tóm tắt (short=ngắn, medium=trung bình, long=dài). User có thể chọn độ dài tóm tắt mong muốn
- `ai_model`: Tên model AI được dùng để tạo tóm tắt (VD: "GPT-4", "Claude", "Gemini"). Dùng cho tracking/audit
- `created_at`: Thời điểm tóm tắt được tạo. Dùng cho cleanup khi xóa dữ liệu cũ
- **UNIQUE KEY:** Mỗi tài liệu chỉ có một bản tóm tắt trong database

### 6. Bảng `chatbot_history`
**Mô tả:** Lưu trữ lịch sử hội thoại giữa người dùng và AI Tutor. Mỗi Q&A pair được lưu với context (user, tài liệu liên quan, model AI, timestamp). Dùng cho demo và có thể xóa sau session.

```sql
CREATE TABLE chatbot_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  document_id INT COMMENT 'Tài liệu liên quan (có thể NULL)',
  question TEXT NOT NULL,
  answer LONGTEXT NOT NULL,
  ai_model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  
  INDEX idx_user (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử chat tutor (demo)';
```

**Chi tiết cột:**
- `id`: Định danh duy nhất cho mỗi message pair, tự động tăng
- `user_id`: Khóa ngoài tới bảng users. Người dùng nào hỏi câu hỏi
- `document_id`: Khóa ngoài tới bảng documents, có thể NULL. Nếu user hỏi dựa trên một tài liệu cụ thể thì lưu reference; nếu hỏi câu hỏi chung thì NULL
- `question`: Câu hỏi của user (TEXT). VD: "Khái niệm đạo hàm là gì?" hoặc "Làm thế nào để hiểu phần này tốt hơn?"
- `answer`: Câu trả lời từ AI (LONGTEXT). Có thể dài vì AI có thể giải thích chi tiết
- `ai_model`: Tên model AI tutor (VD: "Claude 3", "GPT-4 Turbo"). Dùng cho tracking mục đích demo
- `created_at`: Thời điểm user gửi câu hỏi. Dùng cho sắp xếp lịch sử theo thời gian

---

## Ràng Buộc và Chỉ Mục

### Ràng Buộc Toàn Vẹn (Integrity Constraints)

1. **Foreign Key Constraints**
   - `documents.subject_id` → `subjects.id`
   - `documents.uploader_id` → `users.id`
   - `document_reviews.document_id` → `documents.id`
   - `document_summaries.document_id` → `documents.id`
   - `chatbot_history.user_id` → `users.id`

2. **Unique Constraints**
   - `users.email` (duy nhất)
   - `users.student_id` (duy nhất)
   - `subjects.code` (mã môn duy nhất)
   - `document_reviews` (một người dùng chỉ đánh giá một tài liệu một lần)

### Chỉ Mục (Indexes)

**Phân Loại Chỉ Mục:**
- **Primary Key:** Mỗi bảng đều có
- **Foreign Key Indexes:** Để optimize JOIN queries
- **Search Indexes:** Fulltext index trên `documents(title, description)` cho tìm kiếm
- **Performance Indexes:** Trên các cột thường xuyên trong WHERE, ORDER BY

**Ví dụ Chỉ Mục Quan Trọng:**
```sql
-- Tìm kiếm nâng cao
CREATE FULLTEXT INDEX ft_doc_search ON documents(title, description);

-- Lấy tài liệu của một môn
CREATE INDEX idx_subject_status ON documents(subject_id, status);

-- Lịch sử tải của người dùng
CREATE INDEX idx_user_downloads ON user_downloads(user_id, created_at DESC);
```

---

## Quy Ước Dữ Liệu

### Quy Ước Đặt Tên
- Tên bảng: `snake_case`, số nhiều (VD: `users`, `documents`)
- Tên cột: `snake_case`, viết thường
- Khóa ngoài: đặt tên theo mẫu `{table}_{id}` (VD: `user_id`, `document_id`)
- Chỉ mục: `idx_{table}_{column}` hoặc `idx_{purpose}`

### Quy Ước Dữ Liệu
- **TIMESTAMP:** Lưu theo UTC, application layer định dạng theo múi giờ người dùng
- **Rating:** Scale 1-5, lưu dạng DECIMAL(3,2)
- **Kích thước file:** Lưu dạng BIGINT (bytes)
- **Mã code:** Uppercase (VD: `MATH111`)
- **URLs/Paths:** VARCHAR(500-1000) tuỳ loại
- **Passwords:** Hash bằng bcrypt hoặc Argon2, không lưu plaintext

### Quy Ước Business Logic
- Tài liệu mới upload mặc định `status = 'draft'` (chờ duyệt)
- Admin có thể thay đổi thành `status = 'published'` (công bố)
- Người dùng có thể xóa đánh giá của mình, nhưng không thể chỉnh sửa
- **Mindmap & Quiz:** Được tạo on-demand, người dùng tải xuống sau đó xóa cache (không lưu lâu dài)
- **Tóm tắt:** Lưu tạm thời trong database, có thể xóa sau khi demo

---

## Hiệu Năng và Tối Ưu Hóa

### Gợi Ý Tối Ưu Hóa

1. **Caching Layer (Khuyến Nghị cho Production)**
   - Cache danh sách môn học (subjects) - thay đổi ít
   - Cache top 10 tài liệu của mỗi môn

2. **Connection Pooling**
   - Sử dụng connection pool (HikariCP, Druid) để quản lý conn

---

## Bảo Mật Dữ Liệu

1. **Mã Hóa**
   - Password: bcrypt với salt (cost ≥ 12)
   - Personal data: mã hóa ở application layer nếu cần

2. **Access Control**
   - Implement row-level security
   - Người dùng chỉ xem được AI output `is_approved = TRUE`

3. **Audit Trail**
   - Lưu audit_logs cho mọi thay đổi quan trọng
   - Định kỳ review audit logs

4. **Backup & Recovery**
   - Backup hàng ngày, lưu trữ offline
   - Regular recovery drills

---

## Tương Lai và Mở Rộng

1. **Recommendation System**
   - Thêm bảng lưu trữ recommendations khi nâng cấp

2. **Collaboration Features**
   - Thêm `shared_documents` và `document_comments` trong tương lai

3. **Gamification**
   - Thêm `user_achievements`, `user_badges` khi expand

---

## Phiên Bản & Thay Đổi

### v1.0 (02/04/2026) - DEMO Version
- Initial database design - SIMPLIFIED
- 6 tables (simplified from 14)
- Support cho PDF, Word, PowerPoint (lưu trữ đơn giản)
- AI features: summarization (lưu tạm thời), chatbot
- User engagement: reviews chỉ, không lưu history và favorites
- **Focus:** Minimal viable schema cho demo

---

**Tài liệu này được cập nhật thường xuyên. Liên hệ Development Team để đề xuất thay đổi.**
