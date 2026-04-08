import { NextResponse } from "next/server"
import { saveChatbotHistory, searchDocumentsForChatbot, searchDocumentsForChatbotBySubject } from "@/lib/repository_chatbot"
import { curriculumGroups } from "@/lib/curriculum"

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

function buildSystemPrompt() {
  return `Bạn là TutorAI - trợ giảng học thuật cho sinh viên đại học Việt Nam.

NHIỆM VỤ CỐT LÕI:
1) Giải thích kiến thức rõ ràng, dễ hiểu, có tính sư phạm.
2) Ưu tiên sử dụng NGỮ CẢNH TÀI LIỆU được cung cấp.
3) Đưa ra gợi ý học tập thực hành được ngay.

NGUYÊN TẮC TRẢ LỜI:
- Trả lời bằng tiếng Việt, văn phong thân thiện nhưng học thuật.
- Trình bày theo cấu trúc ngắn, rõ, có tiêu đề nhỏ.
- Nếu câu hỏi khó: chia nhỏ vấn đề thành các bước.
- Nếu liên quan bài thi: nêu mẹo làm bài và lỗi thường gặp.
- Nếu người dùng hỏi mơ hồ: đặt 1-2 câu hỏi làm rõ.

RÀNG BUỘC ĐỘ TIN CẬY:
- Chỉ khẳng định mạnh khi có dữ liệu trong NGỮ CẢNH TÀI LIỆU hoặc kiến thức nền phổ thông đáng tin.
- Không bịa tài liệu, không bịa số liệu, không bịa nguồn.
- Nếu dữ liệu chưa đủ, phải nói rõ: "Hiện chưa đủ dữ liệu trong kho tài liệu để kết luận chắc chắn".

ƯU TIÊN CÁ NHÂN HÓA CHO SINH VIÊN:
- Tùy theo mục đích người học (ôn thi, làm bài tập, hiểu khái niệm).
- Kết thúc bằng "Bước tiếp theo" thật cụ thể (ví dụ: nên đọc tài liệu nào trước, luyện gì trong 20 phút).

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
1) Tóm tắt ngắn (2-4 câu)
2) Giải thích chi tiết (gạch đầu dòng)
3) Ví dụ minh họa (nếu phù hợp)
4) Bước tiếp theo để học (2-3 ý)
5) Mức độ chắc chắn: Cao / Trung bình / Thấp (kèm lý do 1 câu)

Nếu có tài liệu liên quan trong context, thêm mục:
6) Tài liệu nên đọc tiếp: liệt kê theo mức ưu tiên.`
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

function extractAssistantText(payload: unknown): string {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>
      }
    }>
  }

  const content = data.choices?.[0]?.message?.content
  if (typeof content === "string") {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item
        }
        return item.text ?? ""
      })
      .join("\n")
      .trim()
  }

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
    normalizeModelName(process.env.CHATBOT_MODEL || "openai"),
    "openai",
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
        max_tokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : 400,
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

  // Heuristic: if text ends with a comma/colon, it likely got cut off.
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
  MATH333: ["dstt", "dai so tuyen tinh", "linear algebra"],
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

    // Allow patterns like "cse 492" in addition to "cse492"
    const letterPart = code.replace(/\d+/g, "").toLowerCase()
    const numberPart = code.replace(/\D+/g, "")
    if (letterPart && numberPart) {
      aliases.add(`${letterPart} ${numberPart}`)
      aliases.add(`${letterPart}-${numberPart}`)
    }

    // Acronym from significant words, e.g. "co so du lieu" -> "csdl"
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

  const searchVerbs = ["tìm", "tim", "kiếm", "kiem", "gợi ý", "goi y", "cho mình", "cho toi", "muốn có", "muon co"]
  const documentKeywords = ["tài liệu", "tai lieu", "đề cương", "de cuong", "giáo trình", "giao trinh", "đề thi", "de thi"]
  const courseSignal = lower.includes("môn") || /[a-z]{2,4}\d{3}\b/i.test(message)

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
    .replace(/\b(tìm kiếm|tim kiem|tìm|tim|tài liệu|tai lieu|môn|mon|về|ve|cho tôi|cho toi)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned.length > 0 ? cleaned : message.trim()
}

function buildGuaranteedAnswer(message: string, docs: SuggestedDoc[], draftAnswer: string) {
  const normalizedDraft = draftAnswer.trim()
  const topDocs = docs.slice(0, 3)

  const documentLines = topDocs.length
    ? topDocs.map((doc, index) => `${index + 1}. ${doc.title}`).join("\n")
    : "Hiện chưa có tài liệu khớp trực tiếp trong kho cho truy vấn này."

  const nextSteps = topDocs.length
    ? [
        "Mở tài liệu số 1 và đọc mục tổng quan trước để nắm khung kiến thức.",
        "Sau đó đọc tiếp tài liệu số 2 hoặc 3 để làm ví dụ/bài tập áp dụng.",
        "Nếu bạn muốn, mình có thể lập kế hoạch ôn 30 phút theo đúng tài liệu vừa gợi ý.",
      ]
    : [
        "Bạn thử bổ sung môn học cụ thể (ví dụ: Giải tích 1, Giải tích nhiều biến).",
        "Bạn thử thêm mục tiêu học (ôn thi, làm bài tập, học lại từ đầu).",
        "Mình sẽ tạo lộ trình học từng bước ngay sau khi bạn làm rõ mục tiêu.",
      ]

  return [
    "Tóm tắt ngắn:",
    `Bạn đang tìm thông tin về: ${message}. Mình đã xử lý theo hướng hỗ trợ học tập thực hành, ưu tiên tài liệu trong kho của hệ thống.`,
    "",
    "Giải thích chi tiết:",
    normalizedDraft.length >= 120
      ? normalizedDraft
      : "- Đây là truy vấn dạng tìm tài liệu, nên trọng tâm là chọn đúng tài liệu theo mức độ học và mục tiêu sử dụng (ôn thi, làm bài tập, hay học lại nền tảng).\n- Khi học hiệu quả, bạn nên bắt đầu từ tài liệu tổng quan trước rồi mới chuyển sang tài liệu có bài tập/đề thi để củng cố.\n- Nếu bạn cho biết rõ môn và phần kiến thức cần học, mình sẽ lọc chính xác hơn.",
    "",
    "Tài liệu nên đọc tiếp:",
    documentLines,
    "",
    "Bước tiếp theo để học:",
    `- ${nextSteps[0]}`,
    `- ${nextSteps[1]}`,
    `- ${nextSteps[2]}`,
    "",
    `Mức độ chắc chắn: ${topDocs.length ? "Trung bình - Cao" : "Trung bình"} (${topDocs.length ? "có tài liệu liên quan trong kho" : "cần thêm thông tin để lọc chính xác hơn"}).`,
  ].join("\n")
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

    const historyContext = buildHistoryContext(body.history)
    const inferredCourseFromCurrent = inferCourseFromText(message)
    const inferredCourseFromHistory = inferCourseFromHistory(body.history)
    const activeCourse = inferredCourseFromCurrent ?? inferredCourseFromHistory

    const recommendationIntent = isStudyRecommendationIntent(message)
    const documentSearchIntent = isDocumentSearchIntent(message)

    const docs = activeCourse && (recommendationIntent || documentSearchIntent)
      ? await searchDocumentsForChatbotBySubject(activeCourse.code, 3)
      : await searchDocumentsForChatbot(message, 3)

    const subjectHintFromConversation = activeCourse?.name || ""
    const context = docs
      .map((doc, index) => {
        const description = doc.description ? `\nMô tả: ${doc.description}` : ""
        return `${index + 1}. ${doc.title}${description}`
      })
      .join("\n\n")

    const apiKey = process.env.POLLINATIONS_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu POLLINATIONS_API_KEY (hoặc GEMINI_API_KEY) trong biến môi trường" },
        { status: 500 },
      )
    }

    const maxOutputTokens = Number(process.env.CHATBOT_MAX_OUTPUT_TOKENS || 700)
    const minAnswerChars = Number(process.env.CHATBOT_MIN_ANSWER_CHARS || 220)

    const { response: llmResponse, model } = await callChatCompletionsWithFallback(
      apiKey,
      message,
      context,
      maxOutputTokens,
    )

    const llmData = (await llmResponse.json()) as unknown
    let answer = extractAssistantText(llmData) ||
      "Mình chưa tạo được câu trả lời phù hợp. Bạn thử hỏi lại ngắn gọn hơn nhé."

    if (shouldRetryShortAnswer(answer, Number.isFinite(minAnswerChars) ? minAnswerChars : 220)) {
      const retryMessage = `${message}\n\nYÊU CẦU BẮT BUỘC: Trả lời đầy đủ, không cụt, tối thiểu 5 mục theo định dạng đã yêu cầu.`
      const retryResult = await callChatCompletionsWithFallback(apiKey, retryMessage, context, maxOutputTokens)
      const retryData = (await retryResult.response.json()) as unknown
      const retryAnswer = extractAssistantText(retryData)

      if (retryAnswer && retryAnswer.trim().length > answer.trim().length) {
        answer = retryAnswer
      }
    }

    if (shouldRetryShortAnswer(answer, Number.isFinite(minAnswerChars) ? minAnswerChars : 220)) {
      answer = buildGuaranteedAnswer(
        message,
        docs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          image: doc.image,
          downloadUrl: doc.downloadUrl,
        })),
        answer,
      )
    }

    const userId = resolveUserId(body)
    if (userId) {
      await saveChatbotHistory({
        userId,
        documentId: docs[0]?.id ?? null,
        question: message,
        answer,
        aiModel: model,
      })
    }

    const responseBody: ChatbotResponseBody = {
      answer,
      documents: docs.slice(0, 3).map((doc) => ({
        id: doc.id,
        title: doc.title,
        image: doc.image,
        downloadUrl: doc.downloadUrl,
      })),
    }

    if (recommendationIntent) {
      if (!activeCourse) {
        return NextResponse.json({
          answer:
            "Để mình gợi ý đúng 1 tài liệu nên học trước, bạn cho mình biết rõ môn học nhé (ví dụ: Trí tuệ nhân tạo - CSE492, Cơ sở dữ liệu - CSE484, Giải tích 1 - MATH111).",
          documents: [],
        } satisfies ChatbotResponseBody)
      }

      const topDocs = responseBody.documents.slice(0, 3)
      const subjectHint = subjectHintFromConversation || extractSubjectHint(message)

      const recommendationAnswer = topDocs.length
        ? `Bạn nên học tài liệu "${topDocs[0].title}" trước để hiểu rõ bản chất nền tảng nhé, đây là tài liệu cơ bản nhất trong nhóm gợi ý.${subjectHint ? ` Với môn ${subjectHint},` : ""} mình gửi bạn 3 tài liệu theo thứ tự ưu tiên ngay bên dưới.`
        : `${subjectHint ? `Mình chưa tìm thấy tài liệu khớp cho môn ${subjectHint}.` : "Mình chưa có đủ dữ liệu để chốt tài liệu nên học trước."} Bạn thử nêu rõ tên/mã môn để mình gợi ý đúng thứ tự học nhé.`

      return NextResponse.json({
        answer: recommendationAnswer,
        documents: topDocs,
      } satisfies ChatbotResponseBody)
    }

    if (documentSearchIntent) {
      const topDocs = responseBody.documents.slice(0, 3)
      const subjectHint = subjectHintFromConversation || extractSubjectHint(message)

      const directAnswer = topDocs.length
        ? `Vâng, đây là danh sách tài liệu của môn ${subjectHint}. Mình gửi bạn 3 tài liệu mẫu tốt nhất ngay bên dưới nhé.`
        : `Mình chưa tìm thấy tài liệu khớp trực tiếp cho môn ${subjectHint}. Bạn thử nhập rõ hơn mã môn hoặc tên môn để mình lọc chuẩn hơn nhé.`

      return NextResponse.json({
        answer: directAnswer,
        documents: topDocs,
      } satisfies ChatbotResponseBody)
    }

    return NextResponse.json(responseBody)
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