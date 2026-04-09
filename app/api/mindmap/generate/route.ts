import { NextResponse } from "next/server"
import { z } from "zod"

import { generateMindmapWithGemini } from "@/lib/mindmap-gemini"

export const runtime = "nodejs"

const RequestSchema = z.object({
  fileName: z.string().min(1),
  text: z.string().min(1),
  maxChunkChars: z.number().int().min(2500).max(30000).optional(),
  maxChunks: z.number().int().min(1).max(20).optional(),
})

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json())

    const apiKey = process.env.POLLINATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thieu POLLINATIONS_API_KEY. Vui long cau hinh bien moi truong de sinh mindmap." },
        { status: 500 },
      )
    }

    const model = (process.env.MINDMAP_MODEL || process.env.CHATBOT_MODEL || "openai").trim()
    const maxChunkChars =
      body.maxChunkChars ??
      Number.parseInt(process.env.MINDMAP_CHUNK_MAX_CHARS || "12000", 10)
    const maxChunks =
      body.maxChunks ??
      Number.parseInt(process.env.MINDMAP_MAX_CHUNKS || "8", 10)

    const result = await generateMindmapWithGemini({
      fileName: body.fileName,
      text: body.text,
      apiKey,
      model,
      maxChunkChars: Number.isFinite(maxChunkChars) ? maxChunkChars : 12000,
      maxChunks: Number.isFinite(maxChunks) ? maxChunks : 8,
    })

    return NextResponse.json({
      model,
      chunkCount: result.chunkCount,
      mindmap: result.mindmap,
      simpleTree: result.simpleTree,
    })
  } catch (error) {
    console.error("[mindmap.generate]", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload khong hop le.", details: error.flatten() }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Khong the sinh mindmap tu Gemini."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
