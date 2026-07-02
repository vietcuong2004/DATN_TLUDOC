import { NextResponse } from 'next/server';
import { checkUserEmailExists, createUser } from '@/lib/repositories';

export async function POST(request: Request) {
  try {
    const { fullName, email, password } = await request.json();

    // 1. Kiểm tra email đã tồn tại chưa qua Repository
    const isEmailExists = await checkUserEmailExists(email);

    if (isEmailExists) {
      return NextResponse.json(
        { success: false, message: 'Email này đã được đăng ký sử dụng.' },
        { status: 400 }
      );
    }

    // 2. Thêm người dùng mới qua Repository (Mặc định role là student)
    const success = await createUser(fullName, email, password, 'student', 'active');

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Đăng ký tài khoản thành công!'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Không thể tạo tài khoản, cấu hình DB lỗi.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
