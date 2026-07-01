import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { HfInference } from '@huggingface/inference';
import { Pinecone } from '@pinecone-database/pinecone';

// Load .env.local
dotenv.config({ path: '.env.local' });

console.log('--- ENV CHECK ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('HUGGINGFACE_TOKEN length:', process.env.HUGGINGFACE_TOKEN ? process.env.HUGGINGFACE_TOKEN.length : 0);
console.log('PINECONE_API_KEY length:', process.env.PINECONE_API_KEY ? process.env.PINECONE_API_KEY.length : 0);
console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME);
console.log('POLLINATIONS_API_KEY length:', process.env.POLLINATIONS_API_KEY ? process.env.POLLINATIONS_API_KEY.length : 0);
console.log('-----------------\n');

async function testMySQL() {
  console.log('[1] Testing MySQL Connection...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('✅ MySQL OK. Result:', rows);
    await connection.end();
  } catch (error) {
    console.error('❌ MySQL Failed:', error);
  }
}

async function testHuggingFace() {
  console.log('\n[2] Testing HuggingFace Inference...');
  try {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) throw new Error('No token');
    const hf = new HfInference(token);
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: 'Hello world',
    });
    console.log('✅ HuggingFace OK. Embedding length:', Array.isArray(result) ? result.length : typeof result);
  } catch (error) {
    console.error('❌ HuggingFace Failed:', error);
  }
}

async function testPinecone() {
  console.log('\n[3] Testing Pinecone Connection...');
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!apiKey) throw new Error('No API Key');
    if (!indexName) throw new Error('No Index Name');
    
    const pinecone = new Pinecone({ apiKey });
    const index = pinecone.index(indexName);
    const stats = await index.describeIndexStats();
    console.log('✅ Pinecone OK. Stats:', stats);
  } catch (error) {
    console.error('❌ Pinecone Failed:', error);
  }
}

async function testPollinations() {
  console.log('\n[4] Testing Pollinations AI...');
  try {
    // Test classifyIntent style pollinations API
    const testPrompt = 'Chỉ trả về 1 từ: OK';
    const classifyRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(testPrompt)}?model=openai&cache=true`);
    const classifyText = await classifyRes.text();
    console.log('✅ Pollinations classify (GET) OK. Response:', classifyText.trim());

    // Test completion style pollinations API
    const authHeader = `Bearer ${process.env.POLLINATIONS_API_KEY || ''}`;
    const completionsRes = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        Authorization: authHeader, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'user', content: 'Say hello!' }
        ],
        temperature: 0.2,
      })
    });
    
    if (!completionsRes.ok) {
      const errorText = await completionsRes.text();
      throw new Error(`HTTP ${completionsRes.status}: ${errorText}`);
    }
    
    const completionsJson = await completionsRes.json();
    console.log('✅ Pollinations chat completion (POST) OK. Response:', completionsJson.choices?.[0]?.message?.content);
  } catch (error) {
    console.error('❌ Pollinations Failed:', error);
  }
}

async function run() {
  await testMySQL();
  await testHuggingFace();
  await testPinecone();
  await testPollinations();
}

run();
