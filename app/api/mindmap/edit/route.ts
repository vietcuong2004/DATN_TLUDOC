import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mindmap } = body

    if (!mindmap) {
      return NextResponse.json({ success: false, error: "Missing mindmap data" }, { status: 400 })
    }

    // Ở đây bạn có thể cập nhật vào database (ví dụ Prisma, MongoDB, etc.)
    // ...

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
