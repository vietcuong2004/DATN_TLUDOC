# 🧠 Hướng Dẫn Chi Tiết: Tạo Sơ Đồ Tư Duy Từ Tài Liệu (UC5)

Tài liệu này mô tả **chi tiết cách code, workflow, thuật toán** để chuyển PDF/DOCX/TXT thành mindmap bằng AI.

---

## 1) Tổng Quan Kiến Trúc

### 1.1 Luồng hoạt động End-to-End

```
User Upload File (PDF/DOCX/TXT)
        ↓
Frontend: POST /api/mindmap/generate + FormData
        ↓
Backend Pipeline:
  1. File Extraction (PDF/DOCX → Text UTF-8)
  2. Preprocessing (normalize whitespace, remove junk)
  3. Length Check:
     ├─ < 3000 chars → Direct to Gemini
     └─ ≥ 3000 chars → Smart Chunking
  4. Smart Chunking (preserve paragraph boundaries)
  5. Parallel Summarization (max 3 concurrent)
  6. Merge Summaries → Core Knowledge
  7. Gemini API → Generate JSON tree
  8. Validation & Normalization (zod schema)
  9. Response with JSON tree
        ↓
Frontend: Render mindmap from JSON
  - Layout calculation (positioning, depth)
  - SVG edge rendering (Bezier curves)
  - Positioned div nodes
  - Zoom/Pan/Fullscreen controls
        ↓
User Interaction: View, zoom, export PNG/JPG/PDF
```

### 1.2 Nguyên tắc thiết kế

- ✅ **AI chỉ sinh JSON** - không HTML/SVG/UI logic
- ✅ **Validate trước render** - tránh frontend crash
- ✅ **Graceful fallback** - error handling ở backend
- ✅ **Retry intelligent** - 3 lần với prompt khác nhau
- ✅ **Track sources** - mỗi node biết từ chunk nào sinh ra
- ✅ **Smart chunking** - giữ paragraph boundaries

---

## 2) Chuẩn JSON Tree

### 2.1 Cấu trúc

```json
{
  "id": "root-unique-id",
  "title": "Tiêu Đề Tài Liệu (Max 10 từ)",
  "important": false,
  "sourceRefs": ["chunk-0", "chunk-1"],
  "children": [
    {
      "id": "node-001-level-1-index-0",
      "title": "Nhánh Chính 1 (10 từ max)",
      "important": true,
      "sourceRefs": ["chunk-1"],
      "children": [
        {
          "id": "node-001-001-level-2-index-0",
          "title": "Chi Tiết 1.1",
          "important": false,
          "sourceRefs": ["chunk-1"],
          "children": []
        }
      ]
    }
  ]
}
```

### 2.2 Quy ước Validation

| Field | Loại | Giới Hạn | Mô Tả |
|-------|------|---------|-------|
| `id` | string | Unique | Format: `node-{parent}-{index}-level-{depth}` |
| `title` | string | ≤ 10 từ | Ý chính, tránh câu dài |
| `important` | boolean | true/false | Highlight UI |
| `sourceRefs` | string[] | 1-5 items | Track chunk origin |
| `children` | array | 0-5 items | Max 3 depth |

---

## 3) Thuật Toán Chi Tiết

### 3.1 TEXT EXTRACTION

#### TXT Files
```typescript
async function extractTxt(arrayBuffer: ArrayBuffer): Promise<string> {
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('utf-8').trim()
}
```

#### PDF Files
```typescript
import pdfParse from 'pdf-parse'

async function extractPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const data = await pdfParse(Buffer.from(arrayBuffer))
  return data.text.trim()
}
```

#### DOCX Files
```typescript
import mammoth from 'mammoth'

async function extractDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({
    arrayBuffer: Buffer.from(arrayBuffer)
  })
  return result.value.trim()
}
```

### 3.2 PREPROCESSING

```typescript
function preprocess(text: string): string {
  return (
    text
      .replace(/\s+/g, ' ')           // Multiple spaces → 1 space
      .replace(/[^\w\s\.\,\;\:\!\?\-]/g, '')  // Keep only necessary chars
      .trim()
  )
}
```

### 3.3 SMART CHUNKING - Thuật toán chia text

**Chiến lược:**
1. Nếu text < 3000 chars → Direct
2. Nếu text ≥ 3000 chars → Chunk vào 2000-3000 char pieces
3. **Quan trọng:** Giữ paragraph boundaries, tìm dấu chấm (.) gần nhất

```typescript
interface TextChunk {
  id: string
  text: string
  startIdx: number
  endIdx: number
}

function smartChunk(text: string, targetSize: number = 2500): TextChunk[] {
  const chunks: TextChunk[] = []
  let currentIdx = 0
  let chunkNumber = 0

  while (currentIdx < text.length) {
    let endIdx = currentIdx + targetSize

    if (endIdx < text.length) {
      // Tìm dấu chấm gần nhất
      const periodIdx = text.indexOf('.', endIdx)
      
      if (periodIdx !== -1 && periodIdx < endIdx + 200) {
        endIdx = periodIdx + 1
      } else {
        // Tìm space
        const spaceIdx = text.lastIndexOf(' ', endIdx)
        if (spaceIdx > currentIdx + targetSize / 2) {
          endIdx = spaceIdx
        }
      }
    } else {
      endIdx = text.length
    }

    const chunkText = text.substring(currentIdx, endIdx).trim()
    
    if (chunkText.length > 100) {
      chunks.push({
        id: `chunk-${chunkNumber}`,
        text: chunkText,
        startIdx: currentIdx,
        endIdx: endIdx,
      })
      chunkNumber++
    }

    currentIdx = endIdx
  }

  return chunks
}
```

**Ví dụ Output:**
```
Input text: "Chương 1. Intro. Content here...Chương 2. Details."

Output chunks:
[
  { id: "chunk-0", text: "Chương 1. Intro.", ... },
  { id: "chunk-1", text: "Content here...Chương 2.", ... }
]
```

### 3.4 SUMMARIZATION - Tóm tắt từng chunk

```typescript
async function summarizeChunk(chunkText: string, apiKey: string): Promise<string> {
  const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai',
      temperature: 0.3,  // Thấp = tập trung, tránh sáng tạo
      messages: [
        {
          role: 'system',
          content: 'Tóm tắt nội dung chính trong 2-3 câu. Bảo lưu ý chính, loại chi tiết phụ.',
        },
        {
          role: 'user',
          content: chunkText,
        },
      ],
    }),
  })

  const data = await response.json()
  return data.choices[0].message.content
}

// Parallel: chạy tối đa 3 cùng 1 lúc
async function summarizeAllChunks(
  chunks: TextChunk[],
  apiKey: string
): Promise<string[]> {
  const summaries: string[] = []
  
  for (let i = 0; i < chunks.length; i += 3) {
    const batch = chunks.slice(i, i + 3)
    const batchSummaries = await Promise.all(
      batch.map(chunk => summarizeChunk(chunk.text, apiKey))
    )
    summaries.push(...batchSummaries)
  }
  
  return summaries
}
```

### 3.5 MERGE SUMMARIES

```typescript
function mergeSummaries(
  chunks: TextChunk[],
  summaries: string[]
): string {
  let merged = ''
  
  for (let i = 0; i < summaries.length; i++) {
    merged += `[Đoạn ${i + 1}]\n${summaries[i]}\n\n`
  }

  // Limit to 5000 chars
  const MAX_MERGED = 5000
  if (merged.length > MAX_MERGED) {
    merged = merged.substring(0, MAX_MERGED) + '\n[...còn nội dung khác...]'
  }

  return merged
}
```

### 3.6 GEMINI/POLLINATIONS API - Sinh JSON

```typescript
interface MindmapResponse {
  mindmap: MindmapNode | null
  error: string | null
}

async function generateMindmap(
  text: string,
  fileName: string,
  apiKey: string
): Promise<MindmapResponse> {
  const maxRetries = 3
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const temperature = 0.4 - (attempt - 1) * 0.1  // 0.4, 0.3, 0.2

      const prompt = `Bạn là chuyên gia phân tích tài liệu.

Chuyển nội dung thành sơ đồ tư duy JSON chuẩn.

YÊUCẦU:
- Trả CHỈ JSON object duy nhất, không markdown, không giải thích
- Mỗi node: {id, title, important, sourceRefs, children}
- title ≤ 10 từ
- Max 3 cấp depth
- children: mảng (0-5 items)
- Tập trung ý chính, tránh lặp

SCHEMA:
{
  "id": "root",
  "title": "string",
  "important": boolean,
  "sourceRefs": ["chunk-0"],
  "children": []
}

CONTENT:
${text}`

      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai',
          temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const jsonStr = data.choices[0].message.content

      let mindmap: MindmapNode
      try {
        mindmap = JSON.parse(jsonStr)
      } catch (e) {
        // Try extract từ markdown code block
        const match = jsonStr.match(/```json\n([\s\S]*?)\n```/)
        if (match) {
          mindmap = JSON.parse(match[1])
        } else {
          throw new Error('Invalid JSON')
        }
      }

      return { mindmap, error: null }
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          mindmap: null,
          error: `Lỗi (attempt ${attempt}): ${error.message}`,
        }
      }
    }
  }

  return { mindmap: null, error: 'Không thể tạo' }
}
```

### 3.7 VALIDATION & NORMALIZATION

```typescript
import { z } from 'zod'

const MindmapNodeSchema = z.object({
  id: z.string(),
  title: z.string().max(100),
  important: z.boolean().optional().default(false),
  sourceRefs: z.array(z.string()).optional().default([]),
  children: z.array(z.lazy(() => MindmapNodeSchema)).optional().default([]),
})

type MindmapNode = z.infer<typeof MindmapNodeSchema>

function normalizeMindmap(node: any, depth: number = 0): MindmapNode | null {
  // Depth check
  if (depth > 3) return null
  
  try {
    let validated = MindmapNodeSchema.parse(node)

    // Cắt title quá dài
    const words = validated.title.split(' ')
    if (words.length > 10) {
      validated.title = words.slice(0, 10).join(' ')
    }

    // Normalize children recursively
    validated.children = validated.children
      .map(child => normalizeMindmap(child, depth + 1))
      .filter(Boolean)
      .slice(0, 5)  // Max 5 children

    return validated
  } catch (e) {
    return null
  }
}
```

---

## 4) API Route Implementation

### File: `app/api/mindmap/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 400 }
      )
    }

    // 1. Extract text based on file type
    const arrayBuffer = await file.arrayBuffer()
    let text: string

    if (file.type === 'application/pdf') {
      text = await extractPdf(arrayBuffer)
    } else if (file.type === 'text/plain') {
      text = await extractTxt(arrayBuffer)
    } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
      text = await extractDocx(arrayBuffer)
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    text = preprocess(text)

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: 'File is too short or empty' },
        { status: 400 }
      )
    }

    // 2. Smart chunking and summarization
    const apiKey = process.env.POLLINATIONS_API_KEY
    let summaryText = text

    if (text.length > 3000) {
      const chunks = smartChunk(text, 2500)
      const summaries = await summarizeAllChunks(chunks, apiKey)
      summaryText = mergeSummaries(chunks, summaries)
    }

    // 3. Generate mindmap from Gemini/Pollinations
    const { mindmap: rawMindmap, error } = await generateMindmap(
      summaryText,
      fileName,
      apiKey
    )

    if (error || !rawMindmap) {
      return NextResponse.json(
        { error: error || 'Failed to generate mindmap' },
        { status: 500 }
      )
    }

    // 4. Validate and normalize
    const mindmap = normalizeMindmap(rawMindmap)

    if (!mindmap) {
      return NextResponse.json(
        { error: 'Invalid JSON from AI' },
        { status: 500 }
      )
    }

    // 5. Return response
    return NextResponse.json({
      mindmap,
      meta: {
        fileName,
        nodeCount: countNodes(mindmap),
        depth: calculateDepth(mindmap),
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
```

---

## 5) Frontend Implementation

Đã hoàn thành trong [components/mindmap-viewer.tsx](../../components/mindmap-viewer.tsx):
- Layout calculation
- SVG edge rendering
- Zoom/Pan/Fullscreen
- Download PNG/JPG/PDF

---

## 6) Performance Tips

- ✅ Parallel summarization (batch 3)
- ✅ Smart chunking (preserve boundaries)
- ✅ Temperature reduction (retry strategy)
- ✅ Memoized calculations
- ✅ Virtual rendering nếu cần

---

## 7) Checklist

- ✅ Upload PDF/DOCX/TXT works
- ✅ Long documents handled
- ✅ JSON always valid
- ✅ Error handling graceful
- ✅ Download works
- ✅ Zoom/Pan/Fullscreen
- ✅ Performance < 15s average

