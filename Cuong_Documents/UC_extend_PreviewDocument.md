# Tài liệu Đặc tả Use Case: Xem trước tài liệu (Preview Document)

## 1. Tổng quan
- **Tên Use Case:** Xem trước tài liệu (Preview PDF, DOCX)
- **Tác nhân (Actor):** Người dùng hệ thống (Sinh viên, Giảng viên,...)
- **Mục đích:** Cho phép người dùng xem nhanh nội dung của tài liệu (PDF hoặc Word .docx) ngay trong popup trên trình duyệt mà không cần phải tải file về máy hay mở bằng phần mềm riêng biệt. Điều này áp dụng trên các trang như Mindmap Generator hay Summarize AI.

---

## 2. Luồng nghiệp vụ cơ bản (Use Case Flow)
1. Người dùng bấm nút **Tải file lên** (Kéo thả hoặc chọn file từ máy tính). Hệ thống chỉ chấp nhận file định dạng `.pdf` và `.docx`.
2. File sẽ được lưu trữ tạm thời trên bộ nhớ đệm (RAM) của trình duyệt. 
3. Người dùng bấm nút **"Xem tài liệu"** (có biểu tượng con mắt).
4. Hệ thống mở lên một hộp thoại (Modal/Popup) hiển thị khung đọc tài liệu.
   - **Nếu là PDF:** Trình duyệt sử dụng công cụ đọc PDF mặc định để hiển thị tài liệu với độ nét và bố cục hoàn hảo 100%.
   - **Nếu là DOCX:** Trình duyệt tự động phân tích mã XML của Word và vẽ lại cấu trúc (chữ, màu sắc, căn lề, bảng biểu) lên thành một trang hiển thị giống trang giấy A4.
5. Người dùng có thể đọc file, cuộn trang, hoặc bấm nút **"Mở trong tab mới"** để đọc ở màn hình lớn hơn.

---

## 3. Thách thức kỹ thuật và Cách giải quyết (Thuật toán)

Trước khi đi vào code, ta cần hiểu vấn đề lớn nhất khi xử lý file DOCX trên Web, đặc biệt khi dự án được *Deploy (triển khai) lên Vercel*.

### **Vấn đề khó khăn:**
- Trình duyệt web có sẵn công cụ cực mạnh để hiển thị PDF (vì PDF lưu vị trí tĩnh), nhưng lại **hoàn toàn không hiểu file Word (DOCX)** (vì DOCX là layout động, yêu cầu phần mềm siêu khủng như MS Word để dịch).
- Phương pháp cũ: Gửi file DOCX lên Server, nhờ *Microsoft Word* hoặc *LibreOffice* trên server convert hộ sang file PDF rồi gửi về. -> **THẤT BẠI TRÊN VERCEL** vì máy chủ serverless của Vercel giới hạn dung lượng siêu nhỏ, cấm cài phần mềm thứ 3 và cấm ghi file vào ổ cứng máy tính.
- Phương pháp cũ 2: Tải file lên host ảo và nhờ *Google Docs Viewer* đọc. -> **THẤT BẠI Ở LOCALHOST** vì server Google không thể thò tay vào máy tính cá nhân ở `localhost` để lấy file.

### **Thuật toán & Giải pháp hiện tại (Tuyệt đối tối ưu):**
Chúng ta áp dụng giải pháp **"Client-side Rendering hoàn toàn"** (Vẽ tài liệu 100% bằng sức mạnh trình duyệt của người dùng).
1. Thư viện `docx-preview` có khả năng đọc cấu trúc file Word và biến chúng thành các thẻ HTML/CSS tương ứng.
2. Tuy nhiên, thay vì phải cài gói NPM phức tạp làm nặng bộ máy, ta sẽ kết nối thẳng thư viện này qua các link CDN miễn phí (mạng phân phối nội dung lưu trữ đám mây).
3. Ta tạo thủ công một chuỗi **HTML ẩn (ảo)** (chứa mã kết nối `docx-preview` và CSS căn lề giả lập tờ giấy A4). 
4. Ta nén chuỗi HTML trên cũng như tài liệu của người dùng thành các khoảnh khắc lưu trữ **Object URL (Blob)** (Siêu tốc, tốn 0 chi phí API).
5. Gắn Object URL đó vào thẻ `<iframe />` để trình duyệt hiểu lầm đó là một trang web độc lập, qua đó hiển thị cực kỳ an toàn.

---

## 4. Giải thích từng bước Code chi tiết

### Bước 1: Hệ thống kiểm tra loại file
Mọi luồng bắt đầu tại hàm `handleOpenPreview`. Đầu tiên hệ thống tự chia nhánh xem người dùng đăng tải file định dạng nào.
```typescript
const fileName = selectedFile.name.toLowerCase();
const isPdf = selectedFile.type === "application/pdf" || fileName.endsWith(".pdf");
const isDocx = selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx");
```

### Bước 2: Hiển thị nếu là PDF (Cực kỳ đơn giản)
Đối với PDF, vì tất cả trình duyệt đều hỗ trợ sẵn, ta chỉ việc hô biến file đang ngậm trong RAM thành một đường link nội bộ (blob url) và truyền thẳng cho thẻ Iframe.
```typescript
if (isPdf) {
  // Hàm tạo ra 1 đường link giả lập chứa toàn bộ dung lượng file pdf
  // Link có dạng: blob:http://localhost:3000/1234-abcd...
  const objectUrl = URL.createObjectURL(selectedFile);
  
  // Lưu link vào biến, thẻ IFrame bên dưới giao diện tự động bắt link và bắt đầu chiếu pdf
  setPreviewUrl(objectUrl);
  return;
}
```

### Bước 3: Thuật toán ảo hóa Iframe với DOCX
Đây là nơi thuật toán thông minh được diễn ra. Do không thể chạy thư viện docx thông thường, ta tự đi viết một trang web HTML (String) thu nhỏ để nhúng vào Iframe.

```typescript
if (isDocx) {
  // Tương tự, lập 1 đường link chứa file docx gốc
  const docxUrl = URL.createObjectURL(selectedFile);
  
  // Viết thuần 1 cục code trang web HTML ảo
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Xem trước DOCX</title>
        <!-- Import 2 thư viện jszip (để giải nén file) và docx-preview qua CDN mở -->
        <script src="https://unpkg.com/jszip/dist/jszip.min.js"></script>
        <script src="https://unpkg.com/docx-preview/dist/docx-preview.min.js"></script>
        
        <!-- CSS giả lập nền nhám màu xám và trang giấy trắng ở giữa -->
        <style>
            body { background: #e2e8f0; display: flex; flex-direction: column; align-items: center; }
            #container { width: 100%; max-width: 900px; margin: 20px auto; } /* Khung tờ giấy A4 */
            .loading { margin-top: 50px; text-align: center; }
        </style>
    </head>
    <body>
        <div id="loading" class="loading">Đang tải và định dạng tài liệu...</div>
        <div id="container"></div>

        <script>
            // Trang web ảo này gọi hàm fetch tải file từ đường link blob ở bên ngoài vào trong
            fetch("${docxUrl}")
                .then(res => res.blob())
                .then(blob => {
                    const options = {
                        inWrapper: true, 
                        breakPages: true, // Ép trình duyệt ngắt trang hệt như word
                        useBase64URL: false
                    };
                    // Ra lệnh cho thư viện nhả file đã phân tích vào vùng <div id="container">
                    return docx.renderAsync(blob, document.getElementById("container"), null, options);
                })
                .then(() => {
                    // Khi vẽ xong, tắt chữ "Đang tải"
                    document.getElementById("loading").style.display = 'none';
                })
        </script>
    </body>
    </html>
  `;
```

### Bước 4: Đẩy cục HTML hiển thị cho người xem
Ở trên ta mới chỉ có một "chuỗi chữ HTML". Giờ ta cũng phải phù phép nó thành một Đường link URL giống hệt PDF.
```typescript
  // Đóng gói mớ chữ html kia thành một file nhị phân báo hệ thống biết đây là loại text/html
  const blob = new Blob([html], { type: "text/html; charset=utf-8" });
  
  // Tạo đường link từ khối html đó
  const objectUrl = URL.createObjectURL(blob);
  
  // Gán cho trình diện Iframe, Iframe sẽ đọc đường link HTML này, HTML này chạy Javascript kéo file liên kết docxURL vào -> ra trang xem trước.
  setPreviewUrl(objectUrl);
  return;
}
```

### Tổng kết Ưu điểm của kiến trúc này:
1. **0% lỗi server & Tương thích 100% Vercel:** Vì thao tác diễn ra 100% trên thẻ Iframe ở máy người dùng, Server hoàn toàn không cần nhúng tay vào, không có khái niệm ghi file thất bại.
2. **Siêu tốc:** Không một byte dữ liệu nào bị upload hay download xuống thông qua mạng Internet. Chuỗi URL Blob móc trực tiếp vào RAM của máy tính.
3. **Thẩm mỹ cao & Dễ bảo trì:** Bố cục được giả mạo như tờ giấy A4. Khi bảo trì chỉ cần thay đổi cục HTML rất tường minh nhanh chóng.
