import { handleChatbotRequest } from "@/lib/chatbot-tutor"

export async function POST(request: Request) {
  return handleChatbotRequest(request)
}
