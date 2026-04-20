import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Kết nối Database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    try {
      // Truy vấn kiểm tra user với tên cột password_hash
      const [rows]: any = await connection.execute(
        'SELECT id, email, full_name, role, avatar_url FROM users WHERE email = ? AND password_hash = ?',
        [email, password]
      );

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
        return NextResponse.json(
          { success: false, message: 'Email hoặc mật khẩu không chính xác.' },
          { status: 401 }
        );
      }
    } finally {
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
