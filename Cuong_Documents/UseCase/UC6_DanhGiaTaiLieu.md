# UC6 - Hướng dẫn code tính năng Đánh giá tài liệu

## 1) Mục tiêu tính năng

Tính năng Đánh giá tài liệu cho phép người dùng:
- Gửi đánh giá kèm số sao (1-5) và nội dung bình luận cho một tài liệu cụ thể.
- Hệ thống tự động tính toán lại điểm trung bình (`avg_rating`) và tổng số lượt đánh giá (`review_count`) của tài liệu đó.
- Hiển thị danh sách các bài đánh giá mới nhất ở tab "Đánh giá".

## 2) Các file chính tham gia tính năng (Dự kiến triển khai)

- **Giao diện chi tiết:** `app/document/[id]/page.tsx` (Hiển thị tab đánh giá).
- **Component hành động:** `app/document/[id]/DocumentActions.tsx` (Chứa nút bấm mở Form đánh giá).
- **Component Modal/Form:** `components/review-form.tsx` (Component mới để nhập liệu).
- **API xử lý đánh giá:** `app/api/documents/[id]/reviews/route.ts` (Nhận thông tin POST từ frontend).
- **Repository truy vấn:** `lib/repositories.ts` (Thêm hàm `addDocumentReview`, `getReviewsByDocumentId`).

## 3) Luồng hoạt động tổng thể

1. Người dùng truy cập trang chi tiết tài liệu `/document/[id]`.
2. Hệ thống gọi `getDocumentDetailById` để lấy thông tin tổng quan (Số sao trung bình, số lượng review).
3. Người dùng nhấn nút **"Viết đánh giá"** trong component `DocumentActions`.
4. Một Modal hoặc Form xuất hiện yêu cầu chọn số sao và nhập nội dung.
5. Khi người dùng nhấn `Gửi`:
   - Frontend gọi `POST /api/documents/[id]/reviews`.
   - API xác thực dữ liệu và gọi hàm `addDocumentReview` trong repository.
   - Repository thực hiện `INSERT` vào bảng `document_reviews`.
   - Hệ thống chạy thêm lệnh `UPDATE` vào bảng `documents` để cập nhật `avg_rating` và `review_count`.
6. API trả về thành công, Frontend tải lại tab "Đánh giá" để hiện kết quả mới nhất.

## 4) Giải thích chi tiết và hướng dẫn code

### 4.1 Cơ sở dữ liệu (Schema)

Tài liệu sử dụng bảng `document_reviews` đã được thiết kế trong file `CoSoDuLieu.md`:

```sql
CREATE TABLE IF NOT EXISTS document_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,  -- 1 đến 5
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE KEY uk_document_user_review (document_id, user_id) -- Mỗi user chỉ review 1 lần/tài liệu
) ENGINE=InnoDB;
```

### 4.2 Lớp Repository (`lib/repositories.ts`)

Cần bổ sung các hàm sau:

```ts
// 1. Lấy danh sách đánh giá của một tài liệu
export async function getReviewsByDocumentId(documentId: number) {
  return await queryRows(`
    SELECT r.*, u.full_name, u.avatar_url 
    FROM document_reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.document_id = ?
    ORDER BY r.created_at DESC
  `, [documentId]);
}

// 2. Thêm đánh giá mới và cập nhật thống kê tài liệu
export async function addDocumentReview(data: { documentId: number, userId: number, rating: number, comment: string }) {
  // B1: Ghi log review
  await executeCommand(`
    INSERT INTO document_reviews (document_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)
  `, [data.documentId, data.userId, data.rating, data.comment]);

  // B2: Tính toán lại avg_rating và review_count
  await executeCommand(`
    UPDATE documents d
    SET 
      avg_rating = (SELECT AVG(rating) FROM document_reviews WHERE document_id = ?),
      review_count = (SELECT COUNT(*) FROM document_reviews WHERE document_id = ?)
    WHERE id = ?
  `, [data.documentId, data.documentId, data.documentId]);
}
```

### 4.3 API Route (`app/api/documents/[id]/reviews/route.ts`)

Sử dụng cấu trúc `POST` để tiếp nhận dữ liệu từ Client:

```ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { rating, comment, userId } = body;
  
  // Validate dữ liệu
  if (!rating || rating < 1 || rating > 5) return Response.json({ error: "Invalid rating" }, { status: 400 });

  await addDocumentReview({
    documentId: Number(params.id),
    userId,
    rating,
    comment
  });

  return Response.json({ success: true });
}
```

## 5) Lưu ý khi triển khai

- **Xác thực người dùng:** Hiện tại hệ thống đang dùng giá trị cứng cho `user_id`. Khi có module Login, cần lấy `user_id` từ session.
- **Tính toán số sao:** Việc tính `AVG(rating)` trực tiếp trong câu lệnh `UPDATE` giúp dữ liệu luôn chính xác tuyệt đối mà không cần logic phức tạp ở code App.
- **Giao diện:** Tab đánh giá nên cho thấy kết quả ngay mà không cần reload toàn bộ trang (sử dụng `router.refresh()` hoặc state management).

## 6) Tóm tắt cho người mới

1. **Database:** Review được lưu ở bảng riêng nhưng tác động trực tiếp đến cột `avg_rating` ở bảng `documents`.
2. **Repository:** Luôn đi kèm 2 bước: Lưu review -> Cập nhật thống kê tài liệu.
3. **UI:** Cần đảm bảo tab "Reviews" gọi data thật từ API thay vì dùng mock data như bản demo.
