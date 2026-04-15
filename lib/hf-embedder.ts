import { HfInference } from "@huggingface/inference";

/**
 * Tiện ích hỗ trợ tạo Vector (Embedding) sử dụng HuggingFace SDK
 */

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export async function getHuggingFaceEmbedding(text: string): Promise<number[]> {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    throw new Error("Missing HUGGINGFACE_TOKEN in environment variables");
  }

  const hf = new HfInference(token);
  
  // Tiền xử lý văn bản
  const cleanText = text.replace(/\s+/g, " ").trim();
  
  try {
    const result = await hf.featureExtraction({
      model: HF_MODEL,
      inputs: cleanText,
    });

    if (Array.isArray(result) && typeof result[0] === "number") {
      return result as number[];
    }
    
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0] as number[];
    }

    throw new Error("Unexpected response format from HuggingFace SDK");
  } catch (error: any) {
    console.error("Error fetching embeddings from HuggingFace SDK:", error.message);
    throw error;
  }
}

/**
 * Tính toán độ tương đồng Cosine giữa 2 vector
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return isNaN(similarity) ? 0 : similarity;
}
