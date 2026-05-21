import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  // Tránh crash trong quá trình build nếu chưa có key
  console.warn('PINECONE_API_KEY is missing in environment variables');
}

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || 'dummy_key',
});

export const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'tlu-document-index');
