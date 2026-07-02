import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/repositories';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Xác thực tài khoản qua Repository
    const user = await authenticateUser(email, password);

    if (user) {
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
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
