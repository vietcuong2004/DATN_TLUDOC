export function Hero() {
  return (
    <section className="w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 md:py-10 lg:py-12">
      <div className="container px-4 md:px-6">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-3xl border border-blue-100/50 bg-white/80 p-6 shadow-lg backdrop-blur-md md:grid-cols-2 md:p-8 lg:p-10">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
          <div className="absolute -left-32 -bottom-32 h-80 w-80 rounded-full bg-purple-200/20 blur-3xl" />

          <div className="relative space-y-4 text-left">
            <div className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-900">
              Tài liệu TLU - TLU Document
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              Kho tài liệu học tập cho sinh viên Thủy Lợi
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              Nơi tổng hợp đề thi, bài giảng, đồ án và tài liệu tham khảo phục vụ học tập tại Trường Đại học Thủy Lợi.
            </p>

            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="font-semibold">Xu hướng tìm kiếm:</span>
              <a href="#" className="font-medium transition-colors hover:text-blue-600">
                Đề thi THPT
              </a>
              <span>•</span>
              <a href="#" className="font-medium transition-colors hover:text-blue-600">
                Luận văn
              </a>
              <span>•</span>
              <a href="#" className="font-medium transition-colors hover:text-blue-600">
                Bài giảng đại học
              </a>
              <span>•</span>
              <a href="#" className="font-medium transition-colors hover:text-blue-600">
                Đề cương ôn thi
              </a>
            </div>
          </div>

          <div className="relative flex justify-center">
            <img
              src="/tlu.png"
              alt="Kho tài liệu học tập cho sinh viên Thủy Lợi"
              className="relative h-52 max-w-sm rounded-2xl object-cover shadow-xl transition-transform duration-300 hover:scale-105 md:h-56 lg:h-64"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
