# Use Case 7: Đăng ký tài khoản người dùng

## 1. Mục tiêu
Cung cấp khả năng cho sinh viên và người dùng mới tạo tài khoản trên hệ thống **TLU Document**. Sau khi đăng ký thành công, người dùng có thể đăng nhập để sử dụng các tính năng nâng cao như: Tải tài liệu, Tóm tắt AI, Tạo Sơ đồ tư duy, và Chatbot hỗ trợ học tập.

---

## 2. Luồng xử lý (Flow)

### 2.1. Phía Người dùng (Frontend - `app/auth/register/page.tsx`)
1.  **Nhập liệu:** Người dùng nhập các thông tin bắt buộc:
    *   Họ và tên
    *   Email (khuyến khích dùng email sinh viên `@tlu.edu.vn`)
    *   Mật khẩu
    *   Xác nhận mật khẩu
2.  **Kiểm tra tại chỗ (Client-side validation):**
    *   Kiểm tra mật khẩu và xác nhận mật khẩu phải trùng khớp.
    *   Đảm bảo các trường không được để trống.
3.  **Gửi yêu cầu:** Gọi API `/api/auth/register` với phương thức `POST`.
4.  **Phản hồi:** 
    *   Nếu thành công: Hiển thị thông báo (Toaster) và chuyển hướng sang trang Đăng nhập (`/auth/login`).
    *   Nếu thất bại: Hiển thị lỗi tương ứng (ví dụ: Email đã tồn tại).

### 2.2. Phía Máy chủ (Backend - `app/api/auth/register/route.ts`)
1.  **Tiếp nhận:** Nhận dữ liệu `fullName`, `email`, `password` từ request body.
2.  **Kết nối CSDL:** Sử dụng thông tin từ biến môi trường (`.env.local`) để kết nối tới MySQL.
3.  **Kiểm tra trùng lặp:** 
    *   Thực hiện câu lệnh `SELECT id FROM users WHERE email = ?`.
    *   Nếu tìm thấy bản ghi, trả về lỗi 400 (Email đã được đăng ký).
4.  **Lưu trữ:**
    *   Thực hiện câu lệnh `INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, 'student', 'active')`.
    *   Mặc định người dùng mới sẽ có vai trò là `student` và trạng thái `active`.
5.  **Kết thúc:** Đóng kết nối và trả về phản hồi thành công.

---

## 3. Chi tiết Mã nguồn và Giải thích

### 3.1. Phía Frontend (`app/auth/register/page.tsx`)
**Input:** `fullName`, `email`, `password`, `confirmPassword` (từ Form người dùng nhập).
**Output:** Thông báo thành công/thất bại và điều hướng trang.

```typescript
// Xử lý khi người dùng nhấn nút Đăng ký
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // 1. Kiểm tra mật khẩu khớp nhau trước khi gửi lên server
  if (password !== confirmPassword) {
    toast.error("Lỗi đăng ký", {
      description: "Xác nhận mật khẩu không khớp.",
    });
    return;
  }

  setIsLoading(true)

  try {
    // 2. Gửi dữ liệu dưới dạng JSON tới API
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await response.json();

    // 3. Xử lý phản hồi từ server
    if (data.success) {
      toast.success("Đăng ký thành công!");
      router.push("/auth/login"); // Chuyển hướng sang trang đăng nhập
    } else {
      toast.error("Đăng ký thất bại", { description: data.message });
    }
  } catch (error) {
    toast.error("Lỗi hệ thống", { description: "Không thể kết nối tới máy chủ." });
  } finally {
    setIsLoading(false)
  }
}
```

### 3.2. Phía Backend (`app/api/auth/register/route.ts`)
**Input:** Đối tượng JSON chứa `{ fullName, email, password }`.
**Output:** Trạng thái `success (boolean)` và `message (string)`.

```typescript
export async function POST(request: Request) {
  try {
    // 1. Giải mã dữ liệu từ Request Body
    const { fullName, email, password } = await request.json();

    // 2. Thiết lập kết nối tới MySQL
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    try {
      // 3. Truy vấn kiểm tra Email đã tồn tại trong bảng users chưa
      const [existingUsers]: any = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        // Trả về lỗi nếu email đã được sử dụng
        return NextResponse.json(
          { success: false, message: 'Email này đã được đăng ký sử dụng.' },
          { status: 400 }
        );
      }

      // 4. Nếu email hợp lệ, thực hiện thêm bản ghi mới
      // Mặc định: role='student', status='active'
      await connection.execute(
        'INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [fullName, email, password, 'student', 'active']
      );

      return NextResponse.json({
        success: true,
        message: 'Đăng ký tài khoản thành công!'
      });

    } finally {
      // 5. Luôn đóng kết nối sau khi truy vấn xong để tránh rò rỉ tài nguyên
      await connection.end();
    }
  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống' },
      { status: 500 }
    );
  }
}
```

---

## 4. Chi tiết Kỹ thuật

### 4.1. Cấu trúc bảng dữ liệu (`users`)
Dữ liệu được lưu trữ vào bảng `users` với các trường quan trọng:
- `full_name`: Tên đầy đủ hiển thị trên hệ thống.
- `email`: Định danh duy nhất để đăng nhập.
- `password_hash`: Hiện tại đang lưu mật khẩu thô (Kế hoạch: Sẽ nâng cấp lên Bcrypt hashing để đảm bảo bảo mật).
- `role`: Phân quyền người dùng (student/teacher/admin).
- `status`: Quản lý trạng thái tài khoản (active/inactive/suspended).

### 4.2. Công nghệ sử dụng
- **Next.js API Routes:** Xử lý logic đăng ký phía server.
- **MySQL2:** Thư viện giao tiếp với cơ sở dữ liệu.
- **Lucide React:** Hệ thống icon cho giao diện (User, Mail, Lock, v.v.).
- **Sonner:** Thư viện hiển thị thông báo (toast) chuyên nghiệp.
- **Tailwind CSS:** Xử lý giao diện hiện đại với hiệu ứng Glassmorphism và Gradient nền.

---

## 4. Bảo mật và Nâng cấp trong tương lai
- [ ] **Mã hóa mật khẩu:** Tích hợp `bcryptjs` để băm mật khẩu trước khi lưu vào CSDL thay vì lưu văn bản thuần.
- [ ] **Xác thực Email:** Gửi mã OTP hoặc Link xác nhận qua email sinh viên để kích hoạt tài khoản.
- [ ] **Phân vai trò:** Tự động nhận diện email cán bộ/giáo viên để gán role `teacher`.
- [ ] **OAuth2:** Hỗ trợ đăng ký/đăng nhập nhanh thông qua Google hoặc tài khoản Microsoft của nhà trường.
