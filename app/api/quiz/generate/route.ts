import { NextResponse } from "next/server"
import mammoth from "mammoth"

if (typeof global !== "undefined" && typeof (global as any).DOMMatrix === "undefined") {
  (global as any).DOMMatrix = class DOMMatrix {}
}
const pdfParse = require("pdf-parse")
import { generateQuizFromText } from "@/lib/quiz"

export const runtime = "nodejs"

// Tăng max duration lên 120 giây (dành cho Hobby plan Vercel Pro/Enterprise, Next.js 13+ app router)
export const maxDuration = 120 

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
    const PDFParseClass = (pdfParse as any).PDFParse
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
    console.error("[quiz.generate] Lỗi khi đọc PDF:", error)
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

    const apiKey = process.env.POLLINATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu POLLINATIONS_API_KEY trong cấu hình server." },
        { status: 500 },
      )
    }

    const model = (process.env.CHATBOT_MODEL || process.env.MINDMAP_MODEL || "gpt-4o-mini").trim()

    const extension = extensionFromName(file.name)
    const buffer = Buffer.from(await file.arrayBuffer())

    let text = ""

    if (extension === "txt") {
      text = normalizeExtractedText(buffer.toString("utf-8"))
    } else if (extension === "pdf") {
      text = await extractPdfText(buffer)
    } else if (extension === "docx") {
      const parsed = await mammoth.extractRawText({ buffer })
      text = normalizeExtractedText(parsed.value ?? "")
    } else if (extension === "doc") {
      return NextResponse.json(
        { error: "Định dạng .doc cũ khó trích xuất chính xác. Vui lòng chuyển sang .docx hoặc .pdf." },
        { status: 415 },
      )
    } else {
      return NextResponse.json({ error: "Định dạng file chưa được hỗ trợ." }, { status: 415 })
    }

    if (!text || text.length < 100) {
      return NextResponse.json({ error: "File không đủ nội dung để tạo quiz." }, { status: 400 })
    }

    console.log("[quiz.generate] Extracted text length:", text.length)

    // Tạo quiz từ text
    const result = await generateQuizFromText({
      text,
      apiKey,
      model,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[quiz.generate]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Có lỗi xảy ra trong quá trình tạo quiz." }, { status: 500 })
  }
}
