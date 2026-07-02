const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');

// Đọc thông tin kết nối từ .env.local
const envPath = "./.env.local";
const env = {};
try {
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[key] = value;
    }
  }
} catch (e) {
  console.error("Read .env.local failed:", e);
}

async function getDocChunks(documentId) {
  console.log(`Connecting to Pinecone index: ${env.PINECONE_INDEX_NAME}...`);
  const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  const index = pc.index(env.PINECONE_INDEX_NAME);

  // Tạo vector truy vấn dummy chứa giá trị 0.1 để tránh lỗi NaN similarity của Pinecone
  const dummyVector = new Array(384).fill(0.1);

  console.log(`Querying Pinecone for document_id = ${documentId}...`);
  const response = await index.query({
    vector: dummyVector,
    filter: { document_id: { $eq: documentId } },
    topK: 50,                // Lấy tối đa 50 chunk của tài liệu này
    includeMetadata: true,   // Bắt buộc để lấy nội dung văn bản (content)
    includeValues: true,     // Bắt buộc để lấy vector nhúng (embedding)
  });

  return response.matches.map((match, idx) => ({
    index: idx + 1,
    chunkId: match.id,
    content: match.metadata.content.slice(0, 100) + "...", // Cắt ngắn để in cho gọn
    embeddingLength: match.values.length,
    embeddingSample: match.values.slice(0, 5) // In mẫu 5 chiều đầu tiên
  }));
}

const targetDocId = 163;
getDocChunks(targetDocId)
  .then(chunks => {
    console.log(`\n=== TÌM THẤY ${chunks.length} CHUNKS THUỘC TÀI LIỆU ID ${targetDocId} ===`);
    console.log(JSON.stringify(chunks, null, 2));
  })
  .catch(err => {
    console.error("Lỗi:", err.message);
  });
