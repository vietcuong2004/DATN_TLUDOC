import fs from 'node:fs';

const filePath = 'd:/DATN_TLUDOCUMENT/Cuong_Documents/Setup/tlu_document.sql';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove column definitions in CREATE TABLE
content = content.replace(/`file_mime_type` varchar\(100\) DEFAULT NULL,\r?\n\s+`file_size_bytes` bigint\(20\) DEFAULT NULL,\r?\n\s+/, '');

// 2. Remove columns from INSERT list
content = content.replace(/`file_mime_type`, `file_size_bytes`, /g, '');

// 3. Remove NULL, NULL values from rows
// The pattern is: , NULL, NULL, 'https://drive.google.com
content = content.replace(/, NULL, NULL, 'https:\/\/drive\.google\.com/g, ", 'https://drive.google.com");

fs.writeFileSync(filePath, content);
console.log('Updated tlu_document.sql successfully');
