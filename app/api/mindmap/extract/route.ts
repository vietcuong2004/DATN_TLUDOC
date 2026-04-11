import { NextResponse } from "next/server"
import mammoth from "mammoth"

export const runtime = "nodejs"

function extensionFromName(fileName: string) {
  const matched = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return matched?.[1] ?? ""
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function extractPdfText(buffer: Buffer) {
  const pdfParseModule = await import("pdf-parse")
  const PDFParseClass = pdfParseModule.PDFParse
  const parser = new PDFParseClass({ data: Uint8Array.from(buffer) })

  try {
    const parsed = await parser.getText()
    return normalizeExtractedText(parsed.text ?? "")
  } finally {
    await parser.destroy()
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file tải lên." }, { status: 400 })
    }

    const extension = extensionFromName(file.name)
    const buffer = Buffer.from(await file.arrayBuffer())

    if (extension === "txt") {
      const text = normalizeExtractedText(buffer.toString("utf-8"))
      return NextResponse.json({ text })
    }

    if (extension === "pdf") {
      const text = await extractPdfText(buffer)
      return NextResponse.json({ text })
    }

    if (extension === "docx") {
      const parsed = await mammoth.extractRawText({ buffer })
      const text = normalizeExtractedText(parsed.value ?? "")
      console.log("[mindmap.extract] DOCX text length:", text.length)
      if (text.length < 20) {
        console.log("[mindmap.extract] DOCX text content:", text)
      }
      return NextResponse.json({ text })
    }

    if (extension === "doc") {
      return NextResponse.json(
        { error: "Định dạng .doc cũ khó trích xuất chính xác. Vui lòng chuyển sang .docx hoặc .pdf." },
        { status: 415 },
      )
    }

    return NextResponse.json({ error: "Định dạng file chưa được hỗ trợ." }, { status: 415 })
  } catch (error) {
    console.error("[mindmap.extract]", error)
    return NextResponse.json({ error: "Không thể trích xuất nội dung từ tài liệu." }, { status: 500 })
  }
}
