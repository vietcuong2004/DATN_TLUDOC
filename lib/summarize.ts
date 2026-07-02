import "@/lib/polyfills"
import mammoth from "mammoth"
import { END_POINT } from "@/lib/ai-model"

const pdfParse = require("pdf-parse")

export type SummaryFormat = "paragraph" | "bullets"
export type SummaryLanguage = "vi" | "en"

export type SummaryMeta = {
  fileName: string
  fileType: string
  wordCount: number
  chunkCount: number
  summaryType: SummaryFormat
  language: SummaryLanguage
}

export type SummaryResult = {
  summary: string
  meta: SummaryMeta
}

type TextChunk = {
  id: string
  text: string
  startIdx: number
  endIdx: number
}

type OpenAIOptions = {
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  summaryType?: SummaryFormat
  jsonMode?: boolean
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
}

function normalizeModelName(modelName: string) {
  const trimmed = modelName.trim()
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function extensionFromName(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ""
}

function inferKind(file: File) {
  const extension = extensionFromName(file.name)
  const mimeType = file.type.toLowerCase()

  if (extension === "pdf" || mimeType === "application/pdf") {
    return "pdf" as const
  }

  if (extension === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx" as const
  }

  if (extension === "doc" || mimeType === "application/msword") {
    return "doc" as const
  }

  if (extension === "txt" || mimeType.includes("text/")) {
    return "txt" as const
  }

  return "unknown" as const
}

async function extractPdfText(buffer: Buffer) {
  try {
    const PDFParseClass = pdfParse.PDFParse
    if (PDFParseClass && typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: Uint8Array.from(buffer) })
      const parsed = await parser.getText()
      if (typeof parser.destroy === "function") await parser.destroy()
      return normalizeWhitespace(parsed.text ?? "")
    }

    const legacyPdfParse = typeof pdfParse === "function" ? pdfParse : (pdfParse as any).default
    if (typeof legacyPdfParse === "function") {
      const parsed = await legacyPdfParse(buffer)
      return normalizeWhitespace(parsed.text ?? "")
    }

    throw new Error("Phiên bản pdf-parse không tương thích")
  } catch (error) {
    console.error("[summarize] Lỗi khi đọc PDF:", error)
    throw new Error("Không thể trích xuất chữ từ PDF.")
  }
}

async function extractWordText(buffer: Buffer) {
  const parsed = await mammoth.extractRawText({ buffer })
  return normalizeWhitespace(parsed.value ?? "")
}

export async function extractTextFromFile(file: File) {
  const kind = inferKind(file)

  if (kind === "doc") {
    throw new Error("Định dạng .doc cũ chưa được hỗ trợ. Vui lòng chuyển sang .docx hoặc .pdf.")
  }

  if (kind === "unknown") {
    throw new Error("Chỉ hỗ trợ file PDF hoặc Word (.docx).")
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (kind === "txt") {
    return normalizeWhitespace(buffer.toString("utf-8"))
  }

  if (kind === "pdf") {
    return extractPdfText(buffer)
  }

  return extractWordText(buffer)
}

export function preprocessText(text: string) {
  return text
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function smartChunk(text: string, targetSize = 2500): TextChunk[] {
  const chunks: TextChunk[] = []
  let currentIdx = 0
  let chunkNumber = 0

  while (currentIdx < text.length) {
    let endIdx = Math.min(currentIdx + targetSize, text.length)

    if (endIdx < text.length) {
      const periodIdx = text.lastIndexOf(".", endIdx)
      if (periodIdx !== -1 && periodIdx > currentIdx + Math.floor(targetSize / 2)) {
        endIdx = periodIdx + 1
      } else {
        const spaceIdx = text.lastIndexOf(" ", endIdx)
        if (spaceIdx > currentIdx + Math.floor(targetSize / 2)) {
          endIdx = spaceIdx
        }
      }
    }

    const chunkText = text.slice(currentIdx, endIdx).trim()
    if (chunkText.length > 100 || chunks.length === 0 || endIdx === text.length) {
      chunks.push({
        id: `chunk-${chunkNumber}`,
        text: chunkText,
        startIdx: currentIdx,
        endIdx,
      })
      chunkNumber += 1
    }

    currentIdx = endIdx
  }

  return chunks
}

function stripMarkdownArtifacts(text: string) {
  return text
    .replace(/^```(?:json|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^#+\s+/gm, "")
    .trim()
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
}

function stripSectionLabels(text: string) {
  return text
    .replace(/^\s*(insight\s*ch[ií]nh|nội\s*dung\s*ch[ií]nh)\s*:\s*/gim, "")
    .replace(/^\s*nội\s*dung\s*chi\s*tiết\s*:\s*/gim, "")
    .replace(/insight\s*ch[ií]nh/gi, "")
    .trim()
}

function normalizeBulletLines(text: string) {
  const cleanedText = stripInlineMarkdown(text)

  const directLines = cleanedText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const candidateLines =
    directLines.length > 1
      ? directLines
      : cleanedText
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter(Boolean)

  return candidateLines
    .map((line) => line.replace(/^[\s•\-*\u2022:;,.\-]+/, "").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => `• ${line}`)
    .join("\n")
}

export function normalizeSummary(text: string, summaryType: SummaryFormat) {
  const cleaned = stripSectionLabels(stripInlineMarkdown(stripMarkdownArtifacts(text)))

  if (summaryType === "bullets") {
    return normalizeBulletLines(cleaned)
  }

  return normalizeWhitespace(cleaned)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s*\n\s*/g, " ")
    .trim()
}

function estimateMaxTokens(summaryLength: number, summaryType: SummaryFormat) {
  const base = summaryType === "bullets" ? 240 : 180
  const adjusted = base + Math.round(summaryLength * 4.5)
  return Math.max(140, Math.min(1000, adjusted))
}

function buildDeterministicFallback(messages: Array<{ content: string }>, summaryType: SummaryFormat) {
  const joined = messages.map((message) => message.content).join("\n\n")
  
  let markedIndex = joined.indexOf("=== NỘI DUNG CẦN TÓM TẮT ===")
  let markerLength = 28
  if (markedIndex === -1) {
    markedIndex = joined.indexOf("=== NỘI DUNG TÀI LIỆU ===")
    markerLength = 25
  }
  if (markedIndex === -1) {
    markedIndex = joined.indexOf("=== ĐOẠN VĂN BẢN ===")
    markerLength = 20
  }
  if (markedIndex === -1) {
    markedIndex = joined.indexOf("=== NỘI DUNG ===")
    markerLength = 16
  }

  const source = normalizeWhitespace(markedIndex >= 0 ? joined.slice(markedIndex + markerLength) : joined)

  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 25)

  if (summaryType === "bullets") {
    const bulletLines = (sentences.length ? sentences : [source])
      .slice(0, 6)
      .map((line) => line.replace(/^[\s•\-*\u2022]+/, "").trim())
      .filter(Boolean)
      .map((line) => `• ${line}`)

    return bulletLines.join("\n") || "• Không thể tạo tóm tắt từ tài liệu hiện tại."
  }

  const paragraph = (sentences.length ? sentences : [source]).slice(0, 4).join(" ").trim()
  return paragraph || "Không thể tạo tóm tắt từ tài liệu hiện tại."
}

function buildDeterministicSummaryFromSource(source: string, summaryType: SummaryFormat, summaryLength: number) {
  const cleaned = normalizeWhitespace(source)
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)

  if (summaryType === "bullets") {
    const bulletCount = summaryLength <= 25 ? 4 : summaryLength <= 55 ? 6 : 8
    const bulletLines = (sentences.length ? sentences : [cleaned])
      .slice(0, bulletCount)
      .map((line) => line.replace(/^[\s•\-*\u2022]+/, "").trim())
      .filter(Boolean)
      .map((line) => `• ${line}`)

    return bulletLines.join("\n") || "• Không thể tạo tóm tắt từ tài liệu hiện tại."
  }

  const sentenceCount = summaryLength <= 25 ? 2 : summaryLength <= 55 ? 3 : 5
  const paragraph = (sentences.length ? sentences : [cleaned]).slice(0, sentenceCount).join(" ").trim()
  return paragraph || "Không thể tạo tóm tắt từ tài liệu hiện tại."
}

function normalizeMainContent(mainText: string) {
  const cleaned = stripSectionLabels(stripInlineMarkdown(stripMarkdownArtifacts(mainText)))
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) {
    return "Tài liệu tập trung vào các nội dung cốt lõi và các điểm quan trọng cần nắm."
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return (sentences.length ? sentences.slice(0, 2).join(" ") : cleaned).trim()
}

function formatStructuredSummary(mainContent: string, detailContent: string, summaryType: SummaryFormat) {
  const normalizedMain = normalizeMainContent(mainContent)
  const normalizedDetail = normalizeSummary(detailContent, summaryType)

  if (summaryType === "bullets") {
    const bulletLines = normalizedDetail
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[\s•\-*\u2022:;,.\-]+/, "").trim())
      .filter(Boolean)
      .map((line) => `• ${line}`)
      .join("\n")

    return `Nội dung chính: ${normalizedMain}\n\nNội dung chi tiết:\n${bulletLines}`.trim()
  }

  return `Nội dung chính: ${normalizedMain}\n\nNội dung chi tiết: ${normalizedDetail}`.trim()
}

function looksLikeMissingContextResponse(text: string) {
  const normalized = text.toLowerCase()
  const markers = [
    "rất tiếc",
    "chỉ nhận được",
    "một phần",
    "không còn nội dung",
    "gửi lại toàn bộ",
    "gửi lại văn bản",
    "không thể tóm tắt",
    "thiếu nội dung",
    "phần còn thiếu",
  ]

  return markers.some((marker) => normalized.includes(marker))
}

async function callWithRetries<T>(fn: (temperature: number) => Promise<T>, temperatures: number[]) {
  let lastError: unknown = null

  for (const temperature of temperatures) {
    try {
      return await fn(temperature)
    } catch (error) {
      lastError = error
    }
  }

  throw (lastError instanceof Error ? lastError : new Error("Retry failed"))
}

function getOpenAIModelName(modelName: string) {
  const trimmed = modelName.trim().toLowerCase()
  if (trimmed === "gpt-5.4-mini") {
    return "gpt-4o-mini"
  }
  if (trimmed.startsWith("gpt-") || trimmed.startsWith("o1-") || trimmed.startsWith("o3-")) {
    return trimmed
  }
  return "gpt-4o-mini"
}

async function callOpenAIChat(options: OpenAIOptions) {
  const model = getOpenAIModelName(options.model || "gpt-4o-mini")
  
  try {
    const body: any = {
      model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }

    if (options.jsonMode) {
      body.response_format = { type: "json_object" }
    }

    const response = await fetch(END_POINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${errorBody || "Unknown error"}`)
    }

    const payload = await response.json()
    const content = payload.choices?.[0]?.message?.content?.trim() || ""
    if (content) {
      return content
    }

    throw new Error("Empty response from OpenAI API")
  } catch (error) {
    console.error("[summarize.callOpenAIChat.error]", error)
    throw error
  }
}

async function summarizeChunk(chunkText: string, summaryType: SummaryFormat, apiKey: string, model: string) {
  const systemPrompt =
    summaryType === "bullets"
      ? "Bạn là trợ lý tóm tắt tài liệu. Chỉ giữ ý quan trọng, không bịa thêm thông tin, không xin thêm dữ liệu."
      : "Bạn là trợ lý tóm tắt tài liệu. Viết ngắn gọn, rõ ý, không thêm thông tin ngoài văn bản."

  return callWithRetries(
    async (temperature) =>
      callOpenAIChat({
        apiKey,
        model,
        summaryType,
        temperature,
        maxTokens: 320,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: chunkText },
        ],
      }),
    [0.2, 0.15, 0.1],
  )
}

async function summarizeChunkBatch(chunks: TextChunk[], summaryType: SummaryFormat, apiKey: string, model: string) {
  const summaries: string[] = []

  for (let index = 0; index < chunks.length; index += 3) {
    const batch = chunks.slice(index, index + 3)
    const batchSummaries = await Promise.all(
      batch.map((chunk) => summarizeChunk(chunk.text, summaryType, apiKey, model)),
    )
    summaries.push(...batchSummaries)
  }

  return summaries
}

async function generateGlobalHint(text: string, apiKey: string, model: string) {
  const prompt = [
    "Hãy đọc tài liệu sau và mô tả ngắn gọn chủ đề chính trong 1-2 câu.",
    "Không liệt kê dài dòng.",
    "=== NỘI DUNG ===",
    text.slice(0, 3000),
  ].join("\n")

  return callWithRetries(
    async (temperature) =>
      callOpenAIChat({
        apiKey,
        model,
        temperature,
        maxTokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    [0.2, 0.1],
  )
}

async function summarizeChunkWithContext(
  chunkText: string,
  globalHint: string,
  summaryType: SummaryFormat,
  apiKey: string,
  model: string,
) {
  const prompt = [
    "Đây là một phần của tài liệu.",
    "Chủ đề tổng thể:",
    globalHint,
    "Nhiệm vụ:",
    "- Tóm tắt đoạn này",
    "- Chỉ giữ ý quan trọng",
    "- Không lặp ý chung",
    `Output: ${summaryType === "bullets" ? "bullet points" : "short paragraph"}`,
    "=== ĐOẠN VĂN BẢN ===",
    chunkText,
  ].join("\n")

  return callWithRetries(
    async (temperature) =>
      callOpenAIChat({
        apiKey,
        model,
        summaryType,
        temperature,
        maxTokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    [0.2, 0.15, 0.1],
  )
}

async function refineSummaries(
  summaries: string[],
  summaryType: SummaryFormat,
  apiKey: string,
  model: string,
) {
  const combined = summaries.join("\n")
  const prompt = [
    "Dưới đây là các ý chính rời rạc của một tài liệu:",
    combined,
    "Nhiệm vụ:",
    "1. Gộp các ý trùng",
    "2. Nhóm các ý liên quan",
    "3. Sắp xếp logic",
    "4. Chỉ giữ thông tin quan trọng",
    `Output: ${summaryType === "bullets" ? "bullet points" : "paragraph"}`,
    "Không thêm thông tin ngoài tài liệu.",
  ].join("\n")

  return callWithRetries(
    async (temperature) =>
      callOpenAIChat({
        apiKey,
        model,
        summaryType,
        temperature,
        maxTokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    [0.25, 0.2, 0.15],
  )
}

async function generateFinalSummary(options: {
  refinedText: string
  summaryType: SummaryFormat
  summaryLength: number
  language: SummaryLanguage
  apiKey: string
  model: string
  fileName: string
}) {
  const languageGuide = options.language === "vi" ? "Tiếng Việt" : "English"
  const systemPrompt = "Bạn là chuyên gia phân tích và tóm tắt tài liệu. Bạn PHẢI trả về kết quả dưới dạng JSON chính xác theo cấu trúc được yêu cầu."

  const prompt = `Bạn hãy phân tích tài liệu sau và tạo ra một bản tóm tắt có cấu trúc JSON chính xác bằng ${languageGuide}.
Tên tài liệu: "${options.fileName}"
Độ dài mong muốn: ${options.summaryLength}%

YÊU CẦU CẤU TRÚC JSON CẦN TRẢ VỀ:
{
  "summary": {
    "title": "Tiêu đề tóm tắt tài liệu ngắn gọn, hấp dẫn và mô tả đúng nội dung",
    "content": "Một đoạn văn tóm tắt tổng quan toàn bộ tài liệu (khoảng 150-250 từ). Hãy viết mạch lạc, trôi chảy bằng ${languageGuide}.",
    "highlights": [
      "Điểm nổi bật/Insight quan trọng 1",
      "Điểm nổi bật/Insight quan trọng 2",
      "Điểm nổi bật/Insight quan trọng 3",
      "Điểm nổi bật/Insight quan trọng 4",
      "Điểm nổi bật/Insight quan trọng 5"
    ],
    "sections": [
      {
        "title": "1. Tiêu đề phần 1 (ví dụ: '1. Giới thiệu khái quát')",
        "summary": "Tóm tắt ngắn gọn nội dung phần này (1-2 câu)"
      },
      {
        "title": "2. Tiêu đề phần 2 (ví dụ: '2. Các khái niệm cốt lõi')",
        "summary": "Tóm tắt ngắn gọn nội dung phần này (1-2 câu)"
      },
      {
        "title": "3. Tiêu đề phần 3",
        "summary": "Tóm tắt ngắn gọn nội dung phần này (1-2 câu)"
      }
    ],
    "keywords": ["từ khóa chính 1", "từ khóa chính 2", "từ khóa chính 3", "từ khóa chính 4", "từ khóa chính 5"],
    "wordCount": 123, // Số lượng từ ước tính của phần content
    "generatedBy": "${options.model}",
    "createdAt": "${new Date().toISOString()}"
  }
}

LƯU Ý QUAN TRỌNG:
1. Trả về đúng định dạng JSON. Không thêm bất kỳ văn bản giải thích nào khác ngoài JSON.
2. Không bọc JSON trong block code \`\`\`json.
3. Nếu tài liệu không chia chương/phần cụ thể, bạn hãy tự chia logic tài liệu thành 3-5 phần phù hợp.

=== NỘI DUNG TÀI LIỆU ===
${options.refinedText}`

  const modelResponse = await callWithRetries(
    async (temperature) =>
      callOpenAIChat({
        apiKey: options.apiKey,
        model: options.model,
        summaryType: options.summaryType,
        temperature,
        maxTokens: 1600,
        jsonMode: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    [0.2, 0.1, 0.15],
  )

  // Ghi log câu trả lời thô từ AI gửi về
  console.log("--- SUMMARIZE: AI RAW RESPONSE ---");
  console.log(modelResponse);
  console.log("----------------------------------");

  return modelResponse
}

function mergeSummaries(summaries: string[]) {
  const merged = summaries
    .map((summary) => normalizeWhitespace(summary))
    .filter(Boolean)
    .join("\n\n")

  const maxLength = 5000
  if (merged.length <= maxLength) {
    return merged
  }

  const sliced = merged.slice(0, maxLength)
  const safeCut = Math.max(sliced.lastIndexOf("."), sliced.lastIndexOf("!"), sliced.lastIndexOf("?"))
  return (safeCut > 100 ? sliced.slice(0, safeCut + 1) : sliced).trim()
}

function safeParseSummaryJson(rawText: string, extractedText: string, options: any) {
  let cleaned = rawText.trim()

  // Trích xuất JSON từ markdown block code hoặc giữa cặp ngoặc nhọn {} ngoài cùng
  const markdownJsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (markdownJsonMatch) {
    cleaned = markdownJsonMatch[1].trim()
  } else {
    const startIdx = cleaned.indexOf("{")
    const endIdx = cleaned.lastIndexOf("}")
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1).trim()
    }
  }
  cleaned = cleaned.trim()

  try {
    const data = JSON.parse(cleaned)
    if (data && data.summary) {
      const s = data.summary
      return {
        title: s.title || "Tóm tắt tài liệu",
        content: s.content || "Không có nội dung tóm tắt chính.",
        highlights: Array.isArray(s.highlights) ? s.highlights : [],
        sections: Array.isArray(s.sections) ? s.sections : [],
        keywords: Array.isArray(s.keywords) ? s.keywords : [],
        wordCount: typeof s.wordCount === "number" ? s.wordCount : (s.content ? s.content.split(/\s+/).filter(Boolean).length : 0),
        generatedBy: s.generatedBy || options.model,
        createdAt: s.createdAt || new Date().toISOString()
      }
    }
    if (data && data.title) {
      return {
        title: data.title || "Tóm tắt tài liệu",
        content: data.content || "Không có nội dung tóm tắt chính.",
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        sections: Array.isArray(data.sections) ? data.sections : [],
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        wordCount: typeof data.wordCount === "number" ? data.wordCount : (data.content ? data.content.split(/\s+/).filter(Boolean).length : 0),
        generatedBy: data.generatedBy || options.model,
        createdAt: data.createdAt || new Date().toISOString()
      }
    }
  } catch (err) {
    console.error("[summarize] Failed to parse JSON, trying regex extraction:", err)
  }

  try {
    const startIdx = cleaned.indexOf("{")
    const endIdx = cleaned.lastIndexOf("}")
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const candidate = cleaned.slice(startIdx, endIdx + 1)
      const data = JSON.parse(candidate)
      const s = data.summary || data
      if (s) {
        return {
          title: s.title || "Tóm tắt tài liệu",
          content: s.content || "Không có nội dung tóm tắt chính.",
          highlights: Array.isArray(s.highlights) ? s.highlights : [],
          sections: Array.isArray(s.sections) ? s.sections : [],
          keywords: Array.isArray(s.keywords) ? s.keywords : [],
          wordCount: typeof s.wordCount === "number" ? s.wordCount : (s.content ? s.content.split(/\s+/).filter(Boolean).length : 0),
          generatedBy: s.generatedBy || options.model,
          createdAt: s.createdAt || new Date().toISOString()
        }
      }
    }
  } catch (err2) {
    console.error("[summarize] Regex parsing also failed:", err2)
  }

  // Fallback structure
  const sentences = (cleaned || extractedText)
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  const content = sentences.slice(0, 5).join(" ")
  const highlights = sentences.slice(0, 5).map(s => s.replace(/^•\s*/, ""))

  return {
    title: `Tóm tắt ${options.file?.name || "tài liệu"}`,
    content: content || "Không có nội dung tóm tắt.",
    highlights: highlights.length > 0 ? highlights : ["Không có điểm nổi bật nào được trích xuất."],
    sections: [
      {
        title: "1. Tổng quan",
        summary: content.slice(0, 100) + "..."
      }
    ],
    keywords: [options.file?.name?.split(".")[0] || "Tài liệu", "Tóm tắt"],
    wordCount: content.split(/\s+/).filter(Boolean).length,
    generatedBy: options.model,
    createdAt: new Date().toISOString()
  }
}

export async function generateSummaryFromFile(options: {
  file: File
  apiKey: string
  model: string
  summaryType: SummaryFormat
  summaryLength: number
  language: SummaryLanguage
  maxChunkChars?: number
  maxChunks?: number
}): Promise<SummaryResult> {
  const extractedText = preprocessText(await extractTextFromFile(options.file))

  if (!extractedText || extractedText.length < 100) {
    throw new Error("Tài liệu quá ngắn hoặc không trích xuất được nội dung.")
  }

  const maxChunkChars = options.maxChunkChars ?? 2500
  const maxChunks = options.maxChunks ?? 8

  const chunks = smartChunk(extractedText, maxChunkChars).slice(0, maxChunks)
  const chunkCount = chunks.length

  if (!chunks.length) {
    throw new Error("Không thể chia tài liệu thành các đoạn hợp lệ.")
  }

  const globalHint = await generateGlobalHint(extractedText, options.apiKey, options.model)

  const chunkSummaries: string[] = []
  for (let index = 0; index < chunks.length; index += 3) {
    const batch = chunks.slice(index, index + 3)
    const batchSummaries = await Promise.all(
      batch.map((chunk) =>
        summarizeChunkWithContext(chunk.text, globalHint, options.summaryType, options.apiKey, options.model),
      ),
    )
    chunkSummaries.push(...batchSummaries)
  }

  const mergedChunkSummaries = mergeSummaries(chunkSummaries)
  const refined = await refineSummaries(
    [mergedChunkSummaries],
    options.summaryType,
    options.apiKey,
    options.model,
  )

  const summaryRaw = await generateFinalSummary({
    refinedText: refined,
    summaryType: options.summaryType,
    summaryLength: options.summaryLength,
    language: options.language,
    apiKey: options.apiKey,
    model: options.model,
    fileName: options.file.name,
  })

  const parsedSummary = safeParseSummaryJson(summaryRaw, extractedText, options)

  // Format as a stringified JSON to be stored in Database and returned to Client
  const summaryJsonStr = JSON.stringify({ summary: parsedSummary })

  // Ghi log kết quả tóm tắt cuối cùng gửi về cho người dùng
  console.log("--- FINAL SUMMARY RESULT (JSON) ---");
  console.log(summaryJsonStr);
  console.log("----------------------------");

  return {
    summary: summaryJsonStr,
    meta: {
      fileName: options.file.name,
      fileType: options.file.type || "unknown",
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      chunkCount,
      summaryType: options.summaryType,
      language: options.language,
    },
  }
}