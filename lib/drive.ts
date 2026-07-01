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
 * Tìm hoặc tạo thư mục con trên Google Drive
 */
async function getOrCreateFolder(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`
  const listResponse = await drive.files.list({
    q: query,
    spaces: "drive",
    fields: "files(id, name)",
    limit: 1,
  })

  const files = listResponse.data.files || []
  if (files.length > 0 && files[0].id) {
    return files[0].id
  }

  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  })

  if (!createResponse.data.id) {
    throw new Error(`Không thể tạo thư mục '${folderName}' trên Google Drive`)
  }

  return createResponse.data.id
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

  // Lưu vào subfolder USER_UPLOAD nằm trong DOCUMENTS folder nếu không chỉ định folder cụ thể
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  let targetFolderId = folderId || rootFolderId

  if (!folderId && rootFolderId) {
    try {
      targetFolderId = await getOrCreateFolder(drive, "USER_UPLOAD", rootFolderId)
    } catch (err) {
      console.error("Lỗi khi tìm hoặc tạo thư mục USER_UPLOAD, chuyển về dùng rootFolderId:", err)
      targetFolderId = rootFolderId
    }
  }

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

/**
 * Xóa file khỏi Google Drive bằng OAuth2
 * @param fileId ID của file cần xóa
 */
export async function deleteFileFromDrive(fileId: string) {
  const drive = getDriveClient()
  await drive.files.delete({ fileId })
}
