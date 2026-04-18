import { NextResponse } from "next/server"
import { saveChatbotHistory, searchDocumentsForChatbot, searchDocumentsForChatbotBySubject } from "@/lib/chatbot-db-services"
import type { ChatbotCandidateDocument } from "@/lib/chatbot-db-services"
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
- Trong NGỮ CẢNH, mỗi đoạn nội dung được gắn tag [DOC_ID:X][Nguồn: TÊN_TÀI_LIỆU][Score: Y]. Đây là mã nội bộ.
- Nếu tài liệu có [Score > 0.6], đây là tài liệu RẤT LIÊN QUAN, bạn nên ưu tiên trích dẫn TÊN tài liệu này vào MỤC V nếu nội dung có ích.
- Nếu bạn SỬ DỤNG kiến thức từ tài liệu nào để trả lời, BẮT BUỘC liệt kê ĐÚNG TÊN tài liệu đó (phần sau "Nguồn:") vào MỤC V.
- MỤC V chỉ được điền TÊN của các file tài liệu có trong NGỮ CẢNH mà bạn đã thực sự đọc và sử dụng.
- KHÔNG giải thích, KHÔNG viết [DOC_ID:X]. Chỉ liệt kê gạch đầu dòng TÊN tài liệu.
- Nếu không có tài liệu đúng chuyên môn trong NGỮ CẢNH, để MỤC V trống.

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
  MATH111: ["giai tich 1", "gt1", "calculus 1", "dao ham", "tich phan", "gioi han", "toan 1", "toan hoc 1"],
  MATH122: ["giai tich 2", "gt2", "calculus 2", "tich phan boi", "chuoi", "phuong trinh vi phan", "toan 2"],
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
    "bat dau tu dau",
    "bắt đầu từ đâu",
    "lộ trình",
    "lo trinh",
  ]

  return patterns.some((item) => lower.includes(item))
}

function isListSubjectsIntent(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("bạn đang có kiến thức về những môn học nào")) return true
  
  const hasSubjectKeyword = lower.includes("môn học") || lower.includes("các môn") || lower.includes("những môn") || lower.includes("môn nào")
  const hasListKeyword = lower.includes("liệt kê") || lower.includes("danh sách") || lower.includes("có kiến thức") || lower.includes("biết") || lower.includes("hỗ trợ")
  
  return hasSubjectKeyword && hasListKeyword
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

    // --- INTERCEPT: List Supported Subjects Intent ---
    if (isListSubjectsIntent(message)) {
      try {
        const pool = getDbPool()
        const [rows]: any = await pool.execute(`SELECT code, name FROM subjects ORDER BY code ASC`)
        
        if (rows && rows.length > 0) {
           const subjectLines = rows.map((r: any) => `- **${r.code}**: ${r.name}`).join("\n")
           const answer = `Hiện tại, hệ thống của mình đã thu thập và có kiến thức về **${rows.length} môn học** sau đây:\n\n${subjectLines}\n\nBạn cần hỗ trợ cụ thể về tài liệu hay kiến thức môn nào, cứ nhắn cho mình nhé!`
           
           const userId = resolveUserId(body)
           if (userId) {
             await saveChatbotHistory({
               userId,
               documentId: null,
               question: message,
               answer,
               aiModel: "system",
             })
           }

           return NextResponse.json({
             answer,
             documents: []
           } satisfies ChatbotResponseBody)
        }
      } catch (error) {
        console.error("[api/chatbot] Lỗi truy xuất danh sách môn học:", error)
      }
    }

    // --- STEP 1: AI Intent Classification ---
    const apiKey = process.env.POLLINATIONS_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu POLLINATIONS_API_KEY trong biến môi trường" },
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

    // --- STEP 2: Document Retrieval (Vector Search) ---
    let semanticChunks: any[] = []

    try {
      const questionVector = await getHuggingFaceEmbedding(message)
      const pool = getDbPool()
      const [chunkRows]: any = await pool.execute(`
        SELECT dc.content, dc.embedding, d.id, d.title, d.preview_url as image, d.download_url
        FROM document_chunks dc
        INNER JOIN documents d ON d.id = dc.document_id
        WHERE d.status = 'published'
      `)

      if (chunkRows.length > 0) {
        const scoredChunks = chunkRows.map((row: any) => {
          try {
            const chunkVector = JSON.parse(row.embedding)
            let similarity = cosineSimilarity(questionVector, chunkVector)

            // Keyword Boost: Nếu tiêu đề chứa từ khóa quan trọng từ câu hỏi
            const titleNorm = normalizeVietnameseText(row.title)
            const msgNorm = normalizeVietnameseText(message)
            const keywords = msgNorm.split(" ").filter(w => w.length >= 3)
            for (const kw of keywords) {
              if (titleNorm.includes(kw)) similarity += 0.05
            }

            // Subject Boost: Ưu tiên tài liệu thuộc môn học đang được nhắc tới
            if (activeCourse) {
              const courseNameNorm = normalizeVietnameseText(activeCourse.name)
              if (row.title.toUpperCase().includes(activeCourse.code.toUpperCase()) || titleNorm.includes(courseNameNorm)) {
                similarity += 0.1
              }
            }

            return {
              content: row.content,
              title: row.title,
              similarity,
              id: row.id,
              image: row.image || "/placeholder.svg",
              downloadUrl: row.download_url
            }
          } catch {
            return { content: row.content, title: row.title, similarity: 0, id: row.id, image: row.image || "/placeholder.svg", downloadUrl: row.download_url }
          }
        })

        // Ngưỡng 0.28 phù hợp với model all-MiniLM-L6-v2 trên văn bản tiếng Việt
        semanticChunks = scoredChunks
          .filter((c: any) => c.similarity > 0.28)
          .sort((a: any, b: any) => b.similarity - a.similarity)
          .slice(0, 8)

        if (semanticChunks.length > 0) {
          console.log(`[RAG] Top Chunks Found:`)
          semanticChunks.forEach((c: any, i: number) => {
            console.log(`   ${i + 1}. [${c.similarity.toFixed(4)}] ${c.title}`)
          })
        }
      }
    } catch (err) {
      console.warn("[api/chatbot] Vector search error:", err)
      semanticChunks = []
    }

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

      if (semanticChunks.length > 0) {
        context += "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU:\n"
        context += semanticChunks.map((chunk) => `[DOC_ID:${chunk.id}][Nguồn: ${chunk.title}][Score: ${chunk.similarity.toFixed(2)}]: ${chunk.content}`).join("\n\n")
        context += "\n\n"
      }

      if (docs.length > 0) {
        context += "DANH SÁCH FILE TÀI LIỆU LIÊN QUAN:\n"
        context += docs.map((doc) => `- [DOC_ID:${doc.id}] ${doc.title}`).join("\n")
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

    if (answer) {
      answer = answer.replace(/##?\s*Mức độ chắc chắn[\s\S]*?(?=##|$)/gi, "").trim();
      answer = answer.replace(/Mức độ chắc chắn:[\s\S]*?(?=\n\n|$)/gi, "").trim();

      // Loại bỏ triệt để các tag nội bộ [DOC_ID:X], [Nguồn: Tên], [Score: Y] nếu AI vô tình viết ra
      answer = answer.replace(/\[DOC_ID:\s*\d+\]/gi, "");
      answer = answer.replace(/\[Nguồn:\s*[^\]]+\]/gi, "");
      answer = answer.replace(/\[Score:\s*[\d.]+\]/gi, "");
      answer = answer.trim();
    }

    if (!answer) {
      answer = "Mình tìm thấy tài liệu nhưng AI chưa thể tổng hợp câu trả lời. Bạn thử hỏi cụ thể hơn nhé."
    }

    // --- STEP 6: Save History & Return ---
    const allCandidates = [...semanticChunks, ...docs];
    const usedDocsMap = new Map<number, any>();

    const sectionVMatch = answer.match(/##\s*V[\.\s]+Tài liệu tham khảo([\s\S]*?)(?=##\s*VI|$)/i);
    const sectionVText = sectionVMatch ? sectionVMatch[1] : null;

    if (sectionVText !== null && sectionVText.trim()) {
      const lines = sectionVText.split("\n").map(l => l.trim()).filter(Boolean);
      const mentionedNames = lines
        .map(line => line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
        .filter(name => name.length > 3);

      for (const name of mentionedNames) {
        const nameLower = name.toLowerCase();
        const matched = allCandidates.find(c =>
          c.title.toLowerCase().includes(nameLower) ||
          nameLower.includes(c.title.toLowerCase())
        );
        if (matched && !usedDocsMap.has(matched.id)) {
          usedDocsMap.set(matched.id, {
            id: matched.id,
            title: matched.title,
            image: matched.image || (matched as any).image || "/placeholder.svg",
            downloadUrl: matched.downloadUrl || (matched as any).downloadUrl
          });
        }
      }

      if (usedDocsMap.size === 0 && mentionedNames.length > 0 && semanticChunks.length > 0) {
        const highScoreChunks = semanticChunks.filter((c: any) => c.similarity >= 0.35);
        const fallbackChunks = highScoreChunks.length > 0 ? highScoreChunks : [semanticChunks[0]];
        for (const chunk of fallbackChunks) {
          if (!usedDocsMap.has(chunk.id)) {
            usedDocsMap.set(chunk.id, {
              id: chunk.id, title: chunk.title,
              image: chunk.image || "/placeholder.svg", downloadUrl: chunk.downloadUrl
            });
            if (usedDocsMap.size >= 3) break;
          }
        }
      }
    } else if (sectionVText === null) {
      if (semanticChunks.length > 0) {
        const topChunk = semanticChunks[0];
        if (topChunk.similarity >= 0.35) {
          usedDocsMap.set(topChunk.id, {
            id: topChunk.id, title: topChunk.title,
            image: topChunk.image || "/placeholder.svg", downloadUrl: topChunk.downloadUrl
          });
        }
      }
    } else {
      // CASE 3: Mục V tồn tại nhưng AI để trống -> AI chủ động không trích dẫn -> Không hiện card (giữ đồng bộ 100%)
      console.log(`[Citation] Mục V is intentionally empty -> showing no document cards`);
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
      documents: uniqueSourceDocs.slice(0, 5),
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
