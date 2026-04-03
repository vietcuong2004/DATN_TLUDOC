# Giải Thích Chi Tiết: Từ Google Drive -> phpMyAdmin/MySQL -> Hiển Thị Lên Web

Tài liệu này giải thích chính xác cách hệ thống đã import file từ Google Drive vào MySQL (quản lý bằng phpMyAdmin), map đúng từng môn học, rồi hiển thị kết quả đúng trên web Next.js.

## 1) Bức tranh tổng thể (pipeline)

Luồng chạy thực tế gồm 4 tầng:

1. Google Drive (nguồn dữ liệu):
- Bạn có 1 thư mục gốc Drive.
- Bên trong có các thư mục con theo **tên môn** (CAU_TRUC_DU_LIEU_VA_GIAI_THUAT, THIET_KE_CO_SO_DU_LIEU, ...).
- Mỗi thư mục môn chứa file PDF/DOC/DOCX/PPT/PPTX.

2. Script import (Node.js):
- Script đọc cấu trúc thư mục public của Drive.
- Tách từng file, xác định file thuộc môn nào.
- Chèn metadata file vào bảng `documents` trong MySQL.

3. API + Repository trong Next.js:
- Backend query từ MySQL ra counts/tài liệu chi tiết.
- Trả JSON cho frontend.

4. Frontend hiển thị:
- Sidebar hiển thị đủ danh sách môn cố định + số tài liệu theo DB.
- Trang chủ/trang môn/trang chi tiết tài liệu hiển thị dữ liệu thật từ DB.

## 2) Hướng dẫn chi tiết: từ chuẩn bị đến thực thi

### 2.1 Cấu trúc thư mục Google Drive

**Trên Google Drive, bạn cần tạo thư mục theo cấu trúc này:**

```
Thư mục gốc (VD: "123Doc - Tài liệu học tập")
├── CAU_TRUC_DU_LIEU_VA_GIAI_THUAT/
│   ├── Bài giảng CTDL - Tuần 1.pdf
│   ├── Đề cương CTDL.pdf
│   └── Ôn tập CTDL.docx
│
├── THIET_KE_CO_SO_DU_LIEU/
│   ├── Slide thiết kế DB - Lession 1.ppt
│   ├── Bài tập Thiết kế DB.pdf
│   └── Tài liệu tham khảo.docx
│
├── GIAO_DIEN_NGUOI_DUNG/
│   ├── Hướng dẫn UI/UX.pdf
│   └── Wireframe mẫu.pptx
│
└── ... (các thư mục môn khác)
```

**Quan trọng:**
- Mỗi **thư mục con** phải có tên **chính xác trùng với tên hiển thị của môn học**.
- Ví dụ: `CAU_TRUC_DU_LIEU_VA_GIAI_THUAT` là tên folder, `CTDL` là mã môn (khác nhau).
- File bên trong có thể là: PDF, DOC, DOCX, PPT, PPTX.
- Tất cả thư mục phải **Share công khai** để script có thể đọc được.

**Lấy ID của thư mục gốc:**
- Vào Google Drive, tìm thư mục gốc.
- Nhấn chuột phải -> "Get link" (hoặc copy URL từ thanh địa chỉ).
- URL dạng: `https://drive.google.com/drive/folders/1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s`
- Lấy phần `1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s` -> đây là `GOOGLE_DRIVE_ROOT_FOLDER_ID`.

### 2.2 Tạo CSDL trong phpMyAdmin

**Bước 1: Mở phpMyAdmin**
- Thường ở `http://localhost/phpmyadmin`
- Đăng nhập với tài khoản MySQL (thường là `root`).

**Bước 2: Tạo Database mới**
- Nhấn "New" (hoặc tìm mục tạo database).
- Nhập tên database: `tlu_document` (hoặc tên khác).
- Character Set: chọn `utf8mb4_general_ci`.
- Nhấn "Create".

**Bước 3: Import schema SQL**
- Tìm file SQL schema (có trong file `Cuong_Documents/CoSoDuLieu.md`).
- Bảng chính cần có:
  - `subjects` (môn học): id, code, name, folder_key, group_name, is_required
  - `documents` (tài liệu): id, title, subject_id, drive_file_id, file_url, status, ...
  - `users` (người dùng): id, email, ...

**Bước 4: Insert dữ liệu môn học vào bảng `subjects`**

Chạy SQL này trong phpMyAdmin (tab SQL):
```sql
INSERT INTO subjects (code, name, folder_key, group_name, is_required) VALUES
('CTDL', 'Cấu trúc dữ liệu và giải thuật', 'CAU_TRUC_DU_LIEU_VA_GIAI_THUAT', 'Bắt buộc', 1),
('TCSDL', 'Thiết kế cơ sở dữ liệu', 'THIET_KE_CO_SO_DU_LIEU', 'Bắt buộc', 1),
('GDND', 'Giao diện người dùng', 'GIAO_DIEN_NGUOI_DUNG', 'Tự chọn', 0),
... (thêm tất cả các môn);
```

**Quan trọng:**
- Cột `folder_key` **PHẢI trùng đúng tên thư mục Drive** (giống trong phần 2.1).
- Cột `code` là mã môn ngắn (VD: CTDL, TCSDL).
- Cột `name` là tên đầy đủ của môn.

**Bước 5: Tạo user uploader (nếu chưa có)**

Chạy SQL:
```sql
INSERT INTO users (email, name) VALUES ('admin@tlu.edu.vn', 'Admin');
```

### 2.3 Lấy thông tin kết nối DB cho web

**Tất cả những thông tin này sẽ dùng để tạo file `.env.local`:**

1. **DB_HOST**: Địa chỉ máy chủ MySQL (thường là `127.0.0.1`)
2. **DB_PORT**: Cổng MySQL (mặc định `3306`)
3. **DB_USER**: Tên người dùng MySQL (mặc định `root`)
4. **DB_PASSWORD**: Mật khẩu MySQL (nếu không có, để trống)
5. **DB_NAME**: Tên database (VD: `tlu_document`)
6. **GOOGLE_DRIVE_ROOT_FOLDER_ID**: ID thư mục gốc Drive (lấy ở phần 2.1)
7. **DOCUMENT_UPLOADER_EMAIL**: Email của user uploader (VD: `admin@tlu.edu.vn`)

**Tạo file `.env.local` trong thư mục gốc dự án `d:\DATN_TLUDOCUMENT\.env.local`:**
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tlu_document
GOOGLE_DRIVE_ROOT_FOLDER_ID=1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s
DOCUMENT_UPLOADER_EMAIL=admin@tlu.edu.vn
```

### 2.4 Script import: vị trí và cách hoạt động

**File script nằm ở:**
```
d:\DATN_TLUDOCUMENT\scripts\import-drive-folder.mjs
```

**Cách chạy script:**

**1) Dry run (thử, không ghi DB):**
```bash
npm run import:drive:dry
```

Output sẽ in ra các file sẽ được import, VD:
```
[DRY RUN] CAU_TRUC_DU_LIEU_VA_GIAI_THUAT -> Bài giảng CTDL.pdf
[DRY RUN] THIET_KE_CO_SO_DU_LIEU -> Slide thiết kế DB.ppt
```

**2) Import thật (ghi vào DB):**
```bash
npm run import:drive
```

Output:
```
Đã thêm: [CTDL] Bài giảng CTDL - Tuần 1.pdf
Đã thêm: [TCSDL] Slide thiết kế DB - Lession 1.ppt
...
Hoàn tất nhập dữ liệu từ Google Drive
{
  "inserted": 50,
  "skippedAlreadyExists": 0,
  "skippedUnmappedFolder": 2,
  "skippedFileType": 3,
  "scannedFolders": 5
}
```

**Logic của script (4 bước chính):**

**Bước 1: Đọc cấu hình**
```javascript
loadLocalEnv()  // Đọc file .env.local
const options = parseArgs(process.argv.slice(2))  // Parse tham số
```

**Bước 2: Kết nối DB và lấy dữ liệu môn**
```javascript
const subjectByFolderKey = new Map(subjects.map(row => 
  [row.folder_key.toUpperCase(), row]
))
// Tạo map: "CAU_TRUC_DU_LIEU_VA_GIAI_THUAT" -> { id: 1, code: "CTDL", ... }
```

**Bước 3: Duyệt thư mục Drive**
```javascript
async function walkFolder(folderId, currentFolderKey = null) {
  const html = await fetchFolderHtml(folderId)  // Đọc HTML công khai
  const entries = parseFolderEntries(html)       // Parse HTML
  
  for (const entry of entries) {
    if (entry.folderId) {
      // Nếu là folder, kiểm tra tên có trùng với folder_key
      const nextFolderKey = subjectByFolderKey.has(entry.title.toUpperCase()) 
        ? entry.title.toUpperCase() 
        : currentFolderKey
      await walkFolder(entry.folderId, nextFolderKey)
    }
    
    if (entry.fileId) {
      // Nếu là file, lấy subject từ folder_key, insert vào DB
      const subject = subjectByFolderKey.get(currentFolderKey)
    }
  }
}
```

**Bước 4: Insert vào DB (nếu không phải dry-run)**
```javascript
if (!options.dryRun) {
  await pool.execute(`
    INSERT INTO documents (...) VALUES (?, ?, ?, ...)
  `, [title, subject.id, drive_file_id, file_url, ...])
}
```

### 2.5 File cần sửa để đẩy tài liệu + map đúng

**File 1: `lib/mysql.ts`**
- **Vị trí:** `d:\DATN_TLUDOCUMENT\lib\mysql.ts`
- **Sửa gì:** Hàm `hasDbConfig()` để chấp nhận password DB rỗng
- **Tại sao:** Nếu không sửa, app sẽ coi `DB_PASSWORD=` (rỗng) là thiếu cấu hình.
- **Code sửa:**
  ```javascript
  function hasDbConfig() {
    return (
      process.env.DB_HOST !== undefined &&
      process.env.DB_PORT !== undefined &&
      process.env.DB_USER !== undefined &&
      process.env.DB_PASSWORD !== undefined &&  // Check undefined, không truthy
      process.env.DB_NAME !== undefined
    )
  }
  ```

**File 2: `.env.local` (tạo mới)**
- **Vị trí:** `d:\DATN_TLUDOCUMENT\.env.local`
- **Tạo gì:** File cấu hình kết nối DB + Drive folder ID
- **Tại sao:** Script `import-drive-folder.mjs` đọc file này

**File 3: `lib/repositories.ts`**
- **Vị trí:** `d:\DATN_TLUDOCUMENT\lib\repositories.ts`
- **Sửa gì:** Hàm `getDocumentCountsBySubjectCode()`
- **Tại sao:** Hàm this JOIN `subjects` và `documents` theo `subject_id`, đảm bảo đếm đúng theo môn
- **Code:**
  ```typescript
  export async function getDocumentCountsBySubjectCode() {
    const rows = await queryRows(`
      SELECT s.code, COUNT(d.id) AS document_count
      FROM subjects s
      LEFT JOIN documents d ON d.subject_id = s.id 
        AND d.status = 'published'
      GROUP BY s.code
    `)
    
    return rows.reduce((acc, row) => {
      acc[row.code.toUpperCase()] = Number(row.document_count ?? 0)
      return acc
    }, {})
  }
  ```

**File 4: `package.json`**
- **Vị trí:** `d:\DATN_TLUDOCUMENT\package.json`
- **Sửa gì:** Thêm 2 lệnh npm scripts
- **Tại sao:** Để chạy `npm run import:drive` từ terminal
- **Code cần có:**
  ```json
  {
    "scripts": {
      "import:drive": "node scripts/import-drive-folder.mjs",
      "import:drive:dry": "node scripts/import-drive-folder.mjs --dry-run"
    }
  }
  ```

## 3) Cơ chế map file vào đúng môn: chính xác diễn ra thế nào?

**Bước 1: Query các môn từ DB**
- Lấy danh sách từ bảng `subjects` với cột `folder_key`.
- Tạo map `folder_key (UPPERCASE) -> subject row`.

**Bước 2: Duyệt Drive**
- Khi gặp folder tên `CAU_TRUC_DU_LIEU_VA_GIAI_THUAT`:
  - Script so sánh với map `folder_key`.
  - Tìm được subject có `folder_key=CAU_TRUC_DU_LIEU_VA_GIAI_THUAT`.
  - Gán `currentFolderKey = CAU_TRUC_DU_LIEU_VA_GIAI_THUAT`.

**Bước 3: Xác định file thuộc môn nào**
- File nằm trong folder `CAU_TRUC_DU_LIEU_VA_GIAI_THUAT`:
  - Lấy subject tương ứng từ map.
  - Ghi `subject.id` vào cột `documents.subject_id`.

**Bước 4: Hiển thị bằng JOIN theo `subject_id`**
- Query: `SELECT ... FROM documents d JOIN subjects s ON d.subject_id = s.id`
- Kết quả: tài liệu được gom nhóm đúng theo môn.

## 4) Quy trình thao tác chuẩn từ đầu đến cuối

### Bước A: Chuẩn bị DB
1. MySQL chạy, schema đã tạo.
2. Bảng `subjects` đã seed, `folder_key` trùng tên thư mục Drive.
3. Bảng `users` có user uploader.

### Bước B: Cấu hình `.env.local`
```bash
# Tạo file với các biến DB + Drive folder ID
```

### Bước C: Dry run
```bash
npm run import:drive:dry
```

### Bước D: Import thật
```bash
npm run import:drive
```

### Bước E: Chạy web + kiểm tra
```bash
npm run dev
```
- Check `http://localhost:3000/api/documents/counts` hoặc `3001`
- Trang chủ có tài liệu
- Sidebar có số lượng
- `/subjects/CAU_TRUC_DU_LIEU_VA_GIAI_THUAT` có danh sách tài liệu

## 5) Vì sao trước đó có lỗi

1. **DB password rỗng:**
   - App từng coi rỗng là thiếu biến.
   - Fix: Check `undefined/null` thay vì truthy.

2. **Lỗi 403 Drive API:**
   - Caller không được phép.
   - Fix: Dùng public HTML crawl thay vì API.

3. **Lỗi 404 route môn:**
   - Mã môn không khớp.
   - Fix: Thêm fallback curriculum.

## 6) Mẹo debug nhanh

1. Check API counts: `/api/documents/counts`
2. Đúng port dev server (3000 hoặc 3001)
3. Hard refresh: `Ctrl + F5`
4. Query DB trong phpMyAdmin để so sánh

## 7) Kết luận

Hệ thống import thành công vì:
1. Duyệt đúng cây Drive public
2. Map đúng `folder_key -> subject_id` khi insert
3. Hiển thị bằng JOIN theo `subject_id`, không dựa vào tên text mơ hồ
