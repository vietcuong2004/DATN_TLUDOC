export type Intent = "study" | "document" | "irrelevant"

export type AIIntentResult = {
  intent: Intent
  is_academic: boolean
}

/**
 * Phân loại ý định bằng Regex (Nhanh, không tốn token)
 * Tối ưu hóa cho ngôn ngữ tự nhiên của sinh viên (Tên môn, từ khóa học tập)
 */
function fastDetectIntent(message: string): Intent | null {
  const normalized = message.toLowerCase().trim()
  
  // 1. Chặn các tin nhắn quá ngắn hoặc xã giao vô nghĩa
  if (normalized.length < 2) return "irrelevant"
  
  const casualPatterns = [
    /^alo$/i, /^hi$/i, /^hello$/i, /^ê$/i, /^ơi$/i, /^hey$/i,
    /bạn là ai/i, /tên gì/i, /biết vũ không/i, /ăn cơm chưa/i,
    /đang làm gì/i, /vui không/i, /ngu/i, /dở/i
  ]
  
  if (casualPatterns.some(p => p.test(normalized))) {
    return "irrelevant"
  }

  // 2. Nhận diện từ khóa "Tìm tài liệu" (Document Intent)
  // Ưu tiên các cấu trúc: "môn [tên]", "tài liệu [tên]", "đề [tên]", "xin [tên]"
  const documentKeywords = [
    /môn\s+/i, /tài liệu\s+/i, /đề thi\s+/i, /đề\s+/i, /slide\s+/i, 
    /bài giảng\s+/i, /giáo trình\s+/i, /xin\s+file/i, /cho\s+mình\s+xin/i,
    /tìm\s+giúp/i, /có\s+tài\s+liệu/i
  ]
  
  if (documentKeywords.some(p => p.test(normalized))) {
    return "document"
  }

  // 3. Nhận diện mã môn học (Ví dụ: CSE484, MATH111)
  const courseCodeRegex = /[a-zA-Z]{2,4}\d{3}/
  if (courseCodeRegex.test(normalized)) {
    return "document"
  }

  // 4. Nhận diện từ khóa "Hỏi kiến thức" (Study Intent)
  const studyKeywords = [
    /là gì/i, /thế nào/i, /giải thích/i, /tại sao/i, /làm sao/i, 
    /ví dụ/i, /so sánh/i, /khác biệt/i, /định nghĩa/i, /ý nghĩa/i,
    /cách làm/i, /hướng dẫn/i
  ]

  if (studyKeywords.some(p => p.test(normalized))) {
    return "study"
  }

  return null
}

/**
 * Phân loại ý định bằng AI (JSON Mode - Semantic thật)
 */
export async function classifyIntentWithAI(message: string, apiKey: string): Promise<AIIntentResult> {
  const fastResult = fastDetectIntent(message)
  if (fastResult) {
    console.log(`[Intent] Fast match found: ${fastResult}`)
    return { intent: fastResult, is_academic: fastResult !== "irrelevant" }
  }

  try {
    const systemPrompt = `Bạn là hệ thống phân loại ý định (Intent Classifier) cho Chatbot học tập TLU.
Phân tích tin nhắn của sinh viên và trả về kết quả dưới định dạng JSON duy nhất.

Cấu trúc JSON:
{
  "intent": "study" | "document" | "irrelevant",
  "is_academic": boolean
}

QUY TẮC PHÂN LOẠI:
1. "document": Khi người dùng muốn tìm tài liệu, đề thi, slide, bài giảng.
   - LƯU Ý: Sinh viên thường dùng TÊN MÔN (ví dụ: "Giải tích", "Cấu trúc dữ liệu") thay vì mã môn. 
   - Nếu câu nói có tên môn học hoặc từ "môn", hãy ưu tiên chọn "document".
2. "study": Khi người dùng hỏi kiến thức, giải bài tập, giải thích khái niệm.
   - Ví dụ: "Bảng băm là gì?", "Giải thích thuật toán Dijkstra".
3. "irrelevant": Xã giao, spam, câu hỏi cá nhân không liên quan học tập.
   - Ví dụ: "Chào bạn", "Bạn tên là gì?".
4. "is_academic": Trả về true nếu nội dung liên quan đến học tập/đại học, false nếu là rác/xã giao.

LƯU Ý QUAN TRỌNG: CHỈ TRẢ VỀ JSON HỢP LỆ. KHÔNG GIẢI THÍCH.`

    const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Phân loại câu này: "${message}"` }
        ],
        temperature: 0,
        response_format: { type: "json_object" },
        seed: 42
      }),
    })

    if (!response.ok) throw new Error("Pollinations API error")

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "{}"
    
    try {
      const parsed = JSON.parse(content)
      console.log(`[Intent] AI Classification: ${parsed.intent}`)
      return {
        intent: parsed.intent || "irrelevant",
        is_academic: parsed.is_academic ?? false
      }
    } catch {
      return { intent: "irrelevant", is_academic: false }
    }
  } catch (error) {
    console.warn("[Intent] AI Fallback triggered:", error)
    // Fallback mặc định: Coi là học thuật để không chặn nhầm trải nghiệm
    return { intent: "study", is_academic: true }
  }
}
