# Tài Liệu Thiết Kế Cơ Sở Dữ Liệu (MySQL/MariaDB + Google Drive)
## Dự án TLU Document

Phiên bản: 4.1  
Ngày cập nhật: 03/04/2026

---

## 1. Tổng quan

Kiến trúc áp dụng theo môi trường thực tế của bạn:
- MySQL/MariaDB (quản trị bằng phpMyAdmin) lưu dữ liệu hệ thống và metadata tài liệu
- Google Drive lưu file thật (PDF, DOCX, PPTX)
- Mỗi môn học được map với một `folder_key`, trùng với tên thư mục trên máy và trên Drive

Mô hình này phù hợp vì:
- Bạn đã có sẵn XAMPP/phpMyAdmin
- Tổng dung lượng tài liệu lớn (khoảng 10GB), không nên lưu file gốc trong database

---

## 2. Danh sách bảng

1. `users`
2. `subjects`
3. `documents`
4. `document_reviews`
5. `document_summaries`
6. `chatbot_history`

---

## 3. Quy ước thư mục môn học (13 môn)

Danh sách `folder_key` đang dùng:
- `CAU_TRUC_DU_LIEU_VA_GIAI_THUAT`
- `CO_SO_DU_LIEU`
- `DAI_SO_TUYEN_TINH`
- `GIAI_TICH_HAM_MOT_BIEN`
- `GIAI_TICH_HAM_NHIEU_BIEN`
- `KY_NANG_MEM_VA_TINH_THAN_KHOI_NGHIEP`
- `LAP_TRINH_NANG_CAO`
- `LAP_TRINH_PYTHON`
- `LINUX_VA_PHAN_MEM_MA_NGUON_MO`
- `NHAP_MON_LAP_TRINH`
- `PHAN_TICH_THIET_KE_HE_THONG_THONG_TIN`
- `TOAN_ROI_RAC`
- `TRI_TUE_NHAN_TAO`

Quy tắc bắt buộc:
- Folder local trên máy = folder trên Google Drive = `subjects.folder_key`

---

## 4. Schema SQL (MySQL/MariaDB)

```sql
CREATE DATABASE IF NOT EXISTS tlu_document
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tlu_document;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  student_id VARCHAR(50) UNIQUE,
  department VARCHAR(100),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  folder_key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  group_name VARCHAR(100),
  semester VARCHAR(20),
  is_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subjects_group (group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  subject_id INT NOT NULL,
  uploader_id INT NOT NULL,

  doc_type ENUM('exam', 'lecture', 'slides', 'assignment', 'research', 'other') DEFAULT 'other',

  storage_provider ENUM('gdrive', 'other') DEFAULT 'gdrive',
  drive_folder_key VARCHAR(100) NOT NULL,
  drive_file_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(255),
  file_ext VARCHAR(20),
  file_mime_type VARCHAR(100),
  file_size_bytes BIGINT,
  file_url VARCHAR(1000),
  preview_url VARCHAR(1000),
  download_url VARCHAR(1000),

  views_count INT DEFAULT 0,
  downloads_count INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,

  status ENUM('draft', 'published', 'archived', 'removed') DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_documents_subject (subject_id),
  INDEX idx_documents_uploader (uploader_id),
  INDEX idx_documents_status (status),
  INDEX idx_documents_created_at (created_at),
  INDEX idx_documents_drive_folder_key (drive_folder_key),
  FULLTEXT INDEX ft_documents_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT,
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_document_user_review (document_id, user_id),

  INDEX idx_reviews_document (document_id),
  INDEX idx_reviews_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_summaries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL UNIQUE,
  summary_text LONGTEXT NOT NULL,
  summary_type ENUM('short', 'medium', 'long') DEFAULT 'medium',
  ai_model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_summaries_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  document_id INT NULL,
  question TEXT NOT NULL,
  answer LONGTEXT NOT NULL,
  ai_model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,

  INDEX idx_chat_user (user_id),
  INDEX idx_chat_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. SQL seed subjects theo quy ước 13 môn

```sql
USE tlu_document;

INSERT INTO subjects (code, name, folder_key, group_name, is_required)
VALUES
('CSE281', 'Cấu trúc dữ liệu và giải thuật', 'CAU_TRUC_DU_LIEU_VA_GIAI_THUAT', 'Kiến thức cơ sở khối ngành', 1),
('CSE484', 'Cơ sở dữ liệu', 'CO_SO_DU_LIEU', 'Kiến thức cơ sở khối ngành', 1),
('MATH333', 'Đại số tuyến tính', 'DAI_SO_TUYEN_TINH', 'Khoa học tự nhiên và tin học', 1),
('MATH111', 'Giải tích hàm một biến', 'GIAI_TICH_HAM_MOT_BIEN', 'Khoa học tự nhiên và tin học', 1),
('MATH122', 'Giải tích hàm nhiều biến', 'GIAI_TICH_HAM_NHIEU_BIEN', 'Khoa học tự nhiên và tin học', 1),
('SSE111', 'Kỹ năng mềm và tinh thần khởi nghiệp', 'KY_NANG_MEM_VA_TINH_THAN_KHOI_NGHIEP', 'Kỹ năng', 1),
('CSE205', 'Lập trình nâng cao', 'LAP_TRINH_NANG_CAO', 'Kiến thức cơ sở khối ngành', 1),
('CSE204', 'Lập trình Python', 'LAP_TRINH_PYTHON', 'Kiến thức cơ sở khối ngành', 1),
('CSE311', 'Linux và phần mềm mã nguồn mở', 'LINUX_VA_PHAN_MEM_MA_NGUON_MO', 'Kiến thức cơ sở khối ngành', 1),
('CSE111', 'Nhập môn lập trình', 'NHAP_MON_LAP_TRINH', 'Khoa học tự nhiên và tin học', 1),
('CSE480', 'Phân tích và thiết kế hệ thống thông tin', 'PHAN_TICH_THIET_KE_HE_THONG_THONG_TIN', 'Kiến thức cơ sở khối ngành', 1),
('CSE213', 'Toán rời rạc', 'TOAN_ROI_RAC', 'Kiến thức cơ sở khối ngành', 1),
('CSE492', 'Trí tuệ nhân tạo', 'TRI_TUE_NHAN_TAO', 'Kiến thức cơ sở khối ngành', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  folder_key = VALUES(folder_key),
  group_name = VALUES(group_name),
  is_required = VALUES(is_required);
```

---

## 6. Quy trình nghiệp vụ

1. Tạo môn học trong `subjects` và gán `folder_key`
2. Tạo folder cùng tên trên Google Drive
3. Upload file vào đúng folder môn học
4. Lấy `drive_file_id` từ link Drive
5. Insert metadata vào `documents`
6. Frontend đọc `documents` (`status = 'published'`) để hiển thị

---

## 7. Các trường metadata bắt buộc cho `documents`

- `subject_id`
- `uploader_id`
- `drive_folder_key`
- `drive_file_id`
- `file_name`
- `file_ext`
- `file_url`
- `preview_url`
- `download_url`
- `status`

---

## 8. Ghi chú

- Không lưu nội dung file gốc vào MySQL
- MySQL chỉ lưu metadata và chỉ số thống kê
- Nếu đổi storage provider trong tương lai, vẫn giữ được logic bảng `users` / `subjects` / `documents`
