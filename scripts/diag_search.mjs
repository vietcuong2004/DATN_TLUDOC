import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { HfInference } from "@huggingface/inference";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const hf = new HfInference(HF_TOKEN);

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const query = "bảng băm là gì";
  console.log(`Diagnostic: Searching for "${query}"`);

  // 1. Get query embedding
  console.log("Generating embedding...");
  const questionVector = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: query
  });

  // 2. Query DB
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log("Fetching chunks from MySQL...");
  const [rows] = await connection.execute('SELECT content, embedding FROM document_chunks');
  console.log(`Found ${rows.length} total chunks in DB.`);

  const results = rows.map(row => {
    const chunkVector = JSON.parse(row.embedding);
    return {
      content: row.content.substring(0, 100) + "...",
      score: cosineSimilarity(questionVector, chunkVector)
    };
  });

  results.sort((a, b) => b.score - a.score);

  console.log("\nTop 5 Results:");
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. Score: ${r.score.toFixed(4)} | Content: ${r.content}`);
  });

  await connection.end();
}

main().catch(console.error);
