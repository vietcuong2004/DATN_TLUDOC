import { google } from "googleapis"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from .env.local in the root project directory
dotenv.config({ path: path.join(__dirname, "../.env.local") })

const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

console.log("=== THÔNG TIN CẤU HÌNH GOOGLE DRIVE OAUTH2 ===")
console.log("CLIENT_ID length:", clientId ? clientId.length : 0)
console.log("CLIENT_SECRET length:", clientSecret ? clientSecret.length : 0)
console.log("REFRESH_TOKEN length:", refreshToken ? refreshToken.length : 0)

if (!clientId || !clientSecret || !refreshToken) {
  console.error("❌ Thiếu cấu hình OAuth2 trong .env.local!")
  process.exit(1)
}

// Strip quotes if they are present in the env
const cleanClientId = clientId.replace(/^["']|["']$/g, "")
const cleanClientSecret = clientSecret.replace(/^["']|["']$/g, "")
const cleanRefreshToken = refreshToken.replace(/^["']|["']$/g, "")

console.log("\n=== THÔNG TIN SAU KHI LÀM SẠCH DẤU NHÁY (NẾU CÓ) ===")
console.log("Clean CLIENT_ID:", cleanClientId)
console.log("Clean CLIENT_SECRET:", cleanClientSecret.substring(0, 10) + "...")
console.log("Clean REFRESH_TOKEN:", cleanRefreshToken.substring(0, 15) + "...")

const oauth2Client = new google.auth.OAuth2(cleanClientId, cleanClientSecret)
oauth2Client.setCredentials({ refresh_token: cleanRefreshToken })

console.log("\n🔄 Đang gửi yêu cầu refresh access token tới Google...")
try {
  const { token } = await oauth2Client.getAccessToken()
  console.log("✅ Thành công! Access Token nhận được:")
  console.log(token ? `${token.substring(0, 20)}...` : "Không có token?")
  console.log("🎉 Cấu hình OAuth2 của bạn hoàn toàn chính xác!")
} catch (error) {
  console.error("❌ Thất bại! Lỗi từ Google API:")
  console.error(error)
  if (error.response && error.response.data) {
    console.error("Chi tiết phản hồi lỗi:", JSON.stringify(error.response.data, null, 2))
  }
}
