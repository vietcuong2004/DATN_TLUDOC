# Hướng dẫn và Giải thích về Vercel Deployment

## 1. Vercel là gì?
**Vercel** là một nền tảng đám mây (Cloud Platform) được tối ưu hóa riêng cho các úng dụng web hiện đại, đặc biệt là **Next.js**. Nó cho phép bạn đưa mã nguồn từ GitHub lên môi trường internet (Live) một cách tự động và miễn phí (với gói Hobby).

---

## 2. Tại sao Vercel lại "tự hiểu" dự án của bạn?

Vercel sử dụng cơ chế **Framework Detection**. Khi bạn kết nối kho mã nguồn (Repository) GitHub với Vercel, hệ thống sẽ quét các file trong thư mục gốc:
*   Nếu thấy file `next.config.js` hoặc `next.config.mjs`: Nó biết đây là dự án **Next.js**.
*   Nếu thấy file `package.json`: Nó biết đây là dự án **Node.js**.

### Các file "chỉ đường" cho Vercel:
1.  **`package.json`**:
    *   Vercel đọc mục `"scripts"` và tự động chạy lệnh `npm run build` mỗi khi bạn cập nhật code.
    *   Nó cài đặt tất cả thư viện liệt kê trong mục `"dependencies"`.
2.  **Cấu trúc thư mục `app/`**:
    *   Vercel nhận diện các file `page.tsx` để tạo ra các đường link (Routes) trên web.
    *   Các file `route.ts` trong `app/api/` được Vercel biến thành **Serverless Functions** - tức là các đoạn mã Backend có thể chạy độc lập mà không cần máy chủ riêng.

---

## 3. Quy trình Triển khai tự động (CI/CD)

Vercel tích hợp sẵn quy trình **CI/CD** (Continuous Integration/Continuous Deployment):
1.  **Push Code:** Bạn thực hiện `git push` lên nhánh chính (thường là `main` hoặc `dev`).
2.  **Trigger:** GitHub báo cho Vercel biết có thay đổi.
3.  **Build:** Vercel tạo một môi trường máy ảo, chạy lệnh build để đóng gói ứng dụng.
4.  **Deploy:** Nếu build không có lỗi, Vercel sẽ cập nhật mã mới lên đường link Live của bạn.

---

## 4. Những thứ Vercel KHÔNG tự làm được (Cần lưu ý)

Vercel chỉ quản lý **Mã nguồn (Code)**. Những thứ sau đây bạn phải cấu hình thủ công trên Dashboard của Vercel:

### 4.1. Biến môi trường (Environment Variables)
File `.env.local` trên máy tính của bạn **không bao giờ** được đưa lên GitHub (để đảm bảo bảo mật). Vì vậy, Vercel không biết thông tin kết nối Database của bạn.
*   **Giải pháp:** Bạn phải vào `Vercel Dashboard` -> `Settings` -> `Environment Variables` và nhập các khóa như `DB_HOST`, `DB_PASSWORD`, `API_KEY`... vào đó.

### 4.2. Cơ sở dữ liệu (Database)
Vercel không cung cấp Database MySQL. Bạn phải dùng một dịch vụ bên ngoài như **Railway** (như bạn đang dùng) và cung cấp thông tin kết nối cho Vercel thông qua Biến môi trường.

---

## 5. Các trạng thái Deploy trên Vercel
*   **Ready:** Website đã online thành công.
*   **Building:** Đang thực hiện quá trình cài đặt và đóng gói.
*   **Error:** Quá trình build thất bại (thường do lỗi code hoặc thiếu thư viện). bạn có thể xem **Build Logs** để biết lý do cụ thể.

---

**Kết luận:** Vercel giúp bạn loại bỏ hoàn toàn việc phải cấu hình máy chủ Linux, cài đặt Nginx hay quản lý cổng (Port). Bạn chỉ việc tập trung vào viết code, phần "đưa lên mạng" đã có Vercel lo!
