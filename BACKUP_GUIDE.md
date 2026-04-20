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

Nếu chẳng may dữ liệu trên Railway bị hỏng hoặc bạn muốn quay lại phiên bản cũ, hãy làm theo các bước sau:

### Sử dụng phần mềm quản lý (Dễ nhất)
1. Mở **MySQL Workbench**, **Beekeeper Studio** hoặc **TablePlus**.
2. Kết nối tới MySQL của Railway (dùng Public URL).
3. Sử dụng tính năng **Import / Execute SQL Script**.
4. Chọn file `.sql` mới nhất trong thư mục `backups/` và chạy.

### Sử dụng Command Line (Nếu có cài MySQL Client)
```powershell
mysql -h <HOST> -u <USER> -p <DATABASE_NAME> < backups/ten_file_backup.sql
```

---

## ⚠️ Lưu ý quan trọng
- **Bảo mật:** Không bao giờ upload thư mục `backups/` lên GitHub (đã được cấu hình trong `.gitignore`).
- **Kiểm tra env:** Luôn đảm bảo các biến `DB_HOST`, `DB_PASSWORD`,... trong file `.env.local` là chính xác (sử dụng **Public Link** từ Railway).
- **GitHub Secrets:** Để GitHub Actions chạy được, bạn phải thêm các biến môi trường vào mục **Settings > Secrets > Actions** trên GitHub Repo.
