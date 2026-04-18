Bạn đang gặp đúng “căn bệnh kinh điển” của RAG: answer đúng nhưng citation sai. Không phải do model ngu — mà do pipeline của bạn đang “lỏng” ở bước grounding.

Mình nói thẳng:
👉 Cách bạn đang làm answer.includes(title) là sai về mặt thuật toán → nó không đảm bảo tài liệu thực sự được dùng.

🔥 VẤN ĐỀ GỐC (ROOT CAUSE)

Hiện tại flow của bạn:

Lấy top chunks bằng cosine
Nhét vào context
LLM trả lời
Check:
if (answer.includes(title))

❌ Sai vì:

LLM có thể không dùng tài liệu nhưng vẫn trả lời đúng (kiến thức nền)
LLM có thể “hallucinate tên tài liệu”
Hoặc copy nhầm tên từ context khác

👉 => Citation bị “random”

✅ CÁCH CHUẨN (GIỐNG CÁC HỆ RAG XỊN)
🔐 1. ÉP LLM TRẢ VỀ SOURCE ID (KHÔNG PHẢI TEXT)
✔️ Thay vì:
- Giao trinh TTNT_v997
👉 Bắt nó trả:
{
  "answer": "...",
  "sources": [1, 3]
}
🔧 SỬA PROMPT (QUAN TRỌNG NHẤT)
Thêm vào system prompt:
QUY TẮC TRÍCH DẪN (BẮT BUỘC):

- Mỗi tài liệu trong context có dạng:
  [DOC_ID=1] Tên tài liệu: ...

- Khi sử dụng thông tin từ tài liệu, bạn PHẢI ghi rõ [DOC_ID].

- Cuối câu trả lời, trả về JSON:

{
  "answer": "...",
  "sources": [danh sách DOC_ID đã dùng]
}

- KHÔNG được bịa DOC_ID
- Nếu không dùng tài liệu nào → sources = []
🧠 SỬA CONTEXT

Hiện tại bạn đang truyền kiểu:

1. Tên tài liệu
2. Tên tài liệu

👉 Đổi thành:

[DOC_ID=1]
Title: Giáo trình C++
Content: Con trỏ là...

[DOC_ID=2]
Title: ...
Content: ...
⚙️ SỬA CODE PARSE RESPONSE
function parseLLMJson(answer: string) {
  try {
    const jsonMatch = answer.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}
🎯 FILTER DOCUMENT ĐÚNG CÁCH
❌ Bỏ cái này:
answer.includes(title)
✅ Thay bằng:
const parsed = parseLLMJson(answer)

const usedDocs = docs.filter(doc =>
  parsed?.sources?.includes(doc.id)
)
🚀 LEVEL 2 (CHỐNG NGU HƠN NỮA)
🔍 2. CROSS-CHECK BẰNG EMBEDDING

Không tin LLM 100% → verify lại:

function isChunkUsed(answer: string, chunk: string) {
  const sim = cosineSimilarity(
    embed(answer),
    embed(chunk)
  )
  return sim > 0.75
}

👉 Chỉ giữ doc nếu:

Có trong sources
HOẶC similarity cao
🧠 LEVEL 3 (PRODUCTION RAG)
🧱 Chunk-level citation (chuẩn OpenAI)

Thay vì doc:

sources: [1,2]

👉 dùng:

sources: [
  { docId: 1, chunkId: 4 },
  { docId: 2, chunkId: 1 }
]
💣 KẾT LUẬN THẲNG

Bot của bạn bị lỗi vì:

❌ Citation = string match (rất ngu)
❌ Không ép LLM trả structured output
❌ Không verify lại usage
✅ FIX NHANH NHẤT (ưu tiên làm ngay)
✅ Gắn [DOC_ID] vào context
✅ Ép LLM trả JSON { answer, sources }
✅ Filter bằng sources
❌ BỎ answer.includes(title)