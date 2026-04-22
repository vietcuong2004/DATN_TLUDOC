import { NextResponse } from "next/server"
import { getChatbotRecentHistory } from "@/lib/chatbot-db-services"
import { getDbPool, isDbConfigured } from "@/lib/mysql"

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

    const pool = getDbPool()

    if (id) {
      // Xóa 1 cuộc hội thoại cụ thể
      await pool.execute(
        "DELETE FROM chatbot_history WHERE id = ? AND user_id = ?",
        [id, userId]
      )
      return NextResponse.json({ message: "Deleted conversation successfully" })
    } else {
      // Xóa TOÀN BỘ lịch sử của user
      await pool.execute(
        "DELETE FROM chatbot_history WHERE user_id = ?",
        [userId]
      )
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

    const pool = getDbPool()
    
    // Lưu theo giờ Việt Nam (UTC + 7) - Giả định server DB là UTC
    try {
      const [result]: any = await pool.execute(
        `INSERT INTO chatbot_history (user_id, document_id, question, answer, created_at) 
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 HOUR))`,
        [userId || 1, documentId || null, question, answer]
      )
      console.log("[api/chatbot/history] Insert successful, ID:", result.insertId)
      return NextResponse.json({ message: "History saved successfully", id: result.insertId })
    } catch (sqlError: any) {
      console.error("[api/chatbot/history] SQL Error:", sqlError.message)
      return NextResponse.json({ error: "Lỗi SQL: " + sqlError.message }, { status: 500 })
    }
  } catch (error) {
    console.error("[api/chatbot/history] POST error:", error)
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 })
  }
}
