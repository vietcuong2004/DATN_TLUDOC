# Tài liệu tổng hợp kiến trúc và sơ đồ cho đồ án

## 1. Đề tài này có gì mới? Ai là người hưởng lợi
> **Dạ thưa thầy/cô, đề tài của em có hai điểm mới cốt lõi:**
> 1. **Về mặt nghiệp vụ:** Hệ thống chuyển từ "lưu trữ tài liệu thụ động" sang "tương tác chủ động" trên cùng một nền tảng. Sinh viên không chỉ tải tài liệu mà còn có thể chat hỏi đáp, tóm tắt, tự động tạo câu hỏi trắc nghiệm ôn tập và sinh sơ đồ tư duy (mindmap) trực quan.
> 2. **Về mặt kỹ thuật:** Tích hợp tìm kiếm ngữ nghĩa (Semantic Search) bằng cách mã hóa văn bản thành Vector qua mô hình `all-MiniLM-L6-v2` và truy vấn trên cơ sở dữ liệu Vector Pinecone để có kết quả chính xác hơn so khớp từ khóa truyền thống.
> **Ai hưởng lợi:** Đối tượng hưởng lợi chính là **sinh viên Trường Đại học Thủy lợi (TLU)** giúp tăng hiệu quả tự học; tiếp theo là **giảng viên** giúp quản lý và chia sẻ học liệu dễ dàng theo từng học phần.

## 2. Làm sao để biết câu trả lời đưa ra là đúng? căn cứ vào đâu em cho nó là đúng?
> **Dạ thưa thầy/cô, câu trả lời của Chatbot được đảm bảo tính đúng đắn dựa trên mô hình RAG (Retrieval-Augmented Generation):**
> 1. **Cơ chế RAG (Lấy ngữ cảnh thực tế):** Khi nhận câu hỏi, hệ thống truy vấn CSDL Pinecone để tìm ra các đoạn tài liệu gốc liên quan nhất. Đoạn văn bản gốc này được đưa vào Prompt làm ngữ cảnh. AI chỉ được phép đọc và trả lời dựa trên ngữ cảnh này, không tự bịa thêm thông tin ngoài tài liệu.
> 2. **Bộ lọc tin cậy (Confidence Gate):** Ở file [chatbot-tutor.ts](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts#L333), nếu điểm tương đồng (similarity score) của tài liệu thấp hơn `0.2`, hệ thống sẽ từ chối trả lời chứ không đoán bừa.
> 3. **Trích dẫn nguồn:** Cuối mỗi câu trả lời, chatbot đính kèm danh sách tài liệu gốc tham khảo để người dùng có thể tự đối chiếu trực tiếp.
> *Căn cứ cốt lõi để khẳng định tính đúng đắn chính là **nội dung của tài liệu gốc** đã được tải lên hệ thống.*

## 3. Tại sao embedding lại là con số 384 chiều mà không phải là con số khác? Em lấy con số 384 chiều ở đâu?
> **Dạ thưa thầy/cô, con số 384 chiều là do kiến trúc của mô hình Embedding em lựa chọn:**
> 1. **Em lấy con số 384 ở đâu:** Em lấy từ đặc tả kỹ thuật của mô hình mã nguồn mở **`all-MiniLM-L6-v2`** từ Hugging Face. Khi gọi API qua hàm [getHuggingFaceEmbedding](file:///d:/DATN_TLUDOCUMENT/lib/hf-embedder.ts#L9), mảng vector trả về có độ dài cố định luôn là 384 số thực. Đồng thời, CSDL Pinecone cũng được cấu hình `dimensions` là `384` để khớp hoàn toàn.
> 2. **Tại sao không phải con số khác:** Mỗi mô hình embedding sẽ có một số chiều cố định khác nhau (ví dụ: OpenAI thường là 1536 chiều). Em chọn 384 chiều vì mô hình `all-MiniLM-L6-v2` hoàn toàn miễn phí, tốc độ xử lý nhanh, tiết kiệm dung lượng lưu trữ trên Pinecone (giúp duy trì trong gói Free tier 2GB) mà vẫn đạt độ chính xác cao cho tìm kiếm ngữ nghĩa tài liệu của dự án.

## 4. Giải thích cơ chế Embedding em dùng trong hệ thống để đưa ra câu trả lời? Làm sao biết câu hỏi, câu trả lời, tài liệu đưa ra nó liên quan đến nhau và nó là chính xác?
> **Dạ thưa thầy/cô, cơ chế hoạt động và cách hệ thống đảm bảo tính liên quan, chính xác giữa câu hỏi, câu trả lời và tài liệu như sau:**
>
> ### 1. Cơ chế Embedding (Mã hóa văn bản):
> * Hệ thống sử dụng mô hình **`sentence-transformers/all-MiniLM-L6-v2`** của Hugging Face để chuyển hóa các đoạn văn bản (PDF học liệu sau khi băm nhỏ thành các chunk) và câu hỏi của sinh viên thành các vector 384 chiều biểu diễn ngữ nghĩa.
> * **Dòng code cụ thể:** 
>   - **Bước 1: Nhận câu hỏi từ request body:** Trong file [chatbot-tutor.ts](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts) tại dòng 208:
>     ```typescript
>     const message = String(body.message ?? "").trim()
>     ```
>   - **Bước 2: Vector hóa câu hỏi:** Trong file [chatbot-tutor.ts](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts) tại dòng 261:
>     ```typescript
>     const queryVector = await getCachedEmbedding(message)
>     ```
>   - **Bước 3: Gọi thư viện Hugging Face tạo vector:** Hàm `getCachedEmbedding` gọi hàm [getHuggingFaceEmbedding](file:///d:/DATN_TLUDOCUMENT/lib/hf-embedder.ts#L9) tại file [hf-embedder.ts](file:///d:/DATN_TLUDOCUMENT/lib/hf-embedder.ts) để gửi request lên HuggingFace API:
>     ```typescript
>     const result = await hf.featureExtraction({
>       model: HF_MODEL,
>       inputs: cleanText,
>     });
>     ```
>
> ### 2. Cách xác định tính liên quan giữa Câu hỏi và Tài liệu (Retrieval):
> * **Thuật toán cốt lõi:** Sử dụng **Độ tương đồng Cosine (Cosine Similarity)** để tính góc giữa vector câu hỏi và vector của các đoạn tài liệu lưu trữ. Giá trị càng gần `1.0` thể hiện độ liên quan ngữ nghĩa càng cao.
> * **Câu hỏi mở rộng của Hội đồng:** *"Thế tức là sau khi vector hóa câu hỏi xong, hệ thống phải chạy vòng lặp để tính độ tương đồng Cosine với từng tài liệu / chunk tài liệu trong hệ thống rồi mới chọn ra kết quả đúng không?"*
> * **Trả lời:**
>   - **Về mặt nguyên lý toán học:** Dạ đúng, bản chất là phải tính toán độ tương đồng giữa vector câu hỏi và tất cả các vector của chunk tài liệu có trong hệ thống để tìm ra các đoạn khớp nhất.
>   - **Về mặt triển khai kỹ thuật:** Dạ không, hệ thống **không** chạy vòng lặp thủ công trên backend Node.js để tính tuần tự từng cái (vì độ phức tạp là $O(N)$, khi số lượng tài liệu lớn lên sẽ gây thắt nút cổ chai hiệu năng). Thay vào đó, nhiệm vụ tính toán này được giao hoàn toàn cho **Pinecone Vector Database**. Pinecone sử dụng cấu trúc chỉ mục đặc biệt dựa trên thuật toán tìm kiếm láng giềng gần nhất xấp xỉ (Approximate Nearest Neighbor - ANN) để tính toán song song, trả về top 25 kết quả tương đồng nhất chỉ trong vài mili-giây với độ phức tạp thuật toán cực thấp ($O(\log N)$).
> * **Dòng code cụ thể:**
>   - Thuật toán Cosine Similarity được triển khai trong hàm [cosineSimilarity](file:///d:/DATN_TLUDOCUMENT/lib/hf-embedder.ts#L44) ở file [hf-embedder.ts](file:///d:/DATN_TLUDOCUMENT/lib/hf-embedder.ts):
>     ```typescript
>     const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
>     ```
>   - Khi người dùng gửi câu hỏi ở file [chatbot-tutor.ts](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts), vector câu hỏi được gửi lên CSDL Pinecone để truy vấn các đoạn tài liệu tương đồng nhất (trả về điểm số `score` tương đồng):
>     ```typescript
>     const queryResponse = await pineconeIndex.query({
>       vector: queryVector,
>       topK: 25,
>       includeMetadata: true,
>       filter: forcedSubjectId ? { subject_id: { $eq: forcedSubjectId } } : undefined
>     })
>     ```
>
> ### 3. Cách đảm bảo câu trả lời liên quan và chính xác (Anti-Hallucination & Prompting):
> * **Bộ lọc độ tin cậy (Confidence Gate):** Nếu độ liên quan lớn nhất thấp hơn `0.2`, hệ thống chặn không trả lời linh tinh. Code tại [chatbot-tutor.ts:L333](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts#L333):
>   ```typescript
>   if (semanticChunks.length === 0 || semanticChunks[0].score < 0.2) {
>     return createTextResponse("Dựa trên hệ thống dữ liệu hiện tại, mình chưa tìm thấy thông tin phù hợp...")
>   }
>   ```
> * **Thiết lập nhiệt độ mô hình (Temperature):** Đặt `temperature: 0.2` khi gọi LLM ở [chatbot-tutor.ts:L351](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts#L351) để hạn chế tính ngẫu nhiên, ép AI trả lời sát với văn bản gốc.
> * **Ràng buộc chặt chẽ bằng System Instruction:** Code tại [chatbot-tutor.ts:L190](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts#L190) ghi rõ chỉ thị:
>   `"CHỈ sử dụng kiến thức trong phần 'NỘI DUNG CHI TIẾT TỪ TÀI LIỆU' làm lý thuyết nền tảng. Tuyệt đối không tự bịa kiến thức lý thuyết khác ngoài tài liệu."` và bắt buộc trích dẫn tên nguồn tài liệu ở cuối ý trả lời ở dòng 189: `"(tài liệu [Tên tài liệu])"`.

## 5. Giải thích thuật toán ANN, độ phức tạp O(log N) và tham số Temperature
> **Dạ thưa thầy/cô, dưới đây là giải thích chi tiết về thuật toán ANN, độ phức tạp tìm kiếm và tham số Temperature:**
>
> ### 1. Thuật toán ANN (Approximate Nearest Neighbor) và Độ phức tạp O(log N) so với O(N):
> * **Tìm kiếm tuyến tính O(N):** Với $N$ là tổng số mảnh tài liệu (chunks), hệ thống phải so sánh lần lượt vector câu hỏi với từng mảnh một từ đầu đến cuối CSDL. Nếu có 10.000 mảnh, ta phải tính công thức Cosine 10.000 lần. Việc này rất chậm khi dữ liệu lớn.
> * **ANN (Approximate Nearest Neighbor):** Là phương pháp tìm kiếm không duyệt hết 100% dữ liệu mà sử dụng các cấu trúc đồ thị liên kết (như HNSW của Pinecone) để gom nhóm các vector gần nhau lại trước. Khi tìm kiếm, thuật toán chỉ điều hướng qua các nhóm vector có xác suất cao nhất.
> * **Độ phức tạp O(log N):** Thời gian tìm kiếm chỉ tăng theo hàm Logarithm của số lượng mảnh. Ví dụ, với 10.000 mảnh, Pinecone chỉ cần so sánh khoảng 13-15 lần là tìm ra các kết quả tương đồng nhất, giúp phản hồi dưới 50ms.
>
> ### 2. Thiết lập nhiệt độ mô hình (Temperature):
> * **Định nghĩa:** `temperature` là tham số điều khiển mức độ "sáng tạo" và ngẫu nhiên của mô hình AI khi sinh văn bản.
> * **Cơ chế hoạt động:** 
>   - **Nhiệt độ cao (gần 1.0):** AI sẽ chọn từ tiếp theo từ danh sách các từ có xác suất thấp hơn, giúp văn phong đa dạng, sáng tạo (phù hợp viết văn).
>   - **Nhiệt độ thấp (0.2):** AI bị ép buộc chỉ được phép chọn những từ có xác suất cao nhất để trả lời.
> * **Ứng dụng trong RAG:** Tại [chatbot-tutor.ts:L351](file:///d:/DATN_TLUDOCUMENT/lib/chatbot-tutor.ts#L351), em đặt `temperature: 0.2` nhằm ép AI trả lời nhất quán, logic và bám sát chính xác câu chữ trong phần ngữ cảnh trích xuất từ tài liệu, loại bỏ tối đa hiện tượng ảo tưởng kiến thức (hallucination).

## 6. Hiện nay đã có Google NotebookLM làm rất tốt các tính năng tương tự. Vậy tại sao sinh viên cần đến trang web của em? Em cạnh tranh kiểu gì với họ?
> **Dạ thưa thầy/cô, đúng là Google NotebookLM hiện nay có các chức năng như hỏi đáp tài liệu, tóm tắt, tạo sơ đồ tư duy và chất lượng AI còn tốt hơn hệ thống của em. Tuy nhiên, mục tiêu của đề tài không phải là cạnh tranh với NotebookLM mà là xây dựng một hệ thống web học liệu tích hợp AI phục vụ nhu cầu cụ thể của Trường Đại học Thủy Lợi.**
>
> **Dự án của em có những điểm khác biệt và thế mạnh cạnh tranh sau:**
>
> ### 1. Quản lý học liệu tập trung của trường (Không gian chung so với Không gian cá nhân):
> * **NotebookLM:** Là một công cụ AI tổng quát mang tính cá nhân. Mỗi người dùng phải tự chuẩn bị, tự tìm kiếm và tự tải tài liệu học tập của mình lên.
> * **TLU Document:** Vừa là website quản lý tài liệu, vừa là nền tảng AI. Hệ thống cung cấp các tính năng quản lý thực tế mà NotebookLM không hướng tới:
>   - Quản lý tài khoản sinh viên và giảng viên.
>   - Phân loại tài liệu khoa học theo từng môn học/học phần của trường.
>   - Có hệ thống bình luận, đánh giá (rating) tài liệu.
>   - Quản trị viên (Admin/Giảng viên) có quyền kiểm duyệt tài liệu tải lên trước khi công bố để đảm bảo chất lượng thông tin học tập.
>
> ### 2. AI được xây dựng trên kho học liệu dùng chung của nhà trường:
> * **NotebookLM:** Chủ yếu làm việc biệt lập với tài liệu do từng cá nhân tải lên tài khoản riêng.
> * **TLU Document:** Xây dựng một kho học liệu dùng chung cho toàn trường. Nhiều sinh viên có thể cùng khai thác một nguồn dữ liệu chính thống đã được tổ chức khoa học theo từng môn học (bao gồm giáo trình, đề cương, đề thi, slide bài giảng...) mà không phải upload lại từ đầu.
>
> ### 3. Giá trị của đồ án nằm ở năng lực thiết kế và triển khai thực tế:
> * Về mặt nghiên cứu, em không đặt mục tiêu xây dựng một mô hình AI mới hay vượt qua NotebookLM của Google. 
> * Giá trị cốt lõi của đề tài là em đã **tự thiết kế và triển khai toàn bộ hệ thống từ đầu**: thiết lập quản lý cơ sở dữ liệu, xử lý bóc tách tài liệu, tạo embedding, lưu trữ trên cơ sở dữ liệu vector Pinecone, xây dựng pipeline RAG hoàn chỉnh, tích hợp mô hình LLM và phát triển giao diện người dùng thành một ứng dụng fullstack hoàn chỉnh. Điều này chứng minh năng lực thiết kế hệ thống và giải quyết bài toán kỹ thuật thực tế của một kỹ sư công nghệ thông tin.
>
> ### 4. Khả năng tùy biến và mở rộng theo nghiệp vụ của trường (Extensibility):
> * Do làm chủ hoàn toàn mã nguồn hệ thống, sau này trường có thể dễ dàng bổ sung các tính năng riêng biệt:
>   - Hỏi đáp quy chế đào tạo, quy định học vụ của trường.
>   - Tra cứu chi tiết học phần, lịch học.
>   - Tích hợp với hệ thống quản lý học tập LMS của nhà trường.
>   - Đồng bộ tài liệu nội bộ và phân quyền truy cập chi tiết theo giảng viên hoặc lớp học.
>   *Đây là điều mà Google NotebookLM hoàn toàn không thể hỗ trợ hay tùy biến sâu.*
>
> ---
>
> **\* Câu hỏi mở rộng từ Hội đồng:** *"Vậy nếu người dùng có thể dùng NotebookLM luôn, thì cần gì hệ thống của em?"*
> **\* Trả lời:**
> * *"Dạ thưa thầy/cô, nếu người học chỉ cần AI đọc và phân tích một vài tài liệu cá nhân đơn lẻ, thì NotebookLM quả thực là lựa chọn rất tốt. Tuy nhiên, trong môi trường của một trường đại học, chúng ta vẫn bắt buộc phải có một hệ thống quản lý học liệu chung để tổ chức, lưu trữ, phân quyền và khai thác tài liệu. Đề tài của em đã giải quyết bài toán tích hợp AI trực tiếp vào chính hệ thống quản lý học liệu đó, giúp sinh viên và giảng viên khai thác tri thức tập trung mà không phải chuyển đổi qua lại giữa nhiều nền tảng khác nhau."*

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
