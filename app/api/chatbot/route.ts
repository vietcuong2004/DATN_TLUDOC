import { NextResponse } from "next/server"
import { saveChatbotHistory, searchDocumentsForChatbot } from "@/lib/chatbot-db-services"
import { getDbPool } from "@/lib/mysql"
import { getHuggingFaceEmbedding, cosineSimilarity } from "@/lib/hf-embedder"

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
  try {
    const prompt = `Phân loại ý định: "${message}" | Lịch sử: "${history}".
Trả về duy nhất 1 từ: ACADEMIC, DISCOVERY, hoặc CASUAL.
- DISCOVERY: Hỏi hệ thống có tài liệu gì, môn học nào, chức năng gì, liệt kê tài liệu.
- CASUAL: Chào hỏi, khen chê, cảm ơn.
- ACADEMIC: Hỏi kiến thức bài học, giải thích khái niệm, làm bài tập.`
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&cache=true`)
    const intent = (await res.text()).trim().toUpperCase()
    return intent.includes("DISCOVERY") ? "DISCOVERY" : intent.includes("CASUAL") ? "CASUAL" : "ACADEMIC"
  } catch { return "ACADEMIC" }
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
- Sử dụng ## cho 5 đầu mục chính: ## I. Tổng quan, ## II. Giải thích chi tiết, ## III. Ví dụ minh họa, ## IV. Bước tiếp theo để học, ## V. Tài liệu tham khảo.
- Mục V: BẮT BUỘC liệt kê TẤT CẢ các tài liệu đã được trích dẫn hoặc thực sự sử dụng nội dung để trả lời ở trên. TUYỆT ĐỐI KHÔNG liệt kê các tài liệu "gợi ý thêm" hoặc tài liệu không dùng đến trong bài viết. CHỈ viết tên file theo dạng: 1. "Tên tài liệu" KHÔNG viết thêm bất kỳ từ nào khác sau tên file (không viết LaTeX, không viết ghi chú).
- In đậm **thuật ngữ** quan trọng. Sử dụng LaTeX \( \) CHỈ DÀNH CHO công thức toán học. BẮT BUỘC sử dụng markdown code block (\`code\`) cho các đoạn mã lập trình, cú pháp, hoặc tên biến. TUYỆT ĐỐI KHÔNG dùng LaTeX cho code.
RÀNG BUỘC (QUAN TRỌNG):
- BẮT BUỘC đi thẳng vào giải thích kiến thức. TUYỆT ĐỐI KHÔNG mở đầu bằng việc nhắc lại câu hỏi (ví dụ: cấm dùng "Bạn hỏi về...", "Theo câu hỏi của bạn...").
- Phần "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU" là dữ liệu hệ thống tự động trích xuất từ kho TLU, KHÔNG PHẢI do người dùng cung cấp. Tuyệt đối KHÔNG yêu cầu người dùng gửi thêm tài liệu hay trích đoạn.
- TUYỆT ĐỐI KHÔNG viết cụm từ "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU" vào câu trả lời cuối cùng. Hãy dùng các cách diễn đạt tự nhiên như "Theo tài liệu", "Trong hệ thống". Khi nhắc đến tên tài liệu cụ thể trong bài, hãy viết theo mẫu: "(tài liệu [Tên tài liệu])".
- CHỈ sử dụng thông tin trong phần "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU". Nếu hệ thống trích xuất thiếu, hãy nói "Kho dữ liệu của hệ thống hiện tại chưa có đủ thông tin chi tiết về phần này".
- Tuyệt đối không tự bịa kiến thức ngoài tài liệu.`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = String(body.message ?? "").trim()
    const historyContext = buildHistoryContext(body.history || [])

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

    const pool = getDbPool()
    let systemMap = ""
    let semanticChunks: any[] = []
    let allAvailableDocs: any[] = []

    if (intent !== "CASUAL") {
      const [subjectRows]: any = await pool.execute(`SELECT id, name, code FROM subjects`)
      const [allDocs]: any = await pool.execute(`SELECT id, title, subject_id, download_url, drive_file_id FROM documents WHERE status = 'published'`)
      allAvailableDocs = allDocs
      systemMap = subjectRows.map((s: any) => {
        const docs = allDocs.filter((d: any) => d.subject_id === s.id).map((d: any) => `+ ${d.title}`)
        return `- ${s.name} (${s.code}): ${docs.length} tài liệu\n  ${docs.join("\n  ")}`
      }).join("\n\n")
    }

    if (intent === "ACADEMIC") {
      const expandedQuery = await expandQueryForSearch(message, historyContext)
      console.log(`[RAG] Optimized Search Query: ${expandedQuery}`)

      let rows: any[] = []
      try {
        const [sqlRows]: any = await pool.execute(`
          SELECT dc.content, dc.embedding, d.id, d.title, d.download_url, d.drive_file_id, MATCH(dc.content) AGAINST (? IN NATURAL LANGUAGE MODE) as bm25Score
          FROM document_chunks dc 
          JOIN documents d ON d.id = dc.document_id 
          WHERE d.status = 'published' AND MATCH(dc.content) AGAINST (? IN NATURAL LANGUAGE MODE)
          LIMIT 200
        `, [expandedQuery, expandedQuery])
        rows = sqlRows
      } catch (err) {
        const keywords = expandedQuery.split(" ").filter(w => w.length > 2).slice(0, 3)
        let likeClause = "AND (1=0"; const params: any[] = []
        keywords.forEach(k => { likeClause += " OR dc.content LIKE ? OR d.title LIKE ?"; params.push(`%${k}%`, `%${k}%`) })
        likeClause += ")"
        const [sqlRows]: any = await pool.execute(`
          SELECT dc.content, dc.embedding, d.id, d.title, d.download_url, d.drive_file_id
          FROM document_chunks dc 
          JOIN documents d ON d.id = dc.document_id 
          WHERE d.status = 'published' ${likeClause}
          LIMIT 50
        `, params)
        rows = sqlRows
      }

      if (rows.length > 0) {
        const queryVector = await getCachedEmbedding(message)
        const maxBm25 = Math.max(...rows.map((r: any) => r.bm25Score || 0), 1)
        const messageNorm = normalizeVietnameseText(message)
        const queryWords = messageNorm.split(" ").filter(w => w.length > 2)

        let scored = rows.map((r: any) => {
          const chunkEmb = typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding
          const vectorScore = fastDot(queryVector, chunkEmb)
          const normBm25 = (r.bm25Score || 0) / maxBm25

          // Trùng khớp tiêu đề theo từng từ khóa (chia tỉ lệ)
          const normTitle = normalizeVietnameseText(r.title)
          const titleMatchScore = queryWords.filter(w => normTitle.includes(w)).length / (queryWords.length || 1)

          return { ...r, score: (vectorScore * 0.5) + (normBm25 * 0.3) + (titleMatchScore * 0.2) }
        }).sort((a: any, b: any) => b.score - a.score)

        // --- RULE TRỪ ĐIỂM LẠC ĐỀ MÔN HỌC (CROSS-SUBJECT PENALTY) ---
        // 1. Tính tổng điểm của từng môn học trong Top 10 để tìm ra môn học thực sự áp đảo
        const subjectScores: Record<string, number> = {}
        scored.slice(0, 10).forEach(c => {
          if (c.subject_id) {
            subjectScores[c.subject_id] = (subjectScores[c.subject_id] || 0) + c.score
          }
        })

        let dominantSubjectId: number | null = null
        let maxSubjScore = 0
        for (const [subj, score] of Object.entries(subjectScores)) {
          const numScore = score as number
          if (numScore > maxSubjScore) {
            maxSubjScore = numScore
            dominantSubjectId = Number(subj)
          }
        }

        // 2. Trừ điểm RẤT NẶNG các tài liệu thuộc môn học khác để chúng rớt khỏi ngưỡng 0.25
        if (dominantSubjectId !== null) {
          scored = scored.map(c => {
            if (c.subject_id && c.subject_id !== dominantSubjectId) {
              c.score -= 0.4 // Penalty hủy diệt
            }
            return c
          }).sort((a: any, b: any) => b.score - a.score)
        }

        scored = scored.slice(0, 30)

        // Deduplication
        const unique = new Map()
        scored.forEach((c: any) => {
          const key = normalizeVietnameseText(c.content.slice(0, 100))
          if (!unique.has(key)) unique.set(key, c)
        })

        // STRICT FILTERING: Bỏ ngay những chunk điểm thấp (< 0.25)
        const topCandidates = Array.from(unique.values())
          .filter((c: any) => c.score >= 0.25)
          .slice(0, 5) // Chỉ lấy 5 chunk tốt nhất thay vì 8

        semanticChunks = topCandidates

        // YÊU CẦU TỪ USER: Ghi log chi tiết ra terminal
        console.log(`\n[RAG_DEBUG] ====== CHI TIẾT TÀI LIỆU (RETRIEVAL) ======`)
        console.log(`[RAG_DEBUG] Câu hỏi: "${message}"`)
        if (semanticChunks.length > 0) {
          console.log(`[RAG_DEBUG] Các tài liệu được sử dụng làm Context:`)
          semanticChunks.forEach((c: any, i: number) => {
            console.log(`   ${i + 1}. [Score: ${c.score.toFixed(3)}] ${c.title}`)
          })
        } else {
          console.log(`[RAG_DEBUG] Không có tài liệu nào đủ điểm (Score >= 0.25)!`)
        }
        console.log(`[RAG_DEBUG] ==============================================\n`)

        // Retrieval Confidence Gate (Anti-Hallucination)
        if (semanticChunks.length === 0) {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("Dựa trên hệ thống dữ liệu hiện tại, mình chưa tìm thấy thông tin phù hợp để trả lời chính xác câu hỏi này. Bạn hãy thử dùng từ khóa khác cụ thể hơn nhé.\n__METADATA__\n" + JSON.stringify({ chatId: body.chatId, documents: [] })))
              controller.close()
            }
          })
          return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
        }
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
          { role: "user", content: `LỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n${historyContext}\n\n${systemMap ? `DỮ LIỆU HIỆN TẠI:\n${systemMap}\n\n` : ''}NỘI DUNG CHI TIẾT TỪ TÀI LIỆU:\n${contextStr}\n\nDANH SÁCH TRÍCH DẪN:\n${docList}\n\nCÂU HỎI HIỆN TẠI: ${message}` }
        ],
        temperature: intent === "CASUAL" ? 0.7 : 0.2,
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

        // Now run the metadata extraction logic using fullAnswer
        const usedDocsMap = new Map<number, any>()
        let textToScan = fullAnswer
        const sectionVMatch = fullAnswer.match(/V\.\s*Tài liệu tham khảo([\s\S]*)/i)
        if (sectionVMatch) {
          textToScan = sectionVMatch[1]
        }
        const normAnswer = normalizeVietnameseText(textToScan).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")

        // CHỈ quét tìm trong danh sách tài liệu đã được gửi cho AI làm bối cảnh (semanticChunks)
        // Điều này ngăn việc bắt nhầm các tài liệu ngẫu nhiên khác trong toàn bộ database
        const providedDocs = Array.from(new Set(semanticChunks.map(c => c.id))).map(id => semanticChunks.find(c => c.id === id))

        providedDocs.forEach(doc => {
          if (!doc) return
          const normTitle = normalizeVietnameseText(doc.title).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
          if (normTitle.length > 2) {
            const regex = new RegExp(`\\b${normTitle}\\b`)
            if (regex.test(normAnswer)) {
              usedDocsMap.set(doc.id, doc)
            }
          }
        })

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
