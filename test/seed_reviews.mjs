import mysql from 'mysql2/promise';
import fs from 'node:fs';

async function seed() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = envContent.split('\n').reduce((acc, line) => {
    if (!line.includes('=')) return acc;
    const [k, v] = line.split('=');
    acc[k.trim()] = v.trim();
    return acc;
  }, {});

  console.log('Đang kết nối tới Database Railway...');
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: Number(env.DB_PORT)
  });

  try {
    console.log('1. Đang tạo các người dùng ảo...');
    await connection.execute(`
      INSERT IGNORE INTO users (id, email, password_hash, full_name, role) VALUES 
      (2, 'user2@tlu.edu.vn', 'hash', 'Nguyễn Văn Nam', 'student'),
      (3, 'user3@tlu.edu.vn', 'hash', 'Trần Thị Mai', 'student'),
      (4, 'user4@tlu.edu.vn', 'hash', 'Lê Minh Tâm', 'student'),
      (5, 'user5@tlu.edu.vn', 'hash', 'Phạm Hoàng Long', 'student')
    `);

    console.log('2. Đang chèn 5 đánh giá cho mỗi tài liệu (tổng cộng ~810 bản ghi)...');
    const [docs] = await connection.execute('SELECT id FROM documents');
    
    // Tạo mảng dữ liệu mẫu
    const reviewsData = [
      { userId: 1, rating: 5, comment: 'Rất tốt, cảm ơn tác giả!' },
      { userId: 2, rating: 4, comment: 'Tài liệu hay, trình bày rõ ràng.' },
      { userId: 3, rating: 5, comment: 'Tài liệu bổ ích, giúp mình hiểu bài hơn.' },
      { userId: 4, rating: 2, comment: 'Dở quá, nội dung sơ sài.' },
      { userId: 5, rating: 1, comment: 'Không học được gì từ tài liệu này.' }
    ];

    for (const doc of docs) {
      for (const review of reviewsData) {
        await connection.execute(
          'INSERT IGNORE INTO document_reviews (document_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
          [doc.id, review.userId, review.rating, review.comment]
        );
      }
    }

    console.log('3. Đang cập nhật số sao trung bình và tổng số lượng đánh giá...');
    await connection.execute(`
      UPDATE documents d
      SET 
          avg_rating = (SELECT IFNULL(AVG(rating), 0) FROM document_reviews WHERE document_id = d.id),
          review_count = (SELECT COUNT(*) FROM document_reviews WHERE document_id = d.id)
    `);

    console.log('HOÀN TẤT! Đã seeding xong dữ liệu đánh giá cho 162 tài liệu.');
  } catch (error) {
    console.error('Lỗi khi seeding:', error);
  } finally {
    await connection.end();
  }
}

seed();
