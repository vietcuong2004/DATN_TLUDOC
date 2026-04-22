# Tài liệu mô tả tính năng hệ thống web tài liệu học tập tích hợp AI

## 1. Tổng quan
Hệ thống là một nền tảng web hỗ trợ người học tìm kiếm, đọc hiểu, tóm tắt và khai thác tài liệu học tập bằng các công cụ AI. Các chức năng chính tập trung vào năm luồng nghiệp vụ: tìm kiếm tài liệu, tóm tắt nội dung, chatbot tư vấn học tập, tạo quiz và tạo sơ đồ tư duy.

## 2. Tính năng tìm kiếm và lọc nâng cao (UC1)

### Mục đích
Cho phép người dùng tìm nhanh đúng tài liệu cần thiết trong kho dữ liệu lớn thông qua từ khóa và bộ lọc chi tiết.

### Tác nhân
- Người dùng chưa đăng nhập
- Người dùng đã đăng nhập

### Tiền điều kiện
- Kho tài liệu đã có dữ liệu
- Hệ thống đã lập chỉ mục thông tin cơ bản của tài liệu

### Luồng xử lý
1. Người dùng nhập từ khóa vào ô tìm kiếm hoặc mở bộ lọc nâng cao.
2. Người dùng chọn một hoặc nhiều tiêu chí như ngành học, môn học, loại tài liệu, định dạng file, số trang, mức đánh giá và thời gian cập nhật.
3. Hệ thống tiếp nhận toàn bộ điều kiện tìm kiếm và chuẩn hóa tham số truy vấn.
4. Hệ thống truy vấn cơ sở dữ liệu để lấy các tài liệu thỏa mãn đồng thời các điều kiện đã chọn.
5. Hệ thống sắp xếp kết quả theo mức độ phù hợp, thời gian cập nhật hoặc tiêu chí mặc định.
6. Hệ thống hiển thị danh sách kết quả kèm thông tin tóm tắt như tên tài liệu, mô tả ngắn, lượt xem, lượt tải và ngày cập nhật.
7. Người dùng chọn một tài liệu để xem chi tiết, thêm vào thư viện cá nhân, tải xuống hoặc lưu đọc sau.

### Luồng thay thế
- Nếu không có kết quả phù hợp, hệ thống hiển thị thông báo không tìm thấy và gợi ý người dùng nới rộng bộ lọc.
- Nếu người dùng chỉ nhập từ khóa mà không chọn bộ lọc, hệ thống thực hiện tìm kiếm toàn văn theo từ khóa.

### Kết quả đầu ra
Danh sách tài liệu phù hợp với truy vấn của người dùng.

## 3. Tóm tắt nội dung tài liệu bằng AI (UC2)

### Mục đích
Giúp người dùng nắm ý chính của tài liệu một cách nhanh chóng, giảm thời gian đọc và hỗ trợ ôn tập hiệu quả.

### Tác nhân
- Người dùng đã đăng nhập

### Tiền điều kiện
- Tài liệu ở trạng thái hợp lệ
- Hệ thống có quyền đọc nội dung tài liệu hoặc nhận được file do người dùng tải lên

### Luồng xử lý
1. Người dùng chọn một tài liệu từ thư viện cá nhân hoặc tải file mới lên hệ thống.
2. Hệ thống kiểm tra định dạng file và khả năng đọc nội dung.
3. Hệ thống xác nhận tài liệu đủ điều kiện để xử lý tóm tắt.
4. Người dùng chọn kiểu tóm tắt mong muốn, gồm dạng đoạn văn hoặc dạng gạch đầu dòng.
5. Hệ thống gửi nội dung đã được tiền xử lý đến dịch vụ AI để phân tích và tạo bản tóm tắt.
6. Hệ thống nhận kết quả, chuẩn hóa lại bố cục và hiển thị nội dung tóm tắt trên giao diện.
7. Người dùng có thể sao chép nội dung và lưu lại để phục vụ việc học tập.

### Luồng thay thế
- Nếu file không hợp lệ hoặc không hỗ trợ, hệ thống yêu cầu người dùng chọn lại tài liệu khác.
- Nếu dịch vụ AI trả lỗi, hệ thống thông báo không thể tạo tóm tắt và cho phép thử lại.

### Kết quả đầu ra
Bản tóm tắt ngắn gọn, dễ đọc và có thể tái sử dụng cho học tập.

## 4. Chatbot Tutor hỗ trợ tìm tài liệu và tư vấn học tập(UC3)

### Mục đích
Đóng vai trò trợ lý học thuật thông minh, vừa trả lời câu hỏi, vừa gợi ý tài liệu liên quan dựa trên dữ liệu thật trong kho học liệu.

### Tác nhân
- Người dùng đã đăng nhập

### Tiền điều kiện
- Hệ thống chatbot đã được kết nối với nguồn dữ liệu tài liệu
- Kho tài liệu có nội dung đủ để truy xuất và trích dẫn

### Luồng xử lý
1. Người dùng nhập câu hỏi, yêu cầu giải thích, hoặc yêu cầu tìm tài liệu qua giao diện chat.
2. Hệ thống phân tích câu hỏi để xác định mục tiêu: giải thích khái niệm, tìm ví dụ, tìm bài tập hay tìm tài liệu tham khảo.
3. Hệ thống trích xuất từ khóa và tạo truy vấn ngữ cảnh phù hợp.
4. Hệ thống thực hiện truy xuất theo cơ chế RAG để lấy các đoạn nội dung liên quan nhất từ kho tài liệu.
5. AI tổng hợp dữ liệu truy xuất và diễn giải lại theo ngữ cảnh câu hỏi của người dùng.
6. Hệ thống trả về câu trả lời hoàn chỉnh, kèm các tài liệu liên quan hoặc nguồn tham khảo.
7. Người dùng có thể tiếp tục đặt câu hỏi tiếp theo trong cùng một phiên chat để duy trì ngữ cảnh.
8. Hệ thống lưu lịch sử hội thoại để người dùng xem lại sau này.

### Luồng thay thế
- Nếu không tìm được dữ liệu liên quan, hệ thống trả lời theo kiến thức tổng quát và thông báo rằng chưa có tài liệu phù hợp trong kho.
- Nếu câu hỏi quá ngắn hoặc mơ hồ, hệ thống yêu cầu người dùng bổ sung thông tin để trả lời chính xác hơn.

### Kết quả đầu ra
Câu trả lời có ngữ cảnh, kèm gợi ý tài liệu và lịch sử hội thoại.

## 5. Tạo quiz trắc nghiệm tự động từ tài liệu (UC4)

### Mục đích
Chuyển nội dung tài liệu thành bộ câu hỏi trắc nghiệm để người dùng tự kiểm tra mức độ hiểu bài.

### Tác nhân
- Người dùng đã đăng nhập

### Tiền điều kiện
- Tài liệu đầu vào hợp lệ và có đủ nội dung để sinh câu hỏi

### Luồng xử lý
1. Người dùng tải file cần ôn tập lên hệ thống.
2. Hệ thống đọc và tiền xử lý nội dung tài liệu.
3. AI phân tích văn bản để nhận diện các đoạn có khả năng sinh câu hỏi, các khái niệm quan trọng và các ý chính.
4. Hệ thống sinh ra danh sách câu hỏi trắc nghiệm, mỗi câu gồm nội dung câu hỏi, bốn phương án lựa chọn và đáp án đúng.
5. Người dùng làm bài trực tiếp trên giao diện web.
6. Hệ thống chấm điểm tự động sau khi người dùng nộp bài.
7. Kết quả được hiển thị gồm điểm số, câu đúng/sai, đáp án đúng và phần giải thích chi tiết.
8. Hệ thống lưu tiến độ học tập để phục vụ việc ôn tập về sau.

### Luồng thay thế
- Nếu tài liệu không đủ nội dung hoặc chất lượng văn bản thấp, hệ thống giảm số lượng câu hỏi hoặc thông báo không đủ dữ liệu để tạo quiz.
- Nếu AI không sinh được bộ câu hỏi đạt chất lượng, hệ thống cho phép tạo lại từ đầu.

### Kết quả đầu ra
Bộ quiz trắc nghiệm hoàn chỉnh và kết quả chấm điểm tự động.

## 6. Tạo sơ đồ tư duy tự động(UC5)

### Mục đích
Biến tài liệu thành sơ đồ tư duy trực quan để người dùng dễ nắm cấu trúc kiến thức và ghi nhớ nhanh hơn.

### Tác nhân
- Người dùng đã đăng nhập

### Tiền điều kiện
- Tài liệu đầu vào hợp lệ
- Hệ thống có module render mindmap từ dữ liệu JSON dạng cây

### Luồng xử lý
1. Người dùng chọn một tài liệu để tạo sơ đồ tư duy.
2. Hệ thống kiểm tra khả năng đọc và phân tích nội dung của tài liệu.
3. AI phân tích nội dung để xác định chủ đề chính, chủ đề phụ và các mối quan hệ cha - con giữa các ý.
4. Hệ thống chuẩn hóa kết quả phân tích thành dữ liệu JSON dạng cây (tree) gồm node cha - con.
5. Frontend nhận JSON và render thành sơ đồ tư duy trực quan ngay trên trình duyệt.
6. Người dùng có thể mở rộng hoặc thu gọn các nhánh, xem lại từng phần nội dung và tùy chỉnh cách hiển thị.
7. Người dùng có thể xuất sơ đồ ra PNG hoặc PDF để lưu trữ hoặc chia sẻ.

### Luồng thay thế
- Nếu AI trả dữ liệu JSON không hợp lệ hoặc thiếu cấu trúc, hệ thống thông báo không thể dựng sơ đồ và cho phép tạo lại.

### Kết quả đầu ra
Một sơ đồ tư duy trực quan, có cấu trúc rõ ràng và có thể xuất file.

## 7. Kết luận
Tài liệu này mô tả các luồng chức năng chính của hệ thống theo hướng nghiệp vụ, tập trung vào mục tiêu, điều kiện đầu vào, bước xử lý chính, nhánh ngoại lệ và kết quả đầu ra. Cấu trúc này giúp việc đọc hiểu, phát triển và kiểm thử chức năng trở nên rõ ràng hơn.