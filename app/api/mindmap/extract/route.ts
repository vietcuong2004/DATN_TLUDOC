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
  try {
    if (typeof global !== "undefined" && typeof (global as any).DOMMatrix === "undefined") {
      (global as any).DOMMatrix = class DOMMatrix {}
    }
    const pdfParseModule = (await import(/* webpackIgnore: true */ "pdf-parse")) as any
    const pdfParse = pdfParseModule.default || pdfParseModule

    const PDFParseClass = pdfParse.PDFParse
    if (PDFParseClass && typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: Uint8Array.from(buffer) })
      const parsed = await parser.getText()
      if (typeof parser.destroy === "function") await parser.destroy()
      return normalizeExtractedText(parsed.text ?? "")
    }

    const legacyPdfParse = typeof pdfParse === "function" ? pdfParse : (pdfParse as any).default
    if (typeof legacyPdfParse === "function") {
      const parsed = await legacyPdfParse(buffer)
      return normalizeExtractedText(parsed.text ?? "")
    }
    
    throw new Error("Phiên bản pdf-parse không tương thích")
  } catch (error) {
    console.error("[mindmap.extract] Lỗi khi đọc PDF:", error)
    throw new Error("Không thể trích xuất chữ từ PDF.")
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
