import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env từ .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error('❌ Thiếu thông tin cấu hình trong .env.local');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = `backup-${DB_NAME}-${timestamp}.sql`;
const backupDir = path.join(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const backupPath = path.join(backupDir, backupFile);

async function backup() {
  let connection;
  try {
    console.log(`🚀 Đang kết nối tới ${DB_HOST}...`);
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: parseInt(DB_PORT || '3306'),
    });

    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    let sqlContent = `-- MySQL Backup\n-- Generated at: ${new Date().toISOString()}\n-- Database: ${DB_NAME}\n\n`;
    sqlContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tableName of tableNames) {
      console.log(`📦 Đang trích xuất dữ liệu bảng: ${tableName}...`);
      
      // 1. Tạo cấu trúc bảng
      const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlContent += createTable[0]['Create Table'] + ';\n\n';

      // 2. Lấy dữ liệu
      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
        sqlContent += `INSERT INTO \`${tableName}\` (${columns}) VALUES\n`;
        
        const valuesArr = rows.map(row => {
          const values = Object.values(row).map(value => {
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return value;
          });
          return `(${values.join(', ')})`;
        });
        
        sqlContent += valuesArr.join(',\n') + ';\n\n';
      }
    }

    sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    fs.writeFileSync(backupPath, sqlContent);
    console.log(`\n✅ Backup thành công rực rỡ!`);
    console.log(`📂 File lưu tại: ${backupPath}`);
  } catch (error) {
    console.error(`❌ Lỗi backup: ${error.message}`);
  } finally {
    if (connection) await connection.end();
  }
}

backup();
