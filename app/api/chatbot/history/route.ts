import { NextResponse } from "next/server"
import { getChatbotRecentHistory } from "@/lib/repository_chatbot"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get("userId")
    const envUserId = Number(process.env.CHATBOT_HISTORY_USER_ID)
    
    // Fallback logic similar to resolveUserId
    let userId = Number(userIdParam)
    if (!Number.isInteger(userId) || userId <= 0) {
      userId = envUserId
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Missing or invalid userId" }, { status: 400 })
    }

    const history = await getChatbotRecentHistory(userId, 10)

    return NextResponse.json({ history })
  } catch (error) {
    console.error("[api/chatbot/history]", error)
    return NextResponse.json({ error: "Hệ thống đang bận. Bạn thử lại sau ít phút nhé." }, { status: 500 })
  }
}
