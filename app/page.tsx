import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ListDocsHomepage } from "@/components/list-docs-homepage"
import { SubjectCategoriesSidebar } from "@/components/sidebar-subject"
import { Footer } from "@/components/footer"
import { Search, FileText, Bot, ListChecks, Network } from "lucide-react"

const tools = [
  {
    name: "Tìm kiếm nâng cao",
    icon: <Search className="h-8 w-8 text-blue-500" />,
    description: "Lọc tài liệu theo nhiều tiêu chí để tìm nhanh nội dung phù hợp.",
    href: "/advanced-search",
  },
  {
    name: "Tóm tắt tài liệu",
    icon: <FileText className="h-8 w-8 text-green-500" />,
    description: "Tóm tắt nhanh nội dung tài liệu bằng AI.",
    href: "/summarize",
  },
  {
    name: "Chatbot Tutor",
    icon: <Bot className="h-8 w-8 text-pink-500" />,
    description: "Trợ lý AI hỗ trợ học tập, giải đáp thắc mắc.",
    href: "/chatbot",
  },
  {
    name: "Sơ đồ tư duy",
    icon: <Network className="h-8 w-8 text-yellow-500" />,
    description: "Trực quan hóa ý chính tài liệu dưới dạng mindmap.",
    href: "/mindmap",
  },
  {
    name: "Quiz tự động",
    icon: <ListChecks className="h-8 w-8 text-cyan-500" />,
    description: "Tạo bài kiểm tra trắc nghiệm từ tài liệu.",
    href: "/quiz",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24">
              <SubjectCategoriesSidebar />
            </div>
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Danh mục công cụ */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-6 text-center">Danh mục công cụ học tập</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                  <Link href={tool.href} key={tool.name} className="group">
                    <div className="border rounded-xl p-6 flex flex-col items-center bg-white shadow-sm hover:shadow-lg transition cursor-pointer h-full">
                      {tool.icon}
                      <h3 className="text-lg font-semibold mt-4 group-hover:text-primary">{tool.name}</h3>
                      <p className="text-gray-500 mt-2 text-center text-sm">{tool.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <ListDocsHomepage title="Tài liệu nổi bật" />
            <ListDocsHomepage title="Tài liệu mới nhất" />
            <ListDocsHomepage title="Tài liệu phổ biến" />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
