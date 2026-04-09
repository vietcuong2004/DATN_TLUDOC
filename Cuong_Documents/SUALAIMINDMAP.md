# 📌 Hướng dẫn tối ưu tính năng tạo Mindmap từ tài liệu (Production-ready)

## 🎯 Mục tiêu

Xây dựng hệ thống tạo **mindmap chính xác, ổn định cho mọi loại tài liệu** (PDF, DOCX, blog, sách…) tương tự cách hoạt động của NotebookLM.

---

# 🚨 Vấn đề hiện tại

## Kiến trúc đang dùng:

```
TEXT → chunk → generate mindmap từng chunk → merge → normalize
```

## Hệ quả:

* ❌ Mất context toàn cục
* ❌ Merge sai ngữ nghĩa
* ❌ AI tự bịa nội dung
* ❌ Output không liên quan tài liệu

---

# ✅ Kiến trúc đúng (bắt buộc phải chuyển)

## Pipeline chuẩn:

```
TEXT
 ↓
CHUNK (chia nhỏ)
 ↓
SUMMARIZE từng chunk (extract ý chính)
 ↓
MERGE → GLOBAL CONTEXT
 ↓
GENERATE MINDMAP (1 lần duy nhất)
```

---

# 🔥 Nguyên tắc quan trọng

1. **Không generate mindmap từ từng chunk**
2. **Không merge nhiều mindmap**
3. **Phải có bước “global understanding”**
4. **AI chỉ generate mindmap 1 lần duy nhất**

---

# 🧠 Thiết kế lại hệ thống

---

## 1. Chunk text (GIỮ NGUYÊN)

Giữ lại function:

```ts
chunkText(text, maxChunkChars, maxChunks)
```

👉 Nhưng chỉ dùng để:

* chia nhỏ input
* KHÔNG dùng để generate mindmap

---

## 2. Tóm tắt từng chunk (Local Summary)

### Mục tiêu:

* Extract ý chính
* Không cần cấu trúc tree

### Prompt:

```text
Bạn là chuyên gia phân tích tài liệu.

Hãy tóm tắt nội dung dưới đây thành các ý chính.

Yêu cầu:
- Dạng bullet points
- Ngắn gọn
- Không thêm thông tin ngoài tài liệu

Nội dung:
{{CHUNK}}
```

---

## 3. Tạo Global Context

```ts
const summaries = await Promise.all(chunks.map(summarizeChunk))
const globalContext = summaries.join("\n")
```

👉 Đây là bước QUAN TRỌNG NHẤT

---

## 4. Generate Mindmap (1 lần duy nhất)

### Prompt chuẩn:

```text
Bạn là chuyên gia phân tích tài liệu.

Từ nội dung dưới đây, hãy tạo sơ đồ tư duy (mindmap).

Yêu cầu:
- 5–8 nhánh chính
- Mỗi nhánh 3–6 ý con
- Mỗi node <= 10 từ
- Không bịa thông tin

Trả về JSON:

{
  "name": "Tiêu đề",
  "children": [
    {
      "name": "Chủ đề chính",
      "children": [
        { "name": "Ý nhỏ" }
      ]
    }
  ]
}

Nội dung:
{{GLOBAL_CONTEXT}}
```

---

# 🧩 Code đề xuất (core logic)

## Function chính mới

```ts
export async function generateMindmap(options: GenerationOptions) {
  const rootTitle = titleFromFileName(options.fileName)

  // 1. Chunk
  const chunks = chunkText(options.text, options.maxChunkChars, options.maxChunks)

  // 2. Summarize từng chunk
  const summaries = []
  for (const chunk of chunks) {
    const summary = await summarizeChunk(chunk, options)
    summaries.push(summary)
  }

  // 3. Merge global context
  const globalContext = summaries.join("\n")

  // 4. Generate mindmap 1 lần
  const mindmapTree = await generateMindmapFromContext(globalContext, options)

  return {
    simpleTree: mindmapTree,
    mindmap: toMindmapNode(mindmapTree),
    chunkCount: chunks.length,
  }
}
```

---

## summarizeChunk()

```ts
async function summarizeChunk(text: string, options) {
  const prompt = `...prompt summary ở trên...`

  const result = await callGemini(prompt, options)

  return result
}
```

---

## generateMindmapFromContext()

```ts
async function generateMindmapFromContext(context: string, options) {
  const prompt = `...prompt mindmap ở trên...`

  const result = await callGemini(prompt, options)

  const parsed = parseJsonWithRepairs(result)

  return parsed
}
```

---

# ❌ Những thứ cần XÓA khỏi code hiện tại

## Bắt buộc remove:

```ts
// ❌ XÓA
generateChunkTreeWithGemini
mergeChunkTrees
normalizeThreeLevelTree
branchSimilarity
buildFallbackChunkTree
```

---

# ⚠️ Những anti-pattern cần tránh

## 1. Không ép số lượng node

❌ Sai:

```ts
MIN_BRANCH_COUNT = 3
MIN_LEAF_COUNT = 3
```

✅ Đúng:

* để AI tự quyết định

---

## 2. Không flatten tree

❌ Sai:

```ts
collectLeafNames()
```

👉 Làm mất structure

---

## 3. Không fallback “hardcode”

❌ Sai:

```ts
"Tong quan", "Noi dung trong tam"
```

👉 Làm output fake

---

# 🚀 Nâng cấp nâng cao (optional)

## 1. Multi-pass AI

```
Pass 1: Extract topics
Pass 2: Group topics
Pass 3: Build tree
```

---

## 2. Giới hạn token thông minh

* chunk ~1500–2000 chars
* summary ngắn
* context cuối không quá dài

---

## 3. Cache kết quả

```ts
if (db.hasMindmap(docId)) return cached
```

---

# 🎯 Kết quả sau khi sửa

## Trước:

* Mindmap random
* Không liên quan tài liệu

## Sau:

* Logic rõ ràng
* Bám sát nội dung
* Hoạt động với mọi loại tài liệu

---

# 📌 Kết luận

👉 Vấn đề không nằm ở AI mà ở pipeline:

**Sai:**

```
chunk → generate → merge
```

**Đúng:**

```
chunk → summarize → combine → generate
```

---

# 💡 Ghi nhớ

> Mindmap = Global understanding
> Không bao giờ build từ các phần rời rạc

---

# 🧠 Tip quan trọng

Nếu phải chọn 1 thứ để sửa ngay:

👉 **Thêm bước summarize trước khi generate mindmap**

→ sẽ cải thiện chất lượng >70%

---

# ✅ Ready

File này có thể đưa trực tiếp vào VSCode + AI để refactor code.
