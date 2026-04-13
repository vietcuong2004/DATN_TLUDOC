# Hướng Dẫn Thiết Lập CSDL (phpMyAdmin + MySQL/MariaDB + Google Drive)

Tài liệu này dùng đúng theo hệ thống bạn đang có:
- phpMyAdmin để quản lý MySQL/MariaDB
- Google Drive để lưu file PDF, DOCX, PPTX
- Thư mục môn học theo đúng tên folder trên máy

---

## 1) Tạo database trong phpMyAdmin

1. Mở phpMyAdmin.
2. Bấm tab Cơ sở dữ liệu.
3. Tạo database mới:
   - Tên: tlu_document
   - Collation: utf8mb4_unicode_ci
4. Bấm Tạo.

---

## 2) Tạo bảng dữ liệu

1. Vào tab SQL.
2. Copy toàn bộ script trong file CoSoDuLieu.md, mục Schema SQL.
3. Bấm Thực hiện.

Sau khi chạy xong sẽ có các bảng:
- users
- subjects
- documents
- document_reviews
- document_summaries
- chatbot_history

---

## 3) Thêm tài khoản quản trị mặc định

Chạy SQL:

```sql
USE tlu_document;

INSERT INTO users (email, password_hash, full_name, role, status)
VALUES ('admin@tlu.edu.vn', 'hashed_password_demo', 'Quản trị viên', 'admin', 'active')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
```

---

## 4) Seed đầy đủ môn học theo đúng thư mục bạn đang có

Bạn gửi danh sách folder môn học như sau:
- CAU_TRUC_DU_LIEU_VA_GIAI_THUAT
- CO_SO_DU_LIEU
- DAI_SO_TUYEN_TINH
- GIAI_TICH_HAM_MOT_BIEN
- GIAI_TICH_HAM_NHIEU_BIEN
- KY_NANG_MEM_VA_TINH_THAN_KHOI_NGHIEP
- LAP_TRINH_NANG_CAO
- LAP_TRINH_PYTHON
- LINUX_VA_PHAN_MEM_MA_NGUON_MO
- NHAP_MON_LAP_TRINH
- PHAN_TICH_THIET_KE_HE_THONG_THONG_TIN
- TOAN_ROI_RAC
- TRI_TUE_NHAN_TAO

Chạy SQL seed:

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

## 5) Chuẩn hóa cấu trúc Google Drive theo môn học

Bạn cần tạo trên Google Drive đúng các folder như đã seed ở trên.

Quy tắc:
- Folder local trên máy = folder trên Drive = subjects.folder_key
- Mỗi file phải nằm đúng folder môn học tương ứng

Ví dụ:
- Folder: CAU_TRUC_DU_LIEU_VA_GIAI_THUAT
- File: DeCuong_OnThi.pdf
- Đường dẫn logic: CAU_TRUC_DU_LIEU_VA_GIAI_THUAT/DeCuong_OnThi.pdf

---

## 6) Lấy link và file id từ Google Drive

1. Chuột phải file, chọn Share.
2. Chọn Anyone with the link.
3. Quyền Viewer.
4. Copy link.

Ví dụ:
- Link gốc: https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing
- File id: 1AbCdEfGhIjKlMnOpQrStUvWxYz
- Preview URL: https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/preview
- Download URL: https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvWxYz

---

## 7) Insert metadata tài liệu vào MySQL

Ví dụ insert một tài liệu cho môn Cấu trúc dữ liệu và giải thuật:

```sql
USE tlu_document;

INSERT INTO documents (
  title,
  description,
  subject_id,
  uploader_id,
  doc_type,
  storage_provider,
  drive_folder_key,
  drive_file_id,
  file_name,
  file_ext,
  file_url,
  preview_url,
  download_url,
  status,
  is_featured
)
VALUES (
  'Đề cương ôn tập CTDL',
  'Tài liệu tổng hợp nội dung ôn tập',
  (SELECT id FROM subjects WHERE folder_key = 'CAU_TRUC_DU_LIEU_VA_GIAI_THUAT' LIMIT 1),
  (SELECT id FROM users WHERE email = 'admin@tlu.edu.vn' LIMIT 1),
  'lecture',
  'gdrive',
  'CAU_TRUC_DU_LIEU_VA_GIAI_THUAT',
  '1AbCdEfGhIjKlMnOpQrStUvWxYz',
  'DeCuong_OnThi.pdf',
  'pdf',
  'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing',
  'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/preview',
  'https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvWxYz',
  'published',
  1
);
```

---

## 8) Kiểm tra dữ liệu

```sql
SELECT
  d.id,
  d.title,
  s.code AS subject_code,
  s.name AS subject_name,
  s.folder_key,
  d.file_name,
  d.drive_file_id,
  d.file_url,
  d.preview_url,
  d.download_url,
  d.status,
  d.created_at
FROM documents d
JOIN subjects s ON s.id = d.subject_id
ORDER BY d.created_at DESC;
```

Nếu có dữ liệu trả về là bạn đã cấu hình thành công.

---

## 9) Frontend sử dụng như thế nào

- Sidebar môn học: lấy từ bảng subjects
- Danh sách tài liệu: lấy từ documents với status = published
- Nút Xem: mở preview_url
- Nút Tải: mở download_url

---

## 10) Lỗi thường gặp

1. Không insert được documents do foreign key
- Kiểm tra subject_id và uploader_id đã tồn tại chưa

2. Link Drive bị từ chối truy cập
- Kiểm tra đã bật Anyone with the link và Viewer chưa

3. Lỗi font tiếng Việt
- Đảm bảo database và bảng dùng utf8mb4_unicode_ci

4. Link tải không hoạt động
- Kiểm tra lại drive_file_id có đúng không

---

## 11) Checklist triển khai nhanh

1. Tạo database tlu_document
2. Chạy schema SQL
3. Tạo user admin
4. Chạy seed subjects đầy đủ 13 môn
5. Tạo folder tương ứng trên Google Drive
6. Upload file vào đúng folder môn
7. Lấy file id và lưu metadata vào documents
8. Query kiểm tra

Làm xong 8 bước trên là hệ thống chạy đúng theo mô hình phpMyAdmin + MySQL/MariaDB + Google Drive.

---

## 12) Nhập hàng loạt từ Google Drive bằng script

Nếu bạn đã có sẵn đủ tài liệu trong từng folder Drive, bạn không cần insert thủ công từng file nữa. Hệ thống đã có script để quét toàn bộ thư mục gốc và tự thêm từng file vào bảng `documents`.

### 12.1. Script sẽ làm gì

Script sẽ:
1. Mở thư mục gốc Google Drive bạn cung cấp.
2. Duyệt từng folder con theo đúng tên môn học.
3. Lấy toàn bộ file bên trong từng folder.
4. Tự map folder đó vào `subjects.folder_key`.
5. Tự insert từng file vào bảng `documents`.
6. Tự tạo `preview_url` và `download_url`.
7. Bỏ qua file đã tồn tại để tránh import trùng.

### 12.2. Folder gốc của bạn

Folder gốc bạn đang dùng là:

`1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s`

### 12.3. Cách chạy nhanh

1. Đảm bảo file `.env.local` có các biến:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tlu_document
GOOGLE_DRIVE_ROOT_FOLDER_ID=1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s
GOOGLE_DRIVE_API_KEY=...
DOCUMENT_UPLOADER_EMAIL=admin@tlu.edu.vn
```

2. Chạy thử chế độ xem trước:

```bash
pnpm import:drive:dry
```

3. Nếu danh sách đúng, chạy import thật:

```bash
pnpm import:drive
```

### 12.4. Ghi chú về quyền truy cập

- Nếu folder Drive của bạn đang mở công khai, `GOOGLE_DRIVE_API_KEY` có thể đủ.
- Nếu Drive trả lỗi quyền truy cập, hãy dùng `GOOGLE_DRIVE_ACCESS_TOKEN` thay thế hoặc cấp quyền phù hợp cho tài khoản/service account.
- Nếu MySQL của bạn không đặt mật khẩu cho `root`, để trống `DB_PASSWORD=` là đúng.

### 12.5. Quy tắc map folder

Script chỉ import file trong các folder có tên trùng với `subjects.folder_key`.

Ví dụ:
- `CAU_TRUC_DU_LIEU_VA_GIAI_THUAT` -> môn Cấu trúc dữ liệu và giải thuật
- `CO_SO_DU_LIEU` -> môn Cơ sở dữ liệu

Nếu folder nào chưa được seed trong database, script sẽ bỏ qua folder đó và không làm hỏng dữ liệu.
