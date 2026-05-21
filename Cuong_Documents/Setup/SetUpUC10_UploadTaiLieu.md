# 🚀 HƯỚNG DẪN SETUP UC10 - UPLOAD TÀI LIỆU LÊN GOOGLE DRIVE

> **Mục tiêu:** Thiết lập luồng Upload tài liệu (PDF/DOCX) từ giao diện web, tự động lưu lên Google Drive cá nhân (bằng OAuth2), ghi metadata vào MySQL, và Vector hóa nội dung lên Pinecone để Chatbot RAG có thể học.

---

## 📋 MỤC LỤC

1. [Lý do không dùng Service Account](#1-lý-do-không-dùng-service-account)
2. [Bước 1: Cài đặt thư viện](#2-bước-1-cài-đặt-thư-viện)
3. [Bước 2: Tạo Google Cloud Project & OAuth2 Credentials](#3-bước-2-tạo-google-cloud-project--oauth2-credentials)
4. [Bước 3: Lấy Refresh Token từ OAuth2 Playground](#4-bước-3-lấy-refresh-token-từ-oauth2-playground)
5. [Bước 4: Cấu hình .env.local](#5-bước-4-cấu-hình-envlocal)
6. [Bước 5: Tạo thư viện `lib/drive.ts`](#6-bước-5-tạo-thư-viện-libdrivets)
7. [Bước 6: Tạo API Upload Route](#7-bước-6-tạo-api-upload-route)
8. [Bước 7: Tạo API Vectorize Route (Pinecone)](#8-bước-7-tạo-api-vectorize-route-pinecone)
9. [Bước 8: Cập nhật `lib/repositories.ts`](#9-bước-8-cập-nhật-librepositorytsts)
10. [Bước 9: Cập nhật UI Upload (Frontend)](#10-bước-9-cập-nhật-ui-upload-frontend)
11. [Kiểm tra và Debug](#11-kiểm-tra-và-debug)

---

## 1. Lý do không dùng Service Account

Ban đầu hệ thống dùng **Service Account** để upload lên Google Drive. Tuy nhiên, Service Account là một "bot" ảo, không có dung lượng lưu trữ thật (nó phụ thuộc vào Google Workspace Organization mà không thể nạp thêm tiền), nên mọi upload đều bị lỗi **403 Quota Exceeded**.

**Giải pháp:** Chuyển sang **Google Drive API (OAuth2)** với `Refresh Token`. File sẽ được tải lên tài khoản **Gmail cá nhân** của Admin, sử dụng 15GB dung lượng miễn phí thật sự.

---

## 2. Bước 1: Cài đặt thư viện

```bash
npm install googleapis
```

> Thư viện `googleapis` là SDK chính thức của Google, bao gồm Drive API v3.

---

## 3. Bước 2: Tạo Google Cloud Project & OAuth2 Credentials

1. Vào trang [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo **Project mới** (hoặc dùng project hiện có).
3. Ở thanh tìm kiếm, tìm và bật **"Google Drive API"** (Enable).
4. Vào menu **APIs & Services → Credentials**.
5. Bấm **"+ CREATE CREDENTIALS" → "OAuth client ID"**.
6. Chọn loại Application: **"Web Application"**.
7. Trong mục **"Authorized redirect URIs"**, thêm URL:
   ```
   https://developers.google.com/oauthplayground
   ```
8. Bấm **Create**. Hệ thống sẽ cấp cho bạn:
   - `Client ID` (dạng: `226218826175-xxxxx.apps.googleusercontent.com`)
   - `Client Secret` (dạng: `GOCSPX-xxxxxx`)

9. Vào **"APIs & Services" → "OAuth consent screen"** (hoặc "Google Auth Platform" trên giao diện mới).
10. Chọn mục **"Audience"** → cuộn xuống phần **"Test users"** → bấm **"+ ADD USERS"** → nhập email Gmail của bạn → **Save**.

---

## 4. Bước 3: Lấy Refresh Token từ OAuth2 Playground

> Đây là bước quan trọng nhất. `Refresh Token` là mã vĩnh cửu để hệ thống tự động tạo `Access Token` mới mỗi khi cần upload.

1. Mở trang [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Bấm icon **⚙️ (Settings)** góc trên bên phải.
3. Tích chọn **"Use your own OAuth credentials"**.
4. Dán `Client ID` và `Client Secret` vào ô tương ứng → bấm **Close**.
5. Ở bảng **Step 1** bên trái, cuộn xuống tìm **Drive API v3**. Tích chọn 2 scope:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive`
6. Bấm nút xanh **"Authorize APIs"**.
7. Đăng nhập bằng Gmail của bạn. Nếu có cảnh báo "chưa xác minh", bấm **Advanced (Nâng cao)** → **Continue (Tiếp tục)** → **Allow (Cho phép)**.
8. Sau khi được chuyển về Playground (Step 2), bấm nút xanh **"Exchange authorization code for tokens"**.
9. Nhìn vào ô **"Refresh token"** → **Copy toàn bộ chuỗi** (bắt đầu bằng `1//04...`).

> ⚠️ **Lưu ý:** `Access Token` hết hạn sau ~1 giờ là bình thường. Chỉ cần `Refresh Token` là đủ — nó gần như vĩnh viễn và hệ thống sẽ tự dùng nó để tạo Access Token mới.

---

## 5. Bước 4: Cấu hình `.env.local`

Thêm các dòng sau vào file `.env.local` tại gốc dự án:

```env
# Google Drive OAuth2
GOOGLE_CLIENT_ID="226218826175-xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxx"
GOOGLE_REFRESH_TOKEN="1//04xxxxxxxxxxxxxxxxxx"

# Thư mục gốc trên Drive để tải tài liệu vào (lấy từ URL của folder Drive)
GOOGLE_DRIVE_ROOT_FOLDER_ID="1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s"
```

Sau đó **Restart server** để nạp lại biến môi trường:
```bash
# Ctrl + C để tắt, sau đó:
npm run dev
```

---

## 6. Bước 5: Tạo thư viện `lib/drive.ts`

File này đóng gói toàn bộ logic kết nối và upload Google Drive:

```typescript
// lib/drive.ts
import { google } from "googleapis"
import { Readable } from "stream"

function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return google.drive({ version: "v3", auth: oauth2Client })
}

export async function uploadFileToDrive(buffer: Uint8Array, fileName: string, mimeType: string, folderId?: string) {
  const drive = getDriveClient()
  const stream = new Readable()
  stream.push(Buffer.from(buffer))
  stream.push(null)

  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  const response = await drive.files.create({
    requestBody: { name: fileName, parents: targetFolderId ? [targetFolderId] : [] },
    media: { mimeType, body: stream },
    fields: "id, webViewLink, webContentLink",
  })

  // Set quyền công khai (Ai có link đều xem được)
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  return {
    id: response.data.id!,
    previewUrl: `https://drive.google.com/file/d/${response.data.id}/preview`,
    fileUrl: `https://drive.google.com/file/d/${response.data.id}/view?usp=drive_link`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${response.data.id}`
  }
}
```

---

## 7. Bước 6: Tạo API Upload Route

File: `app/api/documents/upload/route.ts`

Luồng xử lý theo thứ tự:
1. Đọc `FormData` (file, title, subject, uploader_id).
2. **Sinh mã băm MD5** từ nội dung file để kiểm tra trùng lặp (UC11).
3. Truy vấn DB xem mã băm đã tồn tại chưa → trả lỗi `409 Conflict` nếu trùng.
4. Gọi `uploadFileToDrive()` → nhận về `id`, `previewUrl`, `downloadUrl`.
5. Gọi `createDocument()` để lưu vào MySQL.
6. Trả về `{ success: true, document_id }` cho Frontend.

> **Quan trọng:** `uploader_id` được đọc từ FormData (do Frontend gửi lên), không được hardcode là `1`.

---

## 8. Bước 7: Tạo API Vectorize Route (Pinecone)

File: `app/api/documents/vectorize/route.ts`

Đây là luồng **Background Processing** — chạy **ngầm** sau khi Upload thành công, không bắt User phải chờ.

Luồng xử lý:
1. Nhận `document_id` từ request body.
2. Truy vấn MySQL để lấy thông tin tài liệu (`drive_file_id`, `download_url`...).
3. Tải file PDF từ `download_url` bằng `fetch()`.
4. Bóc tách chữ bằng `pdf-parse`.
5. Chia nhỏ văn bản (`chunkText`, 1000 ký tự, overlap 200).
6. Gọi `getHuggingFaceEmbedding()` cho từng chunk → Vector 384 chiều.
7. Đẩy lên Pinecone Index theo batch 10 records.

> Thêm `// @ts-ignore` phía trên dòng `import pdf from "pdf-parse/lib/pdf-parse.js"` vì thư viện này thiếu TypeScript Declaration.

---

## 9. Bước 8: Cập nhật `lib/repositories.ts`

Hàm `createDocument()` cần INSERT vào **cả 2 cột** `user_id` và `uploader_id` của bảng `documents`:

```sql
INSERT INTO documents (
  title, description, subject_id, user_id, uploader_id, doc_type,
  storage_provider, drive_folder_key, drive_file_id,
  file_name, file_ext, file_hash, file_url, preview_url, download_url,
  status, is_featured
) VALUES (
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  'published', 0
)
```

> `user_id` và `uploader_id` đều nhận cùng giá trị `data.uploader_id` để tương thích với các query cũ trong dự án.

---

## 10. Bước 9: Cập nhật UI Upload (Frontend)

File: `app/upload/page.tsx`

### 10.1. Đọc đúng `user_id` từ localStorage

Khi đăng nhập, hệ thống lưu vào localStorage:
```javascript
localStorage.setItem("user", JSON.stringify(data.user)) // object: { id, name, email... }
```

Do đó, khi Upload cần parse đúng:
```typescript
const userStr = localStorage.getItem('user')
const userObj = JSON.parse(userStr)
const uploaderId = String(userObj.id || 1)
formData.set("uploader_id", uploaderId)
```

> ⚠️ **Lỗi hay gặp:** Đọc `localStorage.getItem("user_id")` — key này không tồn tại → fallback về `1` mặc định. Phải đọc key `"user"` rồi parse JSON.

### 10.2. Luồng State UI 4 bước

```
idle → uploading → vectorizing → success (hoặc error)
```

- **uploading**: Đang upload lên Drive + lưu DB.
- **vectorizing**: Hiển thị thanh màu tím "Đang trích xuất tri thức AI..." — gọi ngầm API `/api/documents/vectorize`.
- **success**: Hiển thị nút "Xem tài liệu ngay".

### 10.3. Sửa đường dẫn chuyển hướng

Trang chi tiết tài liệu dùng route **`/document/[id]`** (số ít), không phải `/documents/[id]`:
```typescript
router.push(`/document/${successDocumentId}`) // ✅ Đúng
// router.push(`/documents/${successDocumentId}`) // ❌ Sai → 404
```

---

## 11. Kiểm tra và Debug

### ✅ Checklist trước khi test:

- [ ] Đã cài `googleapis`: `npm install googleapis`
- [ ] File `.env.local` có đủ 3 biến: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- [ ] Email Gmail của bạn đã được thêm vào **Test Users** trong Google OAuth Consent Screen
- [ ] Đã restart server sau khi sửa `.env.local`

### 🐛 Lỗi hay gặp & cách xử lý:

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `403 access_denied` (Google) | Email chưa được thêm vào Test Users | Vào Google Auth Platform → Audience → Add Test Users |
| `user_id = NULL` trong DB | Code đọc sai key localStorage | Parse `JSON.parse(localStorage.getItem('user')).id` |
| `uploader_id = 1` luôn | Fallback do key `user_id` không tồn tại | Xem mục 10.1 |
| `404` sau khi upload | Dùng nhầm route `/documents/` | Sửa thành `/document/` (số ít) |
| `@types` error cho pdf-parse | Thư viện thiếu TypeScript declaration | Thêm `// @ts-ignore` phía trên import |
| `Quota Exceeded` Drive | Đang dùng Service Account | Chuyển sang OAuth2 Refresh Token |

### 🔍 Cách debug nhanh:

```typescript
// Kiểm tra user trong localStorage (mở F12 → Console):
console.log(JSON.parse(localStorage.getItem('user')))
// Kết quả mong đợi: { id: 7, name: "...", email: "..." }
```

---

## 📁 Danh sách file đã tạo/sửa

| File | Trạng thái | Mô tả |
|------|-----------|-------|
| `lib/drive.ts` | ✅ Tạo mới | Thư viện OAuth2 + Upload Drive |
| `app/api/documents/upload/route.ts` | ✅ Cập nhật | API Upload chính |
| `app/api/documents/vectorize/route.ts` | ✅ Tạo mới | API Vector hóa Pinecone (Background) |
| `lib/repositories.ts` | ✅ Cập nhật | Hàm `createDocument` bổ sung cột `user_id` |
| `app/upload/page.tsx` | ✅ Cập nhật | UI 4 State, đọc đúng user_id |
| `.env.local` | ✅ Cập nhật | Thêm 3 biến OAuth2 |
