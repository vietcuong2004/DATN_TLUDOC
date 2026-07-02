export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string // Bắt buộc phải có để hiển thị lời giải trên giao diện
}
import { callAiModel } from "@/lib/ai-model"

export interface QuizGenerationOptions {
  text: string
  apiKey?: string
  model?: string
}

// Chuẩn hóa văn bản: Loại bỏ khoảng trắng thừa, hạ chữ thường
// Dùng để so sánh xem 2 câu hỏi/đáp án có bị trùng nội dung không
function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

// Cắt bỏ tiền tố "models/" (nếu có) để phù hợp định dạng API Pollinations
function normalizeModelName(modelName: string) {
  const trimmed = modelName.trim()
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed
}

/**
 * BƯỚC 1: CHUNKING (CHIA NHỎ VĂN BẢN)
 * Tài liệu tải lên có thể rất dài, API không thể đọc hết một lần (tràn bộ nhớ / quá tốn token). 
 * Hàm này có nhiệm vụ chia văn bản thành từng "đoạn" (chunk).
 * 
 * - Ưu tiên cắt dựa trên số chữ (words) để không làm đứt đôi câu văn.
 * - `maxChars`: Mức giới hạn độ dài một đoạn để vừa khuôn não AI (~2500 ký tự / khoảng 1 trang A4).
 * - `maxChunks`: Giới hạn nhặt tối đa bao nhiêu đoạn (VD: 6 trang đầu). 
 *   Mục đích: Nếu file 100 trang, nó sẽ ngắt ngay ở số 6 để tránh đốt sạch tài nguyên API.
 */
function smartChunk(text: string, maxChars = 2500, maxChunks = 6) {
  const words = text.split(" ")
  const chunks = []
  let currentChunk: string[] = []
  let currentLength = 0

  for (const word of words) {
    const addLength = currentChunk.length === 0 ? word.length : 1 + word.length
    
    // Nếu nhét thêm từ này vào mà vượt quá maxChars, thì đóng gói Chunk hiện tại lại
    if (currentLength + addLength > maxChars) {
      if (currentChunk.length > 0) chunks.push({ text: currentChunk.join(" ") })
      currentChunk = [word] // Mở Chunk mới khởi đầu bằng từ hiện tại
      currentLength = word.length
      
      // Nếu đã đủ số lượng Chunks tối đa cho phép thì dứt khoát không đọc phần còn lại của tài liệu nữa
      if (chunks.length >= maxChunks) break
    } else {
      currentChunk.push(word)
      currentLength += addLength
    }
  }

  if (currentChunk.length > 0 && chunks.length < maxChunks) {
    chunks.push({ text: currentChunk.join(" ") })
  }

  return chunks
}

async function callPollinationsChat(options: {
  apiKey?: string
  model?: string
  temperature: number
  maxTokens: number
  messages: Array<{ role: string; content: string }>
}) {
  const userMessage = options.messages.find(m => m.role === "user")?.content || "";
  const systemMessage = options.messages.find(m => m.role === "system")?.content || undefined;

  return callAiModel(userMessage, {
    systemInstruction: systemMessage,
    temperature: options.temperature,
    model: options.model,
    maxTokens: options.maxTokens,
    jsonMode: true,
  })
}

/**
 * BƯỚC 2: EXTRACT KEY IDEAS (Tạo bản đồ tư duy bám rễ gốc bài viết)
 * Ép AI đọc phớt qua 4000 ký tự đầu tiên để "hiểu hoàn cảnh" bài viết nói gì.
 * Output từ hàm này (keyIdeas) sẽ bị đem đi mớm kèm vào từng Chunk ở Bước 3.
 * Giúp AI khi hỏi "Chương 2" không bị xé rào hỏi vớ vẩn do mất Context "Chương 1".
 */
async function extractKeyIdeas(text: string, apiKey?: string, model?: string) {
  const prompt = `Đọc tài liệu sau và trích xuất:
- Các khái niệm quan trọng
- Các ý chính
- Các thông tin có thể dùng để tạo câu hỏi

Output:
- Danh sách bullet points (10-20 ý)
- Ngắn gọn, không giải thích dài

Nội dung:
${text.slice(0, 4000)}
`

  return callPollinationsChat({
    apiKey,
    model,
    temperature: 0.2, // Nhiệt độ thấp = Ưu tiên sự rập khuôn chính xác, không tự phiêu
    maxTokens: 2500,
    messages: [{ role: "user", content: prompt }],
  })
}

/**
 * BƯỚC 3: GENERATE QUESTIONS YÊU CẦU ĐỊNH DẠNG NGHIÊM NGẶT
 * Đây là hàm mang tính cấu trúc lặp (nó lặp đi lặp lại vì phải gọi xử lý ở mỗi vòng lặp đứt đoạn chunk).
 */
async function generateQuestionsFromChunk(
  chunkText: string,
  keyIdeas: string,
  apiKey?: string,
  model?: string,
) {
  // Bơm KEY IDEA làm định hướng, rải NỘI DUNG vào cho AI làm bài liệu.
  const prompt = `Dựa trên tài liệu và các ý chính sau:

=== KEY IDEAS ===
${keyIdeas}

=== NỘI DUNG ===
${chunkText}

Hãy tạo 3 câu hỏi trắc nghiệm:
Yêu cầu:
- 4 đáp án (A, B, C, D)
- Chỉ 1 đáp án đúng
- Có giải thích đầy đủ tại sao đúng (Tạo ra logic để frontend gắn vào phần View Explaination)
- Không hỏi chung chung dạng "nội dung này nói về gì"
- KHÔNG dùng markdown tags như \`\`\`json ở đầu/cuối chuỗi phản hồi. CHỈ trả về đúng định dạng JSON thuần tuý.

Return ONLY valid JSON.
The response MUST be in JSON format.

Output bắt buộc phải chép y nguyên cấu trúc này:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}
`

  return callPollinationsChat({
    apiKey,
    model,
    temperature: 0.3,
    maxTokens: 3500, // Cung cấp giới hạn não lớn để AI chịu khó viết 'explanation' dài.
    messages: [{ role: "user", content: prompt }],
  })
}

/**
 * BỘ LỌC 1: SAFEPARSE - KĨ THUẬT RỬA CHUỖI JSON
 * AI sinh văn bản, dù ép ngặt cỡ nào vẫn hay khuyến mãi thêm thẻ ```json.
 * Hàm này dùng Regex bóc gọt các lớp vỏ bọc độc hại đó để JSON.parse() code Javascript không bị sụp (Crash).
 */
function safeParseQuiz(jsonText: string): QuizQuestion[] {
  try {
    const cleaned = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim()
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    
    if (start === -1 || end === -1) return []
    
    const sliced = cleaned.slice(start, end + 1)
    const parsed = JSON.parse(sliced)
    return parsed.questions ?? []
  } catch (error) {
    console.warn("Parse JSON error in generateQuestionsFromChunk:", error)
    return [] // Nếu bó tay, thà huỷ mảng chứ không trả cục lỗi về vỡ màn hình Web
  }
}

/**
 * BỘ LỌC 2: DEDUPLICATE (LUỘT RÂY LỌC TRÙNG LẶP)
 * Nhiều đoạn Chunk có chung nội dung, khiến AI lặp lại ý rập khuôn sinh y hệt 1 câu hỏi 2 lần.
 * Hàm này chuẩn hoá chuỗi text của Câu Hỏi, nếu thấy đã tạo ở bước trước, thì thẳng tay xoá câu trùng đi.
 */
function deduplicateQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const seen = new Set()
  const result: QuizQuestion[] = []

  for (const q of questions) {
    const key = normalizeText(q.question)

    if (!seen.has(key)) {
      seen.add(key)
      result.push(q)
    }
  }

  return result
}

/**
 * BỘ LỌC 3: VALIDATION (CHỐNG LỖI HIỂN THỊ)
 * Duyệt đội hình xem có khuyết tật không: 
 * Vd: AI quên viết Lời Giải? -> Gạch. AI bịa ra có 2 Đáp Án thay vì 4? -> Gạch.
 */
function validateQuestion(q: QuizQuestion): boolean {
  if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) return false
  if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) return false
  if (!q.explanation) return false

  // Kiểm tra đáp án A, B, C, D có vô tình viết đáp án nào trùng y chang nhau không
  const uniqueOptions = new Set(q.options.map(normalizeText))
  if (uniqueOptions.size < 4) return false

  return true // Bác sĩ xác nhận sức khoẻ tốt.
}

/**
 * BƯỚC CUỐI CÙNG: MÀI GIŨA TRƯỚC KHI XUẤT XƯỞNG (REFINE)
 * 15 câu lọt qua bao vòng vẫn chỉ là 'sản phẩm thô'. Tống cả mảng JSON này vào một prompt cuối gọi là "Chấm điểm".
 * Chức năng: Mượt hoá ngôn ngữ tiếng Việt (Sửa ngữ pháp), Cân bằng lại logic giữa các Đáp án A B C D.
 */
async function refineQuiz(questions: QuizQuestion[], apiKey?: string, model?: string) {
  const prompt = `Dưới đây là danh sách câu hỏi trắc nghiệm dưới dạng JSON:
${JSON.stringify(questions)}

Nhiệm vụ:
- Kiểm tra tính logic của đáp án đúng.
- Đảm bảo cấu trúc văn phong tiếng Việt tự nhiên, phù hợp với giáo dục phổ thông.
- Đảm bảo chỉ trả về MẢNH JSON CỦA BẠN, không có định dạng markdown \`\`\`json. Không xưng hô, chỉ trả về chuỗi JSON chính xác như sau:

{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}
`

  try {
    const result = await callPollinationsChat({
      apiKey,
      model,
      temperature: 0.25, // Hạ nhiệt độ để nó ko dám sửa linh tinh đáp án.
      maxTokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    // Tiếp tục phải gọi bóc mác ```json như cũ (Vì AI có chứng 'cá vàng' ở các vòng mới này)
    const cleaned = result.replace(/```json/g, "").replace(/```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions as QuizQuestion[]
    }
    return questions
  } catch (error) {
    console.warn("Refine Quiz error:", error)
    return questions // Vạn nhất chập chờn quá, lấy đồ thô xào cũng được, Web ko được chết.
  }
}

/**
 * NÚT GIAO TỔNG QUẢN LÝ TẤT CẢ (MAIN GENERATOR CORE)
 * Đây là hàm sẽ được `route.ts` API Mũi nhọn gọi trực tiếp vào để nạp xăng và khởi chạy toàn xưởng máy móc ở trên.
 */
export async function generateQuizFromText(options: QuizGenerationOptions) {
  const text = options.text.trim()

  if (!text || text.length < 100) {
    throw new Error("Tài liệu quá ngắn hoặc không có nội dung rõ ràng để tạo quiz.")
  }

  /* KHÂU 1: Băm vụn - Giới hạn tối đa 6 băng (tránh cạn kiệt tài khoản API) */
  const chunks = smartChunk(text, 2500, 6)

  /* KHÂU 2: Nắm được cái Hồn (Tư tưởng chính) của toàn tài liệu */
  console.log("[Quiz Generation] Extracting Key Ideas...")
  const keyIdeas = await extractKeyIdeas(text, options.apiKey, options.model)

  let allQuestions: QuizQuestion[] = []

  /* KHÂU 3: Nhét từng băng đã băm vào Xưởng Chế Biến câu hỏi */
  console.log(`[Quiz Generation] Generating from ${chunks.length} chunks...`)
  for (const chunk of chunks) {
    try {
      const raw = await generateQuestionsFromChunk(
        chunk.text,
        keyIdeas,
        options.apiKey,
        options.model,
      )
        // Đã có logging chi tiết bên trong callPollinationsChat
        
        const parsed = safeParseQuiz(raw)
      if (!parsed.length) throw new Error("Empty quiz chunk returned")
      
      allQuestions.push(...parsed)
    } catch (error) {
      // Cơ chế Fallback phòng thủ: Bất cứ giá nào Front-End không thể đứng im chờ không thấy Câu nào về.
      console.warn("[quiz] fallback question generation due to chunk failure")
      allQuestions.push({
        question: "Nội dung chính của tài liệu này liên quan đến điều gì?",
        options: [
          "Phân tích nội dung chi tiết",
          "Tóm tắt thông tin tài liệu",
          "Giải thích các khái niệm quan trọng",
          "Tất cả các ý trên đều đúng"
        ],
        correctIndex: 3,
        explanation: "Đây là câu hỏi dự phòng do hệ thống sinh ra khi AI phân tích gặp trục trặc trên đoạn khối tài liệu vừa đọc."
      })
    }
  }

  /* KHÂU 4: Qua Trạm Hải Quan làm sạch 3 lớp (Lọc Trùng + Kiểm kê) */
  allQuestions = deduplicateQuestions(allQuestions)
  allQuestions = allQuestions.filter(validateQuestion)

  // THAO TÁC CỐT LÕI: Nếu xưởng sinh đẫy đà tận 18, 20 câu, kiên quyết bóp cổ xả ngẫu nhiên cho rớt về đúng 15 câu (Max limit thiết kế UI)
  const MAX_QUESTIONS_BEFORE_REFINE = 15
  if (allQuestions.length > MAX_QUESTIONS_BEFORE_REFINE) {
    // Thuật toán mẹo JS: sort ngẫu nhiên 0.5 để trộn xáo bài, sau đó cắt (slice) lấy 15 câu đầu.
    allQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, MAX_QUESTIONS_BEFORE_REFINE)
  }

  /* KHÂU 5: Mài giũa lại mẻ bánh cuối trước khi xuất đi (Refine) */
  console.log(`[Quiz Generation] Refining ${allQuestions.length} questions...`)
  const finalQuestions = await refineQuiz(allQuestions, options.apiKey, options.model)
  
  // Tổng thanh tra cuối cùng nhỡ Refine lại tự sinh ra trùng hoặc lỗi định dạng
  const strictlyValidQuestions = deduplicateQuestions(finalQuestions).filter(validateQuestion)

  // Ghi log kết quả quiz cuối cùng sau khi sàng lọc
  console.log("--- FINAL QUIZ QUESTIONS FOR RENDERING ---");
  console.log(JSON.stringify(strictlyValidQuestions.slice(0, 15), null, 2));
  console.log("------------------------------------------");

  // Đóng hàng, lên xe vận tống về cho Web Frontend nhận.
  return {
    questions: strictlyValidQuestions.slice(0, 15), 
    meta: {
      total: strictlyValidQuestions.length,
      sourceLength: text.length,
    },
  }
}
