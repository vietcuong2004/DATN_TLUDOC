import { z } from "zod"

export type MindmapNode = {
  id: string
  title: string
  important: boolean
  sourceRefs: string[]
  children: MindmapNode[]
}
type SimpleMindmapNode = {
  name: string
  children?: SimpleMindmapNode[]
}

type GenerationOptions = {
  fileName: string
  text: string
  apiKey: string
  model: string
  maxChunkChars: number
  maxChunks: number
}

function normalizeModelName(modelName: string) {
  const trimmed = modelName.trim()
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed
}

async function callPollinationsChat(options: {
  apiKey: string
  model: string
  systemPrompt?: string
  userPrompt: string
  temperature: number
  maxTokens: number
}) {
  const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: normalizeModelName(options.model || "openai"),
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system", content: options.systemPrompt }]
          : []),
        { role: "user", content: options.userPrompt },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Pollinations error (${response.status}): ${errorBody || "Unknown"}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = payload.choices?.[0]?.message?.content?.trim() ?? ""
  if (!content) {
    throw new Error("Pollinations returned empty content")
  }

  return content
}

const SimpleMindmapNodeSchema: z.ZodType<SimpleMindmapNode> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    children: z.array(SimpleMindmapNodeSchema).optional(),
  }),
)

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeName(value: string) {
  return normalizeWhitespace(value)
    .replace(/^[-*•]\s*/, "")
    .replace(/[\r\n]+/g, " ")
}

function cleanMarkdownText(text: string): string {
  // Loại bỏ heading markdown
  text = text.replace(/^#+\s+/gm, "")
  
  // Loại bỏ bullet points
  text = text.replace(/^[\s]*[•○◯●-]\s+/gm, "")
  
  // Loại bỏ numbered lists
  text = text.replace(/^\s*\d+\.\s+/gm, "")
  
  // Ghép các dòng bị cắt
  text = text.replace(/([.!?])\n(?=[a-z])/g, "$1 ")
  
  // Normalize whitespace
  text = text.replace(/\s+/g, " ")
  
  return text.trim()
}

function titleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "")
  const cleaned = withoutExtension.replace(/[_-]+/g, " ").trim()
  return cleaned.length > 0 ? cleaned : "Tai lieu"
}

function normalizeForCompare(value: string) {
  return normalizeName(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function extractJsonFromText(value: string) {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch) {
    return fencedMatch[1].trim()
  }

  const genericFenceMatch = value.match(/```\s*([\s\S]*?)```/)
  if (genericFenceMatch) {
    return genericFenceMatch[1].trim()
  }

  const objectStart = value.indexOf("{")
  const objectEnd = value.lastIndexOf("}")
  if (objectStart >= 0 && objectEnd > objectStart) {
    return value.slice(objectStart, objectEnd + 1).trim()
  }

  return value.trim()
}

function findBalancedJsonObject(value: string) {
  const start = value.indexOf("{")
  if (start < 0) {
    return ""
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < value.length; index += 1) {
    const char = value[index]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }

      if (char === "\\") {
        escaped = true
        continue
      }

      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === "{") {
      depth += 1
      continue
    }

    if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return value.slice(start, index + 1)
      }
    }
  }

  return ""
}

function parseJsonWithRepairs(rawText: string) {
  const extracted = extractJsonFromText(rawText)
  const balanced = findBalancedJsonObject(rawText)

  const candidates = uniqueStrings([
    extracted,
    balanced,
    extracted.replace(/,\s*([}\]])/g, "$1"),
    balanced.replace(/,\s*([}\]])/g, "$1"),
    extracted.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
    balanced.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
  ]).filter((item) => item.length > 0)

  let lastError: unknown = null

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch (error) {
      lastError = error
    }
  }

  throw (lastError instanceof Error ? lastError : new Error("Khong parse duoc JSON tu Gemini output."))
}

function sentenceToLeafTitle(sentence: string, maxWords = 14) {
  const normalized = normalizeName(sentence)
  const words = normalized.split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) {
    return "Chi tiet noi dung"
  }
  return words.slice(0, maxWords).join(" ")
}

function chunkText(inputText: string, maxChunkChars: number, maxChunks: number) {
  const text = cleanMarkdownText(inputText)
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]+/g, " ")
    .replace(/\r/g, "")
    .trim()

  if (!text) {
    return [] as string[]
  }

  if (text.length <= maxChunkChars) {
    return [text]
  }

  const paragraphs = text.split(/\n{2,}/).flatMap((paragraph) => {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      return [] as string[]
    }

    if (trimmed.length > maxChunkChars) {
      return splitLargeParagraph(trimmed, Math.max(1600, Math.floor(maxChunkChars * 0.92)))
    }

    return [trimmed]
  })

  const chunks: string[] = []
  let current = ""

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > maxChunkChars && current.length > 0) {
      chunks.push(current)
      current = paragraph
      if (chunks.length >= maxChunks) {
        break
      }
      continue
    }

    current = candidate
  }

  if (current.length > 0 && chunks.length < maxChunks) {
    chunks.push(current)
  }

  return chunks.slice(0, maxChunks)
}

function splitLargeParagraph(paragraph: string, maxChars: number) {
  const parts: string[] = []
  const sentences = paragraph
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;:])\s+/)
    .filter((item) => item.length > 0)

  let current = ""
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence
    if (next.length > maxChars && current.length > 0) {
      parts.push(current)
      current = sentence
      continue
    }
    current = next
  }

  if (current.length > 0) {
    parts.push(current)
  }

  return parts.length > 0 ? parts : [paragraph.slice(0, maxChars)]
}

function uniqueStrings(items: string[]) {
  const result: string[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const normalized = normalizeForCompare(item)
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(item)
  }

  return result
}

function toMindmapNode(simpleNode: SimpleMindmapNode, path: string[] = []): MindmapNode {
  const level = path.length
  const nodeId = path.length === 0 ? "root" : `root-${path.join("-")}`
  const children = (simpleNode.children ?? []).map((child, index) => toMindmapNode(child, [...path, String(index)]))

  return {
    id: nodeId,
    title: normalizeName(simpleNode.name) || "Noi dung",
    important: level <= 1,
    sourceRefs: level === 0 ? ["file"] : [`level-${level}`],
    children,
  }
}

// ============ NEW PIPELINE ============

async function summarizeChunk(chunkText: string, options: { apiKey: string; model: string }): Promise<string> {
  const prompt = `Bạn là chuyên gia phân tích tài liệu.

Hãy tóm tắt nội dung dưới đây thành các ý chính.

Yêu cầu:
- Dạng bullet points
- Ngắn gọn, mỗi dòng <= 15 từ
- Không thêm thông tin ngoài tài liệu
- Chỉ trả về bullet points, không thêm ghi chú

Nội dung:
${chunkText}`

  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const summaryText = await callPollinationsChat({
        apiKey: options.apiKey,
        model: options.model,
        userPrompt: prompt,
        temperature: 0.3 + attempt * 0.1, // Tăng nhẹ nhiệt độ nếu lỗi
        maxTokens: 1500,
      })

      if (summaryText) {
        return summaryText
      }
    } catch (error) {
      lastError = error
      console.warn(`[mindmap.generate] chunk summarize attempt ${attempt + 1} failed, retrying...`)
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  console.error("[mindmap.generate] All attempts to summarize chunk failed, returning empty summary.", lastError)
  return "" // Trả về chuỗi rỗng để pipeline không bị sập toàn cục
}

async function generateMindmapFromContext(
  globalContext: string,
  rootTitle: string,
  options: { apiKey: string; model: string },
): Promise<SimpleMindmapNode> {
  const prompt = `Bạn là chuyên gia phân tích tài liệu và tạo sơ đồ tư duy.

Từ nội dung dưới đây, hãy tạo sơ đồ tư duy (mindmap).

Yêu cầu:
- 5-8 nhánh chính (các chủ đề chính)
- Mỗi nhánh 3-6 ý con (chi tiết, ví dụ, phương pháp)
- Mỗi node <= 10 từ
- Không bịa thông tin, chỉ dùng nội dung đã cho
- Cấu trúc rõ ràng, hợp logic

Trả về JSON theo schema này (chỉ JSON, không thêm ghi chú):
{
  "name": "Tiêu đề tài liệu",
  "children": [
    {
      "name": "Chủ đề chính 1",
      "children": [
        { "name": "Chi tiết 1" },
        { "name": "Chi tiết 2" }
      ]
    }
  ]
}

Nội dung tài liệu:
${globalContext}`

  let lastError: unknown = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const temperature = attempt === 0 ? 0.4 : attempt === 1 ? 0.2 : 0
      const strictSuffix = attempt > 0
        ? "\n\nChi tra ve DUY NHAT mot JSON object hop le, khong markdown, khong text bo sung."
        : ""

      const modelText = await callPollinationsChat({
        apiKey: options.apiKey,
        model: options.model,
        systemPrompt: "Ban la tro ly tao so do tu duy va phai tra ve JSON hop le.",
        userPrompt: `${prompt}${strictSuffix}`,
        temperature,
        maxTokens: 3000,
      })

      if (!modelText) {
        lastError = new Error("Pollinations mindmap generation returned empty content")
        continue
      }

      try {
        const parsed = parseJsonWithRepairs(modelText)
        const validated = SimpleMindmapNodeSchema.parse(parsed)

        // Ensure root has correct name
        validated.name = rootTitle

        console.log(`[mindmap.generate] Successfully generated mindmap on attempt ${attempt + 1}`)
        return validated
      } catch (parseError) {
        lastError = parseError
        console.warn(`[mindmap.generate] JSON parse failed on attempt ${attempt + 1}:`, {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          modelTextLength: modelText.length,
          preview: modelText.substring(0, 150),
        })
      }
    } catch (error) {
      lastError = error
    }
  }

  console.error("[mindmap.generate] All retry attempts failed:", {
    error: lastError instanceof Error ? lastError.message : String(lastError),
  })

  throw lastError instanceof Error ? lastError : new Error("Failed to generate mindmap from Pollinations after 3 attempts")
}

export async function generateMindmapWithGemini(options: GenerationOptions) {
  const rootTitle = titleFromFileName(options.fileName)

  // Step 1: Chunk text
  const chunks = chunkText(options.text, options.maxChunkChars, options.maxChunks)

  if (chunks.length === 0) {
    // Fallback if empty
    const fallback: SimpleMindmapNode = {
      name: rootTitle,
      children: [
        {
          name: "Phan mot",
          children: [{ name: "Chi tiet 1" }, { name: "Chi tiet 2" }, { name: "Chi tiet 3" }],
        },
        {
          name: "Phan hai",
          children: [{ name: "Chi tiet 1" }, { name: "Chi tiet 2" }, { name: "Chi tiet 3" }],
        },
        {
          name: "Phan ba",
          children: [{ name: "Chi tiet 1" }, { name: "Chi tiet 2" }, { name: "Chi tiet 3" }],
        },
      ],
    }

    return {
      simpleTree: fallback,
      mindmap: toMindmapNode(fallback),
      chunkCount: 0,
    }
  }

  try {
    // Step 2: Summarize each chunk (local summary) with batching to prevent API rate limits
    console.log(`[mindmap.generate] Summarizing ${chunks.length} chunks...`)
    const summaries: string[] = []
    for (let index = 0; index < chunks.length; index += 2) {
      const batch = chunks.slice(index, index + 2)
      const batchSummaries = await Promise.all(
        batch.map((chunk) =>
          summarizeChunk(chunk, {
            apiKey: options.apiKey,
            model: options.model,
          })
        )
      )
      summaries.push(...batchSummaries)
    }

    // Step 3: Merge into global context
    const globalContext = summaries.join("\n\n")

    console.log(`[mindmap.generate] Global context length: ${globalContext.length} chars`)

    // Step 4: Generate mindmap once from global context
    console.log(`[mindmap.generate] Generating mindmap from global context...`)
    const simpleTree = await generateMindmapFromContext(globalContext, rootTitle, {
      apiKey: options.apiKey,
      model: options.model,
    })

    return {
      simpleTree,
      mindmap: toMindmapNode(simpleTree),
      chunkCount: chunks.length,
    }
  } catch (error) {
    console.error("[mindmap.generate] Error in pipeline:", {
      error: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}
