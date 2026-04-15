import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Đang kết nối tới MySQL...');

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        content LONGTEXT NOT NULL,
        embedding LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_doc_id (document_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Bảng document_chunks đã được tạo thành công.');
  } catch (error) {
    console.error('❌ Lỗi khi tạo bảng:', error);
  } finally {
    await connection.end();
  }
}

main();
