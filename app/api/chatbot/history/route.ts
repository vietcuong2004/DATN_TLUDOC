import { NextResponse } from "next/server"
import { getChatbotRecentHistory, saveChatbotHistory, deleteChatbotHistoryItem, clearChatbotHistory } from "@/lib/chatbot-db-services"
import { isDbConfigured } from "@/lib/mysql"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get("userId")
    
    // Logic tương đương resolveUserId
    const userId = Number(userIdParam) || 1

    const history = await getChatbotRecentHistory(userId, 50)
    return NextResponse.json({ history })
  } catch (error) {
    console.error("[api/chatbot/history] GET error:", error)
    return NextResponse.json({ error: "Lỗi tải lịch sử" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const userId = Number(searchParams.get("userId")) || 1
    const id = searchParams.get("id")

    if (id) {
      // Xóa 1 cuộc hội thoại cụ thể từ Repository
      await deleteChatbotHistoryItem(userId, Number(id))
      return NextResponse.json({ message: "Deleted conversation successfully" })
    } else {
      // Xóa TOÀN BỘ lịch sử của user từ Repository
      await clearChatbotHistory(userId)
      return NextResponse.json({ message: "Cleared all history successfully" })
    }
  } catch (error) {
    console.error("[api/chatbot/history] DELETE error:", error)
    return NextResponse.json({ error: "Lỗi xóa lịch sử" }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const body = await request.json()
    const { userId, question, answer, documentId } = body

    console.log("[api/chatbot/history] Received save request:", { userId, question: question?.slice(0, 50) + "...", answer: answer?.slice(0, 50) + "..." })

    if (!question || !answer) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 })
    }

    // Gọi hàm nghiệp vụ từ Repository
    const insertId = await saveChatbotHistory({
      userId: userId || 1,
      documentId: documentId || null,
      question,
      answer
    })

    if (insertId) {
      return NextResponse.json({ message: "History saved successfully", id: insertId })
    } else {
      return NextResponse.json({ error: "Không thể lưu lịch sử chat" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[api/chatbot/history] POST error:", error)
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 })
  }
}
