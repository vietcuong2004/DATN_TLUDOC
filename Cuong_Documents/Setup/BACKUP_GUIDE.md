# 🗄️ Hướng dẫn Backup & Khôi phục MySQL (Railway Hobby)

Tài liệu này hướng dẫn cách sao lưu và khôi phục dữ liệu MySQL cho dự án, vì gói **Railway Hobby** không hỗ trợ tính năng backup tự động.

---

## 1. Cách Sao lưu (Backup)

### Cách A: Backup thủ công về máy tính cá nhân (Khuyên dùng)
Bạn có thể chạy lệnh này bất cứ lúc nào để lưu dữ liệu hiện tại về máy:

```powershell
npm run db:backup
```
- **Kết quả:** File SQL sẽ được tạo trong thư mục `backups/` (ví dụ: `backup-railway-2024-04-20.sql`).
- **Ưu điểm:** Nhanh, dữ liệu nằm ngay trên máy bạn.

### Cách B: Backup tự động hàng ngày (GitHub Actions)
Hệ thống đã được thiết lập để tự động chạy vào **1:00 AM mỗi ngày (giờ Việt Nam)**.
1. Truy cập vào Repository của bạn trên GitHub.
2. Vào tab **Actions** -> Chọn **MySQL Daily Backup**.
3. Bạn có thể nhấn **Run workflow** để chạy ngay lập tức trên server GitHub.
4. File backup sẽ nằm trong mục **Artifacts** của mỗi lần chạy (lưu giữ trong 7 ngày).

---

## 2. Cách Khôi phục (Restore)

Nếu chẳng may dữ liệu trên Railway bị xóa nhầm hoặc bạn muốn quay lại phiên bản cũ, hãy làm theo các bước chi tiết sau:

### Cách 1: Sử dụng Beekeeper Studio (Khuyên dùng - Rất dễ)
1. **Mở kết nối:** Mở Beekeeper Studio và kết nối vào MySQL Railway của bạn.
2. **Mở file SQL:** Nhấn vào menu **File** -> **Open**, sau đó chọn file `.sql` mới nhất trong thư mục `backups/`.
3. **Chạy Script:** Toàn bộ nội dung file SQL sẽ hiện ra trong một tab mới. Bạn chỉ cần nhấn nút **Run** (biểu tượng mũi tên Run màu xanh) ở góc trên bên phải.
4. **Kiểm tra:** Sau khi chạy xong, hãy nhấn làm mới (Refresh) danh sách bảng ở cột bên trái để thấy dữ liệu đã quay trở lại.

### Cách 2: Sử dụng MySQL Workbench
1. **Kết nối:** Mở MySQL Workbench và vào kết nối Railway của bạn.
2. **Mở File:** Vào menu **File** -> **Open SQL Script...** -> Chọn file backup trong thư mục `backups/`.
3. **Thực thi:** Nhấn vào biểu tượng **Tia chớp** (Execute the installed portion of the script) ở thanh công cụ phía trên cửa sổ query.
4. **Xác nhận:** Nếu có thông báo hiện ra, hãy chọn tiếp tục. Các lệnh `DROP TABLE IF EXISTS` trong file sẽ tự động dọn dẹp bảng cũ và tạo lại bảng mới cùng dữ liệu.

### Cách 3: Sử dụng Command Line (Nếu có sẵn MySQL Client)
Mở terminal tại thư mục dự án và chạy lệnh sau (thay thế các thông tin trong `<>`):
```powershell
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < backups/ten_file_backup.sql
```
---

## 3. Cách cập nhật code Backup mới nhất
Vì hệ thống backup này đang được phát triển liên tục, mỗi khi bạn merge nhánh hay pull code mới, hãy nhớ chạy:
```powershell
pnpm install
```
Để đảm bảo tất cả thư viện hỗ trợ (như `mysql2`, `dotenv`) luôn ở phiên bản đúng nhất.

---

## ⚠️ Lưu ý quan trọng
- **Bảo mật:** Không bao giờ upload thư mục `backups/` lên GitHub (đã được cấu hình trong `.gitignore`).
- **Kiểm tra env:** Luôn đảm bảo các biến `DB_HOST`, `DB_PASSWORD`,... trong file `.env.local` là chính xác (sử dụng **Public Link** từ Railway).
- **GitHub Secrets:** Để GitHub Actions chạy được, bạn phải thêm các biến môi trường vào mục **Settings > Secrets > Actions** trên GitHub Repo.
