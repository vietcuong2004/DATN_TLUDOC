import { NextResponse } from "next/server"
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse.js"
import { getHuggingFaceEmbedding } from "@/lib/hf-embedder"
import { index as pineconeIndex } from "@/lib/pinecone"
import { executeCommand } from "@/lib/mysql"

function chunkText(text: string, size = 1000, overlap = 200) {
  const chunks = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + size))
    i += size - overlap
  }
  return chunks
}

export async function POST(request: Request) {
  try {
    const { document_id } = await request.json()
    if (!document_id) return NextResponse.json({ error: "Thiếu document_id" }, { status: 400 })

    // Lấy thông tin tài liệu từ DB
    const docs = await executeCommand(
      "SELECT id, title, drive_file_id, subject_id, file_ext, download_url FROM documents WHERE id = ?",
      [document_id]
    ) as any[]

    if (!docs || docs.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 })
    }

    const doc = docs[0]
    
    if (doc.file_ext !== "pdf") {
      return NextResponse.json({ success: true, message: "Chỉ hỗ trợ Vector hóa PDF. Bỏ qua." })
    }

    // 1. Tải file từ Google Drive
    const downloadUrl = doc.download_url || `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
    const response = await fetch(downloadUrl)
    if (!response.ok) throw new Error(`Lỗi tải file: ${response.statusText}`)
    
    const buffer = Buffer.from(await response.arrayBuffer())

    // 2. Trích xuất Text
    const data = await pdf(buffer)
    const cleanText = data.text.replace(/\s+/g, " ").trim()

    if (!cleanText) {
      return NextResponse.json({ error: "Tài liệu PDF không có chữ để trích xuất" }, { status: 400 })
    }

    // 3. Chia nhỏ (Chunking)
    const chunks = chunkText(cleanText)
    const vectors = []

    // 4. Tạo Vector (Embedding) và đẩy lên Pinecone
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        const vector = await getHuggingFaceEmbedding(chunk)
        vectors.push({
          id: `doc-${doc.id}-chunk-${i}`,
          values: vector,
          metadata: {
            document_id: doc.id,
            subject_id: doc.subject_id,
            content: chunk,
            title: doc.title,
            drive_file_id: doc.drive_file_id || "",
            download_url: doc.download_url || "",
          }
        })

        // Gửi theo batch 10 records để tránh quá tải
        if (vectors.length >= 10 || i === chunks.length - 1) {
          await pineconeIndex.upsert(vectors)
          vectors.length = 0 // Clear batch
        }
      } catch (embedError: any) {
        console.error(`Lỗi tạo embedding mảnh ${i}:`, embedError.message)
        if (embedError.message.includes("503") || embedError.message.includes("loading")) {
          // Chờ 5s nếu HuggingFace đang bận
          await new Promise(r => setTimeout(r, 5000))
          i-- // Thử lại
        }
      }
      // Nghỉ ngắn để tránh rate limit của HuggingFace
      await new Promise(r => setTimeout(r, 100))
    }

    return NextResponse.json({ success: true, message: `Đã vector hóa thành công ${chunks.length} mảnh.` })

  } catch (error: any) {
    console.error("Vectorize API Error:", error)
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 })
  }
}
