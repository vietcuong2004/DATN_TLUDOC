import { NextResponse } from "next/server"
import { saveChatbotHistory, searchDocumentsForChatbot } from "@/lib/chatbot-db-services"
import { getDbPool } from "@/lib/mysql"
import { getHuggingFaceEmbedding, cosineSimilarity } from "@/lib/hf-embedder"
import { index as pineconeIndex } from "@/lib/pinecone"


// --- CONFIG & UTILS ---
// Global caches to improve performance
const embeddingCache = new Map<string, number[]>()
const answerCache = new Map<string, any>()

function normalizeVietnameseText(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, " ").trim()
}

function fastDot(a: number[], b: number[]) {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }
  return sum
}

/** 1. AI Intent Classifier (Router) */
async function classifyIntent(message: string, history: string): Promise<"ACADEMIC" | "DISCOVERY" | "CASUAL"> {
  const cleanMsg = message.toLowerCase().trim()

  // 1. Phân loại cứng (Rule-based)
  // - Phát hiện từ khóa CASUAL thông dụng
  const casualWords = ["haha", "hi", "hello", "chào", "cam on", "thanks", "tuyet", "oke", "ok", "bye", "hey", "hê", "hihi", "huhu", "vãi", "vl"]
  if (casualWords.some(word => cleanMsg.includes(word)) && cleanMsg.length < 15) {
    return "CASUAL"
  }

  // - Phát hiện chuỗi vô nghĩa (Gibberish)
  // Nếu là một từ duy nhất, dài > 10 ký tự và không có nguyên âm hoặc toàn ký tự lạ
  const words = cleanMsg.split(/\s+/)
  if (words.length === 1 && words[0].length > 10) {
    const hasVowels = /[aeiouyàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(words[0])
    if (!hasVowels) return "CASUAL"
  }

  // Nếu là chuỗi ký tự linh tinh không có dấu cách và quá dài
  if (cleanMsg.length > 15 && !cleanMsg.includes(" ") && !/[0-9]/.test(cleanMsg)) {
    return "CASUAL"
  }

  // 2. Nếu không phải câu đơn giản, dùng AI để phân loại
  try {
    const prompt = `
Bạn là hệ thống PHÂN LOẠI Ý ĐỊNH cho chatbot học tập.

=====================
NHIỆM VỤ
=====================
Phân loại câu hỏi thành 1 trong 3 nhãn:
- ACADEMIC
- DISCOVERY
- CASUAL

BẮT BUỘC:
- CHỈ trả về DUY NHẤT 1 TỪ
- KHÔNG giải thích
- KHÔNG xuống dòng
- KHÔNG thêm ký tự khác

=====================
ĐỊNH NGHĨA CHÍNH XÁC
=====================

1. ACADEMIC (ưu tiên cao nhất):
- Hỏi kiến thức học thuật, khái niệm, lý thuyết
- Nhờ giải bài tập
- So sánh, phân tích
- Có thể chứa từ mơ hồ nhưng phụ thuộc lịch sử

Ví dụ:
- "đạo hàm là gì"
- "giải bài này"
- "so sánh OOP và FP"
- "cái đó hoạt động thế nào" (nếu lịch sử là kiến thức)

---------------------

2. DISCOVERY:
- Hỏi về tài liệu / môn học / dữ liệu hệ thống
- Yêu cầu liệt kê / gợi ý tài nguyên
- Hỏi chatbot có gì / làm được gì

Từ khóa mạnh:
"tài liệu", "môn", "có gì", "liệt kê", "cho mình", "gợi ý"

Ví dụ:
- "có tài liệu AI không"
- "liệt kê các môn bạn biết"
- "cho mình tài liệu giải tích"

---------------------

3. CASUAL:
- Chào hỏi, cảm ơn
- Câu vô nghĩa / spam / ký tự linh tinh
- Không liên quan học tập

Ví dụ:
- "hello"
- "haha"
- "???"
- "asdasd"
- "ok luôn"

=====================
QUY TẮC ƯU TIÊN
=====================

1. Nếu có NỘI DUNG HỌC THUẬT → ACADEMIC
2. Nếu có ý định tìm TÀI LIỆU → DISCOVERY
3. Nếu KHÔNG LIÊN QUAN → CASUAL
4. Nếu mơ hồ → dùng LỊCH SỬ để suy luận
5. Nếu vẫn mơ hồ → mặc định ACADEMIC

=====================
NGỮ CẢNH
=====================
Lịch sử:
${history || "Không có"}

Câu hỏi:
"${message}"

=====================
KẾT QUẢ (CHỈ 1 TỪ):
`;
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&cache=true`)
    const intent = (await res.text()).trim().toUpperCase()

    if (intent.includes("DISCOVERY")) return "DISCOVERY"
    if (intent.includes("CASUAL")) return "CASUAL"
    return "ACADEMIC"
  } catch {
    return "ACADEMIC"
  }
}

async function expandQueryForSearch(query: string, history: string): Promise<string> {
  const needsContext = /nó|cái đó|thế còn|vậy|thêm|nữa|ở đâu/i.test(query) || query.split(" ").length <= 3
  if (!needsContext) return query

  try {
    const prompt = `Dựa vào Lịch sử: "${history}". Viết lại câu hỏi: "${query}" thành một cụm từ khóa tìm kiếm ngắn gọn (tối đa 6 từ). BẮT BUỘC CHỈ IN RA TỪ KHÓA, TUYỆT ĐỐI KHÔNG GIẢI THÍCH, KHÔNG TRẢ LỜI CÂU HỎI.`
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&cache=true`)
    const text = (await res.text()).trim()

    // Nếu AI bị ảo giác và trả về câu văn quá dài (trả lời luôn câu hỏi), dùng lại query gốc
    if (text.length > 100 || text.includes("###") || text.includes("**")) {
      return query
    }
    return text
  } catch { return query }
}

async function getCachedEmbedding(text: string) {
  if (embeddingCache.has(text)) return embeddingCache.get(text)!
  const emb = await getHuggingFaceEmbedding(text)
  embeddingCache.set(text, emb)
  return emb
}

function buildHistoryContext(history: any[]) {
  return (history || []).slice(-4).map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n")
}

function getSystemPrompt(intent: string) {
  const base = `Bạn là TutorAI chuyên gia của web TLU Document. Xưng "Mình", gọi "Bạn". Danh tính: Người quản lý kho dữ liệu của website TLU Document.`

  if (intent === "CASUAL") return `${base}\nGIAO TIẾP: Trả lời ngắn gọn 1 câu. Tuyệt đối không nhắc đến việc thiếu tài liệu.`

  if (intent === "DISCOVERY") return `${base}\nGIỚI THIỆU: Dựa vào dữ liệu hiện tại để liệt kê. BẮT BUỘC xưng hô là "Mình" và gọi người dùng là "Bạn". Nếu được hỏi về môn học, hãy mở đầu bằng: "Mình đang có kiến thức về:". Trả lời ngắn gọn, trực tiếp, KHÔNG giải thích dông dài. Tuyệt đối không yêu cầu người dùng cung cấp tài liệu.`

  return `${base}\nHỌC THUẬT: Sử dụng "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU". 
CHỈ THỊ ĐỊNH DẠNG (BẮT BUỘC):
- Sử dụng ## cho 4 đầu mục chính: ## I. Tổng quan, ## II. Giải thích chi tiết, ## III. Ví dụ minh họa, ## IV. Bước tiếp theo để học.
- TUYỆT ĐỐI KHÔNG viết mục "V. Tài liệu tham khảo". Hệ thống sẽ tự động làm việc này.
- In đậm **thuật ngữ** quan trọng. Sử dụng LaTeX \( \) CHỈ DÀNH CHO công thức toán học. BẮT BUỘC sử dụng markdown code block (\`code\`) cho các đoạn mã lập trình, cú pháp, hoặc tên biến. TUYỆT ĐỐI KHÔNG dùng LaTeX cho code.
RÀNG BUỘC (QUAN TRỌNG):
- BẮT BUỘC đi thẳng vào giải thích kiến thức. TUYỆT ĐỐI KHÔNG mở đầu bằng việc nhắc lại câu hỏi.
- Khi nhắc đến tên tài liệu cụ thể trong bài (Mục I-IV), hãy viết theo mẫu: "(tài liệu [Tên tài liệu])". Đây là căn cứ duy nhất để liệt kê vào mục V.
- CHỈ sử dụng thông tin trong phần "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU". Nếu hệ thống trích xuất thiếu, hãy nói "Kho dữ liệu của hệ thống hiện tại chưa có đủ thông tin chi tiết về phần này".
- Tuyệt đối không tự bịa kiến thức ngoài tài liệu.`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = String(body.message ?? "").trim()
    const historyContext = buildHistoryContext(body.history || [])

    // Force clear cache during debugging to ensure new prompt rules are applied
    answerCache.clear()

    if (!message || message.length < 2) {
      return NextResponse.json({ answer: "Bạn có câu hỏi gì về học tập hay tài liệu không?", documents: [] })
    }

    // Lightweight caching for fast responses on repeated queries
    if (answerCache.has(message)) {
      console.log(`[CHATBOT] Cache hit for: ${message}`)
      const cached = answerCache.get(message)
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(cached.answer + "\n__METADATA__\n" + JSON.stringify({
            chatId: cached.chatId, documents: cached.documents
          })))
          controller.close()
        }
      })
      return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    }

    const intent = await classifyIntent(message, historyContext)
    console.log(`[ROUTER] Detected Intent: ${intent}`)

    if (intent === "CASUAL") {
      const casualAnswer = "Xin lỗi, mình chưa hiểu câu hỏi của bạn. Bạn có thể hỏi chi tiết hơn hoặc hỏi đúng trọng tâm kiến thức được không? Mình có thể giúp bạn giải đáp những kiến thức trong môn học hoặc tìm tài liệu phù hợp cho bạn."
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(casualAnswer + "\n__METADATA__\n" + JSON.stringify({ documents: [] })))
          controller.close()
        }
      })
      return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    }

    const pool = getDbPool()
    let systemMap = ""
    let semanticChunks: any[] = []
    let allAvailableDocs: any[] = []

    const [subjectRows]: any = await pool.execute(`SELECT id, name, code FROM subjects`)
    const [allDocs]: any = await pool.execute(`SELECT id, title, subject_id, download_url, drive_file_id FROM documents WHERE status = 'published'`)
    allAvailableDocs = allDocs
    systemMap = subjectRows.map((s: any) => {
      const docs = allDocs.filter((d: any) => d.subject_id === s.id).map((d: any) => `+ ${d.title}`)
      return `- ${s.name} (${s.code}): ${docs.length} tài liệu\n  ${docs.join("\n  ")}`
    }).join("\n\n")

    if (intent === "ACADEMIC") {
      const expandedQuery = await expandQueryForSearch(message, historyContext)
      console.log(`[RAG] Optimized Search Query: ${expandedQuery}`)

      try {
        const queryVector = await getCachedEmbedding(message)

        // 1. Nhận diện môn học từ từ khóa trong câu hỏi (nếu có)
        const messageNorm = normalizeVietnameseText(message)
        let forcedSubjectId: number | null = null
        for (const s of subjectRows) {
          const sName = normalizeVietnameseText(s.name)
          const sCode = s.code.toLowerCase()
          if (messageNorm.includes(sName) || messageNorm.includes(sCode)) {
            forcedSubjectId = s.id
            break
          }
        }

        // 2. Truy vấn trực tiếp từ Pinecone (Lấy nhiều hơn để lọc)
        const queryResponse = await pineconeIndex.query({
          vector: queryVector,
          topK: 25,
          includeMetadata: true,
        })

        // 3. Chuyển đổi kết quả Pinecone
        let scored = queryResponse.matches.map((match: any) => ({
          content: match.metadata.content,
          title: match.metadata.title,
          id: match.metadata.document_id,
          subject_id: match.metadata.subject_id,
          score: match.score || 0,
          drive_file_id: match.metadata.drive_file_id || null,
          download_url: match.metadata.download_url || null
        }))

        // 4. Xác định môn học mục tiêu (Target Subject)
        let targetSubjectId: number | null = forcedSubjectId

        if (!targetSubjectId) {
          const subjectScores: Record<string, number> = {}
          scored.slice(0, 10).forEach(c => {
            if (c.subject_id) {
              subjectScores[c.subject_id] = (subjectScores[c.subject_id] || 0) + c.score
            }
          })

          let maxSubjScore = 0
          for (const [subj, score] of Object.entries(subjectScores)) {
            if (score > maxSubjScore) {
              maxSubjScore = score
              targetSubjectId = Number(subj)
            }
          }
        }

        // --- CƠ CHẾ THIẾT QUÂN LUẬT (HARD FILTER) ---
        // CHỈ giữ lại tài liệu thuộc môn học mục tiêu. Xóa bỏ hoàn toàn các môn khác.
        const targetSubject = subjectRows.find((s: any) => s.id === targetSubjectId)

        if (targetSubjectId !== null) {
          console.log(`[RAG_FILTER] 🎯 Đã xác định Môn học: ${targetSubject?.name || targetSubjectId}`)
          semanticChunks = scored.filter(c => Number(c.subject_id) === targetSubjectId).slice(0, 5)
        } else {
          semanticChunks = scored.slice(0, 5)
        }

        // YÊU CẦU TỪ USER: Ghi log chi tiết ra terminal
        console.log(`\n[RAG_DEBUG] ====== CHI TIẾT TÀI LIỆU (PINECONE RETRIEVAL) ======`)
        console.log(`[RAG_DEBUG] Câu hỏi: "${message}"`)
        console.log(`[RAG_DEBUG] Môn học mục tiêu: ${targetSubject?.name || "Không xác định"}`)

        if (semanticChunks.length > 0) {
          console.log(`[RAG_DEBUG] Các tài liệu được giữ lại sau khi lọc môn học:`)
          semanticChunks.forEach((c: any, i: number) => {
            const chunkSubject = subjectRows.find((s: any) => s.id === Number(c.subject_id))
            console.log(`   ${i + 1}. [Score: ${c.score.toFixed(3)}] ${c.title} (Môn: ${chunkSubject?.name || "N/A"})`)
          })
        } else {
          console.log(`[RAG_DEBUG] Không tìm thấy tài liệu nào thuộc môn học mục tiêu!`)
        }
        console.log(`[RAG_DEBUG] ==============================================\n`)

        // Retrieval Confidence Gate (Anti-Hallucination)
        if (semanticChunks.length === 0 || semanticChunks[0].score < 0.2) {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("Dựa trên hệ thống dữ liệu hiện tại, mình chưa tìm thấy thông tin phù hợp để trả lời chính xác câu hỏi này. Bạn hãy thử dùng từ khóa khác cụ thể hơn nhé.\n__METADATA__\n" + JSON.stringify({ chatId: body.chatId, documents: [] })))
              controller.close()
            }
          })
          return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
        }
      } catch (err) {
        console.error("[PINECONE_ERROR]", err)
        // Fallback or error response
      }
    }


    // Priority weighting added to Context String
    const contextStr = semanticChunks.map((c, i) => `[ĐOẠN ${i + 1} - MỨC ĐỘ: ${i < 2 ? "QUAN TRỌNG" : "BỔ SUNG"}]\nNguồn: ${c.title}\nĐộ liên quan: ${c.score ? c.score.toFixed(2) : "N/A"}\n\n${c.content.length > 500 ? c.content.slice(0, 500) + "..." : c.content}`).join("\n\n")
    const docList = Array.from(new Set(semanticChunks.map(d => d.title))).map(t => `- "${t}"`).join("\n")

    const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY || process.env.GEMINI_API_KEY || ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: getSystemPrompt(intent) },
          { role: "user", content: `LỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n${historyContext}\n\n${systemMap ? `DỮ LIỆU HIỆN TẠI:\n${systemMap}\n\n` : ''}NỘI DUNG CHI TIẾT TỪ TÀI LIỆU:\n${contextStr}\n\nDANH SÁCH TÀI LIỆU CÓ THỂ SỬ DỤNG (CHỈ TRÍCH DẪN NẾU THỰC SỰ CẦN THIẾT):\n${docList}\n\nCÂU HỎI HIỆN TẠI: ${message}` }
        ],
        temperature: 0.2,
        stream: true
      })
    })

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        let fullAnswer = ""

        try {
          if (res.body) {
            const reader = res.body.getReader()
            let buffer = ""
            while (true) {
              // Kiểm tra nếu client đã ngắt kết nối (bấm Hủy/Ctrl+C)
              if (request.signal.aborted) {
                console.log("[api/chatbot] Client aborted connection. Stopping stream.");
                reader.cancel(); // Ngắt stream từ phía AI provider
                return; // Kết thúc start()
              }

              const { value, done } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || "" // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const data = JSON.parse(line.slice(6))
                    const content = data.choices[0]?.delta?.content || ""
                    if (content) {
                      fullAnswer += content
                      controller.enqueue(encoder.encode(content))
                    }
                  } catch (e) {
                    // Ignore parse errors from chunk chunks
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream error", err)
        }

        // --- TỰ ĐỘNG TẠO MỤC V (CHỈ CHO ACADEMIC) ---
        const usedDocsMap = new Map<number, any>()
        const normAnswer = normalizeVietnameseText(fullAnswer).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")
        const docsToScan = intent === "DISCOVERY" ? allAvailableDocs : Array.from(new Set(semanticChunks.map(c => c.id))).map(id => semanticChunks.find(c => c.id === id))

        docsToScan.forEach(doc => {
          if (!doc) return
          const normTitle = normalizeVietnameseText(doc.title).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
          if (normTitle.length > 2) {
            const regex = new RegExp(`\\b${normTitle}\\b`, "i")
            if (regex.test(normAnswer)) {
              usedDocsMap.set(doc.id, doc)
            }
          }
        })

        if (intent === "ACADEMIC" && usedDocsMap.size > 0) {
          let sectionV = "\n\n## V. Tài liệu tham khảo\n"
          const sortedDocs = Array.from(usedDocsMap.values())
          sortedDocs.forEach((d, i) => {
            sectionV += `${i + 1}. "${d.title}"\n`
          })
          controller.enqueue(encoder.encode(sectionV))
          fullAnswer += sectionV
        }

        const metadata = {
          chatId: body.chatId || null,
          documents: Array.from(usedDocsMap.values()).map(d => ({
            id: d.id,
            title: d.title,
            image: d.drive_file_id ? `https://drive.google.com/thumbnail?id=${d.drive_file_id}&sz=w720` : "/placeholder.svg",
            downloadUrl: d.download_url || (d.drive_file_id ? `https://drive.google.com/uc?export=download&id=${d.drive_file_id}` : "#")
          })).slice(0, 5)
        }

        if (intent === "ACADEMIC" || intent === "DISCOVERY") {
          answerCache.set(message, { answer: fullAnswer.trim(), ...metadata })
          if (answerCache.size > 200) answerCache.clear()
        }

        controller.enqueue(encoder.encode("\n__METADATA__\n" + JSON.stringify(metadata)))
        controller.close()
      }
    })

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
  } catch (error) {
    console.error(`[CHATBOT_ERROR]`, error)
    return NextResponse.json({ answer: "Lỗi hệ thống", documents: [] }, { status: 500 })
  }
}
