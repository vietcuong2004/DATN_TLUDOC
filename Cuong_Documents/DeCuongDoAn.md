Tên đề tài: Xây dựng hệ thống web tài liệu học tập tích hợp AI
Sinh viên thực hiện: Vương Việt Cường	
Lớp: 64CNTT3
Mã sinh viên: 2251061732
Số điện thoại: 0356287338
Email:	 2251061732@e.tlu.edu.vn
Giáo viên hướng dẫn: Ts. Nguyễn Huy Đức

TÓM TẮT ĐỀ TÀI
Trong bối cảnh khối lượng tài liệu học tập ngày càng lớn, việc tìm kiếm và tiếp thu kiến thức hiệu quả vẫn là khó khăn đối với sinh viên. Phần lớn các website tài liệu hiện nay chủ yếu cung cấp chức năng lưu trữ hoặc chia sẻ tài liệu thuần túy, trong khi các hoạt động hỗ trợ học tập như tóm tắt, ôn tập hay hệ thống hóa kiến thức phải thực hiện trên nhiều công cụ rời rạc.

Đề tài “Xây dựng hệ thống web tài liệu học tập tích hợp AI” hướng tới xây dựng một hệ thống học tập "một cửa", cho phép người dùng thực hiện toàn bộ chu trình học ngay trên cùng nền tảng. Ngoài chức năng tìm kiếm và lọc tài liệu, hệ thống tích hợp thêm các tính năng hỗ trợ học tập gồm tóm tắt tài liệu theo đề mục hoặc gạch đầu dòng, tạo quiz tự động để ôn tập, tạo sơ đồ tư duy để nắm ý chính, và chatbot hỗ trợ truy vấn theo ngữ cảnh tài liệu. Điểm mới của đề tài là sự tích hợp đồng bộ các chức năng này trong một hệ thống duy nhất, giúp giảm phụ thuộc vào các website hoặc công cụ bên ngoài và nâng cao trải nghiệm học tập.
CÁC MỤC TIÊU CHÍNH
•	Mục tiêu 1: Nghiên cứu cơ sở lý thuyết về phát triển Website hiện đại, các mô hình ngôn ngữ lớn (LLM), công nghệ xử lý ngôn ngữ tự nhiên (NLP).
•	Mục tiêu 2: Phân tích, thiết kế và xây dựng hệ thống web với 5 chức năng chính; mỗi chức năng được tích hợp trực tiếp vào quy trình sử dụng tài liệu trên cùng một nền tảng:
(1) Tìm kiếm và lọc tài liệu: Cho phép người dùng tìm tài liệu theo từ khóa, môn học và bộ lọc. Chức năng được tích hợp tại trang tìm kiếm và danh mục môn học để truy cập tài liệu nhanh. Ý tưởng triển khai code: Frontend gửi query tới API tìm kiếm, Backend xử lý điều kiện lọc và trả danh sách tài liệu theo mức độ phù hợp.
(2) Tóm tắt nội dung tài liệu bằng AI: Tạo bản tóm tắt ngắn theo đề mục hoặc gạch đầu dòng từ tài liệu gốc. Chức năng được tích hợp ngay tại trang xem tài liệu để người dùng đọc nhanh ý chính trước khi học chi tiết. Ý tưởng triển khai code: Khi người dùng bấm "Tóm tắt", hệ thống lấy nội dung tài liệu, gọi API LLM và lưu kết quả tóm tắt để hiển thị lại nhanh.
(3) Chatbot hỗ trợ tìm tài liệu, tư vấn học tập: Trả lời câu hỏi liên quan đến tài liệu và gợi ý hướng học. Chức năng được tích hợp trong hệ thống chat nội bộ, sử dụng dữ liệu tài liệu đang có trên website để hỗ trợ người dùng. Ý tưởng triển khai code: Mỗi phiên chat lưu ngữ cảnh gần nhất, Backend phân loại ý định câu hỏi rồi truy vấn dữ liệu tài liệu hoặc gọi LLM để sinh câu trả lời phù hợp.
(4) Tạo quiz tự động từ tài liệu: Sinh câu hỏi ôn tập từ nội dung tài liệu để người dùng tự kiểm tra kiến thức. Chức năng được tích hợp tại trang tài liệu hoặc trang ôn tập, giúp chuyển từ đọc tài liệu sang luyện tập ngay trong hệ thống. Ý tưởng triển khai code: Hệ thống trích nội dung chính của tài liệu, tạo bộ câu hỏi trắc nghiệm qua API AI và lưu bộ quiz để người dùng làm lại nhiều lần.
(5) Tạo sơ đồ tư duy (mindmap) từ tài liệu: Trích xuất và hiển thị các ý chính dưới dạng sơ đồ tư duy. Chức năng được tích hợp ngay trên hệ thống để người dùng hệ thống hóa kiến thức mà không cần dùng công cụ bên ngoài. Ý tưởng triển khai code: Backend sinh cấu trúc mindmap dạng cây từ nội dung tài liệu (render ra dưới dạng JSON), Frontend render bằng thư viện sơ đồ để người dùng xem và tương tác.

Ý tưởng triển khai chung cho các tính năng AI: Tài liệu đầu vào (PDF/DOCX) được chuyển sang văn bản thuần (text), sau đó chuẩn hóa và tách đoạn; từ dữ liệu text này, hệ thống tiếp tục xử lý cho các chức năng tóm tắt, chatbot, tạo quiz và tạo mindmap.

•	Nội dung mới của đề tài: Khác với các website tài liệu chủ yếu chỉ cung cấp tài liệu, hệ thống đề xuất tích hợp đồng thời tóm tắt, quiz, mindmap và chatbot ngay trong cùng môi trường học tập, giúp người dùng không cần chuyển sang công cụ khác.
KẾT QUẢ DỰ KIẾN
•	Quyển báo cáo tổng kết đồ án tốt nghiệp đầy đủ cơ sở lý thuyết và quy trình thực hiện.
•	Website hoàn thiện tích hợp các API AI (như OpenAI, Gemini) có khả năng xử lý tài liệu thực tế, thực hiện đầy đủ 5 tính năng đã kể trên.
TIẾN ĐỘ THỰC HIỆN
TT	Thời gian	Nội dung công việc chi tiết	Kết quả dự kiến đạt được
1	23/3 – 15/4	- Nghiên cứu kiến trúc Web (Frontend & Backend).
- Tìm hiểu về các API AI: OpenAI (LLM), Gemini. 
- Nghiên cứu luồng xử lý dữ liệu từ kho tài liệu cho Chatbot.	- Tài liệu tổng hợp công nghệ.
- Sơ đồ kiến trúc tổng thể của hệ thống Web AI.
2	16/4 – 10/5	- Phân tích yêu cầu chi tiết cho 5 Use Case (từ tìm kiếm đến tạo mindmap).
- Thiết kế cơ sở dữ liệu (Database).	- Đặc tả yêu cầu hệ thống.
- Bản thiết kế Database.
3	10/5 – 30/5	- Xây dựng khung hệ thống (Base source code).
- Triển khai các chức năng quản lý cơ bản: Đăng nhập, Tìm kiếm nâng cao.	- Hạ tầng Web hoạt động ổn định.
- Các chức năng quản lý tài liệu cơ bản được hoàn thiện.
4	31/5 – 15/6	- Tích hợp các module AI: Tóm tắt văn bản, Chatbot hỗ trợ truy vấn.
- Xây dựng thuật toán tạo Quiz tự động từ file tải lên.
- Xây dựng chức năng sinh Sơ đồ tư duy (Mindmap) từ tài liệu.	- Hệ thống tích hợp đầy đủ 5 tính năng thông minh.
- Các tính năng AI phản hồi chính xác theo dữ liệu đầu vào.
5	16/6 – 28/6	- Kiểm thử hệ thống (Unit Test, Integration Test) và sửa lỗi.
- Viết báo cáo đồ án chi tiết về quá trình xây dựng và kết quả đạt được.
- Chuẩn bị Slide thuyết trình bảo vệ.	- Website hoàn thiện, không lỗi nghiêm trọng.
- Quyển báo cáo đồ án hoàn chỉnh.
6	29/6 – 12/7	- Chỉnh sửa báo cáo theo góp ý của giáo viên hướng dẫn.
- Bảo vệ đồ án trước hội đồng.	- Bảo vệ thành công đồ án.

TÀI LIỆU THAM KHẢO
[1] OpenAI API Reference -  https://platform.openai.com/docs/api-reference
[2] Mermaid.js Live Editor & Docs - https://mermaid.js.org/syntax/mindmap.html
[3] A. Vaswani et al., "Attention is all you need," in Advances in Neural Information Processing Systems (NIPS), 2017, pp. 5998–6008. https://arxiv.org/pdf/1706.03762.pdf
[4] P. Lewis et al., "Retrieval-augmented generation for knowledge-intensive NLP tasks," in Proc. Advances in Neural Information Processing Systems, vol. 33, 2020, pp. 9459-9475.  https://arxiv.org/pdf/2005.11401.pdf
[5] W. X. Zhao et al., "A survey of large language models," arXiv preprint arXiv:2303.18223, 2023. [Online].  https://arxiv.org/pdf/2303.18223.pdf
[6] C. Zhang, “Automatic Generation of Multiple-Choice Questions,” Ph.D. dissertation, Dept. Comput. Sci., Univ. Massachusetts Lowell, Lowell, MA, 2022. https://arxiv.org/pdf/2303.14576
[7] D. Jurafsky và J. H. Martin, Speech and Language Processing: An Introduction to Natural Language Processing, Computational Linguistics, and Speech Recognition, 3rd ed. draft, Pearson, 2023. https://web.stanford.edu/~jurafsky/slp3/ed3book_jan26.pdf
[8] C. Raffel et al., "Exploring the limits of transfer learning with a unified text-to-text transformer," J. Mach. Learn. Res., 2020. https://arxiv.org/pdf/1910.10683.pdf
