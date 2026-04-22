# UC3 - ĐẶC TẢ CHI TIẾT VÀ HƯỚNG DẪN TRIỂN KHAI CHATBOT TUTOR (RAG EDITION)

Tài liệu này đóng vai trò như một bản đặc tả thiết kế hệ thống (System Design Specification) đi sâu vào tầng mã nguồn (Code-level). Nó giải thích toàn bộ quy trình nhận thức, lưu trữ, và kết xuất của hệ thống Retrieval-Augmented Generation (RAG) đang chạy trực tiếp trên dự án. Hệ thống hiện tại đã chuyển đổi từ mô hình Mock-up sang mô hình **Production-Ready RAG** hoàn chỉnh.

---

## I. MỤC TIÊU VÀ TRIẾT LÝ THIẾT KẾ

### 1. Mục tiêu cốt lõi
- **Trợ giảng thông minh**: Giải đáp kiến thức học thuật dựa trên dữ liệu chuẩn của hệ thống, không trả lời lan man.
- **Kết nối tài liệu**: Gợi ý chính xác các file bài giảng, giáo trình (`.pdf`) đang có trong kho dữ liệu tương ứng với nội dung người dùng hỏi.
- **Chống ảo giác (Anti-Hallucination)**: Đảm bảo chatbot không bịa đặt thông tin hoặc gợi ý tài liệu không tồn tại.
- **Tối ưu chi phí**: Vận hành hiệu quả trên các tài nguyên miễn phí hoặc giá rẻ (Railway, Pollinations AI, HuggingFace).

### 2. Triết lý "Hybrid RAG"
Hệ thống không phụ thuộc hoàn toàn vào Vector Database đắt đỏ (như Pinecone/Weaviate). Thay vào đó, chúng ta sử dụng **Hybrid Search** kết hợp 3 lớp:
1. **Semantic Search (Vector)**: Hiểu ý nghĩa câu chữ qua Embedding 384 chiều.
2. **Keyword Search (BM25)**: Tìm chính xác các thuật ngữ chuyên môn có trong văn bản bằng sức mạnh của MySQL Full-text Index.
3. **Metadata Matching**: Ưu tiên các từ khóa xuất hiện ngay trong tiêu đề tài liệu để tăng độ chính xác khi người dùng tìm kiếm trực tiếp.

---

## II. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

### 1. Luồng dữ liệu 6 bước (Standard RAG Pipeline)
Khi một tin nhắn được gửi đi, hệ thống thực hiện quy trình liên hoàn:

1. **Intent Classification**: 
   - Phân loại xem người dùng đang hỏi học thuật (`ACADEMIC`), tìm tài liệu (`DISCOVERY`) hay chỉ chào hỏi xã giao (`CASUAL`).
   - Chặn chuỗi vô nghĩa (Gibberish) bằng Rule-based trước khi gọi AI để tiết kiệm tối đa chi phí.

2. **Query Expansion & Vectorization**: 
   - Tối ưu hóa câu hỏi dựa trên lịch sử hội thoại gần nhất.
   - Chuyển đổi thành Vector 384 chiều qua mô hình `sentence-transformers/all-MiniLM-L6-v2`.

3. **Hybrid Retrieval**: 
   - Truy vấn MySQL lấy các đoạn văn bản tiềm năng bằng sự kết hợp giữa Vector Cosine (tính toán in-memory) và BM25 Full-text Search.

4. **Cross-Subject Penalty**: 
   - Thuật toán "gác cổng" môn học. 
   - Hệ thống tự động xác định môn học chủ đạo (Dominant Subject) của câu hỏi.
   - Trừ điểm nặng các tài liệu thuộc môn học khác để đảm bảo tính nhất quán và chuyên sâu.

5. **LLM Generation (Streaming)**: 
   - Nhồi 5 đoạn ngữ cảnh chất lượng nhất vào Prompt.
   - Gọi LLM (OpenAI/Gemini/Pollinations) để sinh câu trả lời dưới dạng luồng dữ liệu (Stream).

6. **Metadata Extraction**: 
   - Quét nội dung AI trả về sau khi hoàn tất việc sinh văn bản.
   - Đối soát tên tài liệu để tạo danh sách Citations (Trích dẫn) chính xác 100%.

### 2. Kịch bản luồng sự kiện chi tiết (Main Success Scenario)

Dưới đây là các bước tương tác chi tiết giữa Người dùng và Hệ thống trong một phiên sử dụng Chatbot:

1.  **Bắt đầu**: Người dùng truy cập trang Chatbot. Hệ thống hiển thị lời chào mặc định và danh sách các câu hỏi gợi ý (`recentSearches`).
2.  **Nhập liệu**: Người dùng nhập câu hỏi (Ví dụ: "Đạo hàm là gì?") vào ô input và nhấn phím **Enter** hoặc nút **Gửi**.
3.  **Khởi tạo**:
    - Frontend lập tức thêm câu hỏi vào danh sách tin nhắn.
    - Nút "Gửi" chuyển thành nút "Dừng" (ô vuông đỏ) với hiệu ứng sóng âm.
    - Một yêu cầu `POST` được gửi tới API với `AbortSignal`.
4.  **Xử lý tại Server**:
    - Hệ thống phân loại câu hỏi (Ví dụ: Nhận diện đây là câu hỏi `ACADEMIC`).
    - Thực hiện tìm kiếm Hybrid trên CSDL để lấy các tài liệu Giải tích liên quan.
    - Bắt đầu truyền dữ liệu (Stream) câu trả lời từ AI về Client.
5.  **Phản hồi thời gian thực**: Người dùng quan sát thấy câu trả lời xuất hiện dần dần trên màn hình với định dạng Markdown và công thức Toán học chuẩn xác.
6.  **Kết thúc sinh văn bản**: 
    - Khi AI viết xong, hệ thống gửi kèm danh sách Metadata (Tài liệu tham khảo).
    - Frontend render các thẻ tài liệu bên dưới câu trả lời.
    - Nút "Dừng" quay trở lại thành nút "Gửi".
7.  **Tương tác mở rộng (Tùy chọn)**: Người dùng có thể click vào thẻ tài liệu để xem trước (Preview) hoặc tải về mà không làm gián đoạn cuộc trò chuyện.
8.  **Hủy tiến trình (Tùy chọn)**: Nếu câu trả lời quá dài hoặc không đúng ý, người dùng nhấn nút **Dừng** (hoặc `Ctrl + C`). Hệ thống ngắt kết nối Server ngay lập tức.
9.  **Lưu trữ**: Người dùng nhấn nút **"Tạo cuộc trò chuyện mới"**. Hệ thống gộp toàn bộ nội dung đã trao đổi và lưu vào bảng `chatbot_history` trong CSDL.

---

### 3. Mô hình hóa dữ liệu (Database Schema)

Hệ thống sử dụng các bảng chiến lược sau trong MySQL:

#### a) Bảng `document_chunks` (Lưu trữ ngữ nghĩa)
Đây là nơi lưu trữ các "mảnh kiến thức" đã được tiền xử lý:
- `id`: Khóa chính (Primary Key).
- `document_id`: Foreign Key liên kết tới bảng tài liệu gốc.
- `content`: Nội dung văn bản (đã được chunking khoảng 1000 ký tự).
- `embedding`: Vector 384 chiều lưu dưới dạng JSON String.

#### b) Bảng `chatbot_history` (Lưu trữ hành vi)
- `user_id`: Định danh người dùng.
- `question`: Gộp toàn bộ câu hỏi trong một phiên làm việc.
- `answer`: Gộp toàn bộ câu trả lời của AI tương ứng.
- `created_at`: Lưu theo chuẩn giờ Việt Nam (GMT+7) dùng `DATE_ADD(NOW(), INTERVAL 7 HOUR)`.

---

## III. CHI TIẾT THUẬT TOÁN (BACKEND DEEP DIVE)

### 1. Bộ phân loại Intent thông minh
Hàm `classifyIntent` đóng vai trò là "người gác cổng" tài nguyên:
- **Phát hiện Gibberish**: Nếu người dùng nhập chuỗi ký tự ngẫu nhiên (không có nguyên âm, không có dấu cách và quá dài), hệ thống sẽ đánh dấu là `CASUAL` và không kích hoạt RAG.
- **Short-circuit**: Các câu chào hỏi thông dụng (`haha`, `hello`, `chào`) sẽ được hệ thống trả lời bằng câu thoại fix sẵn, giúp phản hồi cực nhanh (< 100ms).

### 2. Công thức tính điểm Hybrid Scoring
Mỗi đoạn văn bản (Chunk) được chấm điểm theo trọng số:
`FinalScore = (VectorSimilarity * 0.5) + (BM25Score * 0.3) + (TitleMatch * 0.2)`

- **VectorSimilarity**: Tính toán bằng hàm `fastDot` (Tích vô hướng).
- **BM25Score**: Lấy từ kết quả `MATCH() AGAINST()` của MySQL, được chuẩn hóa theo giá trị cao nhất trong tập kết quả.
- **TitleMatch**: Chấm điểm dựa trên số lượng từ khóa trong câu hỏi xuất hiện trong tiêu đề tài liệu (`d.title`).

### 3. Cơ chế Cross-Subject Penalty (Chống lạc đề)
Đây là giải pháp độc đáo để xử lý dữ liệu quy mô lớn:
1. Hệ thống lấy Top 10 kết quả có điểm cao nhất.
2. Duyệt qua danh sách để tính môn học nào đang chiếm ưu thế (Tổng điểm cao nhất).
3. Gán ID môn học đó làm **Dominant Subject**.
4. Các tài liệu khác môn học này sẽ bị trừ thẳng **0.4 điểm**. 
5. Kết quả: Các tài liệu "lạc đề" sẽ biến mất khỏi danh sách gợi ý của AI.

---

## IV. TRIỂN KHAI PHÍA SERVER (API ROUTE)

### 1. Endpoint: `POST /api/chatbot`
Đây là trung tâm xử lý dữ liệu. Toàn bộ logic RAG được đóng gói tại đây để đảm bảo bảo mật cho API Keys và Logic xử lý.

**Đặc điểm nổi bật:**
- **Streaming**: Sử dụng `ReadableStream` để truyền dữ liệu về Client theo thời gian thực. Người dùng không phải đợi AI viết xong toàn bộ mới thấy kết quả.
- **Abort Signal**: Server chủ động kiểm tra `request.signal.aborted`. Nếu Client ngắt kết nối (do người dùng bấm Hủy), Server sẽ lập tức dừng việc đọc dữ liệu từ AI Provider để tiết kiệm Token.

### 2. Endpoint: `POST /api/chatbot/history`
- Xử lý việc lưu trữ bền vững.
- Hỗ trợ gộp tin nhắn thông minh: Hệ thống sử dụng dấu phân tách `---MESSAGE_SEP---` để phân tách các câu hỏi/trả lời trong cùng một phiên chat khi lưu vào DB.
- Hỗ trợ lọc tin nhắn hệ thống (Intro) để đảm bảo lịch sử chỉ chứa nội dung trao đổi thực sự.

---

## V. CÔNG NGHỆ PHÍA FRONTEND (UX/UI DEEP DIVE)

### 1. Quản lý trạng thái và Luồng (Stream Handling)
- Sử dụng `AbortController` để quản lý vòng đời của yêu cầu fetch.
- Cung cấp nút **"Stop Generation"** với hiệu ứng viền đỏ nhấp nháy (`animate-ping`) khi AI đang hoạt động.
- Hỗ trợ phím tắt `Ctrl + C` để hủy nhanh tiến trình, tạo cảm giác chuyên nghiệp như các công cụ lập trình.

### 2. Bộ Render Cú Pháp (AST-based Rendering)
Tại file `components/chatbot/ChatbotAnswer.tsx`:
- **Markdown**: Chuyển đổi Text thô thành các thẻ HTML chuẩn.
- **KaTeX**: Tích hợp `rehype-katex` để render các công thức toán học phức tạp. Hệ thống xử lý được cả các lỗi phổ biến của AI khi sinh LaTeX (như nhầm lẫn dấu backslash trong tiếng Việt).
- **Huy hiệu số La Mã**: Sử dụng kỹ thuật ghi đè Component (Component Overriding) của `react-markdown` để vẽ các thẻ tiêu đề I, II, III với phong cách tối giản, hiện đại.

### 3. Interactive Sidebar
- Hiển thị lịch sử chat từ MySQL.
- Hỗ trợ xóa từng mục hoặc xóa toàn bộ lịch sử chỉ với 1 click.
- Tự động cập nhật danh sách lịch sử ngay sau khi người dùng kết thúc một phiên chat mới.

---

## VI. BẢO MẬT VÀ TỐI ƯU HÓA (PERFORMANCE)

### 1. Bảo mật API
- Toàn bộ API Key (`POLLINATIONS_API_KEY`, `GEMINI_API_KEY`) được giấu kín ở phía Server.
- Client chỉ giao tiếp qua Route Handler của Next.js, không bao giờ biết được thông tin về Provider bên thứ ba.

### 2. Tối ưu bộ nhớ (In-memory Caching)
- Hệ thống duy trì một `answerCache` (Map) để lưu trữ các câu trả lời cho những câu hỏi giống hệt nhau.
- Cache này giúp phản hồi tức thì và giảm 100% chi phí gọi AI cho các câu hỏi phổ biến.

---

## VII. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

Một phiên triển khai Chatbot Tutor được coi là thành công khi:
1. **Tốc độ**: Thời gian bắt đầu thấy những từ đầu tiên (First Byte) không quá 2 giây.
2. **Độ chính xác**: Khi hỏi về một môn học cụ thể, các tài liệu gợi ý bên dưới phải thuộc đúng môn học đó.
3. **Tính bền bỉ**: Lịch sử chat phải được lưu đúng múi giờ Việt Nam và hiển thị lại chính xác trong Sidebar.
4. **Trải nghiệm**: Các công thức toán học và cấu trúc mục lục La Mã phải hiển thị đẹp mắt, không lỗi font.
5. **Độ tin cậy**: Khi người dùng hỏi linh tinh, chatbot phải từ chối khéo léo thay vì cố gắng suy luận sai lệch.

---

## VIII. KẾT LUẬN

Hệ thống Chatbot Tutor hiện tại là sự kết hợp hoàn hảo giữa kỹ thuật **RAG tiên tiến** và tối ưu hóa **vận hành chi phí thấp**. Với thuật toán chấm điểm 3 yếu tố và cơ chế Cross-Subject Penalty, chúng ta đã xây dựng được một "Trợ lý học tập" thực sự tin cậy, bám sát dữ liệu thực tế của đồ án.

Tài liệu này cung cấp đầy đủ cơ sở lý luận và hướng dẫn kỹ thuật để bạn có thể tự tin bảo vệ trước hội đồng về tính sáng tạo cũng như khả năng thực thi thực tế của hệ thống.

---
*Tài liệu được cập nhật ngày: 23/04/2026*
*Phiên bản: 3.2 (Production RAG Documentation)*
