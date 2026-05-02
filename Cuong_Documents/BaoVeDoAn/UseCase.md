Bảng mô tả Use Case:
# 1. UC01 – Đăng ký tài khoản:

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC01 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user tạo tài khoản bằng email cá nhân |
| Mức độ ưu tiên (Priority) | Bắt buộc (Quan trọng) |
| Điều kiện kích hoạt (Trigger) | User bấm vào “Đăng ký” |
| Điều kiện tiên quyết (Pre-condition) | - User chưa có tài khoản trong hệ thống.<br>- Email phải hợp lệ. |
| Điều kiện thành công (Post-condition) | - Tài khoản mới được lưu vào CSDL.<br>- Chuyển hướng user đến trang đăng nhập. |
| Điều kiện thất bại | - Tài khoản không được lưu vào CSDL.<br>- Email đã tồn tại trong hệ thống. |
| Luồng sự kiện chính (Basic Flow) | 1. User chọn “Đăng ký”<br>2. Hệ thống hiển thị form đăng ký với các trường: Họ và tên, Email, Password, Xác nhận lại Password.<br>3. User nhập thông tin:<br>- Họ và tên (bắt buộc)<br>- Email (bắt buộc)<br>- Password (bắt buộc)<br>- Xác nhận lại password (bắt buộc)<br>4. User bấm “Đăng ký”<br>5. Hệ thống kiểm tra dữ liệu:<br>- Xác nhận mật khẩu có khớp không? Nếu không, hiển thị thông báo lỗi.<br>- Email có tồn tại? Nếu có, hiển thị thông báo lỗi.<br>6. Hệ thống lưu tài khoản mới vào csdl. |
| Luồng sự kiện thay thế (Alternative Flow) | Không có |
| Luồng sự kiện ngoại lệ (Exception Flow) | 5a. Mật khẩu xác nhận không khớp: hệ thống yêu cầu nhập lại mật khẩu.<br>5b. Email đã tồn tại: hệ thống hiển thị thông báo lỗi.<br>6a. Hệ thống lỗi khi lưu dữ liệu: hệ thống hiển thị thông báo lỗi và yêu cầu thử lại. |
| Cơ sở dữ liệu | Bảng “users”:<br>- id: tự động tăng<br>- full_name: user vừa nhập<br>- email: user vừa nhập<br>- password_hash: mã hóa từ mật khẩu user nhập<br>- role: mặc định 'student'<br>- status: mặc định 'active' |

# 2. UC02 – Đăng nhập:

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC02 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user truy cập vào hệ thống để sử dụng các tính năng thông qua tài khoản đã đăng ký. |
| Mức độ ưu tiên (Priority) | Bắt buộc (Quan trọng) |
| Điều kiện kích hoạt (Trigger) | User bấm vào “Đăng nhập” |
| Điều kiện tiên quyết (Pre-condition) | - User đã có tài khoản hợp lệ trong hệ thống. |
| Điều kiện thành công (Post-condition) | - Thông tin user được lưu vào bộ nhớ tạm (Local Storage).<br>- Chuyển hướng user đến Trang chủ. |
| Điều kiện thất bại | - Xác thực thất bại.<br>- Hiển thị thông báo lỗi tương ứng. |
| Luồng sự kiện chính (Basic Flow) | 1. User chọn “Đăng nhập”<br>2. Hệ thống hiển thị form đăng nhập với các trường: Email, Mật khẩu, Checkbox (Ghi nhớ đăng nhập).<br>3. User nhập thông tin:<br>- Email (bắt buộc)<br>- Password (bắt buộc)<br>4. User bấm “Đăng nhập ngay”<br>5. Hệ thống gửi thông tin đến Server kiểm tra (`users` table):<br>- Kiểm tra Email và Mật khẩu (`password_hash`) có khớp trong CSDL không? Nếu khớp, lấy thông tin user.<br>6. Hệ thống lưu trạng thái đăng nhập vào Local Storage (`isLoggedIn = true` và dữ liệu `user`).<br>7. Hệ thống hiển thị thông báo thành công và chuyển hướng về Trang chủ (`/`). |
| Luồng sự kiện thay thế (Alternative Flow) | 3a. User có thể lựa chọn đăng nhập bằng bên thứ 3 (Google, Zalo). |
| Luồng sự kiện ngoại lệ (Exception Flow) | 5a. Email hoặc mật khẩu không chính xác: hệ thống hiển thị thông báo lỗi "Email hoặc mật khẩu không chính xác".<br>5b. Không thể kết nối server / lỗi hệ thống: hệ thống hiển thị thông báo lỗi và yêu cầu thử lại. |
| Cơ sở dữ liệu | Bảng “users”:<br>- id<br>- email<br>- full_name<br>- password_hash<br>- role<br>- avatar_url |

# 3. UC03 – Tìm kiếm tài liệu nâng cao:

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC03 |
| Tác nhân chính | User (Sinh viên / Khách truy cập) |
| Mục đích (mô tả) | Cho phép user tìm kiếm tài liệu thông qua từ khóa kết hợp với các bộ lọc chi tiết (ngành học, môn học, loại tài liệu, số sao, thời gian). |
| Mức độ ưu tiên (Priority) | Bắt buộc (Quan trọng) |
| Điều kiện kích hoạt (Trigger) | User truy cập vào trang Tìm kiếm nâng cao (`/advanced-search`) hoặc bấm "Áp dụng bộ lọc" / "Tìm kiếm". |
| Điều kiện tiên quyết (Pre-condition) | - Không yêu cầu đăng nhập. |
| Điều kiện thành công (Post-condition) | - Hệ thống trả về danh sách tài liệu khớp với các tiêu chí tìm kiếm.<br>- Hiển thị kết quả lên màn hình cho user. |
| Điều kiện thất bại | - Lỗi truy xuất cơ sở dữ liệu hoặc mất kết nối.<br>- Hiển thị thông báo lỗi. |
| Luồng sự kiện chính (Basic Flow) | 1. User truy cập màn hình Tìm kiếm nâng cao.<br>2. Hệ thống tự động tải danh sách các ngành học, môn học và hiển thị lên bộ lọc.<br>3. User nhập "Từ khóa tìm kiếm" (nếu có).<br>4. User chọn các bộ lọc mong muốn: Ngành học, Môn học, Loại tài liệu, Đánh giá tối thiểu, Thời gian cập nhật.<br>5. User bấm nút "Tìm kiếm" hoặc "Áp dụng bộ lọc".<br>6. Hệ thống phân tích tham số và gửi request đến Server (`GET /api/search/advanced`).<br>7. Server truy vấn CSDL dựa trên các điều kiện lọc và trả về dữ liệu.<br>8. Hệ thống render danh sách các tài liệu (Document Cards) lên giao diện. |
| Luồng sự kiện thay thế (Alternative Flow) | 3a. User bấm nút "Xóa bộ lọc": Hệ thống reset toàn bộ form về giá trị mặc định ("Tất cả").<br>8a. Nếu không có kết quả khớp: Hệ thống hiển thị thông báo "Chưa có kết quả tìm kiếm" và gợi ý thay đổi từ khóa/bộ lọc. |
| Luồng sự kiện ngoại lệ (Exception Flow) | 2a. Không tải được danh sách Ngành/Môn học: Bộ lọc dropdown sẽ bị trống, user vẫn tìm được bằng từ khóa.<br>7a. Lỗi khi truy vấn tài liệu: Hệ thống hiển thị thông báo "Có lỗi khi tìm kiếm. Vui lòng thử lại sau." |
| Cơ sở dữ liệu | Sử dụng hàm `searchDocumentsAdvanced` truy vấn các bảng:<br>- `documents` (Thông tin tài liệu cơ bản, loại tài liệu, ngày cập nhật)<br>- `subjects` (Môn học)<br>- `subject_groups` (Ngành học)<br>- Dữ liệu rating (số sao) |

# 4. UC04 – Trợ lý học tập AI (Chatbot Tutor):

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC04 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user trò chuyện với AI để hỏi đáp kiến thức, nhận giải thích học thuật và gợi ý tài liệu học tập chính xác dựa trên kho dữ liệu của trường. |
| Mức độ ưu tiên (Priority) | Bắt buộc (Quan trọng) |
| Điều kiện kích hoạt (Trigger) | User truy cập vào trang Chatbot (`/chatbot`) và gửi một câu hỏi. |
| Điều kiện tiên quyết (Pre-condition) | - User đã truy cập vào hệ thống. |
| Điều kiện thành công (Post-condition) | - AI trả về câu trả lời phù hợp kèm danh sách tài liệu tham khảo.<br>- Cuộc hội thoại được lưu vào lịch sử. |
| Điều kiện thất bại | - Mất kết nối mạng hoặc lỗi API AI.<br>- Hệ thống báo lỗi. |
| Luồng sự kiện chính (Basic Flow) | 1. User vào trang Chatbot. Giao diện hiển thị lời chào, tab gợi ý và lịch sử trò chuyện.<br>2. User nhập câu hỏi (hoặc chọn câu hỏi gợi ý) và bấm Gửi.<br>3. Hệ thống hiển thị tin nhắn của user, bật trạng thái "đang trả lời" và gửi request lên Server (`POST /api/chatbot`).<br>4. Server phân loại ý định câu hỏi (ACADEMIC, DISCOVERY, CASUAL) và trích xuất từ khóa.<br>5. Server tìm kiếm ngữ nghĩa (Vector Search qua Pinecone) để lấy nội dung tài liệu liên quan nhất.<br>6. Server gửi ngữ cảnh và câu hỏi cho mô hình AI (LLM) để sinh câu trả lời.<br>7. Hệ thống nhận dữ liệu luồng (Streaming) từ server và hiển thị dần câu trả lời lên màn hình.<br>8. Nếu có tài liệu liên quan, hệ thống hiển thị danh sách tài liệu bên dưới câu trả lời để user xem trước (Preview) hoặc tải xuống. |
| Luồng sự kiện thay thế (Alternative Flow) | - **Dừng tạo phản hồi**: User bấm nút "Dừng" (Stop) khi AI đang sinh câu trả lời, hệ thống lập tức ngắt luồng (Abort Stream). |
| Luồng sự kiện ngoại lệ (Exception Flow) | 5a. Không tìm thấy ngữ cảnh phù hợp: Chatbot báo lỗi "Chưa tìm thấy thông tin phù hợp" và gợi ý đổi từ khóa.<br>6a. Lỗi kết nối API / Lỗi server: Hệ thống thông báo lỗi hệ thống và hiển thị tin nhắn thất bại. |
| Cơ sở dữ liệu | Truy vấn dữ liệu từ các bảng và hệ thống:<br>- Cơ sở dữ liệu Vector (`Pinecone`) để tìm kiếm ngữ nghĩa.<br>- Bảng `chat_history` (Lưu câu hỏi, câu trả lời, tài liệu đính kèm, `user_id`).<br>- Bảng `documents`, `subjects` (Để lấy thông tin tài liệu liên quan). |

# 5. UC05 – Quản lý lịch sử trò chuyện AI:

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC05 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user xem lại các phiên trò chuyện cũ với AI, tải lại nội dung chat hoặc xóa lịch sử khi không cần thiết. |
| Mức độ ưu tiên (Priority) | Trung bình |
| Điều kiện kích hoạt (Trigger) | User chuyển sang tab "Lịch sử" trên màn hình Chatbot hoặc bấm nút xóa/tạo mới. |
| Điều kiện tiên quyết (Pre-condition) | - User đã đăng nhập hệ thống.<br>- User đã có ít nhất một cuộc trò chuyện với Chatbot trước đó. |
| Điều kiện thành công (Post-condition) | - Hệ thống hiển thị chính xác danh sách và nội dung lịch sử.<br>- Các thao tác xóa được cập nhật thành công vào cơ sở dữ liệu. |
| Điều kiện thất bại | - Lỗi kết nối máy chủ, không tải được danh sách hoặc không thể xóa dữ liệu. |
| Luồng sự kiện chính (Xem & Khôi phục) | 1. User ở màn hình Chatbot, bấm chọn tab "Lịch sử".<br>2. Hệ thống gửi yêu cầu lấy dữ liệu (`GET /api/chatbot/history`).<br>3. Hệ thống hiển thị danh sách các cuộc hội thoại cũ (gồm thời gian và nội dung rút gọn).<br>4. User bấm chọn một mục trong danh sách.<br>5. Hệ thống phân tích nội dung, khôi phục lại toàn bộ tin nhắn (câu hỏi, trả lời, tài liệu đính kèm) và hiển thị lên khung chat chính. |
| Luồng sự kiện thay thế (Xóa & Tạo mới) | - **Tạo mới và lưu**: User bấm "Tạo cuộc trò chuyện mới". Nếu phiên chat hiện tại có dữ liệu, hệ thống tự động lưu vào CSDL và làm trống khung chat.<br>- **Xóa 1 phiên chat**: User bấm icon Thùng rác cạnh một phiên chat -> Hệ thống xác nhận -> Xóa bản ghi trong CSDL và cập nhật lại giao diện.<br>- **Xóa toàn bộ lịch sử**: User bấm "Xóa hết" -> Hệ thống xác nhận -> Xóa toàn bộ dữ liệu lịch sử của user đó. |
| Luồng sự kiện ngoại lệ (Exception Flow) | 2a. Lỗi không tải được dữ liệu: Hệ thống hiển thị giao diện tải hoặc thông báo "Chưa có lịch sử hội thoại".<br>Xóa thất bại: Nếu server trả về lỗi khi xóa, bản ghi vẫn giữ nguyên trên giao diện. |
| Cơ sở dữ liệu | Bảng `chat_history`: thao tác `SELECT`, `INSERT`, `DELETE` dựa trên `user_id` và `id` của cuộc trò chuyện. |

# 6. UC06 – Tóm tắt tài liệu bằng AI:

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC06 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user tải lên tệp tài liệu cá nhân (PDF, DOCX) để AI đọc, phân tích và trích xuất ra một bản tóm tắt ngắn gọn. |
| Mức độ ưu tiên (Priority) | Bắt buộc (Quan trọng) |
| Điều kiện kích hoạt (Trigger) | User truy cập trang Tóm tắt (`/summarize`), tải file lên và bấm "Tóm tắt ngay". |
| Điều kiện tiên quyết (Pre-condition) | - User đã đăng nhập hệ thống.<br>- File tải lên phải đúng định dạng hỗ trợ (PDF, DOCX) và dưới giới hạn dung lượng (4.5 MB). |
| Điều kiện thành công (Post-condition) | - Hệ thống trả về bản tóm tắt văn bản và hiển thị lên màn hình.<br>- Bản tóm tắt được lưu vào cơ sở dữ liệu để phục vụ lịch sử. |
| Điều kiện thất bại | - Tệp quá lớn, sai định dạng hoặc lỗi kết nối đến API AI.<br>- Hiển thị thông báo lỗi. |
| Luồng sự kiện chính (Basic Flow) | 1. User truy cập trang "Tóm tắt tài liệu".<br>2. User kéo thả hoặc click chọn tệp tài liệu từ máy tính.<br>3. User tùy chỉnh cấu hình: Định dạng (Đoạn văn/Gạch đầu dòng), Độ dài (Thanh trượt %), Ngôn ngữ (Việt/Anh).<br>4. User bấm nút "Tóm tắt ngay".<br>5. Nếu là file PDF, hệ thống sẽ tự động trích xuất nội dung văn bản (text) ở phía Client để giảm tải.<br>6. Hệ thống gửi dữ liệu kèm các cấu hình lên Server (`POST /api/summarize`).<br>7. Server tổng hợp prompt và gửi cho mô hình AI (LLM) để thực hiện tóm tắt.<br>8. Sau khi có kết quả, Server lưu bản tóm tắt vào CSDL và trả về cho hệ thống.<br>9. Hệ thống hiển thị kết quả lên khung "Kết quả tóm tắt". User có thể đọc hoặc bấm "Sao chép". |
| Luồng sự kiện thay thế (Alternative Flow) | - **Xem trước tài liệu**: Sau khi chọn file, user có thể bấm "Xem tài liệu" để mở popup hiển thị nội dung file vừa tải lên.<br>- **Xóa file**: User bấm dấu "X" để hủy file đã chọn và bắt đầu lại. |
| Luồng sự kiện ngoại lệ (Exception Flow) | 2a. File vượt quá dung lượng (>4.5MB): Hệ thống chặn và báo lỗi yêu cầu cắt nhỏ tài liệu.<br>5a. Trích xuất text từ PDF thất bại hoặc văn bản quá dài: Hệ thống báo lỗi "Tài liệu quá dài (vượt quá 4.5MB chữ)".<br>7a. Lỗi Server / Timeout API AI: Quá trình xử lý dừng lại, thanh tiến trình (progress bar) biến mất và hiện thông báo lỗi hệ thống. |
| Cơ sở dữ liệu | Bảng `document_summaries`: Thêm bản ghi mới (INSERT) gồm `user_id`, `document_name`, `summary_text`, `summary_type`, `ai_model`. |

# 7. UC07 – Tạo bài kiểm tra trắc nghiệm (AI Quiz Generator):

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC07 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user tải lên tài liệu học tập để AI phân tích và tự động thiết kế một bộ câu hỏi trắc nghiệm (kèm giải thích chi tiết), giúp ôn luyện kiến thức thực hành. |
| Mức độ ưu tiên (Priority) | Bắt buộc (Quan trọng) |
| Điều kiện kích hoạt (Trigger) | User truy cập trang `/quiz`, tải file lên và bấm nút "Tạo câu hỏi". |
| Điều kiện tiên quyết (Pre-condition) | - Tệp tin hợp lệ (PDF, DOCX, TXT) và có dung lượng không vượt quá 4.5MB.<br>- Tệp tin phải chứa đủ nội dung văn bản (> 100 ký tự). |
| Điều kiện thành công (Post-condition) | - AI trả về danh sách các câu hỏi trắc nghiệm.<br>- User có thể làm bài trực tiếp trên giao diện tương tác và xem điểm số. |
| Điều kiện thất bại | - Lỗi phân tích văn bản (chữ trong ảnh/PDF scan) hoặc lỗi kết nối máy chủ AI.<br>- Hệ thống báo lỗi không tạo được câu hỏi. |
| Luồng sự kiện chính (Basic Flow) | 1. User truy cập trang "Tạo Quiz". Giao diện ban đầu hiển thị ô tải lên tài liệu.<br>2. User tải file lên và bấm "Tạo câu hỏi".<br>3. Hệ thống hiển thị hiệu ứng tải (Progress bar). Nếu là PDF, hệ thống trích xuất text phía Client.<br>4. Hệ thống gửi text hoặc file lên Server (`POST /api/quiz/generate`).<br>5. Server (dùng mammoth cho DOCX, client text cho PDF) bóc tách dữ liệu và gọi API AI để sinh ra cấu trúc câu hỏi JSON.<br>6. Hệ thống nhận kết quả, chuyển sang giao diện "Làm bài" (Playing state) và hiển thị câu số 1.<br>7. User đọc câu hỏi, tick chọn đáp án và bấm "Xác nhận".<br>8. Hệ thống đánh giá (xanh/đỏ), cộng điểm nếu đúng và hiển thị phần "Giải thích chi tiết".<br>9. User lặp lại thao tác cho đến hết bộ câu hỏi.<br>10. Giao diện chuyển sang màn hình "Kết quả" hiển thị điểm số tổng. |
| Luồng sự kiện thay thế (Alternative Flow) | - **Xem trước tài liệu**: Trước khi tạo Quiz, user có thể bấm "Xem tài liệu" để đọc lại nội dung file.<br>- **Xem lại câu cũ**: Trong/sau quá trình làm bài, user bấm vào các ô số (1, 2, 3...) ở cột Tiến độ bên phải để xem lại đáp án & giải thích của những câu đã làm.<br>- **Làm lại bài**: Ở màn hình kết quả, user bấm "Làm lại bài này", hệ thống reset điểm số và trạng thái câu hỏi về 0. |
| Luồng sự kiện ngoại lệ (Exception Flow) | 2a. File vượt quá 4.5MB: Hệ thống chặn tải lên và báo lỗi dung lượng.<br>5a. Nội dung file quá ngắn: Server trả về lỗi "File không đủ nội dung để tạo quiz".<br>6a. AI không tạo được format câu hỏi hợp lệ: Hệ thống bắt lỗi và hiển thị thông báo "Không thể tạo câu hỏi từ tài liệu này". |
| Cơ sở dữ liệu | Tính năng xử lý theo thời gian thực (Real-time), dữ liệu câu hỏi được lưu tạm trên bộ nhớ giao diện (RAM), không lưu trữ vào CSDL Database cố định. |

# 8. UC08 – Chuyển đổi tài liệu thành Sơ đồ tư duy (Mindmap Generator):

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC08 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user tải lên tài liệu học tập (PDF, DOCX), AI sẽ tự động phân tích dàn ý và tạo ra một bản đồ tư duy (Mindmap) trực quan. User có thể xuất (Export) sơ đồ ra ảnh/PDF. |
| Mức độ ưu tiên (Priority) | Bắt buộc (Quan trọng) |
| Điều kiện kích hoạt (Trigger) | User truy cập trang `/mindmap`, chọn tải file lên và bấm "Tạo sơ đồ". |
| Điều kiện tiên quyết (Pre-condition) | - Tệp tin hợp lệ (PDF, DOCX) và dưới 4.5MB. |
| Điều kiện thành công (Post-condition) | - Hệ thống render thành công Sơ đồ tư duy lên màn hình.<br>- User có thể xuất (Download) Mindmap ra ảnh hoặc PDF. |
| Điều kiện thất bại | - Tệp không chứa văn bản hợp lệ hoặc lỗi API AI.<br>- Hệ thống báo lỗi và hủy quá trình. |
| Luồng sự kiện chính (Basic Flow) | 1. User truy cập trang Mindmap. Hệ thống hiển thị giao diện tải tài liệu.<br>2. User tải file lên và bấm "Tạo sơ đồ".<br>3. Hệ thống hiển thị thanh Progress Bar. Nếu là PDF, hệ thống trích xuất văn bản trực tiếp từ Client.<br>4. Hệ thống gọi API (`POST /api/mindmap/extract`) để chuẩn hóa text.<br>5. Hệ thống gửi phần chữ đã chuẩn hóa lên Server (`POST /api/mindmap/generate`).<br>6. Server gửi lệnh cho mô hình AI (LLM) để phân tích ý chính, xây dựng cây thư mục (JSON Node).<br>7. Hệ thống nhận dữ liệu Node và vẽ lên giao diện Sơ đồ tư duy (Mindmap Viewer).<br>8. User xem, phóng to, thu nhỏ và kéo thả trên sơ đồ.<br>9. User bấm nút "Download", hệ thống tự động render Sơ đồ thành định dạng ảnh (PNG/JPG) hoặc tệp tin (PDF) và tải xuống máy tính. |
| Luồng sự kiện thay thế (Alternative Flow) | - **Xem trước tài liệu**: User bấm "Xem tài liệu" để mở popup đọc trực tiếp nội dung file vừa tải lên. |
| Luồng sự kiện ngoại lệ (Exception Flow) | 2a. Dung lượng file > 4.5MB: Hệ thống chặn ngay lập tức và báo lỗi dung lượng.<br>4a. Trích xuất văn bản thất bại: Hệ thống báo lỗi "Không thể trích xuất nội dung từ tài liệu".<br>6a. AI không thể tạo cấu trúc: Server trả về lỗi, giao diện hiện thông báo "Không thể tạo tài liệu, vui lòng thử lại" màu đỏ. |
| Cơ sở dữ liệu | Cấu trúc Mindmap (JSON) được tạo realtime và quản lý thông qua luồng State của giao diện. |

# 9. UC09 – Chỉnh sửa Sơ đồ tư duy (Edit Mindmap):

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC09 |
| Quan hệ | **Extend** từ UC08 (Chuyển đổi tài liệu thành Sơ đồ tư duy) |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user tùy biến, thay đổi nội dung chữ (text) của các node trên Sơ đồ tư duy sau khi AI đã tạo xong để sơ đồ chính xác và đúng ý muốn hơn. |
| Mức độ ưu tiên (Priority) | Trung bình |
| Điều kiện kích hoạt (Trigger) | User click đúp (double click) vào một ô chữ (Node) bất kỳ trên Sơ đồ đang hiển thị. |
| Điều kiện tiên quyết (Pre-condition) | - User đang ở màn hình UC08 và Sơ đồ tư duy đã được khởi tạo, hiển thị thành công trên màn hình. |
| Điều kiện thành công (Post-condition) | - Nội dung Node được cập nhật ngay lập tức trên giao diện.<br>- Hệ thống lưu trạng thái mới thành công lên Server. |
| Điều kiện thất bại | - Mất kết nối internet khi đang gửi yêu cầu lưu dữ liệu lên Server. |
| Luồng sự kiện chính (Basic Flow) | 1. Sơ đồ tư duy đang hiển thị trên giao diện (Mindmap Viewer).<br>2. User click đúp chuột vào một Node cần chỉnh sửa.<br>3. Hệ thống chuyển Node đó thành dạng ô nhập liệu (Input field).<br>4. User nhập nội dung mới.<br>5. User bấm phím `Enter` hoặc click chuột ra ngoài (blur) để xác nhận hoàn tất.<br>6. Hệ thống cập nhật lại text trên cây giao diện (căn chỉnh lại kích thước Sơ đồ nếu text quá dài).<br>7. Hệ thống tự động gửi request ngầm (`POST /api/mindmap/edit`) chứa bộ dữ liệu Node mới để lưu trạng thái lên Server. |
| Luồng sự kiện thay thế (Alternative Flow) | - **Hủy chỉnh sửa**: Trong lúc đang gõ văn bản ở bước 4, user có thể xóa hết chữ rồi bấm ra ngoài để giữ nguyên gốc (hoặc bấm `Esc`). |
| Luồng sự kiện ngoại lệ (Exception Flow) | 7a. Lỗi lưu cấu trúc Node lên Server: Hệ thống bắt lỗi mạng và có thể hiển thị cảnh báo console (Save failed), tuy nhiên trạng thái giao diện UI tạm thời vẫn giữ được nội dung text mới cho user thao tác tiếp. |
| Cơ sở dữ liệu | Cập nhật cấu trúc JSON thông qua API Edit (`/api/mindmap/edit`), sử dụng cấu trúc lưu trữ database document (MongoDB/JSON type) hoặc bộ nhớ tạm tùy cơ chế backend thực tế. |

# 10. UC10 – Đánh giá tài liệu (Review Document):

| Thuộc tính | Mô tả |
|---|---|
| Tên use case | UC10 |
| Tác nhân chính | User (Sinh viên) |
| Mục đích (mô tả) | Cho phép user viết bình luận và chấm điểm (1-5 sao) cho một tài liệu học tập, nhằm chia sẻ mức độ hữu ích của tài liệu đó cho cộng đồng. |
| Mức độ ưu tiên (Priority) | Trung bình |
| Điều kiện kích hoạt (Trigger) | User truy cập trang Chi tiết tài liệu (`/document/[id]`), bấm "Viết đánh giá" và gửi form. |
| Điều kiện tiên quyết (Pre-condition) | - Tài liệu phải tồn tại trong hệ thống. |
| Điều kiện thành công (Post-condition) | - Đánh giá được lưu thành công vào cơ sở dữ liệu.<br>- Giao diện tự động chuyển hướng và bôi sáng (highlight) đánh giá vừa gửi. |
| Điều kiện thất bại | - Không chọn số sao (rating) hoặc lỗi mạng.<br>- Đánh giá không được lưu. |
| Luồng sự kiện chính (Basic Flow) | 1. User đang xem chi tiết một tài liệu. Ở góc phải (hoặc dưới), user bấm nút "Viết đánh giá".<br>2. Hệ thống mở một hộp thoại (Popup Dialog) hiển thị khung chọn số sao và ô nhập bình luận.<br>3. User click chọn số sao tương ứng (từ 1 đến 5 sao) và nhập nội dung bình luận (không bắt buộc).<br>4. User bấm "Gửi đánh giá".<br>5. Hệ thống gửi thông tin (rating, comment, user_id, document_id) lên Server qua API (`POST /api/documents/[id]/review`).<br>6. Server kiểm tra tính hợp lệ của mức sao (1-5), sau đó INSERT bản ghi mới vào CSDL.<br>7. Sau khi nhận phản hồi thành công, hệ thống tải lại trang với tham số URL `?tab=reviews&highlight=true`.<br>8. Giao diện tự động chuyển qua tab "Đánh giá" và hiển thị bình luận mới nhất lên đầu tiên, được bôi sáng màu xanh lá kèm nhãn "Vừa gửi" (hiệu ứng Highlight). |
| Luồng sự kiện thay thế (Alternative Flow) | - **Hủy bỏ đánh giá**: Trong lúc nhập liệu trên hộp thoại, user bấm dấu "X" hoặc click ra ngoài viền hộp thoại để đóng popup. Hệ thống không lưu bất kỳ thay đổi nào. |
| Luồng sự kiện ngoại lệ (Exception Flow) | 6a. Thông tin thiếu hoặc sai định dạng: Nếu user chưa chọn sao (rating < 1), Server trả về lỗi 400 "Rating must be between 1 and 5". Hệ thống báo lỗi yêu cầu chọn sao.<br>6b. Lỗi kết nối Server: Server trả lỗi 500 (Internal Server Error), hộp thoại hiển thị lỗi không thể gửi đánh giá lúc này. |
| Cơ sở dữ liệu | Bảng `document_reviews`: Thêm bản ghi mới (INSERT) bao gồm các trường `document_id`, `user_id`, `rating` (số nguyên), `comment` (văn bản) và `created_at`. |
