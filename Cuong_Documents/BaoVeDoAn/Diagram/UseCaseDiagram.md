flowchart LR
    %% Định nghĩa Tác nhân (Actor)
    User([Khách truy cập / Sinh viên])

    %% Khối hệ thống
    subgraph Hệ thống TLU Document
        direction TB
        UC01([UC01: Đăng ký tài khoản])
        UC02([UC02: Đăng nhập])
        UC03([UC03: Tìm kiếm tài liệu nâng cao])
        UC04([UC04: Trợ lý học tập AI - Chatbot])
        UC05([UC05: Quản lý lịch sử trò chuyện AI])
        UC06([UC06: Tóm tắt tài liệu bằng AI])
        UC07([UC07: Tạo bài kiểm tra trắc nghiệm AI])
        UC08([UC08: Chuyển đổi tài liệu thành Sơ đồ tư duy])
        UC09([UC09: Chỉnh sửa Sơ đồ tư duy])
        UC10([UC10: Đánh giá tài liệu])
    end

    %% Các tương tác của Actor với Use Case
    User --> UC01
    User --> UC02
    User --> UC03
    User --> UC04
    User --> UC05
    User --> UC06
    User --> UC07
    User --> UC08
    User --> UC10

    %% Quan hệ giữa các Use Case (Extend, Include)
    UC09 -.->|<< extend >>| UC08