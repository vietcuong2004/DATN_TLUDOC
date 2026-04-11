import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
import { randomUUID } from "crypto"
import fs from "fs/promises"
import path from "path"

const execFileAsync = promisify(execFile)

export const runtime = "nodejs"

// Thư mục tạm để lưu file upload và file PDF (tương thích Windows)
const TMP_DIR = process.env.TEMP || process.env.TMP || "C:/Temp"

function extensionFromName(fileName: string) {
  const matched = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return matched?.[1] ?? ""
}

export async function POST(request: Request) {
  try {
    // Debug: log đường dẫn thư mục tạm
    console.log("[mindmap.preview] TMP_DIR:", TMP_DIR)
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file tải lên." }, { status: 400 })
    }
    const ext = extensionFromName(file.name)
    if (ext !== "docx") {
      return NextResponse.json({ error: "Chỉ hỗ trợ file .docx" }, { status: 415 })
    }
    // Lưu file tạm
    const uuid = randomUUID()
    const inputPath = path.join(TMP_DIR, `${uuid}.docx`)
    const outputPath = path.join(TMP_DIR, `${uuid}.pdf`)
    const arrayBuffer = await file.arrayBuffer()
    // Debug: log đường dẫn file tạm
    console.log("[mindmap.preview] inputPath:", inputPath)
    await fs.writeFile(inputPath, new Uint8Array(arrayBuffer))
    // Chuyển đổi bằng MS Word (COM) qua PowerShell
    try {
      console.log("[mindmap.preview] Chạy PowerShell & MS Word chuyển đổi PDF...")
      const psCommand = `
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open('${inputPath}')
  $doc.SaveAs('${outputPath}', 17)
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
`
      await execFileAsync("powershell", ["-Command", psCommand])
      console.log("[mindmap.preview] Chuyển đổi xong:", outputPath)
    } catch (err) {
      console.error("[mindmap.preview] Lỗi khi chạy MS Word qua PowerShell:", err)
      await fs.unlink(inputPath).catch(() => {})
      return NextResponse.json({ error: "Không thể chuyển đổi file docx sang PDF. Đảm bảo đã cài MS Word hoặc libreoffice." }, { status: 500 })
    }
    // Đọc file PDF trả về
    const pdfBuffer = await fs.readFile(outputPath)
    console.log("[mindmap.preview] Đọc file PDF thành công:", outputPath)
    // Chuyển Buffer sang ArrayBuffer slice, đảm bảo là ArrayBuffer thực sự
    let pdfArrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)
    // Nếu là SharedArrayBuffer, copy sang ArrayBuffer mới
    if (!(pdfArrayBuffer instanceof ArrayBuffer)) {
      const tmp = new Uint8Array(pdfBuffer.byteLength)
      tmp.set(new Uint8Array(pdfBuffer))
      pdfArrayBuffer = tmp.buffer
    }
    // Xoá file tạm
    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})
    // Trả về Blob thay vì Buffer để tránh lỗi kiểu
    return new Response(new Blob([pdfArrayBuffer], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(file.name.replace(/\.docx$/, ".pdf"))}`
      }
    })
  } catch (error) {
    console.error("[mindmap.preview] Lỗi server:", error)
    return NextResponse.json({ error: `Lỗi server khi chuyển đổi file: ${error}` }, { status: 500 })
  }
}
