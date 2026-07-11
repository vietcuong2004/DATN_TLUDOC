import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/mysql"
import { getHuggingFaceEmbedding } from "@/lib/hf-embedder"
import { index as pineconeIndex } from "@/lib/pinecone"
import { callAiModel, callAiModelStream } from "@/lib/ai-model"

// --- CONFIG & UTILS ---
// Global caches to improve performance
const embeddingCache = new Map<string, number[]>()
const answerCache = new Map<string, any>()

function normalizeVietnameseText(input: string) {
	return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, " ").trim()
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
		const intentText = await callAiModel(prompt, { temperature: 0 })
		const intent = intentText.trim().toUpperCase()

		if (intent.includes("DISCOVERY")) return "DISCOVERY"
		if (intent.includes("CASUAL")) return "CASUAL"
		return "ACADEMIC"
	} catch (err) {
		console.error("[classifyIntent.error]", err)
		return "ACADEMIC"
	}
}

async function expandQueryForSearch(query: string, history: string): Promise<string> {
	const needsContext = /nó|cái đó|thế còn|vậy|thêm|nữa|ở đâu/i.test(query) || query.split(" ").length <= 3
	if (!needsContext) return query

	try {
		const prompt = `Dựa vào Lịch sử: "${history}". Viết lại câu hỏi: "${query}" thành một cụm từ khóa tìm kiếm ngắn gọn (tối đa 6 từ). BẮT BUỘC CHỈ IN RA TỪ KHÓA, TUYỆT ĐỐI KHÔNG GIẢI THÍCH, KHÔNG TRẢ LỜI CÂU HỎI.`
		const text = (await callAiModel(prompt, { temperature: 0.1 })).trim()

		// Nếu AI bị ảo giác và trả về câu văn quá dài (trả lời luôn câu hỏi), dùng lại query gốc
		if (text.length > 100 || text.includes("###") || text.includes("**")) {
			return query
		}
		return text
	} catch (err) {
		console.error("[expandQueryForSearch.error]", err)
		return query
	}
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

	if (intent === "CASUAL") return `${base}\nGIAO TIẾP: Trả lời ngắn gọn 1 câu. Tuyệt đối không nhắc đến tài liệu.`

	if (intent === "DISCOVERY") return `${base}\nGIỚI THIỆU: Dựa vào dữ liệu hiện tại của hệ thống để trả lời. BẮT BUỘC xưng hô là "Mình" và gọi người dùng là "Bạn". Nếu người dùng hỏi về các môn học mà bạn có kiến thức hoặc tài liệu, bạn BẮT BUỘC phải tuân thủ định dạng sau:
1. Mở đầu bằng câu chính xác: "Mình đang có kiến thức về các môn học:"
2. Theo sau bởi một dòng trống (xuống dòng 2 lần).
3. Liệt kê danh sách các môn học dưới dạng các dòng gạch đầu dòng, mỗi môn học trên một dòng độc lập, bắt đầu bằng ký tự '•' (dấu chấm tròn) theo định dạng chính xác: "• Tên môn học (Mã môn học)". Ví dụ:
• Cấu trúc dữ liệu và giải thuật (CSE281)
• Cơ sở dữ liệu (CSE484)
4. Sắp xếp các môn học theo thứ tự bảng chữ cái tiếng Việt của tên môn học.
5. Tuyệt đối KHÔNG viết chung các môn học trên một dòng cách nhau bởi dấu phẩy, KHÔNG thêm câu hỏi phụ hay bất kỳ lời giải thích nào ở cuối câu trả lời (như "Bạn cần tìm tài liệu..."). Trả lời ngắn gọn, trực tiếp, không yêu cầu người dùng cung cấp tài liệu.`

	return `${base}\nHỌC THUẬT: Sử dụng "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU". 
CHỈ THỊ ĐỊNH DẠNG (BẮT BUỘC):
- Sử dụng ## cho 4 đầu mục chính: ## I. Tổng quan, ## II. Giải thích chi tiết, ## III. Ví dụ minh họa, ## IV. Bước tiếp theo để học.
- TUYỆT ĐỐI KHÔNG viết mục "V. Tài liệu tham khảo". Hệ thống sẽ tự động làm việc này.
- In đậm **thuật ngữ** quan trọng. Sử dụng LaTeX \( \) CHỈ DÀNH CHO công thức toán học. BẮT BUỘC sử dụng markdown code block (\`code\`) cho các đoạn mã lập trình, cú pháp, hoặc tên biến. TUYỆT ĐỐI KHÔNG dùng LaTeX cho code.
RÀNG BUỘC (QUAN TRỌNG):
- BẮT BUỘC đi thẳng vào giải thích kiến thức. TUYỆT ĐỐI KHÔNG mở đầu bằng việc nhắc lại câu hỏi.
- BẮT BUỘC: Khi sử dụng thông tin từ tài liệu nào, bạn phải viết kèm nguồn chính xác theo mẫu: "(tài liệu [Tên tài liệu])" (ví dụ: (tài liệu CSDL-Chuong 6-Dang chuan va chuan hoa)) ở cuối các câu hoặc các ý tương ứng trong các mục từ I đến IV.
- CHỈ sử dụng kiến thức trong phần "NỘI DUNG CHI TIẾT TỪ TÀI LIỆU" làm lý thuyết nền tảng. Tuyệt đối không tự bịa kiến thức lý thuyết khác ngoài tài liệu. Nếu nội dung tài liệu không liên quan đến câu hỏi, bạn BẮT BUỘC phải trả lời: "Hiện mình chưa có tài liệu/kiến thức trong hệ thống về nội dung này, bạn hãy đặt câu hỏi liên quan đến tài liệu môn học khác nhé." và không được giải thích thêm gì cả.
- Đối với phần "III. Ví dụ minh họa": Nếu tài liệu trích xuất không có sẵn ví dụ hoặc code mẫu, bạn BẮT BUỘC sử dụng kiến thức chuyên môn của mình để tự soạn một ví dụ minh họa hoặc đoạn code mẫu thực tế, chính xác và dễ hiểu nhất để làm rõ cho phần lý thuyết ở trên.`
}

function createTextResponse(text: string) {
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(text))
			controller.close()
		}
	})

	return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}

export async function handleChatbotRequest(request: Request) {
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
			return createTextResponse(casualAnswer + "\n__METADATA__\n" + JSON.stringify({ documents: [] }))
		}

		const pool = getDbPool()
		let systemMap = ""
		let semanticChunks: any[] = []
		let allAvailableDocs: any[] = []

		const [subjectRows]: any = await pool.execute(`SELECT id, name, code FROM subjects`)
		// Sort subjects alphabetically by Vietnamese name
		subjectRows.sort((a: any, b: any) => a.name.localeCompare(b.name, "vi"))
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

				// 2. Truy vấn trực tiếp từ Pinecone (Lọc theo môn học nếu nhận diện được môn học mục tiêu)
				const queryResponse = await pineconeIndex.query({
					vector: queryVector,
					topK: 25,
					includeMetadata: true,
					filter: forcedSubjectId ? { subject_id: { $eq: forcedSubjectId } } : undefined
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
					// Chọn môn học của chunk có độ tương đồng cao nhất (đứng đầu danh sách)
					if (scored.length > 0 && scored[0].subject_id) {
						targetSubjectId = Number(scored[0].subject_id)
					}
				}

				// --- CƠ CHẾ THIẾT QUÂN LUẬT (HARD FILTER) ---
				// CHỈ giữ lại tài liệu thuộc môn học mục tiêu khi được chỉ định rõ ràng trong câu hỏi.
				// Nếu không chỉ định rõ môn học, lấy top 8 tài liệu tương đồng nhất từ toàn bộ index để tránh bỏ sót tri thức đúng.
				const targetSubject = subjectRows.find((s: any) => s.id === targetSubjectId)

				if (forcedSubjectId !== null) {
					console.log(`[RAG_FILTER] 🎯 Đã xác định Môn học (Lọc cứng): ${targetSubject?.name || targetSubjectId}`)
					semanticChunks = scored.filter(c => Number(c.subject_id) === targetSubjectId).slice(0, 5)
				} else {
					semanticChunks = scored.slice(0, 8)
				}

				// Ghi log chi tiết ra terminal
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
				if (semanticChunks.length === 0 || semanticChunks[0].score < 0.4) {
					return createTextResponse("Hiện mình chưa có tài liệu/kiến thức trong hệ thống về nội dung này, bạn hãy đặt câu hỏi liên quan đến tài liệu môn học khác nhé.\n__METADATA__\n" + JSON.stringify({ chatId: body.chatId, documents: [] }))
				}
			} catch (err) {
				console.error("[PINECONE_ERROR]", err)
				// Fallback or error response
			}
		}


		// Priority weighting added to Context String
		const contextStr = semanticChunks.map((c, i) => `[ĐOẠN ${i + 1} - MỨC ĐỘ: ${i < 2 ? "QUAN TRỌNG" : "BỔ SUNG"}]\nNguồn: ${c.title}\nĐộ liên quan: ${c.score ? c.score.toFixed(2) : "N/A"}\n\n${c.content.length > 500 ? c.content.slice(0, 500) + "..." : c.content}`).join("\n\n")
		const docList = Array.from(new Set(semanticChunks.map(d => d.title))).map(t => `- "${t}"`).join("\n")

		const userPrompt = `LỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n${historyContext}\n\n${systemMap ? `DỮ LIỆU HIỆN TẠI:\n${systemMap}\n\n` : ''}NỘI DUNG CHI TIẾT TỪ TÀI LIỆU:\n${contextStr}\n\nDANH SÁCH TÀI LIỆU CÓ THỂ SỬ DỤNG (CHỈ TRÍCH DẪN NẾU THỰC SỰ CẦN THIẾT):\n${docList}\n\nCÂU HỎI HIỆN TẠI: ${message}`

		const resultStream = await callAiModelStream(userPrompt, {
			systemInstruction: getSystemPrompt(intent),
			temperature: 0.2,
		})

		const encoder = new TextEncoder()

		const stream = new ReadableStream({
			async start(controller) {
				let fullAnswer = ""

				try {
					for await (const chunk of resultStream.stream) {
						// Kiểm tra nếu client đã ngắt kết nối (bấm Hủy/Ctrl+C)
						if (request.signal.aborted) {
							console.log("[api/chatbot] Client aborted connection. Stopping stream.")
							return
						}

						const chunkText = chunk.text()
						if (chunkText) {
							fullAnswer += chunkText
							controller.enqueue(encoder.encode(chunkText))
						}
					}
				} catch (err) {
					console.error("Stream error", err)
				}

				// --- TỰ ĐỘNG TẠO MỤC V (CHỈ CHO ACADEMIC) ---
				const usedDocsMap = new Map<number, any>()
				const isRejection = fullAnswer.includes("chưa có tài liệu") || 
				                    fullAnswer.includes("chưa có kiến thức") || 
				                    fullAnswer.includes("chưa tìm thấy thông tin");

				if (!isRejection) {
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

					// Fallback: Nếu không quét được tài liệu nào từ câu trả lời nhưng có semanticChunks, tự động lấy các tài liệu tìm thấy từ RAG
					if (usedDocsMap.size === 0 && semanticChunks.length > 0) {
						semanticChunks.forEach(c => {
							if (c) usedDocsMap.set(c.id, c)
						})
					}
				}

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

