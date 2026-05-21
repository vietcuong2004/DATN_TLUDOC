import mysql from 'mysql2/promise';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  console.log('🚀 Bắt đầu quá trình đồng bộ dữ liệu sang Pinecone...');

  // 1. Kết nối MySQL
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // 2. Kết nối Pinecone
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index(process.env.PINECONE_INDEX_NAME);

  try {
    // 3. Lấy dữ liệu từ MySQL (JOIN thêm bảng documents để lấy tiêu đề)
    console.log('📡 Đang truy vấn dữ liệu từ MySQL...');
    const [rows] = await connection.execute(`
      SELECT dc.id, dc.document_id, dc.content, dc.embedding, d.title, d.drive_file_id, d.download_url, d.subject_id 
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
    `);

    if (rows.length === 0) {
      console.log('⚠️ Không có dữ liệu nào để đồng bộ.');
      return;
    }

    console.log(`📦 Tìm thấy ${rows.length} chunks. Bắt đầu đẩy lên Pinecone...`);

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      const vectors = batch.map(row => {
        let embeddingArray;
        try {
          embeddingArray = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
        } catch (e) {
          console.error(`❌ Lỗi parse embedding cho chunk ID ${row.id}`);
          return null;
        }

        if (!Array.isArray(embeddingArray)) {
          console.error(`❌ Embedding không phải mảng cho chunk ID ${row.id}`);
          return null;
        }

        return {
          id: `chunk-${row.id}`,
          values: embeddingArray,
          metadata: {
            document_id: row.document_id,
            subject_id: row.subject_id, // Bổ sung trường này
            content: row.content.slice(0, 10000),
            title: row.title,
            drive_file_id: row.drive_file_id || "",
            download_url: row.download_url || "",
          }
        };
      }).filter(v => v !== null);

      if (vectors.length > 0) {
        await index.upsert(vectors);
        console.log(`✅ Đã đẩy batch ${Math.floor(i / batchSize) + 1} (${vectors.length} records)`);
      }
    }

    console.log('✨ Hoàn thành đồng bộ dữ liệu sang Pinecone!');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình đồng bộ:', error);
  } finally {
    await connection.end();
  }
}

main();
