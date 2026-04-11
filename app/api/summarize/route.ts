import { NextResponse } from "next/server"
import { z } from "zod"

import { generateSummaryFromFile } from "@/lib/summarize"

export const runtime = "nodejs"
export const maxDuration = 60

const RequestSchema = z.object({
  summaryType: z.enum(["paragraph", "bullets"]),
  summaryLength: z.number().int().min(10).max(100).default(30),
  language: z.enum(["vi", "en"]).default("vi"),
})

function parseNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const summaryType = String(formData.get("summaryType") ?? "paragraph")
    const summaryLength = parseNumber(formData.get("summaryLength"), 30)
    const language = String(formData.get("language") ?? "vi")

    const parsed = RequestSchema.parse({
      summaryType,
      summaryLength,
      language,
    })

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Vui lòng chọn file PDF hoặc Word (.docx)." }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu POLLINATIONS_API_KEY. Vui lòng cấu hình biến môi trường để tóm tắt tài liệu." },
        { status: 500 },
      )
    }

    const model = (process.env.SUMMARY_MODEL || process.env.CHATBOT_MODEL || "openai").trim()
    const maxChunkChars = Number.parseInt(process.env.SUMMARY_CHUNK_MAX_CHARS || "2500", 10)
    const maxChunks = Number.parseInt(process.env.SUMMARY_MAX_CHUNKS || "8", 10)

    const result = await generateSummaryFromFile({
      file,
      apiKey,
      model,
      summaryType: parsed.summaryType,
      summaryLength: parsed.summaryLength,
      language: parsed.language,
      maxChunkChars: Number.isFinite(maxChunkChars) ? maxChunkChars : 2500,
      maxChunks: Number.isFinite(maxChunks) ? maxChunks : 8,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[summarize.generate]", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload không hợp lệ.", details: error.flatten() }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Không thể tạo bản tóm tắt."
    const status = message.includes("không được hỗ trợ") ? 415 : 500

    return NextResponse.json({ error: message }, { status })
  }
}