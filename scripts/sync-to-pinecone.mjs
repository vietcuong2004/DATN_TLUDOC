import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { HfInference } from '@huggingface/inference';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// 1. Cấu hình
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const hf = new HfInference(HF_TOKEN);

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX_NAME);

const SYNC_CACHE_FILE = path.join(__dirname, 'synced-docs.json');

// 2. Các hàm bổ trợ
function getSyncedDocIds() {
  try {
    if (fs.existsSync(SYNC_CACHE_FILE)) {
      const content = fs.readFileSync(SYNC_CACHE_FILE, 'utf8');
      const data = JSON.parse(content);
      return Array.isArray(data.synced_document_ids) ? data.synced_document_ids : [];
    }
  } catch (e) {
    console.error("⚠️ Lỗi đọc file synced-docs.json, sẽ đồng bộ từ đầu:", e.message);
  }
  return [];
}

function saveSyncedDocId(docId) {
  try {
    const syncedIds = getSyncedDocIds();
    if (!syncedIds.includes(docId)) {
      syncedIds.push(docId);
      fs.writeFileSync(SYNC_CACHE_FILE, JSON.stringify({ synced_document_ids: syncedIds }, null, 2), 'utf8');
    }
  } catch (e) {
    console.error("⚠️ Lỗi ghi file synced-docs.json:", e.message);
  }
}

async function getEmbedding(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const result = await hf.featureExtraction({
    model: HF_MODEL,
    inputs: cleanText,
  });
  return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
}

function chunkText(text, size = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function main() {
  console.log("🚀 Bắt đầu quá trình nạp tài liệu TRỰC TIẾP lên Pinecone...");

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Lấy danh sách tài liệu từ MySQL
  const [documents] = await pool.query("SELECT id, title, drive_file_id, subject_id, file_ext, download_url FROM documents WHERE status = 'published'");

  console.log(`🔍 Tìm thấy ${documents.length} tài liệu trong danh sách.`);

  const syncedDocIds = getSyncedDocIds();
  console.log(`ℹ️ Đã đồng bộ trước đó: ${syncedDocIds.length} tài liệu.`);

  for (const doc of documents) {
    if (doc.file_ext !== "pdf") {
      console.log(`⏭️ Bỏ qua ${doc.title} (chỉ hỗ trợ PDF).`);
      continue;
    }

    if (syncedDocIds.includes(doc.id)) {
      console.log(`⏭️ Bỏ qua ${doc.title} (Đã đồng bộ trước đó).`);
      continue;
    }

    console.log(`📦 Đang xử lý: ${doc.title}...`);

    try {
      // 1. Tải file từ Google Drive
      const downloadUrl = doc.download_url || `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Lỗi tải file: ${response.statusText}`);
      
      const buffer = Buffer.from(await response.arrayBuffer());

      // 2. Trích xuất Text
      const data = await pdf(buffer);
      const cleanText = data.text.replace(/\s+/g, " ").trim();

      if (!cleanText) {
        console.log(`⚠️ Tài liệu ${doc.title} không có nội dung văn bản.`);
        continue;
      }

      // 3. Chia nhỏ
      const chunks = chunkText(cleanText);
      console.log(`   - Chia thành ${chunks.length} mảnh. Đang tạo embedding và đẩy lên Pinecone...`);

      const vectors = [];
      let docError = false;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const vector = await getEmbedding(chunk);
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
          });

          // Gửi theo batch 20 records để tránh quá tải
          if (vectors.length >= 20 || i === chunks.length - 1) {
            await index.upsert(vectors);
            vectors.length = 0; // Clear batch
            process.stdout.write(".");
          }
        } catch (embedError) {
          console.error(`\n   ❌ Lỗi tạo embedding mảnh ${i}:`, embedError.message);
          // Cho phép thử lại khi gặp bất kỳ lỗi kết nối HTTP/503 nào từ Hugging Face
          if (embedError.message.includes("503") || embedError.message.includes("inference") || embedError.message.includes("provider")) {
            console.log("   (Mô hình quá tải hoặc lỗi kết nối, nghỉ 10s...)");
            await new Promise(r => setTimeout(r, 10000));
            i--; // Thử lại
          } else {
            docError = true;
          }
        }
        await new Promise(r => setTimeout(r, 100)); // Tránh rate limit HF
      }
      
      if (!docError) {
        console.log(`\n   ✅ Đã nạp thành công lên Pinecone.`);
        saveSyncedDocId(doc.id); // Lưu vết thành công khi không có lỗi nghiêm trọng
      } else {
        console.log(`\n   ⚠️ Hoàn thành với một số mảnh bị lỗi, không lưu vết để lần sau chạy lại.`);
      }

    } catch (error) {
      console.error(`❌ Lỗi khi xử lý ${doc.title}:`, error.message);
    }
  }

  await pool.end();
  console.log("\n✨ HOÀN TẤT! Toàn bộ tri thức đã nằm an toàn trên Pinecone.");
}

main().catch(console.error);
