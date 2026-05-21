import { google } from "googleapis"
import { Readable } from "stream"

const SCOPES = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]

function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Thiếu cấu hình OAuth2 (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) trong file .env.local")
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return google.drive({ version: "v3", auth: oauth2Client })
}

/**
 * Upload file lên Google Drive bằng OAuth2
 * @param buffer Dữ liệu file
 * @param fileName Tên file
 * @param mimeType Mime type của file
 * @param folderId ID của thư mục cha (nếu có)
 * @returns Thông tin file vừa upload (id, webViewLink, webContentLink)
 */
export async function uploadFileToDrive(
  buffer: Uint8Array, 
  fileName: string, 
  mimeType: string, 
  folderId?: string
) {
  const drive = getDriveClient()

  // Chuyển Uint8Array thành Readable Stream để Drive API đọc
  const stream = new Readable()
  stream.push(Buffer.from(buffer))
  stream.push(null)

  const media = {
    mimeType: mimeType,
    body: stream,
  }

  // Lưu vào root folder hệ thống nếu không có folder cụ thể
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  const parents = targetFolderId ? [targetFolderId] : []

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: parents,
    },
    media: media,
    fields: "id, webViewLink, webContentLink",
  })

  // Set quyền công khai cho file (Ai có link đều xem được)
  if (response.data.id) {
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })
  }

  return {
    id: response.data.id!,
    previewUrl: `https://drive.google.com/file/d/${response.data.id}/preview`,
    fileUrl: `https://drive.google.com/file/d/${response.data.id}/view?usp=drive_link`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${response.data.id}`
  }
}
