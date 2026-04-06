# 📚 Hướng Dẫn Upload Thêm Tài Liệu Mới

Sau khi deploy xong, khi bạn muốn thêm tài liệu mới vào website, hãy làm theo hướng dẫn này.

---

## 📋 Bước 1: Chuẩn Bị Tài Liệu Trên Google Drive

### 1.1. Mở Google Drive
- Truy cập: https://drive.google.com
- Đăng nhập bằng tài khoản được cấp quyền

### 1.2. Tìm Folder Của Môn Học
Bạn sẽ thấy các folder theo tên môn học, ví dụ:
```
📁 Cơ Sở Dữ Liệu
📁 Lập Trình Java
📁 Thiết Kế Web
```

**Danh sách các folder:**
- **Cơ Sở Dữ Liệu** (CSDL)
- **Lập Trình Java** (Java)
- **Thiết Kế Web** (Web)
- v.v...

### 1.3. Upload File Vào Folder
1. **Mở folder môn học** (ví dụ: "Cơ Sở Dữ Liệu")
2. **Click button "Upload"** (hoặc kéo thả file vào)
3. **Chọn file PDF/Word/ZIP** mà bạn muốn thêm
4. **Chờ upload xong** (phải thấy dấu tích xanh ✅)

**⚠️ Lưu ý:** 
- File phải là PDF, Word, PowerPoint, hoặc ZIP
- Size < 50MB (tùy cấu hình Drive)
- Tên file nên rõ ràng, ví dụ: `Bai1_CacDieuKienSQL.pdf`

---

## 💻 Bước 2: Chạy Script Import (Trên Máy Tính)

Sau khi upload xong lên Drive, bạn cần chạy lệnh import để đưa tài liệu vào database.

### 2.1. Mở Terminal PowerShell

**Cách 1: Dùng VS Code**
- Mở project `DATN_TLUDOCUMENT` trong VS Code
- Nhấn **Ctrl + `** (backtick) để mở Terminal
- Terminal sẽ hiển thị ở dưới

**Cách 2: Mở PowerShell riêng**
- Nhấn **Windows + R**
- Gõ: `powershell`
- Press **Enter**
- Gõ: `cd D:\DATN_TLUDOCUMENT` (đến folder project)

### 2.2. Chạy Lệnh Import

**Lệnh để chạy:**
```powershell
npm run import:drive
```

**Output bạn sẽ thấy:**
```
> import:drive
> node scripts/import-drive-folder.mjs

📂 Scanning Google Drive...
✅ Cơ Sở Dữ Liệu: 5 documents found
✅ Thiết Kế Web: 3 documents found
📝 Processing...
✅ Added: Bai1_CacDieuKienSQL.pdf → Subject: Cơ Sở Dữ Liệu
✅ Added: Bai2_JOIN_Query.pdf → Subject: Cơ Sở Dữ Liệu
✅ Already exists: Bai3_Index.pdf (skipped)

✅ Import completed! 8 new documents added.
```

### 2.3. Chờ Xong

Script sẽ:
1. **Quét Google Drive** → Tìm các file mới
2. **Kiểm tra database** → Xem file đã có chưa (tránh duplicate)
3. **Thêm vào database** → Insert vào Railway MySQL
4. **Hiển thị kết quả** → Báo cáo số file thêm được

**⏱️ Thời gian:**
- 1-5 file: 1-2 giây
- 10-20 file: 5-10 giây
- 50+ file: 20-30 giây

---

## ⚠️ Bước 3: Xử Lý Lỗi (Nếu Có)

### Lỗi 1: "ENOENT: no such file or directory"
```
Error: ENOENT: no such file or directory
```

**Nguyên nhân:** File `.env.local` không tìm thấy

**Cách fix:**
1. Đảm bảo file `.env.local` có trong folder `D:\DATN_TLUDOCUMENT`
2. File phải chứa:
   ```
   GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
   DB_HOST=junction.proxy.rlwy.net
   DB_PORT=27301
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=railway
   ```

### Lỗi 2: "Cannot connect to database"
```
Error: connect ECONNREFUSED
```

**Nguyên nhân:** Railway database (junction.proxy.rlwy.net) không online

**Cách fix:**
1. Kiểm tra xem Railway service còn chạy không:
   - Truy cập: https://railway.app
   - Vào project `DATN_TLUDOCUMENT`
   - Xem "Database" service: phải là màu **xanh lá (healthly)**, không phải **đỏ (crashed)**
2. Nếu đỏ, click "Deploy" để khởi động lại

### Lỗi 3: "Drive Authorization Failed"
```
Error: Invalid credentials
```

**Nguyên nhân:** Google Drive API key hết hạn hoặc sai

**Cách fix:**
- Kiểm tra file `scripts/import-drive-folder.mjs`
- Dòng credentials có chứa: `"client_email"` và `"private_key"`
- Nếu sai, tạo lại file JSON từ Google Cloud Console

---

## ✅ Bước 4: Xác Nhận Dữ Liệu Đã Thêm

Sau khi script chạy xong, hãy kiểm tra xem dữ liệu đã vào database chưa.

### 4.1. Cách 1: Check trên Website (Dễ nhất)
1. Mở: https://datn-tludoc.vercel.app
2. Click vào **môn học** bạn vừa thêm
3. Bạn sẽ thấy **tài liệu mới** hiển thị

### 4.2. Cách 2: Query Database (Chi tiết)

Mở PowerShell và chạy câu lệnh SQL:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" `
  -h junction.proxy.rlwy.net `
  -P 27301 `
  -u root `
  -p `
  railway `
  -e "SELECT COUNT(*) as total_documents FROM documents;"
```

**Khi được hỏi password, gõ:** password của Railway
**Output sẽ hiển thị:** Tổng số tài liệu hiện có

Ví dụ: Nếu trước có 162 documents, giờ sẽ thành 165 (thêm 3 cái mới).

---

## 📝 Tóm Tắt Quy Trình

| Bước | Hành Động | Thời Gian |
|------|----------|----------|
| 1 | Upload file lên Google Drive folder | 1-5 phút |
| 2 | Mở PowerShell, đứng ở folder `D:\DATN_TLUDOCUMENT` | 30 giây |
| 3 | Chạy lệnh `npm run import:drive` | 5-30 giây |
| 4 | Chờ script xong, xác nhận lỗi (nếu có) | 1-2 phút |
| 5 | Kiểm tra website hoặc database | 30 giây |
| **TOTAL** | | **10-15 phút** |

---

## 🎯 Câu Lệnh Cần Nhớ

**Lệnh chính (chạy import):**
```powershell
npm run import:drive
```

**Kiểm tra database:**
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -h junction.proxy.rlwy.net -P 27301 -u root -p railway -e "SELECT COUNT(*) FROM documents;"
```

**Kiểm tra log (nếu muốn debug):**
```powershell
npm run import:drive:dry
```
(Cái này chỉ hiển thị những file sẽ thêm, không thêm thực sự)

---

## 🆘 Câu Hỏi Thường Gặp

### Q: Nếu tôi upload 100 file một lúc, script có bị treo không?
**A:** Không. Script xử lý từng file một, chạy nhanh. Nhưng nếu > 200 file, có thể mất 1-2 phút.

### Q: Nếu upload lại file cùng tên, nó sẽ duplicate không?
**A:** Không. Script kiểm tra `drive_file_id` (ID duy nhất của Drive), nên nó sẽ **skip** nếu đã tồn tại.

### Q: Website sẽ update ngay hay phải đợi?
**A:** Update ngay! Vì Vercel sẽ fetch data từ Railway, không cache.

### Q: Muốn xóa/sửa tài liệu sau này làm sao?
**A:** Bạn xóa file khỏi Drive, rồi chạy `npm run import:drive` lại, script sẽ cập nhật.

### Q: Script có log file không, để xem chi tiết?
**A:** Hiện chưa có. Nhưng output trên terminal là đủ. Nếu cần log file, hãy hỏi mình cải thiện script.

---

## 📞 Liên Hệ Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra phần **"Xử Lý Lỗi"** trên
2. Nếu vẫn không được, **chụp lại error message** và hỏi
3. Chuẩn bị file `.env.local` để check credentials

---

**✅ Bạn đã sẵn sàng upload tài liệu mới!**

Lần tới chỉ cần: **Upload Drive → Chạy `npm run import:drive` → Done!**
