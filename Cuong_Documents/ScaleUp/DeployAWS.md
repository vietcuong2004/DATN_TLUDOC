# Hướng Dẫn Deploy Vercel + Amazon RDS MySQL (Cho Người Mới)

Tài liệu này hướng dẫn từng bước rất chi tiết để bạn:

1. Tạo MySQL trên Amazon RDS.
2. Đưa dữ liệu lên RDS.
3. Cấu hình Vercel để web Next.js kết nối RDS.
4. Kiểm tra web đã chạy dữ liệu thật.

Mục tiêu: làm xong là web deploy trên Vercel không còn phụ thuộc Railway.

---

## 0) Bạn cần chuẩn bị gì

Bạn cần có sẵn:

1. Tài khoản AWS.
2. Tài khoản Vercel (đã liên kết với GitHub repo).
3. Dự án đã đẩy lên GitHub.
4. File SQL backup (nếu đã có data local).

Lưu ý về free tier:

1. Chính sách miễn phí của AWS có thể thay đổi theo thời gian/tài khoản.
2. Trước khi tạo RDS, hãy xem trang billing/free tier trong AWS Console.

---

## 1) Kiểm tra nhanh project của bạn có cần sửa code nhiều không

Project hiện tại đang dùng các env sau để kết nối MySQL:

1. DB_HOST
2. DB_PORT
3. DB_USER
4. DB_PASSWORD
5. DB_NAME

Vì vậy, thường bạn KHÔNG cần viết lại logic query. Thường chỉ đổi env là đủ.

---

## 2) Tạo database MySQL trên Amazon RDS

Vào AWS Console -> tìm "RDS" -> nhấn "Create database".

### Bước 2.1: Chọn engine

1. Engine type: MySQL
2. Version: giữ mặc định ổn định (8.x)

### Bước 2.2: Chọn template

1. Chọn Free tier nếu account của bạn cho phép.

### Bước 2.3: Đặt tên và tài khoản DB

1. DB instance identifier: ví dụ `tlu-doc-mysql`
2. Master username: ví dụ `admin`
3. Master password: đặt mật khẩu mạnh và lưu lại

### Bước 2.4: Cấu hình compute/storage

1. DB instance class: để mặc định free tier
2. Storage: để mặc định free tier

### Bước 2.5: Connectivity (rất quan trọng)

1. Public access: `Yes` (để Vercel có thể kết nối)
2. VPC security group: tạo mới hoặc dùng group có sẵn
3. Database port: `3306`

### Bước 2.6: Additional configuration

1. Initial database name: ví dụ `tlu_document`
2. Giữ các mục còn lại mặc định cho người mới

Nhấn "Create database" và chờ đến khi status = `Available`.

---

## 3) Mở Security Group để kết nối được

Vào RDS instance -> tab Connectivity & security -> bấm vào Security Group.

Tại Security Group, vào Inbound rules -> Add rule:

1. Type: MySQL/Aurora
2. Port: 3306
3. Source: tạm thời có thể dùng `0.0.0.0/0` để test nhanh

Cảnh báo bảo mật:

1. `0.0.0.0/0` là để test nhanh cho người mới, không nên dùng lâu dài.
2. Sau khi chạy ổn, nên giới hạn source chặt hơn nếu có thể.

---

## 4) Lấy thông tin kết nối RDS

Trong trang chi tiết RDS, lấy:

1. Endpoint (ví dụ: `xxxx.ap-southeast-1.rds.amazonaws.com`)
2. Port (thường 3306)
3. Username (master username)
4. Password (bạn đã đặt ở bước tạo)
5. Database name (initial database name)

Bạn sẽ dùng 5 thông tin này cho Vercel.

---

## 5) Đưa schema + data lên RDS

Bạn có 2 cách: GUI (dễ hơn) hoặc command line.

### Cách A (dễ nhất): Dùng MySQL Workbench hoặc DBeaver

1. Tạo connection mới tới endpoint RDS.
2. Test connection.
3. Mở file SQL backup.
4. Chạy import/execute.
5. Kiểm tra các bảng đã có dữ liệu.

### Cách B: Dùng terminal mysql

Nếu máy bạn đã cài mysql client, chạy:

```bash
mysql -h <RDS_ENDPOINT> -P 3306 -u <DB_USER> -p <DB_NAME> < backup.sql
```

Nhập password khi được hỏi.

### Kiểm tra dữ liệu đã lên chưa

Chạy các lệnh SQL:

```sql
SELECT COUNT(*) AS total_subjects FROM subjects;
SELECT COUNT(*) AS total_documents FROM documents;
SELECT COUNT(*) AS total_users FROM users;
```

Điều kiện đạt:

1. subjects > 0
2. documents > 0
3. users > 0

---

## 6) Cấu hình Vercel

Vào Vercel -> Project của bạn -> Settings -> Environment Variables.

Thêm đúng 5 biến sau:

```env
DB_HOST=<RDS_ENDPOINT>
DB_PORT=3306
DB_USER=<DB_USER>
DB_PASSWORD=<DB_PASSWORD>
DB_NAME=<DB_NAME>
```

Lưu ý:

1. Không dùng `127.0.0.1` trên Vercel.
2. Nhớ add cho mỗi environment cần dùng (Production/Preview/Development nếu cần).

---

## 7) Redeploy trên Vercel

Sau khi thêm env:

1. Vào tab Deployments.
2. Chọn deployment mới nhất.
3. Bấm Redeploy.

---

## 8) Kiểm tra kết quả sau deploy

Mở trình duyệt và test:

1. `/api/documents/counts`
2. `/api/subjects/groups`

Nếu 2 API trả về có dữ liệu (không rỗng) thì DB đã kết nối thành công.

Sau đó vào trang chủ web kiểm tra:

1. Có danh sách môn học.
2. Có danh sách tài liệu.
3. Vào được trang chi tiết tài liệu.

---

## 9) Nếu bị lỗi, sửa theo checklist này

### Lỗi A: API trả rỗng

Kiểm tra:

1. RDS đã import data chưa?
2. Vercel env có đúng chưa?
3. Đã Redeploy sau khi đổi env chưa?

### Lỗi B: Timeout / ECONNREFUSED

Kiểm tra:

1. RDS status đã `Available` chưa?
2. Security Group đã mở inbound 3306 chưa?
3. RDS có Public access = Yes chưa?

### Lỗi C: Access denied for user

Kiểm tra:

1. Đúng username/password chưa?
2. Đúng DB_NAME chưa?

### Lỗi D: SSL error (ít gặp hơn)

Nếu bạn bật chế độ bắt buộc SSL trên RDS, code kết nối MySQL có thể cần thêm cấu hình SSL.

Trong trường hợp này, bạn có 2 lựa chọn:

1. Tạm tắt yêu cầu SSL ở DB để deploy nhanh (cho mới học).
2. Hoặc cập nhật code kết nối để hỗ trợ SSL đúng cách.

---

## 10) File `.env.local` để chạy local với RDS (nếu cần)

Nếu bạn muốn máy local cũng dùng RDS, tạo/cập nhật `.env.local`:

```env
DB_HOST=<RDS_ENDPOINT>
DB_PORT=3306
DB_USER=<DB_USER>
DB_PASSWORD=<DB_PASSWORD>
DB_NAME=<DB_NAME>
GOOGLE_DRIVE_ROOT_FOLDER_ID=<ID_FOLDER_GOC_DRIVE>
DOCUMENT_UPLOADER_EMAIL=admin@tlu.edu.vn
```

Sau đó chạy local:

```bash
npm run dev
```

---

## 11) Checklist nộp bài / bàn giao

Trước khi gửi link deploy, check 6 mục:

1. `/api/documents/counts` có data.
2. `/api/subjects/groups` có data.
3. Trang chủ hiện card tài liệu.
4. Sidebar hiện số tài liệu theo môn.
5. Vào được trang môn học.
6. Vào được trang chi tiết tài liệu.

Nếu 6 mục đều đạt, bạn đã deploy thành công với Amazon RDS.

---

## 12) Gợi ý để an toàn hơn sau khi chạy ổn

Khi đã ổn định, bạn nên:

1. Đổi mật khẩu DB mạnh hơn (nếu bạn đã đặt tạm).
2. Không để Security Group mở rộng quá lâu.
3. Theo dõi chi phí AWS billing mỗi ngày trong giai đoạn đầu.

Xong.
