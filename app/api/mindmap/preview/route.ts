import { NextResponse } from "next/server"
import mammoth from "mammoth"

export const runtime = "nodejs"

function extensionFromName(fileName: string) {
  const matched = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return matched?.[1] ?? ""
}

export async function POST(request: Request) {
  try {
    // Debug: log nhận request
    console.log("[mindmap.preview] Nhận request chuyển đổi preview file")
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file tải lên." }, { status: 400 })
    }
    const ext = extensionFromName(file.name)
    if (ext !== "docx") {
      return NextResponse.json({ error: "Chỉ hỗ trợ file .docx" }, { status: 415 })
    }
    // Vercel serverless functions do not have LibreOffice or MS Word.
    // They also have a read-only filesystem.
    // Instead of converting to PDF, we use mammoth to convert to HTML
    // and serve the HTML directly as a preview blob.
    
    // Đọc nội dung ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    try {
      console.log("[mindmap.preview] Chạy mammoth để convert to HTML...")
      const result = await mammoth.convertToHtml({ buffer })
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${file.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2rem; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
            th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${result.value}
        </body>
        </html>
      `
      
      return new Response(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="preview.html"`
        }
      })
    } catch (err) {
      console.error("[mindmap.preview] Lỗi mammoth convert:", err)
      return NextResponse.json({ error: "Không thể trích xuất HTML từ file docx." }, { status: 500 })
    }
  } catch (error) {
    console.error("[mindmap.preview] Lỗi server:", error)
    return NextResponse.json({ error: `Lỗi server khi chuyển đổi file: ${error}` }, { status: 500 })
  }
}
