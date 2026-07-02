import { NextResponse } from "next/server"
import { z } from "zod"

import { generateSummaryFromFile } from "@/lib/summarize"
import { executeCommand } from "@/lib/mysql"

export const runtime = "nodejs"
export const maxDuration = 60

const RequestSchema = z.object({
  language: z.enum(["vi", "en"]).default("vi"),
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const language = String(formData.get("language") ?? "vi")
    const userId = formData.get("userId")
    const documentName = String(formData.get("documentName") ?? "Tài liệu không tên")

    const parsed = RequestSchema.parse({
      language,
    })

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Vui lòng chọn file PDF hoặc Word (.docx)." }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.POLLINATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu OPENAI_API_KEY, GEMINI_API_KEY hoặc POLLINATIONS_API_KEY. Vui lòng cấu hình biến môi trường để tóm tắt tài liệu." },
        { status: 500 },
      )
    }

    const model = (process.env.SUMMARY_MODEL || process.env.CHATBOT_MODEL || "gpt-4o-mini").trim()
    const maxChunkChars = Number.parseInt(process.env.SUMMARY_CHUNK_MAX_CHARS || "2500", 10)
    const maxChunks = Number.parseInt(process.env.SUMMARY_MAX_CHUNKS || "8", 10)

    const result = await generateSummaryFromFile({
      file,
      apiKey,
      model,
      summaryType: "paragraph",
      summaryLength: 30,
      language: parsed.language,
      maxChunkChars: Number.isFinite(maxChunkChars) ? maxChunkChars : 2500,
      maxChunks: Number.isFinite(maxChunks) ? maxChunks : 8,
    })

    // Lưu vào cơ sở dữ liệu nếu có userId
    if (userId && result.summary) {
      try {
        await executeCommand(
          "INSERT INTO document_summaries (user_id, document_name, summary_text, ai_model) VALUES (?, ?, ?, ?)",
          [userId, documentName, result.summary, model]
        );
      } catch (dbError) {
        console.error("[summarize.db_error]", dbError);
        // Không throw error ở đây để người dùng vẫn nhận được kết quả tóm tắt trên UI
      }
    }

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