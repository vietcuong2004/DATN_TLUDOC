export type Course = {
  code: string
  name: string
}

export type CurriculumGroup = {
  group: string
  courses: Course[]
}

export const curriculumGroups: CurriculumGroup[] = [
  {
    group: "Khoa học tự nhiên và tin học",
    courses: [
      { code: "MATH111", name: "Giải tích hàm một biến" },
      { code: "MATH122", name: "Giải tích hàm nhiều biến" },
      { code: "MATH254", name: "Xác suất thống kê" },
      { code: "MATH333", name: "Đại số tuyến tính" },
      { code: "CSE111", name: "Nhập môn lập trình" },
    ],
  },
  {
    group: "Kiến thức cơ sở khối ngành",
    courses: [
      { code: "CSE204", name: "Lập trình Python" },
      { code: "CSE205", name: "Lập trình nâng cao" },
      { code: "CSE213", name: "Toán rời rạc" },
      { code: "CSE224", name: "Nguyên lý lập trình hướng đối tượng" },
      { code: "CSE281", name: "Cấu trúc dữ liệu và giải thuật" },
      { code: "CSE290", name: "Tiếng Anh chuyên ngành công nghệ thông tin" },
      { code: "CSE311", name: "Linux và phần mềm mã nguồn mở" },
      { code: "CSE370", name: "Kiến trúc máy tính" },
      { code: "CSE391", name: "Nền tảng phát triển Web" },
      { code: "CSE480", name: "Phân tích và thiết kế hệ thống thông tin" },
      { code: "CSE481", name: "Công nghệ phần mềm" },
      { code: "CSE484", name: "Cơ sở dữ liệu" },
      { code: "CSE489", name: "Mạng máy tính" },
      { code: "CSE492", name: "Trí tuệ nhân tạo" },
    ],
  },
  {
    group: "Kiến thức cơ sở ngành",
    courses: [
      { code: "CSE284", name: "Lập trình Java" },
      { code: "CSE376", name: "Lý thuyết tính toán" },
      { code: "CSE387", name: "An toàn và bảo mật thông tin" },
      { code: "CSE404", name: "Khai phá dữ liệu" },
      { code: "CSE421", name: "Quản trị mạng" },
      { code: "CSE426", name: "Thuật toán ứng dụng" },
      { code: "CSE428", name: "Chuyên đề Công nghệ Thông tin" },
      { code: "CSE441", name: "Phát triển ứng dụng cho các thiết bị di động" },
      { code: "CSE445", name: "Học máy" },
      { code: "CSE485", name: "Công nghệ Web" },
      { code: "CSE487", name: "Đồ họa máy tính" },
    ],
  },
  {
    group: "Lý luận chính trị",
    courses: [
      { code: "GEL111", name: "Pháp luật đại cương" },
      { code: "HCMT354", name: "Tư tưởng Hồ Chí Minh" },
      { code: "HCPV343", name: "Lịch sử Đảng Cộng sản Việt Nam" },
      { code: "MLP121", name: "Triết học Mác - Lênin" },
      { code: "MLPE222", name: "Kinh tế chính trị Mác - Lênin" },
      { code: "SCSO232", name: "Chủ nghĩa xã hội khoa học" },
    ],
  },
  {
    group: "Ngoại ngữ và kỹ năng",
    courses: [
      { code: "ENG213", name: "Tiếng Anh 1" },
      { code: "ENG224", name: "Tiếng Anh 2" },
      { code: "SSE111", name: "Kỹ năng mềm và tinh thần khởi nghiệp" },
      { code: "TATC111", name: "Tiếng Anh tăng cường" },
    ],
  },
  {
    group: "Thực tập và học phần tốt nghiệp",
    courses: [
      { code: "CSE293", name: "Thực tập tốt nghiệp" },
      { code: "DATN106", name: "Đồ án tốt nghiệp" },
    ],
  },
  {
    group: "Tự chọn ngành 1",
    courses: [
      { code: "CSE390", name: "Thống kê ứng dụng" },
      { code: "CSE393", name: "Nhập môn điện toán đám mây" },
      { code: "CSE418", name: "Truy hồi thông tin và tìm kiếm web" },
      { code: "CSE419", name: "Mạng không dây và di động" },
      { code: "CSE424", name: "Tối ưu hóa" },
      { code: "CSE429", name: "Học sâu và ứng dụng" },
      { code: "CSE462", name: "Kiểm thử và đảm bảo chất lượng phần mềm" },
    ],
  },
  {
    group: "Tự chọn ngành 2",
    courses: [
      { code: "CSE371", name: "Phương pháp số" },
      { code: "CSE406", name: "Phân tích dữ liệu lớn" },
      { code: "CSE415", name: "Lập trình đồ họa 3D" },
      { code: "CSE417", name: "Tin sinh" },
      { code: "CSE420", name: "Thiết kế mạng" },
      { code: "CSE425", name: "Hệ thống thông tin địa lý" },
      { code: "CSE494", name: "Thiết kế và phát triển game" },
    ],
  },
  {
    group: "Tự chọn ngành 3",
    courses: [
      { code: "CSE423", name: "Lập trình phân tán" },
      { code: "CSE455", name: "Chuỗi khối và công nghệ sổ cái phân tán" },
      { code: "CSE456", name: "Xử lý ảnh" },
      { code: "CSE457", name: "Xử lý âm thanh và tiếng nói" },
      { code: "CSE458", name: "Xử lý ngôn ngữ tự nhiên" },
      { code: "CSE460", name: "Tương tác người máy" },
      { code: "CSE475", name: "Kết nối vạn vật và ứng dụng" },
    ],
  },
]

export function getCourseByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase()

  for (const group of curriculumGroups) {
    const course = group.courses.find((item) => item.code.toUpperCase() === normalizedCode)

    if (course) {
      return { course, group }
    }
  }

  return undefined
}