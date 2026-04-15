import fs from "node:fs"
import path from "node:path"
import mysql from "mysql2/promise"
import pdf from "pdf-parse/lib/pdf-parse.js"
import { HfInference } from "@huggingface/inference"

/**
 * SCRIPT ĐỒNG BỘ TRI THỨC SỬ DỤNG HUGGINGFACE SDK + MYSQL (PLAN C)
 */

// 1. Tải môi trường
const PROJECT_ROOT = process.cwd()
function loadLocalEnv() {
  const filePath = path.join(PROJECT_ROOT, ".env.local")
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue
    const [key, ...vals] = line.split("=")
    process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "")
  }
}
loadLocalEnv()

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const hf = new HfInference(HF_TOKEN);

async function getEmbedding(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const result = await hf.featureExtraction({
    model: HF_MODEL,
    inputs: cleanText,
  });

  if (Array.isArray(result) && typeof result[0] === "number") {
    return result;
  }
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  throw new Error("Unexpected HF response format");
}

// Hàm chia nhỏ văn bản (Chunking)
function chunkText(text, size = 1000, overlap = 200) {
  const chunks = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + size))
    i += size - overlap
  }
  return chunks
}

async function main() {
  console.log("🚀 Bắt đầu quá trình đồng bộ tài liệu lên MySQL (HuggingFace SDK)...")

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  // Lấy danh sách tài liệu từ MySQL
  const [documents] = await pool.query("SELECT id, title, drive_file_id, subject_id, file_ext FROM documents WHERE status = 'published'")

  console.log(`Tìm thấy ${documents.length} tài liệu cần xử lý.`)

  // Xóa dữ liệu cũ trong document_chunks để nạp lại sạch sẽ
  console.log("🧹 Đang làm sạch bảng document_chunks...");
  await pool.query("DELETE FROM document_chunks");

  for (const doc of documents) {
    if (doc.file_ext !== "pdf") {
      console.log(`⏭️ Bỏ qua ${doc.title} (không phải PDF)`)
      continue
    }

    console.log(`📦 Đang xử lý: ${doc.title}...`)

    try {
      // 1. Tải file từ Google Drive
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
      const response = await fetch(downloadUrl)
      if (!response.ok) throw new Error(`Lỗi tải file: ${response.statusText}`)
      
      const buffer = Buffer.from(await response.arrayBuffer())

      // 2. Trích xuất Text
      const data = await pdf(buffer)
      const cleanText = data.text.replace(/\s+/g, " ").trim()

      if (!cleanText) {
        console.log(`⚠️ Tài liệu ${doc.title} không có nội dung văn bản.`)
        continue
      }

      // 3. Chia nhỏ & Tạo Embedding
      const chunks = chunkText(cleanText)
      console.log(`   - Chia thành ${chunks.length} mảnh.`)

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        try {
          const vector = await getEmbedding(chunk)
          
          await pool.query(
            "INSERT INTO document_chunks (document_id, content, embedding) VALUES (?, ?, ?)",
            [doc.id, chunk, JSON.stringify(vector)]
          )

          if (i % 5 === 0) process.stdout.write(".");
        } catch (embedError) {
          console.error(`\n   ❌ Lỗi tạo embedding mảnh ${i}:`, embedError.message)
          if (embedError.message.includes("503") || embedError.message.includes("loading")) {
            console.log("   (Mô hình đang khởi động trên HuggingFace, nghỉ 10s...)")
            await new Promise(r => setTimeout(r, 10000))
            i--; // Thử lại mảnh này
          }
        }

        // Nghỉ ngắn để tránh rate limit
        await new Promise(r => setTimeout(r, 100))
      }
      console.log(`\n   ✅ Đã nạp thành công ${chunks.length} mảnh vào MySQL.`)

    } catch (error) {
      console.error(`❌ Lỗi khi xử lý ${doc.title}:`, error.message)
    }
  }

  await pool.end()
  console.log("\n✨ Hoàn tất đồng bộ tri thức tài liệu vào MySQL!")
}

main().catch(console.error)
