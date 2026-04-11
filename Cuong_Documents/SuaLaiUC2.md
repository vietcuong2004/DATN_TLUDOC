# 🚀 Production-Level: Tóm tắt tài liệu bằng AI (Generic & Scalable)

## 🎯 Mục tiêu

Xây dựng hệ thống tóm tắt:

* ✅ Chính xác (giữ đúng nội dung tài liệu)
* ✅ Ổn định (mọi loại tài liệu)
* ✅ Giống NotebookLM (hiểu toàn cục, không rời rạc)

---

# 🧠 Kiến trúc chuẩn (FINAL)

```id="arch1"
EXTRACT TEXT
   ↓
PREPROCESS
   ↓
CHUNK
   ↓
LOCAL SUMMARY (có global hint)
   ↓
MERGE + REFINE (AI hiểu toàn bộ)
   ↓
FINAL SUMMARY
```

---

# 🔥 Cải tiến chính

## ❌ Trước (sai)

```id="arch2"
chunk → summarize → join → summarize
```

## ✅ Sau (đúng)

```id="arch3"
chunk → summarize (context-aware)
      ↓
merge → refine (AI hiểu toàn bộ)
      ↓
final summary (structured)
```

---

# 🧩 CODE PRODUCTION

---

## 1. Tạo global hint (cực quan trọng)

```ts id="global-hint"
async function generateGlobalHint(text: string, apiKey: string, model: string) {
  const prompt = `
Hãy đọc tài liệu sau và mô tả NGẮN GỌN chủ đề chính (1-2 câu).

Không giải thích dài dòng.

Nội dung:
${text.slice(0, 3000)}
`

  const result = await callPollinationsChat({
    apiKey,
    model,
    temperature: 0.2,
    maxTokens: 120,
    messages: [{ role: "user", content: prompt }],
  })

  return result.trim()
}
```

---

## 2. Summarize chunk (context-aware)

```ts id="chunk-summary"
async function summarizeChunkWithContext(
  chunkText: string,
  globalHint: string,
  summaryType: SummaryFormat,
  apiKey: string,
  model: string,
) {
  const prompt = `
Đây là một phần của tài liệu.

Chủ đề tổng thể:
${globalHint}

Nhiệm vụ:
- Tóm tắt đoạn này
- Chỉ giữ ý quan trọng
- Không lặp lại thông tin chung

Output:
${summaryType === "bullets" ? "bullet points" : "short paragraph"}

Đoạn:
${chunkText}
`

  return callPollinationsChat({
    apiKey,
    model,
    temperature: 0.2,
    maxTokens: 280,
    messages: [{ role: "user", content: prompt }],
  })
}
```

---

## 3. Refine summaries (🔥 bước quyết định chất lượng)

```ts id="refine"
async function refineSummaries(
  summaries: string[],
  summaryType: SummaryFormat,
  apiKey: string,
  model: string,
) {
  const combined = summaries.join("\n")

  const prompt = `
Dưới đây là các ý chính rời rạc của một tài liệu:

${combined}

Nhiệm vụ:
1. Gộp các ý trùng
2. Nhóm các ý liên quan
3. Sắp xếp lại logic
4. Chỉ giữ thông tin quan trọng

Output:
${summaryType === "bullets" ? "bullet points" : "paragraph"}

Không thêm thông tin ngoài tài liệu.
`

  return callPollinationsChat({
    apiKey,
    model,
    temperature: 0.25,
    maxTokens: 600,
    messages: [{ role: "user", content: prompt }],
  })
}
```

---

## 4. Final summary (structured)

```ts id="final"
async function generateFinalSummary(
  refinedText: string,
  summaryType: SummaryFormat,
  summaryLength: number,
  language: SummaryLanguage,
  apiKey: string,
  model: string,
) {
  const prompt = `
Bạn là chuyên gia phân tích tài liệu.

Nhiệm vụ:
- Xác định insight chính
- Loại bỏ chi tiết phụ
- Viết lại rõ ràng, dễ hiểu

Ngôn ngữ: ${language === "vi" ? "Tiếng Việt" : "English"}
Độ dài: ${summaryLength}

Output:
${summaryType === "bullets" ? "Bullet points (5-8 ý)" : "1-2 đoạn văn"}

Nội dung:
${refinedText}
`

  return callPollinationsChat({
    apiKey,
    model,
    temperature: 0.3,
    maxTokens: estimateMaxTokens(summaryLength, summaryType),
    messages: [{ role: "user", content: prompt }],
  })
}
```

---

# 🧩 MAIN FUNCTION (REWRITE)

```ts id="main"
export async function generateSummaryFromFile(options): Promise<SummaryResult> {
  const extractedText = preprocessText(await extractTextFromFile(options.file))

  if (!extractedText || extractedText.length < 100) {
    throw new Error("Tài liệu không đủ nội dung.")
  }

  const chunks = smartChunk(extractedText, 2500).slice(0, 8)

  // 🔥 STEP 1: global understanding
  const globalHint = await generateGlobalHint(extractedText, options.apiKey, options.model)

  // 🔥 STEP 2: summarize từng chunk (có context)
  const chunkSummaries = []
  for (const chunk of chunks) {
    const s = await summarizeChunkWithContext(
      chunk.text,
      globalHint,
      options.summaryType,
      options.apiKey,
      options.model,
    )
    chunkSummaries.push(s)
  }

  // 🔥 STEP 3: refine toàn bộ
  const refined = await refineSummaries(
    chunkSummaries,
    options.summaryType,
    options.apiKey,
    options.model,
  )

  // 🔥 STEP 4: final summary
  const finalSummary = await generateFinalSummary(
    refined,
    options.summaryType,
    options.summaryLength,
    options.language,
    options.apiKey,
    options.model,
  )

  return {
    summary: normalizeSummary(finalSummary, options.summaryType),
    meta: {
      fileName: options.file.name,
      fileType: options.file.type || "unknown",
      wordCount: extractedText.split(/\s+/).length,
      chunkCount: chunks.length,
      summaryType: options.summaryType,
      language: options.language,
    },
  }
}
```

---

# ⚠️ Các điểm cần sửa thêm

## 1. Fix chunk bug

```ts id="fix-chunk"
const periodIdx = text.lastIndexOf(".", endIdx)
```

---

## 2. Giới hạn token thông minh

* chunk: ~2000–2500 chars
* max chunks: 6–10
* tránh overflow context

---

## 3. Retry logic (nên có)

```ts id="retry"
try { ... } catch {
  retry với temperature thấp hơn
}
```

---

# 🚀 Kết quả đạt được

## Trước:

* ❌ Summary rời rạc
* ❌ Lặp ý
* ❌ Thiếu insight

## Sau:

* ✅ Có structure rõ
* ✅ Insight chính nổi bật
* ✅ Không lặp
* ✅ Dùng được cho mọi tài liệu

---

# 🧠 Ghi nhớ quan trọng

> ❗ AI không thông minh hơn pipeline
> 👉 Pipeline quyết định 80% chất lượng

---

