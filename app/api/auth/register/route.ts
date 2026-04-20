import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: Request) {
  try {
    const { fullName, email, password } = await request.json();

    // Kết nối Database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    try {
      // 1. Kiểm tra email đã tồn tại chưa
      const [existingUsers]: any = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Email này đã được đăng ký sử dụng.' },
          { status: 400 }
        );
      }

      // 2. Thêm người dùng mới (Mặc định role là student)
      await connection.execute(
        'INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [fullName, email, password, 'student', 'active']
      );

      return NextResponse.json({
        success: true,
        message: 'Đăng ký tài khoản thành công!'
      });

    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
