# Use Case 8: Đăng nhập hệ thống

## 1. Mục tiêu
Xác thực danh tính người dùng để cho phép truy cập vào các tài nguyên cá nhân và các tính năng AI của hệ thống **TLU Document**. Đảm bảo thông tin người dùng được bảo mật và duy trì trạng thái đăng nhập trong suốt phiên làm việc.

---

## 2. Luồng xử lý (Flow)

### 2.1. Phía Người dùng (Frontend - `app/auth/login/page.tsx`)
1.  **Nhập liệu:** Người dùng nhập Email và Mật khẩu.
2.  **Gửi yêu cầu:** Gọi API `/api/auth/login` với phương thức `POST`.
3.  **Xử lý phản hồi:** 
    *   Nếu thành công: 
        *   Lưu thông báo thành công.
        *   Lưu trạng thái `isLoggedIn = "true"` vào `localStorage`.
        *   Lưu thông tin người dùng (JSON) vào `localStorage` dưới khóa `user`.
        *   Điều hướng về trang chủ (`/`).
    *   Nếu thất bại: Hiển thị lỗi (Email/Mật khẩu không đúng).

### 2.2. Phía Máy chủ (Backend - `app/api/auth/login/route.ts`)
1.  **Tiếp nhận:** Nhận `email` và `password` từ request body.
2.  **Kết nối CSDL:** Mở kết nối tới MySQL bằng các biến môi trường.
3.  **Xác thực:** 
    *   Thực hiện câu lệnh: `SELECT id, email, full_name, role, avatar_url FROM users WHERE email = ? AND password_hash = ?`.
    *   (Lưu ý: Hiện tại đang so sánh mật khẩu thô trực tiếp).
4.  **Phản hồi:**
    *   Nếu tìm thấy người dùng: Trả về vật thể `user` chứa thông tin cơ bản.
    *   Nếu không: Trả về lỗi 401 (Unauthorized).
5.  **Kết thúc:** Đóng kết nối CSDL.

---

## 3. Chi tiết Mã nguồn và Giải thích

### 3.1. Phía Frontend (`app/auth/login/page.tsx`)
**Input:** `email`, `password`.
**Output:** Lưu Session vào LocalStorage và điều hướng trang.

```typescript
// Xử lý khi người dùng nhấn nút Đăng nhập
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)

  try {
    // 1. Gửi dữ liệu đăng nhập lên API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      // 2. Thông báo thành công và lưu thông tin vào trình duyệt
      toast.success("Đăng nhập thành công!", {
        description: `Chào mừng ${data.user.name} trở lại.`,
      });
      
      // Lưu trạng thái để các component khác (như Navbar) có thể sử dụng
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // 3. Điều hướng về trang chủ
      router.push("/");
    } else {
      toast.error("Đăng nhập thất bại", { description: data.message });
    }
  } catch (error) {
    toast.error("Lỗi hệ thống", { description: "Không thể kết nối tới máy chủ." });
  } finally {
    setIsLoading(false)
  }
}
```

### 3.2. Phía Backend (`app/api/auth/login/route.ts`)
**Input:** `{ email, password }`.
**Output:** Thông tin người dùng thu gọn hoặc thông báo lỗi.

```typescript
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Kết nối CSDL
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    try {
      // 2. Truy vấn tìm kiếm người dùng khớp cả email và mật khẩu
      const [rows]: any = await connection.execute(
        'SELECT id, email, full_name, role, avatar_url FROM users WHERE email = ? AND password_hash = ?',
        [email, password]
      );

      // 3. Kiểm tra kết quả trả về
      if (rows.length > 0) {
        const user = rows[0];
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role,
            avatar: user.avatar_url
          }
        });
      } else {
        // Trả về lỗi 401 nếu không khớp thông tin
        return NextResponse.json(
          { success: false, message: 'Email hoặc mật khẩu không chính xác.' },
          { status: 401 }
        );
      }
    } finally {
      // 4. Giải phóng kết nối
      await connection.end();
    }
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
```

---

## 4. Chi tiết Kỹ thuật

### 4.1. Cơ chế Quản lý Phiên (Session Management)
- **LocalStorage:** Hệ thống hiện đang sử dụng `localStorage` để duy trì trạng thái đăng nhập. Điều này giúp người dùng không phải đăng nhập lại khi F5 trang web.
- **Dữ liệu lưu trữ:** 
    - `isLoggedIn`: Đánh dấu trạng thái.
    - `user`: Chứa ID, Name, Role, Avatar để hiển thị trên UI (ví dụ: Navbar).

### 4.2. Công nghệ sử dụng
- **Next.js Client Components:** Sử dụng Hooks (`useState`, `useRouter`) để xử lý logic phía người dùng.
- **MySQL2:** Xử lý truy vấn xác thực người dùng.
- **Tailwind CSS & Lucide Icons:** Xây dựng giao diện trang đăng nhập hiện đại, trực quan.

---

## 5. Bảo mật và Nâng cấp trong tương lai
- [ ] **JWT (JSON Web Token):** Chuyển sang sử dụng JWT để xác thực an toàn hơn, thay vì chỉ lưu thông tin đơn giản trong LocalStorage.
- [ ] **Bcrypt Hashing:** So sánh mật khẩu đã được băm (hash) để tránh lộ mật khẩu thô trong DB.
- [ ] **Middleware bảo vệ Route:** Cấu hình Next.js Middleware để chặn người dùng chưa đăng nhập truy cập các trang như `/summarize`, `/mindmap`.
- [ ] **Remember Me:** Tích hợp Cookie có thời hạn lâu dài nếu người dùng tích chọn "Ghi nhớ đăng nhập".
