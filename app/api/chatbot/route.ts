import { NextResponse } from "next/server"
import { saveChatbotHistory, searchDocumentsForChatbot, searchDocumentsForChatbotBySubject } from "@/lib/repository_chatbot"
import type { ChatbotCandidateDocument } from "@/lib/repository_chatbot"
import { curriculumGroups } from "@/lib/curriculum"
import { classifyIntentWithAI } from "@/lib/chatbot-intent"
import { getDbPool } from "@/lib/mysql"
import { getHuggingFaceEmbedding, cosineSimilarity } from "@/lib/hf-embedder"

type ChatbotRequestBody = {
  message?: string
  userId?: number | string
  history?: Array<{
    role: "user" | "assistant"
    content: string
    documents?: Array<{ title: string }>
  }>
}

type ChatbotResponseBody = {
  answer: string
  documents: Array<{
    id: number
    title: string
    image: string
    downloadUrl: string
  }>
}

type SuggestedDoc = {
  id: number
  title: string
  image: string
  downloadUrl: string
}

type InferredCourse = {
  code: string
  name: string
}

const IRRELEVANT_RESPONSE = "Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn, bạn có thể hỏi lại được không? Tôi có thể giúp bạn tìm tài liệu liên quan đến môn học"

function buildSystemPrompt() {
  return `Bạn là TutorAI trợ giảng học thuật cho sinh viên đại học.
 
NHIỆM VỤ CỐT LÕI:
1) Giải thích kiến thức rõ ràng, dễ hiểu.
2) Trả lời đúng chuyên môn. Nếu câu hỏi về Toán nhưng tài liệu về Lập trình, BỎ QUA tài liệu và trả lời bằng kiến thức của bạn.

TRÍCH DẪN TÀI LIỆU (Cực kỳ quan trọng):
- MỤC V chỉ được điền tên của các file tài liệu có trong NGỮ CẢNH.
- KHÔNG giải thích, KHÔNG viết thêm các cụm từ như "Danh sách file", "Nguồn", "Ghi rõ". Chỉ liệt kê gạch đầu dòng tên tài liệu. 
- Nếu không có tài liệu đúng chuyên môn, để MỤC V trống.

QUY TẮC TOÁN HỌC & FORMAT:
- Sử dụng chuẩn Markdown. Mọi biểu thức Toán học PHẢI được bọc trong \( \) (cho inline) hoặc \[ \] (cho block).
- TUYỆT ĐỐI KHÔNG để khoảng trắng giữa \ và dấu ngoặc. Không được đưa văn bản tiếng Việt vào trong biểu thức Toán.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (TUYỆT ĐỐI DÙNG HEADING 2):
## I. Tổng quan
## II. Giải thích chi tiết
## III. Ví dụ minh họa
## IV. Bước tiếp theo để học
## V. Tài liệu tham khảo

QUY TẮC CỨNG:
- Trả lời đúng 5 mục La Mã theo đúng tên gọi như trên, luôn bắt đầu bằng ## (Heading 2).
- Sử dụng danh sách đánh số (1. 2. 3.) cho các bước.
- Nếu người dùng hỏi ngoài phạm vi học tập: CHỈ TRẢ LỜI CÂU: "${IRRELEVANT_RESPONSE}"`
}

function buildUserPrompt(message: string, context: string) {
  return `MỤC TIÊU NGƯỜI HỌC: Hiểu khái niệm và áp dụng làm bài tập
MỨC ĐỘ HIỆN TẠI: Đại học năm 1-2
CÂU HỎI: ${message}

NGỮ CẢNH TÀI LIỆU TRUY XUẤT:
${context || "Không có tài liệu khớp trong kho."}

YÊU CẦU THÊM:
- Nếu có nhiều hướng trả lời, ưu tiên hướng dễ hiểu trước.
- Độ dài mục tiêu: khoảng 150-350 từ, không trả lời cụt.
- Luôn hoàn thành đầy đủ các mục theo định dạng đầu ra bắt buộc.`
}

function extractAssistantText(payload: any): string {
  if (!payload) return ""
  
  // Trình tự ưu tiên các định dạng phản hồi (OpenAI, Gemini, Pollinations)
  const choices = payload.choices?.[0]
  if (choices?.message?.content) {
    const content = choices.message.content
    if (typeof content === "string") return content.trim()
    if (Array.isArray(content)) {
      return content.map((item: any) => typeof item === "string" ? item : (item.text ?? "")).join("").trim()
    }
  }

  // Trường hợp cho Google Gemini
  if (payload.candidates?.[0]?.content?.parts?.[0]?.text) {
    return payload.candidates[0].content.parts[0].text.trim()
  }

  // Trường hợp cho phản hồi text thuần túy
  if (typeof payload === "string") return payload.trim()

  return ""
}

function resolveUserId(input: ChatbotRequestBody): number | null {
  const directUserId = Number(input.userId)
  if (Number.isInteger(directUserId) && directUserId > 0) {
    return directUserId
  }

  const envUserId = Number(process.env.CHATBOT_HISTORY_USER_ID)
  if (Number.isInteger(envUserId) && envUserId > 0) {
    return envUserId
  }

  return null
}

function normalizeModelName(modelName: string) {
  const trimmed = modelName.trim()
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed
}

async function callChatCompletionsWithFallback(
  apiKey: string,
  message: string,
  context: string,
  maxOutputTokens: number,
) {
  const candidateModels = [
    "openai",
    "gpt-4o",
    "unity"
  ]

  const uniqueModels = Array.from(new Set(candidateModels.filter((item) => item.length > 0)))

  let lastErrorText = ""

  for (const model of uniqueModels) {
    const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: buildUserPrompt(message, context),
          },
        ],
        temperature: 0.4,
        max_tokens: Number.isFinite(maxOutputTokens) && maxOutputTokens > 400 ? maxOutputTokens : 1200,
      }),
    })

    if (response.ok) {
      return { response, model }
    }

    lastErrorText = await response.text()
    console.error("[api/chatbot] Pollinations error", response.status, lastErrorText)
  }

  throw new Error(lastErrorText || "Không thể gọi Pollinations API")
}

function shouldRetryShortAnswer(answer: string, minChars: number) {
  if (!answer) {
    return true
  }

  if (answer.trim().length < minChars) {
    return true
  }

  const trimmed = answer.trim()
  return /[,:;\-]$/.test(trimmed)
}

function normalizeVietnameseText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

const COURSE_INDEX: InferredCourse[] = curriculumGroups.flatMap((group) =>
  group.courses.map((course) => ({ code: course.code, name: course.name })),
)

const STOP_WORDS = new Set(["va", "và", "hoc", "phan", "mon", "nganh", "chuyen", "de", "cot", "ki", "nang"])

const COMMON_COURSE_ALIASES: Record<string, string[]> = {
  MATH111: ["giai tich 1", "gt1", "calculus 1"],
  MATH122: ["giai tich 2", "gt2", "calculus 2"],
  CSE484: ["csdl", "co so du lieu", "database"],
  CSE492: ["ttnt", "tri tue nhan tao", "ai"],
  CSE213: ["trr", "toan roi rac", "discrete math"],
  CSE281: ["ctdl", "ctdlgt", "cau truc du lieu", "giai thuat"],
  CSE204: ["python", "lap trinh py", "lt python"],
  CSE205: ["ltnc", "lap trinh nang cao"],
  CSE111: ["nhap mon lap trinh", "nmlt"],
  CSE311: ["linux", "ma nguon mo", "oss"],
  CSE480: ["pttk", "phan tich thiet ke he thong thong tin"],
  MATH333: ["dstt", "dai so tuyen tinh", "linear algebra", "dai so"],
  MATH254: ["xs tk", "xac suat thong ke", "probability", "xac suat"],
  MLP121: ["triet hoc", "triet", "mac lenin"],
  GEL111: ["phap luat", "pl dc", "phap luat dai cuong"],
  SSE111: ["ky nang mem", "knm"],
}

function buildCourseAliasMap() {
  const map = new Map<string, Set<string>>()

  for (const course of COURSE_INDEX) {
    const code = course.code.toUpperCase()
    const normalizedName = normalizeVietnameseText(course.name)
    const words = normalizedName.split(" ").filter((item) => item.length > 0)
    const compact = normalizedName.replace(/\s+/g, "")

    const aliases = new Set<string>()
    aliases.add(code.toLowerCase())
    aliases.add(code.toLowerCase().replace(/\s+/g, ""))
    aliases.add(normalizedName)
    aliases.add(compact)

    const letterPart = code.replace(/\d+/g, "").toLowerCase()
    const numberPart = code.replace(/\D+/g, "")
    if (letterPart && numberPart) {
      aliases.add(`${letterPart} ${numberPart}`)
      aliases.add(`${letterPart}-${numberPart}`)
    }

    const significantWords = words.filter((word) => !STOP_WORDS.has(word))
    if (significantWords.length >= 2) {
      aliases.add(significantWords.map((word) => word[0]).join(""))
    }

    const manualAliases = COMMON_COURSE_ALIASES[code] ?? []
    for (const manual of manualAliases) {
      aliases.add(normalizeVietnameseText(manual))
    }

    map.set(code, aliases)
  }

  return map
}

const COURSE_ALIAS_MAP = buildCourseAliasMap()

function getCourseByCode(code: string): InferredCourse | null {
  return COURSE_INDEX.find((course) => course.code.toUpperCase() === code.toUpperCase()) ?? null
}

function inferCourseFromText(text: string): InferredCourse | null {
  const normalized = normalizeVietnameseText(text)

  for (const course of COURSE_INDEX) {
    const aliases = COURSE_ALIAS_MAP.get(course.code.toUpperCase())
    if (!aliases) {
      continue
    }

    for (const alias of aliases) {
      if (!alias) {
        continue
      }

      if (alias.length <= 3) {
        const regex = new RegExp(`(^|\\s)${alias}(\\s|$)`)
        if (regex.test(normalized)) {
          return course
        }
      } else if (normalized.includes(alias)) {
        return course
      }
    }
  }

  for (const course of COURSE_INDEX) {
    const normalizedCode = course.code.toLowerCase()
    const normalizedName = normalizeVietnameseText(course.name)

    if (normalized.includes(normalizedCode) || normalized.includes(normalizedName)) {
      return course
    }
  }

  return null
}

function isDocumentSearchIntent(message: string) {
  if (isStudyRecommendationIntent(message)) {
    return false
  }

  const lower = message.toLowerCase()
  const capabilityPatterns = [
    /bạn có (biết )?tìm/i,
    /có thể tìm/i,
    /có (tài liệu|đề thi) không/i,
    /biết (tìm|lấy) không/i,
    /là gì thế/i
  ]
  if (capabilityPatterns.some(p => p.test(lower)) && !lower.includes("môn") && !lower.includes("mã")) {
    return false
  }

  const searchVerbs = ["tìm", "tim", "kiếm", "kiem", "gợi ý", "goi y", "cho mình", "cho toi", "muốn có", "muon co"]
  const documentKeywords = ["tài liệu", "tai lieu", "đề cương", "de cuong", "giáo trình", "giao trinh", "đề thi", "de thi"]
  const courseSignal = lower.includes("môn") || / [a-z]{2,4}\d{3}\b/i.test(message)

  const hasDocumentKeyword = documentKeywords.some((item) => lower.includes(item))
  const hasSearchVerb = searchVerbs.some((item) => lower.includes(item))

  return hasDocumentKeyword && (hasSearchVerb || courseSignal || Boolean(inferCourseFromText(message)))
}

function isStudyRecommendationIntent(message: string) {
  const lower = message.toLowerCase()
  const patterns = [
    "nên học",
    "nen hoc",
    "học trước",
    "hoc truoc",
    "nào trước",
    "nao truoc",
    "bắt đầu từ đâu",
    "bat dau tu dau",
    "lộ trình",
    "lo trinh",
  ]

  return patterns.some((item) => lower.includes(item))
}

function extractSubjectHint(message: string) {
  const inferredCourse = inferCourseFromText(message)
  if (inferredCourse) {
    return inferredCourse.name
  }

  const cleaned = message
    .replace(/\b(tôi muốn|toi muon|mình muốn|minh muon|giúp tôi|giup toi|hãy|hay|vui lòng|vui long)\b/gi, " ")
    .replace(/\b(tìm kiếm|tim kiem|tìm|tim|tài liệu|tai lieu|môn|mon|về|ve|cho tôi|cho toi|của|cua)\b/gi, " ")
    .replace(/\b(bạn có|có thể|không|đâu|nào|nao|gì|biết|biet|xem|lấy|lay|đọc|doc)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned.length >= 3 ? cleaned : ""
}

function buildGuaranteedAnswer(message: string, docs: SuggestedDoc[], draftAnswer: string) {
  const topDocs = docs.slice(0, 3)
  const normalized = normalizeVietnameseText(message)
  const studyKeywords = ["hoc", "mon", "tai lieu", "de thi", "giai", "thuat toan", "lap trinh", "cau truc", "du lieu", "la gi", "tai sao", "cach", "lam sao"]
  const hasStudySignal = studyKeywords.some(k => normalized.includes(k))
  const hasCourse = Boolean(inferCourseFromText(message))

  if (topDocs.length === 0 && message.length < 25) {
    return "Xin lỗi, tôi vẫn chưa hiểu rõ ý bạn, bạn có thể hỏi lại chi tiết được không? Vui lòng hỏi theo cú pháp: 'Tìm tài liệu [Tên môn]' hoặc '[Kiến thức] là gì' để mình hỗ trợ tốt nhất nhé."
  }

  if (!hasStudySignal && !hasCourse) {
    return IRRELEVANT_RESPONSE
  }

  const docList = topDocs.length 
    ? topDocs.map((doc, i) => `${i + 1}. ${doc.title}`).join("\n")
    : "Hiện chưa có tài liệu khớp trực tiếp cho nội dung này."

  return [
    `🔍 **Kết quả tìm kiếm cho:** "${message}"`,
    "",
    "💡 **Gợi ý học tập:**",
    "- Bạn nên xem qua danh sách tài liệu bên dưới để nắm bắt kiến thức nền tảng.",
    "- Nếu cần giải thích chuyên sâu về từng phần, hãy đặt câu hỏi chi tiết hơn cho mình nhé.",
    "",
    "📚 **Tài liệu đề xuất:**",
    docList,
    "",
    `✅ **Mức độ tin cậy:** ${topDocs.length ? "Cao (Có tài liệu khớp)" : "Trung bình"}`
  ].join("\n")
}

function isGarbageAnswer(answer: string, message: string) {
  const normalizedAnswer = answer.toLowerCase()
  const normalizedMessage = message.toLowerCase()
  
  const badPatterns = [
    "bạn đang tìm thông tin",
    "truy vấn dạng tìm tài liệu",
    "mình đã xử lý theo hướng",
    "ưu tiên tài liệu trong kho"
  ]
  
  const casualWords = ["alo", "hi", "hello", "ê", "à", "ơi"]
  const isCasual = casualWords.some(p => normalizedMessage.includes(p))

  return (
    badPatterns.some(p => normalizedAnswer.includes(p)) &&
    (isCasual || message.length < 15)
  )
}

function buildHistoryContext(history: ChatbotRequestBody["history"]) {
  if (!history?.length) {
    return ""
  }

  return history
    .slice(-8)
    .map((item) => {
      const documentTitles = item.documents?.length
        ? `\nTài liệu đã gợi ý: ${item.documents.map((doc) => doc.title).join("; ")}`
        : ""
      return `${item.role === "user" ? "USER" : "ASSISTANT"}: ${item.content}${documentTitles}`
    })
    .join("\n\n")
}

function inferCourseFromHistory(history: ChatbotRequestBody["history"]) {
  if (!history?.length) {
    return null
  }

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index]
    if (item.role !== "user") {
      continue
    }

    const inferred = inferCourseFromText(item.content)
    if (inferred) {
      return inferred
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatbotRequestBody
    const message = String(body.message ?? "").trim()

    if (!message) {
      return NextResponse.json({ error: "Thiếu nội dung câu hỏi" }, { status: 400 })
    }

    // --- STEP 1: AI Intent Classification (Level 4 - Semantic) ---
    const apiKey = process.env.POLLINATIONS_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu POLLINATIONS_API_KEY (hoặc GEMINI_API_KEY) trong biến môi trường" },
        { status: 500 },
      )
    }

    const { intent, is_academic } = await classifyIntentWithAI(message, apiKey)

    if (intent === "irrelevant" || !is_academic) {
      return NextResponse.json({
        answer: IRRELEVANT_RESPONSE,
        documents: [],
      } satisfies ChatbotResponseBody)
    }

    const inferredCourseFromCurrent = inferCourseFromText(message)
    const inferredCourseFromHistory = inferCourseFromHistory(body.history)
    const currentSubjectHint = extractSubjectHint(message)
    
    let activeCourse = inferredCourseFromCurrent
    if (!activeCourse && inferredCourseFromHistory) {
      if (!currentSubjectHint || currentSubjectHint.length < 3) {
        activeCourse = inferredCourseFromHistory
      }
    }

    const recommendationIntent = isStudyRecommendationIntent(message)
    const documentSearchIntent = isDocumentSearchIntent(message)

    // --- STEP 2: Document Retrieval (Metadata + Vector Search - Plan C) ---
    let semanticChunks: any[] = []
    
    try {
      // 1. Tạo Vector cho câu hỏi (HuggingFace)
      const questionVector = await getHuggingFaceEmbedding(message)
      
      // 2. Lấy toàn bộ Chunks từ MySQL để so sánh độ tương đồng (Plan C - In-Memory Similarity)
      const pool = getDbPool()
      const [chunkRows]: any = await pool.execute(`
        SELECT dc.content, dc.embedding, d.id, d.title, d.preview_url as image, d.download_url
        FROM document_chunks dc
        INNER JOIN documents d ON d.id = dc.document_id
        WHERE d.status = 'published'
      `)
      
      if (chunkRows.length > 0) {
        // 3. Tính độ tương đồng cho từng mảnh
        const scoredChunks = chunkRows.map((row: any) => {
          try {
            const chunkVector = JSON.parse(row.embedding)
            return {
              content: row.content,
              title: row.title,
              similarity: cosineSimilarity(questionVector, chunkVector),
              id: row.id,
              image: row.image || "/placeholder.svg",
              downloadUrl: row.download_url
            }
          } catch {
            return { content: row.content, title: row.title, similarity: 0, id: row.id, image: row.image || "/placeholder.svg", downloadUrl: row.download_url }
          }
        })
        
        // 4. Lấy tối đa 5 đoạn có độ tương đồng cao (Ngưỡng cực khắt khe > 0.65 để lọc tài liệu ngoại lai)
        semanticChunks = scoredChunks
          .filter((c: any) => c.similarity > 0.65)
          .sort((a: any, b: any) => b.similarity - a.similarity)
          .slice(0, 5)

        if (semanticChunks.length > 0) {
          console.log(`[RAG] Found ${semanticChunks.length} chunks. Top score: ${semanticChunks[0].similarity.toFixed(4)}`)
        } else {
          const maxScore = Math.max(...scoredChunks.map((c: any) => c.similarity))
          console.log(`[RAG] No chunks passed threshold. Highest was: ${maxScore.toFixed(4)}`)
        }
      }
    } catch (err) {
      console.warn("[api/chatbot] Vector search error:", err)
      semanticChunks = []
    }

    // Luôn lấy tài liệu từ MySQL làm nòng cốt gợi ý link tải
    let docs: ChatbotCandidateDocument[] = []
    if (intent === "document" || recommendationIntent || documentSearchIntent || intent === "study") {
      if (activeCourse) {
        docs = await searchDocumentsForChatbotBySubject(activeCourse.code, 3)
      } else {
        docs = await searchDocumentsForChatbot(message, 4)
      }
    }

    // --- STEP 3: Build Context ---
    let context = ""
    if (semanticChunks.length > 0 || docs.length > 0) {
      context += "DỮ LIỆU TÀI LIỆU THAM KHẢO (Sử dụng các thông tin này làm nòng cốt):\n\n"
      
      // Ưu tiên nội dung chi tiết
      if (semanticChunks.length > 0) {
        context += "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU:\n"
        context += semanticChunks.map((chunk, i) => `[Nguồn: ${chunk.title}]: ${chunk.content}`).join("\n\n")
        context += "\n\n"
      }
      
      // Danh sách tài liệu khớp
      if (docs.length > 0) {
        context += "DANH SÁCH FILE TÀI LIỆU LIÊN QUAN:\n"
        context += docs.map((doc, index) => `- ${doc.title}`).join("\n")
      }
    }

    if (!context && !activeCourse && intent !== "document") {
        return NextResponse.json({
          answer: "Để hỗ trợ chính xác nhất, bạn có thể nêu rõ tên môn học hoặc nội dung cụ thể cần giải đáp không (Ví dụ: Giải tích 1 là gì, Tìm tài liệu CSE492)?",
          documents: [],
        } satisfies ChatbotResponseBody)
    }

    // --- STEP 4: Handle Search Intents ---
    if (intent === "document" || recommendationIntent) {
       if (recommendationIntent && !activeCourse) {
         return NextResponse.json({
           answer: "Để mình gợi ý đúng 1 tài liệu nên học trước, bạn cho mình biết rõ môn học nhé (ví dụ: Trí tuệ nhân tạo - CSE492, Cơ sở dữ liệu - CSE484).",
           documents: [],
         } satisfies ChatbotResponseBody)
       }

       const subjectHint = activeCourse?.name || extractSubjectHint(message)
       const topDocs = docs.slice(0, 3).map(doc => ({
         id: doc.id,
         title: doc.title,
         image: doc.image,
         downloadUrl: doc.downloadUrl,
       }))

       const answer = recommendationIntent
         ? (topDocs.length 
             ? `Bạn nên học tài liệu "${topDocs[0].title}" trước để hiểu rõ bản chất nền tảng nhé.${subjectHint ? ` Với môn ${subjectHint},` : ""} mình gửi bạn ${topDocs.length} tài liệu tốt nhất bên dưới.`
             : `Mình chưa tìm thấy tài liệu khớp cho môn ${subjectHint || "này"}. Bạn thử nêu rõ tên môn để mình gợi ý nhé.`)
         : (topDocs.length
             ? `Vâng, đây là danh sách tài liệu ${subjectHint ? `môn ${subjectHint}` : "liên quan"} mà bạn yêu cầu.`
             : `Mình chưa tìm thấy tài liệu khớp cho môn ${subjectHint || "học này"}. Bạn thử nhập rõ mã môn hơn nhé.`)

       return NextResponse.json({
         answer,
         documents: topDocs,
       } satisfies ChatbotResponseBody)
    }

    // --- STEP 5: LLM Generation ---
    const maxOutputTokens = Number(process.env.CHATBOT_MAX_OUTPUT_TOKENS || 1600)
    const { response: llmResponse, model } = await callChatCompletionsWithFallback(
      apiKey,
      message,
      context,
      maxOutputTokens,
    )

    const llmData = (await llmResponse.json()) as any
    
    let answer = extractAssistantText(llmData)
    
    // Xóa bỏ mục "Mức độ chắc chắn" bằng Regex nếu AI vẫn cố tình viết ra
    if (answer) {
      answer = answer.replace(/##?\s*Mức độ chắc chắn[\s\S]*?(?=##|$)/gi, "").trim();
      answer = answer.replace(/Mức độ chắc chắn:[\s\S]*?(?=\n\n|$)/gi, "").trim();
    }

    console.log(`[api/chatbot] AI Output Length: ${answer?.length || 0} chars (after cleaning).`)
    
    if (!answer) {
      console.error("[api/chatbot] AI returned empty. Payload:", JSON.stringify(llmData))
      answer = "Mình tìm thấy tài liệu nhưng AI chưa thể tổng hợp câu trả lời. Bạn thử hỏi cụ thể hơn nhé."
    }

    // Tạm thời vô hiệu hóa bộ lọc Garbage để xem phản hồi thực tế
    if (isGarbageAnswer(answer, message)) {
      console.log("[api/chatbot] Garbage answer detected, using irrelevant response fallback.")
      answer = IRRELEVANT_RESPONSE
    }

    const minAnswerChars = Number(process.env.CHATBOT_MIN_ANSWER_CHARS || 220)
    if (answer !== IRRELEVANT_RESPONSE && shouldRetryShortAnswer(answer, minAnswerChars)) {
       // Retry with more specific instructions if the answer is too short or cut off
       const retryMessage = `${message}\n\nYÊU CẦU: Trả lời đúng cấu trúc 5 phần (từ I đến V) theo quy định, trình bày bằng Markdown rõ ràng.`
       const retryResult = await callChatCompletionsWithFallback(apiKey, retryMessage, context, maxOutputTokens)
       const retryData = (await retryResult.response.json()) as any
       const retryAnswer = extractAssistantText(retryData)
       if (retryAnswer && retryAnswer.length > answer.length) {
         answer = retryAnswer
       }
    }

    // --- STEP 6: Save History & Return ---
    // Lấy danh sách tài liệu mà AI thực sự trích dẫn sau khi đã siết chặt format
    const usedDocsMap = new Map<string | number, any>();
    
    // Gom tất cả ứng viên tiềm năng (tích hợp)
    const allCandidates = [...semanticChunks, ...docs];

    // Chỉ giữ lại tài liệu nếu tên của tài liệu thực sự xuất hiện trong nội dung trả lời của AI
    for (const candidate of allCandidates) {
       // Sử dụng escape Regex để tránh lỗi khi title có ký tự đặc biệt
       const titleLower = candidate.title.toLowerCase();
       if (answer.toLowerCase().includes(titleLower)) {
          usedDocsMap.set(candidate.id, {
            id: candidate.id,
            title: candidate.title,
            image: candidate.image || (candidate as any).image,
            downloadUrl: candidate.downloadUrl || (candidate as any).downloadUrl
          });
       }
    }

    const uniqueSourceDocs = Array.from(usedDocsMap.values());

    const userId = resolveUserId(body)
    if (userId) {
      await saveChatbotHistory({
        userId,
        documentId: uniqueSourceDocs[0]?.id ?? null,
        question: message,
        answer,
        aiModel: model,
      })
    }

    return NextResponse.json({
      answer,
      documents: uniqueSourceDocs.slice(0, 3),
    } satisfies ChatbotResponseBody)

  } catch (error) {
    console.error("[api/chatbot]", error)
    return NextResponse.json(
      {
        answer: "Hệ thống đang bận. Bạn thử lại sau ít phút nhé.",
        documents: [],
      },
      { status: 500 },
    )
  }
}