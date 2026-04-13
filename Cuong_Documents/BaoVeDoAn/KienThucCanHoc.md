# Tài liệu tổng hợp kiến trúc và sơ đồ cho đồ án

## 1) Dự án hiện tại là gì?

Dự án hiện tại là **Next.js fullstack**.

Thành phần chính:
- Frontend: React + Next.js App Router
- Ngôn ngữ: TypeScript
- UI: Tailwind CSS + shadcn/ui + Radix
- Backend: Next.js Route Handlers (Node.js runtime)
- Database: MySQL (qua thư viện `mysql2`)

Kết luận ngắn gọn để dùng khi bảo vệ:
> Dự án em là Next.js fullstack, kiến trúc phân lớp: UI -> API Route -> Repository -> MySQL.

---

## 2) Backend hiện tại đang dùng gì?

Backend hiện tại không dùng Laravel; thay vào đó sử dụng backend tích hợp sẵn trong Next.js (Route Handlers chạy trên Node.js runtime), code bằng TypeScript, tổ chức theo mô hình API Route -> Repository (`lib/repositories.ts`) -> MySQL (`lib/mysql.ts`).

Đang dùng:
- API routes trong thư mục `app/api/.../route.ts`
- Hàm truy vấn dữ liệu trong `lib/repositories.ts`
- Kết nối DB trong `lib/mysql.ts`

Một số API đang hoạt động:
- `/api/search/advanced`
- `/api/subjects/groups`
- `/api/documents/counts`

---

## 3) TypeScript và JavaScript khác gì?

### JavaScript
- Dễ bắt đầu, viết nhanh
- Linh hoạt cao
- Nhiều lỗi chỉ phát hiện khi chạy thật (runtime)

### TypeScript
- Là JavaScript + kiểu dữ liệu (type)
- Phát hiện lỗi sớm ngay khi code
- Dễ đọc và bảo trì hơn khi dự án lớn

Ví dụ minh họa:

1. Ví dụ hàm cộng đơn giản

JavaScript:

```js
function sum(a, b) {
	return a + b
}

sum(10, 20)   // 30
sum("10", 20) // "1020" (dễ phát sinh lỗi logic)
```

TypeScript:

```ts
function sum(a: number, b: number): number {
	return a + b
}

sum(10, 20)   // OK
sum("10", 20) // Báo lỗi ngay lúc code
```

2. Ví dụ sát với đồ án (dữ liệu kết quả tìm kiếm)

```ts
type SearchResult = {
	id: number
	title: string
	rating: number
}

const item: SearchResult = {
	id: 1,
	title: "Đại số tuyến tính",
	rating: 4.5,
}
```

Nếu vô tình gán sai kiểu, ví dụ `rating: "4.5"`, TypeScript sẽ cảnh báo ngay trong editor thay vì đợi chạy mới lỗi.

### Mức độ khó
- Ban đầu khó hơn JS một chút vì phải khai báo kiểu
- Sau khi quen, tốc độ code gần tương đương
- Bù lại giảm bug đáng kể

Với đồ án hiện tại, nên giữ TS để ổn định và dễ giải thích kỹ thuật với hội đồng.

---

## 4) Vì sao chọn FE/BE hiện tại thay vì stack kiến thức nền ở trường?

### Stack hiện tại của đồ án:
- FE: React + Next.js + Tailwind + TypeScript
- BE: Next.js API Route + Repository + MySQL

Trong khi kiến thức nền ở trường thường học:
1. FE: HTML, CSS, Bootstrap, JavaScript
2. BE: Laravel, PHP

### Lý do chọn stack hiện tại:

1. Phù hợp sản phẩm thực tế hơn
- Đồ án cần giao diện tương tác nhiều, lọc dữ liệu động, điều hướng mượt.
- React/Next.js phù hợp với mô hình component và state, dễ mở rộng hơn HTML/CSS/JS thuần.

2. Tối ưu tốc độ phát triển
- FE và BE cùng nằm trong một codebase Next.js, giảm thời gian đồng bộ giữa 2 dự án tách rời.
- Tạo API ngay trong `app/api`, tái sử dụng type và logic dễ hơn.

3. Dễ bảo trì và giảm lỗi
- TypeScript kiểm tra kiểu dữ liệu sớm, giảm lỗi runtime.
- Khi sửa API/DTO, frontend sẽ được cảnh báo ngay nếu dùng sai dữ liệu.

4. UX/UI hiện đại hơn
- Tailwind + shadcn/ui giúp dựng giao diện nhanh, nhất quán, responsive tốt.
- Nếu dùng Bootstrap thuần có thể làm được, nhưng khó tinh chỉnh chi tiết và khó đồng bộ design system hơn.

5. Triển khai và vận hành thuận lợi
- Lý do quan trọng nhất: Vercel hỗ trợ CI/CD tự động rất tốt cho Next.js (kết nối Git, push code lên main là auto build/deploy, có preview URL “Preview URL là link chạy thử tự động cho từng lần cập nhật code, giúp kiểm tra và chia sẻ nhanh trước khi đưa lên production.”), nên phần build/deploy ứng dụng nhanh và nhẹ cấu hình hơn nhiều.
- Tuy nhiên, do dự án dùng MySQL trên Railway, vẫn phải cấu hình thủ công biến môi trường DB (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) trên Vercel để hệ thống kết nối được database khi deploy production.
- Với stack theo hướng học phần truyền thống (FE thuần + Laravel/PHP), việc triển khai thường tách nhiều phần hơn: FE và BE có thể phải deploy ở các nền tảng khác nhau, phải tự cấu hình thêm CORS/domain/env/pipeline nên phức tạp và tốn thời gian hơn.
- Luồng backend hiện tại (API Route -> Repository -> MySQL) rõ ràng, vừa dễ triển khai nhanh vừa dễ giải thích kiến trúc.

### Trả lời khi bị hỏi vặn (mẫu ngắn gọn để dùng khi bảo vệ)
1. Có những cách thiết kế stack nào?
- Cách 1: Laravel monolith truyền thống (Blade)
	FE + BE cùng một project Laravel, không tách app.
- Cách 2: FE và BE tách rời
	FE (Next/React) là app riêng, BE (Laravel/Node) là API riêng; có thể tách repo, tách deploy.
- Cách 3: Next.js fullstack
	FE + API Route cùng một codebase Next.js (mô hình đồ án hiện tại).

2. Vì sao không chọn Laravel hướng 1 ngay từ đầu?
- Laravel hướng 1 hoàn toàn đúng và làm được, em không phủ nhận.
- Nhưng bài toán đồ án cần UI tương tác cao (lọc nhiều điều kiện, cập nhật trạng thái nhanh, trải nghiệm mượt).
- Next.js + React + TypeScript cho em lợi thế rõ hơn ở phần này: component/state mạnh, tái sử dụng logic tốt, kiểm tra kiểu sớm.

3. "Tốn công đồng bộ" cụ thể là gì?
- Khi FE và BE tách rời, mỗi lần đổi API phải đồng bộ thêm:
	cập nhật contract dữ liệu, đồng bộ version FE/BE, cấu hình CORS/domain/env, kiểm tra lại pipeline/deploy hai bên.
- Với codebase thống nhất (như Next.js fullstack), các bước đồng bộ này nhẹ hơn vì sửa UI và API trong cùng dự án.

4. Câu trả lời 20-30 giây khi hội đồng hỏi nhanh
> Dạ, Laravel monolith là phương án đúng và em có cân nhắc. Tuy nhiên, mục tiêu sản phẩm của đồ án là giao diện tương tác cao và mở rộng nhanh, nên em chọn Next.js fullstack để làm UI và API trong cùng codebase. Cách này giúp giảm công đồng bộ giữa hai ứng dụng tách rời, tận dụng TypeScript để giảm lỗi tích hợp dữ liệu, và phù hợp hơn với mục tiêu kỹ thuật của đề tài.

---

## 5) Sequence Diagram có mấy kiểu? BCE là gì?

Trong học phần, thường gặp 2 mức chi tiết:

1. **Sequence Diagram thiên phân tích nghiệp vụ (BCE-oriented)**
2. **Sequence Diagram thiên thiết kế kỹ thuật (design-level / technical)**

### BCE là gì?
- **Boundary**: màn hình/giao diện
- **Control**: điều phối luồng xử lý
- **Entity**: dữ liệu/thực thể

### Có bắt buộc dùng biểu tượng tròn BCE cho SD không?
- Không bắt buộc theo UML chuẩn
- Nhưng nếu môn yêu cầu BCE thì nên vẽ đúng theo mẫu giảng viên

---

### Mapping BCE cho tính năng Tìm kiếm nâng cao

#### Actor
- Người dùng (Sinh viên)

#### Boundary
- Trang tìm kiếm nâng cao
- Vùng hiển thị kết quả tìm kiếm

#### Control
- Hàm xử lý tìm kiếm ở frontend (`runSearch`)
- API `/api/search/advanced`
- API `/api/subjects/groups` (nạp bộ lọc)

#### Entity
- `DocumentRepository` (hàm `searchDocumentsAdvanced`)
- Bảng `documents`, `subjects` trong MySQL

Luồng chính:
1. Actor nhập từ khóa + chọn lọc
2. Boundary gửi yêu cầu
3. Control kiểm tra tham số và gọi Entity
4. Entity truy vấn DB
5. Kết quả trả ngược về Boundary để hiển thị

---

## 6) Nên nộp sơ đồ nào cho an toàn?

Nếu trường yêu cầu BCE:
1. Nộp **Sequence Diagram theo BCE** trước
2. Nếu muốn cộng điểm kỹ thuật, thêm 1 sơ đồ Sequence kỹ thuật ở phụ lục

Mẫu câu trình bày:
> Em có sơ đồ Sequence theo BCE để bám chuẩn phân tích nghiệp vụ của môn, và có sơ đồ Sequence mức kỹ thuật để bám sát code triển khai thực tế.

---
## 7) Các kiến thức về API:
### API là gì? (giải thích dễ hiểu nhất)
API giống như một "quầy tiếp nhận yêu cầu" giữa Frontend và Backend.
- Frontend gửi yêu cầu: "Cho tôi dữ liệu theo điều kiện này".
- Backend nhận yêu cầu, xử lý (thường là truy vấn DB), rồi trả dữ liệu về.

Nói ngắn gọn:
- Frontend không truy cập thẳng MySQL.
- Frontend gọi API.
- API mới là nơi làm việc với database.

### API dùng để làm gì?
Trong đồ án này, API dùng để:
- Lấy dữ liệu ngành học/môn học cho bộ lọc.
- Tìm kiếm tài liệu theo nhiều điều kiện (từ khóa, ngành, môn, loại tài liệu, rating, thời gian cập nhật).
- Trả dữ liệu về dưới dạng JSON để giao diện hiển thị.

---

### Các khái niệm bắt buộc phải nắm
1. Endpoint (đường dẫn API)
- Ví dụ: `/api/search/advanced`
- Đây là "địa chỉ" mà frontend gọi tới.

2. Method (phương thức)
- Phổ biến: GET, POST, PUT, DELETE.
- Trong tính năng tìm kiếm nâng cao đang dùng `GET` vì mục đích là lấy dữ liệu.

3. Input của API
- Với GET, input thường đi qua query string trên URL.
- Ví dụ:
	`/api/search/advanced?q=giai+tich&groupName=Cong+nghe+thong+tin&minRating=4`

4. Output của API
- Thường là JSON.
- Ví dụ API này trả về dạng:

```json
{
	"items": [
		{
			"id": 10,
			"title": "Giải tích 1",
			"date": "05-03-2026",
			"views": 120,
			"downloads": 35,
			"rating": 4.6,
			"image": "https://drive.google.com/thumbnail?...",
			"downloadUrl": "https://drive.google.com/uc?export=download&id=..."
		}
	]
}
```

5. Status code (mã trạng thái)
- `200`: thành công.
- `500`: server lỗi.
- Trong dự án này, khi lỗi API tìm kiếm sẽ trả `{ "items": [] }` kèm status `500`.

---

### Luồng API trong dự án này (từ lúc bấm tìm kiếm đến lúc ra kết quả)

1. Người dùng nhập từ khóa + chọn bộ lọc ở trang tìm kiếm nâng cao.
2. Frontend ghép query string và gọi API `/api/search/advanced`.
3. API route đọc tham số, lọc giá trị hợp lệ (doc type, mốc thời gian...).
4. API gọi hàm repository để truy vấn MySQL.
5. Repository trả danh sách tài liệu.
6. API bọc lại thành JSON `{ items: [...] }` trả về frontend.
7. Frontend nhận JSON, set vào state và render danh sách kết quả.

---

### Ví dụ thật trong code của chính dự án
1. Nơi nhận request API
- File: `app/api/search/advanced/route.ts`
- Có hàm `GET(request: Request)`.
- Hàm này đọc `searchParams`, ví dụ `q`, `groupName`, `subjectCode`, `docTypes`, `minRating`, `updatedWithin`.

2. Nơi truy vấn database
- File: `lib/repositories.ts`
- Hàm: `searchDocumentsAdvanced(filters)`.
- Hàm này dựng `WHERE` theo các filter người dùng chọn, rồi query bảng `documents` + `subjects`.

3. Nơi gọi API từ giao diện
- File: `app/advanced-search/page.tsx`
- Hàm `runSearch()` làm các việc chính:
	- Tạo `URLSearchParams` từ filter hiện tại.
	- Gọi `fetch('/api/search/advanced?...')`.
	- `await response.json()` để lấy output.
	- `setSearchResults(data.items ?? [])` để hiển thị kết quả.

---

### "Gọi API ra kiểu gì?" (cú pháp bạn cần nhớ)
Ví dụ tối giản phía frontend:
```ts
const response = await fetch("/api/search/advanced?q=giai+tich", {
	cache: "no-store",
})

if (!response.ok) {
	throw new Error("Lỗi gọi API")
}

const data = await response.json()
console.log(data.items)
```

Ý nghĩa:
- `fetch(...)`: gửi request.
- `response.ok`: kiểm tra có thành công không.
- `response.json()`: đọc body JSON.
- `data.items`: mảng kết quả dùng để render UI.

---

### "Sử dụng output như thế nào?"
1. Lưu output vào state
- `setSearchResults(data.items ?? [])`
2. Truyền state xuống component hiển thị
- Component `SearchResults` nhận danh sách và vẽ card tài liệu.
3. Hiển thị thông tin từ mỗi item
- `title` để hiện tên tài liệu.
- `rating`, `views`, `downloads` để hiện chỉ số.
- `downloadUrl` gắn vào nút "Tải xuống".
Kết luận đơn giản:
- API trả dữ liệu thô (JSON).
- Frontend biến JSON đó thành giao diện người dùng nhìn thấy.

---

### Mẫu trả lời ngắn khi bị hỏi API là gì (15-20 giây)
> API là cầu nối giữa giao diện và dữ liệu. Frontend gửi yêu cầu lên endpoint, backend xử lý và trả JSON. Trong đồ án của em, trang Tìm kiếm nâng cao gọi API `/api/search/advanced`, API đọc filter, truy vấn MySQL qua repository và trả `{ items: [...] }`, sau đó frontend dùng `items` để render danh sách tài liệu.

## 8) Từ khóa tìm kiếm tài liệu tham khảo trên mạng

Tiếng Anh:
- `BCE robustness diagram`
- `analysis sequence diagram vs design sequence diagram`
- `Next.js layered architecture`
- `Next.js repository pattern`
- `Laravel MVC architecture api only`

Tiếng Việt:
- `sơ đồ BCE là gì`
- `phân biệt sequence diagram phân tích và thiết kế`
- `kiến trúc phân lớp trong Next.js`
- `Laravel có bắt buộc dùng Blade không`

---
