import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 })
  }
  // Đảm bảo tên file an toàn
  const fileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await fs.mkdir(uploadDir, { recursive: true })
  const uploadPath = path.join(uploadDir, fileName)
  const arrayBuffer = await file.arrayBuffer()
  await fs.writeFile(uploadPath, new Uint8Array(arrayBuffer))
  // Trả về URL public
  const publicUrl = `/uploads/${fileName}`
  return NextResponse.json({ url: publicUrl })
}
