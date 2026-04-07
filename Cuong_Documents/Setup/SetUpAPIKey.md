# Hướng dẫn setup API key cho Chatbot Tutor

Tài liệu này hướng dẫn bạn setup API key theo từng bước để sau đó có thể gắn vào code chatbot của dự án Next.js hiện tại.

Mục tiêu của hướng dẫn:
- Bạn biết lấy API key ở đâu.
- Bạn biết đặt key vào file nào trong project.
- Bạn biết cài package nào để code gọi AI.
- Bạn biết cách kiểm tra là setup đúng chưa.

---

## 1) Chọn nhà cung cấp API key

Với đồ án này, nên ưu tiên theo thứ tự:

1. Google AI Studio - Gemini
- Link: https://aistudio.google.com/app/apikey
- Lý do nên chọn: dễ lấy key, thường có free tier, phù hợp bài toán chatbot học tập, chi phí thấp.

2. OpenRouter
- Link: https://openrouter.ai/keys
- Lý do: linh hoạt, có nhiều model để chọn.

3. OpenAI
- Link: https://platform.openai.com/api-keys
- Lý do: chất lượng tốt, nhưng thường tốn hơn nếu gọi nhiều.

Khuyến nghị cho dự án này:
- Dùng Gemini trước.
- Khi code xong nếu muốn đổi model, mình có thể chuyển sang OpenRouter hoặc OpenAI sau.

---

## 2) Tạo API key ở đâu?

### Cách lấy key từ Google AI Studio

1. Mở trang: https://aistudio.google.com/app/apikey
2. Đăng nhập bằng tài khoản Google.
3. Tìm nút tạo key mới, thường là `Create API key`.
4. Chọn project Google Cloud nếu hệ thống yêu cầu.
5. Tạo xong thì copy API key ra một nơi an toàn.

Lưu ý:
- Key chỉ hiện một lần hoặc rất khó xem lại đầy đủ.
- Không gửi key cho người khác.
- Không dán key vào chat công khai.

---

## 3) Tạo file môi trường trong project

Trong project của bạn, file cần dùng là:
- `.env.local` ở thư mục gốc `D:\DATN_TLUDOCUMENT`

Nếu file này chưa có:
1. Tạo mới file `.env.local`.
2. Đặt nó cùng cấp với `package.json`.

Ví dụ cấu trúc:

```text
D:\DATN_TLUDOCUMENT
├─ app
├─ components
├─ lib
├─ public
├─ .env.local
├─ package.json
└─ tsconfig.json
```

---

## 4) Viết biến môi trường vào `.env.local`

Nếu dùng Gemini, thêm các dòng sau:

```env
GEMINI_API_KEY=your_actual_api_key_here
CHATBOT_MODEL=gemini-2.0-flash
CHATBOT_MAX_OUTPUT_TOKENS=400
```

Giải thích từng dòng:

- `GEMINI_API_KEY`: khóa để backend gọi Gemini.
- `CHATBOT_MODEL`: tên model sẽ dùng khi gọi AI.
- `CHATBOT_MAX_OUTPUT_TOKENS`: giới hạn độ dài câu trả lời để giảm chi phí.

Lưu ý quan trọng:
- Không thêm dấu ngoặc kép nếu không cần.
- Không có dấu cách ở đầu/cuối dòng.
- Không commit file này lên Git.

---

## 5) Thêm file vào `.gitignore` nếu cần

Trong hầu hết project Next.js, `.env.local` đã được bỏ qua sẵn.

Bạn vẫn nên kiểm tra trong `.gitignore` có dòng này không:

```gitignore
.env.local
```

Nếu đã có thì không cần sửa.

Mục đích:
- Tránh đưa API key lên GitHub.

---

## 6) Cài package để gọi Gemini

Khi bắt đầu code chatbot, mình sẽ cần cài package này:

```bash
npm install @google/generative-ai
```

Giải thích:
- Package này giúp backend gọi Gemini dễ hơn.
- Dùng trong file route của chatbot, không dùng ở frontend.

Nếu sau này đổi sang OpenAI hoặc OpenRouter, package sẽ khác. Nhưng với hướng hiện tại, Gemini là lựa chọn đơn giản nhất.

---

## 7) Kiểm tra máy đã đọc được biến môi trường chưa

Sau khi tạo `.env.local`, bạn cần restart server dev.

### Cách làm

1. Dừng server đang chạy.
2. Chạy lại:

```bash
npm run dev
```

### Tại sao phải restart?
- Next.js chỉ đọc biến môi trường lúc khởi động.
- Nếu bạn thêm key khi server đang chạy, code cũ chưa thấy key mới.

---

## 8) Cách kiểm tra setup đúng trước khi code tiếp

Bạn có thể kiểm tra theo 3 mức:

### Mức 1: Kiểm tra file `.env.local`
- File có tồn tại không.
- Có đúng tên biến `GEMINI_API_KEY` không.
- Có dán đúng key thật không.

### Mức 2: Kiểm tra bằng console ở backend

Khi mình code route chatbot sau, có thể tạm kiểm tra bằng:

```ts
console.log(process.env.GEMINI_API_KEY ? "API key OK" : "API key missing")
```

### Mức 3: Kiểm tra bằng một request thật
- Gọi API chatbot từ frontend.
- Nếu key đúng, backend sẽ nhận được phản hồi từ Gemini.
- Nếu key sai, server sẽ báo lỗi 401/403 hoặc lỗi xác thực tương tự.

---

## 9) Những lỗi hay gặp khi setup

1. Sai tên biến môi trường
- Ví dụ viết nhầm `GEMNI_API_KEY`.
- Cách sửa: dùng đúng `GEMINI_API_KEY`.

2. Quên restart server
- Đã sửa `.env.local` nhưng Next.js vẫn chưa đọc key mới.
- Cách sửa: tắt và chạy lại `npm run dev`.

3. Đặt file sai chỗ
- `.env.local` phải nằm ở thư mục gốc của project.

4. Dán key vào frontend
- Không được đưa API key vào file client component.
- API key phải được dùng trong backend route.

5. Đưa `.env.local` lên Git
- Rất nguy hiểm vì lộ key.
- Nếu lỡ đẩy lên Git, phải revoke key và tạo key mới ngay.

---

## 10) Cách triển khai đúng trong project này

Hướng đúng cho dự án của bạn là:

1. Frontend gửi câu hỏi từ `app/chatbot/page.tsx`.
2. Frontend gọi `POST /api/chatbot`.
3. File `app/api/chatbot/route.ts` đọc `process.env.GEMINI_API_KEY`.
4. Backend gọi Gemini API.
5. Backend trả answer + tài liệu liên quan về frontend.

Quy tắc quan trọng:
- Key chỉ tồn tại ở backend.
- Frontend không được biết key thật.

---

## 11) Checklist hoàn thành trước khi mình code tiếp

Bạn làm xong các bước sau là đủ:

1. Tạo key ở Google AI Studio.
2. Tạo file `.env.local`.
3. Dán các biến môi trường vào file.
4. Kiểm tra `.gitignore` không commit file này.
5. Cài package `@google/generative-ai`.
6. Restart `npm run dev`.

Sau khi hoàn thành, mình có thể code luôn phần backend chatbot cho bạn.

---

## 12) Mẫu cấu hình tối thiểu nên dùng

```env
GEMINI_API_KEY=your_actual_key_here
CHATBOT_MODEL=gemini-2.0-flash
CHATBOT_MAX_OUTPUT_TOKENS=400
```

Đây là cấu hình tối thiểu đủ để bắt đầu.

---

## 13) Ghi nhớ an toàn

- Không chia sẻ API key lên chat, ảnh chụp màn hình công khai hoặc GitHub.
- Nếu lộ key, hãy xóa key cũ và tạo key mới ngay.
- Nếu deploy lên Vercel, phải khai báo lại biến môi trường trong phần Environment Variables.

---

## 14) Setup Environment Variables trên Vercel

Khi bạn đã push code lên GitHub và deploy trên Vercel, cần setup lại các biến môi trường trên Vercel để chatbot hoạt động trên live.

### Bước 1: Đăng nhập vào Vercel Dashboard
1. Vào: https://vercel.com/dashboard
2. Đăng nhập bằng tài khoản của bạn
3. Tìm project của bạn trong danh sách

### Bước 2: Mở Settings của project
1. Mở project
2. Click tab **Settings** (thanh menu trên cùng)
3. Ở sidebar bên trái, click **Environment Variables**

### Bước 3: Thêm các biến cần thiết

Bạn sẽ nhìn thấy form để thêm biến. Thêm lần lượt các biến sau:

#### Biến bắt buộc cho chatbot:

**1. GEMINI_API_KEY**
- Name: `GEMINI_API_KEY`
- Value: Dán API key từ Google AI Studio (ví dụ: `AIzaSyC7cn-A2CA922HJf-...`)
- Environments: Chọn **Production**
- Click **Add**

**2. CHATBOT_MODEL**
- Name: `CHATBOT_MODEL`
- Value: `gemini-2.5-flash`
- Environments: **Production**
- Click **Add**

**3. CHATBOT_MAX_OUTPUT_TOKENS**
- Name: `CHATBOT_MAX_OUTPUT_TOKENS`
- Value: `400`
- Environments: **Production**
- Click **Add**

**4. CHATBOT_HISTORY_USER_ID**
- Name: `CHATBOT_HISTORY_USER_ID`
- Value: `1`
- Environments: **Production**
- Click **Add**

#### Biến cho database (nếu cần lấy tài liệu từ MySQL):

**5. DB_HOST**
- Name: `DB_HOST`
- Value: IP hoặc hostname của server MySQL (ví dụ: `123.45.67.89` hoặc `db.example.com`)
- Environments: **Production**
- Click **Add**

**6. DB_PORT**
- Name: `DB_PORT`
- Value: `3306`
- Environments: **Production**
- Click **Add**

**7. DB_USER**
- Name: `DB_USER`
- Value: Tên user MySQL
- Environments: **Production**
- Click **Add**

**8. DB_PASSWORD**
- Name: `DB_PASSWORD`
- Value: Password MySQL
- Environments: **Production**
- Click **Add**

**9. DB_NAME**
- Name: `DB_NAME`
- Value: `tlu_document`
- Environments: **Production**
- Click **Add**

**10. GOOGLE_DRIVE_ROOT_FOLDER_ID**
- Name: `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- Value: `1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s` (hoặc ID của bạn)
- Environments: **Production**
- Click **Add**

### Bước 4: Redeploy project

Sau khi add xong tất cả biến:

1. Vào tab **Deployments**
2. Tìm deployment mới nhất
3. Click vào deployment đó
4. Click nút **Redeploy**
5. Đợi khoảng 2-5 phút để Vercel build lại project

### Bước 5: Kiểm tra chatbot hoạt động

1. Vào URL của project live trên Vercel
2. Mở trang chatbot
3. Thử gõ một câu hỏi
4. Nếu chatbot trả lời thì setup thành công ✓

### ⚠️ Nếu vẫn không hoạt động

**Kiểm tra lỗi:**
1. Mở DevTools (F12)
2. Vào tab **Console** để xem lỗi
3. Vào tab **Network** để kiểm tra request gửi tới `/api/chatbot`

**Kiểm tra logs trên Vercel:**
1. Vào Settings → **Function Logs**
2. Xem log để biết lỗi ở backend
3. Thường là lỗi: API key sai, database không kết nối được, hoặc biến chưa được set đúng

**Các lỗi thường gặp:**
- `Error: GEMINI_API_KEY is not defined` → Quên add biến `GEMINI_API_KEY`
- `Error: connect ECONNREFUSED` → Database không kết nối được (DB_HOST sai hoặc network không thông)
- `Error: 401 Unauthorized` → API key Gemini sai hoặc hết hạn
- `Error: timeout` → Server chậm hoặc database không phản hồi

**Cách debug:**
1. Kiểm tra lại tất cả biến trên Vercel Environment Variables xem có đầy đủ không
2. Kiểm tra spelling các biến (phải viết hoa đúng như trong code)
3. Kiểm tra API key Gemini còn hoạt động không
4. Nếu dùng database từ máy local, có thể không kết nối được từ Vercel (cần deploy database lên cloud như AWS RDS, Railway, hay PlanetScale)

### ✅ Checklist setup Vercel

- [ ] Mở Settings → Environment Variables
- [ ] Add GEMINI_API_KEY
- [ ] Add CHATBOT_MODEL
- [ ] Add CHATBOT_MAX_OUTPUT_TOKENS
- [ ] Add CHATBOT_HISTORY_USER_ID
- [ ] Add DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (nếu dùng)
- [ ] Chọn **Production** cho tất cả biến
- [ ] Redeploy project
- [ ] Kiểm tra chatbot hoạt động

---

## 15) Khi nào mới code tiếp?

Sau khi bạn làm xong hướng dẫn này, mình sẽ viết tiếp cho bạn:
- `app/api/chatbot/route.ts`
- Hàm gọi Gemini thật
- Hàm truy vấn tài liệu liên quan trong MySQL
- Gắn chatbot thật vào `app/chatbot/page.tsx`

