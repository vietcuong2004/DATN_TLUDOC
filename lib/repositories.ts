import type { RowDataPacket } from "mysql2"
import { isDbConfigured, queryRows, executeCommand } from "@/lib/mysql"

type SubjectRow = RowDataPacket & {
  code: string
  name: string
  group_name: string | null
  is_required: number | boolean
}

type SubjectDetailRow = RowDataPacket & {
  code: string
  name: string
  group_name: string | null
}

type DocumentRow = RowDataPacket & {
  id: number
  title: string
  description: string | null
  created_at: Date | string
  views_count: number
  downloads_count: number
  avg_rating: number
  file_name: string | null
  file_ext: string | null
  drive_file_id: string | null
  file_url: string | null
  preview_url: string | null
  download_url: string | null
  subject_id: number
}

type DocumentCountRow = RowDataPacket & {
  code: string
  document_count: number
}

export type SidebarGroup = {
  group: string
  courses: Array<{ code: string; name: string; isRequired: boolean }>
}

export type DocumentCountsByCode = Record<string, number>

export type HomepageDocument = {
  id: number
  title: string
  date: string
  views: number
  downloads: number
  rating: number
  image: string
  fileExt?: string
  downloadUrl?: string
  subjectCode?: string
  subjectName?: string
}

export type SubjectDocument = {
  id: number
  title: string
  date: string
  views: number
  downloads: number
  rating: number
  image: string
  fileExt?: string
  downloadUrl?: string
  subjectCode?: string
  subjectName?: string
}

export type DocumentDetail = {
  id: number
  title: string
  description: string
  date: string
  views: number
  downloads: number
  rating: number
  reviews: number
  format: string
  previewImage: string
  fileUrl: string
  previewUrl: string
  downloadUrl: string
  subjectId: number
  subjectName: string
  subjectCode: string
  uploaderName?: string
}

function buildDriveThumbnail(fileId: string | null, size = 1200) {
  if (!fileId) {
    return "/placeholder.svg?height=200&width=300"
  }

  // Nhận diện file local (tên file chứa dấu '.' hoặc có ID ngắn hơn 20 ký tự chuẩn của Drive)
  if (fileId.includes('.') || fileId.length < 20) {
    return "/placeholder.svg?height=200&width=300"
  }

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
}

function toDateString(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  const day = `${date.getDate()}`.padStart(2, "0")
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export async function getSidebarGroups(): Promise<SidebarGroup[]> {
  if (!isDbConfigured()) {
    return []
  }

  const rows = await queryRows<SubjectRow>(
    `
      SELECT code, name, group_name, is_required
      FROM subjects
      ORDER BY group_name ASC, code ASC
    `,
  )

  const grouped = new Map<string, SidebarGroup>()

  for (const row of rows) {
    const groupName = row.group_name?.trim() || "Chưa phân nhóm"
    if (!grouped.has(groupName)) {
      grouped.set(groupName, { group: groupName, courses: [] })
    }

    grouped.get(groupName)?.courses.push({
      code: row.code,
      name: row.name,
      isRequired: Boolean(row.is_required),
    })
  }

  return Array.from(grouped.values())
}

export async function getDocumentCountsBySubjectCode(): Promise<DocumentCountsByCode> {
  if (!isDbConfigured()) {
    return {}
  }

  const rows = await queryRows<DocumentCountRow>(`
      SELECT s.code, COUNT(d.id) AS document_count
      FROM subjects s
      LEFT JOIN documents d ON d.subject_id = s.id AND d.status = 'published'
      GROUP BY s.code
    `)

  return rows.reduce<DocumentCountsByCode>((accumulator, row) => {
    accumulator[row.code.toUpperCase()] = Number(row.document_count ?? 0)
    return accumulator
  }, {})
}

export async function getHomepageDocuments(mode: "featured" | "latest" | "popular", limit = 8): Promise<HomepageDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const orderBy =
    mode === "featured"
      ? "avg_rating DESC, created_at DESC"
      : mode === "latest"
        ? "created_at DESC"
        : "views_count DESC, created_at DESC"


  const rows = await queryRows<DocumentRow & { subject_code: string; subject_name: string; uploader_name: string }>(
    `
      SELECT d.id, d.title, d.created_at, d.views_count, d.downloads_count, d.avg_rating, d.drive_file_id, d.file_ext, d.download_url,
             s.code as subject_code, s.name as subject_name, u.full_name as uploader_name
      FROM documents d
      INNER JOIN subjects s ON s.id = d.subject_id
      LEFT JOIN users u ON u.id = d.uploader_id
      WHERE d.status = 'published'
      ORDER BY ${orderBy}
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: toDateString(row.created_at),
    views: row.views_count ?? 0,
    downloads: row.downloads_count ?? 0,
    rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
    image: buildDriveThumbnail(row.drive_file_id, 720),
    fileExt: row.file_ext?.toUpperCase() || "FILE",
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
    uploaderName: row.uploader_name || undefined,
  }))

}

export async function getSubjectByCode(code: string): Promise<{ code: string; name: string; groupName: string } | null> {
  if (!isDbConfigured()) {
    return null
  }

  const rows = await queryRows<SubjectDetailRow>(
    `
      SELECT code, name, group_name
      FROM subjects
      WHERE UPPER(code) = UPPER(?)
      LIMIT 1
    `,
    [code],
  )

  if (!rows.length) {
    return null
  }

  return {
    code: rows[0].code,
    name: rows[0].name,
    groupName: rows[0].group_name?.trim() || "Chưa phân nhóm",
  }
}

export async function getSubjectIdByFolderKey(folderKey: string): Promise<number | null> {
  if (!isDbConfigured()) return null
  const rows = await queryRows<RowDataPacket & { id: number }>(
    `SELECT id FROM subjects WHERE folder_key = ? LIMIT 1`,
    [folderKey]
  )
  return rows.length ? rows[0].id : null
}

export async function getOrCreateOtherSubjectId(): Promise<number> {
  if (!isDbConfigured()) return 0
  
  // 1. Tìm xem đã có subject code 'OTHER' chưa
  const rows = await queryRows<RowDataPacket & { id: number }>(
    `SELECT id FROM subjects WHERE code = 'OTHER' LIMIT 1`
  )
  if (rows.length > 0) {
    return rows[0].id
  }

  // 2. Nếu chưa có, insert mới
  const result = await executeCommand(
    `INSERT INTO subjects (code, name, folder_key, group_name, is_required) VALUES (?, ?, ?, ?, ?)`,
    ["OTHER", "Không rõ", "USER_UPLOAD", "Khác", 0]
  )

  if (result && 'insertId' in result) {
    return result.insertId
  }
  
  throw new Error("Không thể khởi tạo môn học 'Không rõ' trong database")
}

export async function getDocumentsBySubjectCode(subjectCode: string): Promise<SubjectDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const rows = await queryRows<DocumentRow & { subject_code: string; subject_name: string }>(
    `
      SELECT d.id, d.title, d.created_at, d.views_count, d.downloads_count, d.avg_rating, d.drive_file_id, d.file_ext, d.download_url,
             s.code as subject_code, s.name as subject_name
      FROM documents d
      INNER JOIN subjects s ON s.id = d.subject_id
      WHERE UPPER(s.code) = UPPER(?) AND d.status = 'published'
      ORDER BY d.created_at DESC
    `,
    [subjectCode],
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: toDateString(row.created_at),
    views: row.views_count ?? 0,
    downloads: row.downloads_count ?? 0,
    rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
    image: buildDriveThumbnail(row.drive_file_id, 720),
    fileExt: row.file_ext?.toUpperCase() || "FILE",
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
  }))
}

export async function getDocumentDetailById(id: number): Promise<DocumentDetail | null> {
  if (!isDbConfigured()) {
    return null
  }

  const rows = await queryRows<DocumentRow & { subject_name: string; subject_code: string; review_count: number; uploader_name: string | null }>(
    `
      SELECT
        d.id,
        d.title,
        d.description,
        d.subject_id,
        s.name as subject_name,
        s.code as subject_code,
        d.created_at,
        d.views_count,
        d.downloads_count,
        d.avg_rating,
        d.review_count,
        d.file_name,
        d.file_ext,
        d.drive_file_id,
        d.file_url,
        d.preview_url,
        d.download_url,
        u.full_name as uploader_name
      FROM documents d
      INNER JOIN subjects s ON d.subject_id = s.id
      LEFT JOIN users u ON u.id = d.uploader_id
      WHERE d.id = ? AND d.status = 'published'
      LIMIT 1
    `,
    [id],
  )

  if (!rows.length) {
    return null
  }

  const row = rows[0] as DocumentRow & { review_count: number; uploader_name: string | null }
  const format = row.file_ext?.toUpperCase() || (row.file_name?.split(".").pop()?.toUpperCase() ?? "FILE")

  return {
    id: row.id,
    title: row.title,
    description: row.description?.trim() || "Tài liệu học tập được đồng bộ từ kho Google Drive.",
    date: toDateString(row.created_at),
    views: row.views_count ?? 0,
    downloads: row.downloads_count ?? 0,
    rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
    reviews: Number(row.review_count ?? 0),
    format,
    previewImage: buildDriveThumbnail(row.drive_file_id, 1400),
    fileUrl: row.file_url || `https://drive.google.com/file/d/${row.drive_file_id}/view?usp=drive_link`,
    previewUrl: row.preview_url || `https://drive.google.com/file/d/${row.drive_file_id}/preview`,
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectCode: row.subject_code,
    uploaderName: row.uploader_name || undefined,
  }
}

export async function getRelatedDocuments(documentId: number, subjectId: number, limit = 6): Promise<HomepageDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const rows = await queryRows<DocumentRow>(
    `
      SELECT id, title, created_at, views_count, downloads_count, avg_rating, drive_file_id
      FROM documents
      WHERE status = 'published' AND subject_id = ? AND id <> ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [subjectId, documentId, limit],
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: toDateString(row.created_at),
    views: row.views_count ?? 0,
    downloads: row.downloads_count ?? 0,
    rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
    image: buildDriveThumbnail(row.drive_file_id, 720),
  }))
}

export async function incrementViews(id: number) {
  if (!isDbConfigured()) return;
  await executeCommand(
    "UPDATE documents SET views_count = views_count + 1 WHERE id = ?",
    [id]
  )
}

export async function incrementDownloads(id: number) {
  if (!isDbConfigured()) return;
  await executeCommand(
    "UPDATE documents SET downloads_count = downloads_count + 1 WHERE id = ?",
    [id]
  )
}

export async function getReviewsByDocumentId(documentId: number) {
  if (!isDbConfigured()) return []
  return await queryRows(
    `
      SELECT r.id, r.rating, r.comment, r.updated_at as created_at, u.full_name as author, u.avatar_url as avatar
      FROM document_reviews r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.document_id = ?
      ORDER BY r.updated_at DESC
    `,
    [documentId],
  )
}




export async function addDocumentReview(data: { documentId: number; userId: number; rating: number; comment: string }) {
  if (!isDbConfigured()) return

  // 1. Thêm bản ghi đánh giá (Nếu đã có thì cập nhật)
  await executeCommand(
    `
      INSERT INTO document_reviews (document_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)
    `,
    [data.documentId, data.userId, data.rating, data.comment],
  )

  // 2. Cập nhật lại avg_rating và review_count trong bảng documents
  await executeCommand(
    `
      UPDATE documents
      SET 
        avg_rating = (SELECT AVG(rating) FROM document_reviews WHERE document_id = ?),
        review_count = (SELECT COUNT(*) FROM document_reviews WHERE document_id = ?)
      WHERE id = ?
    `,
    [data.documentId, data.documentId, data.documentId],
  )
}

// ==========================================
// THÊM MỚI CHO UC10 & UC11 (UPLOAD & CHECK TRÙNG LẶP)
// ==========================================

export async function checkDuplicateByHash(fileHash: string): Promise<boolean> {
  if (!isDbConfigured()) return false
  
  const rows = await queryRows<RowDataPacket & { id: number }>(
    `SELECT id FROM documents WHERE file_hash = ? LIMIT 1`,
    [fileHash]
  )
  return rows.length > 0
}

export type CreateDocumentPayload = {
  title: string
  description: string
  subject_id: number
  uploader_id: number
  doc_type: string
  storage_provider: string
  drive_folder_key: string
  drive_file_id: string
  file_name: string
  file_ext: string
  file_hash: string
  file_url: string
  preview_url: string
  download_url: string
}

export async function createDocument(data: CreateDocumentPayload): Promise<number | null> {
  if (!isDbConfigured()) return null

  const result = await executeCommand(
    `
      INSERT INTO documents (
        title, description, subject_id, user_id, uploader_id, doc_type, 
        storage_provider, drive_folder_key, drive_file_id, 
        file_name, file_ext, file_hash, file_url, preview_url, download_url, 
        status, is_featured
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, 
        ?, ?, ?, ?, ?, ?, 
        'published', 0
      )
    `,
    [
      data.title, data.description, data.subject_id, data.uploader_id, data.uploader_id, data.doc_type,
      data.storage_provider, data.drive_folder_key, data.drive_file_id,
      data.file_name, data.file_ext, data.file_hash, data.file_url, data.preview_url, data.download_url
    ]
  )
  
  if (result && 'insertId' in result) {
    return result.insertId
  }
  return null
}

export async function getAllSubjects(): Promise<Array<{ id: number; code: string; name: string }>> {
  if (!isDbConfigured()) return []
  const rows = await queryRows<RowDataPacket & { id: number; code: string; name: string }>(
    `SELECT id, code, name FROM subjects ORDER BY name ASC`
  )
  return rows.map(r => ({ id: r.id, code: r.code, name: r.name }))
}

export type AdminDocument = {
  id: number
  title: string
  description: string | null
  created_at: string
  views_count: number
  downloads_count: number
  file_name: string | null
  file_ext: string | null
  drive_file_id: string | null
  subject_id: number
  subject_name: string
  subject_code: string
  uploader_name: string | null
}

export async function getAdminDocuments(): Promise<AdminDocument[]> {
  if (!isDbConfigured()) return []
  const rows = await queryRows<RowDataPacket & { subject_name: string; subject_code: string; uploader_name: string | null }>(
    `
      SELECT d.id, d.title, d.description, d.created_at, d.views_count, d.downloads_count,
             d.file_name, d.file_ext, d.drive_file_id, d.subject_id,
             s.name as subject_name, s.code as subject_code,
             u.full_name as uploader_name
      FROM documents d
      INNER JOIN subjects s ON d.subject_id = s.id
      LEFT JOIN users u ON u.id = d.uploader_id
      ORDER BY d.created_at DESC
    `
  )

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    created_at: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    views_count: row.views_count ?? 0,
    downloads_count: row.downloads_count ?? 0,
    file_name: row.file_name,
    file_ext: row.file_ext,
    drive_file_id: row.drive_file_id,
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    subject_code: row.subject_code,
    uploader_name: row.uploader_name
  }))
}

export async function updateDocument(id: number, title: string, description: string, subjectId: number): Promise<boolean> {
  if (!isDbConfigured()) return false
  const result = await executeCommand(
    `UPDATE documents SET title = ?, description = ?, subject_id = ? WHERE id = ?`,
    [title, description, subjectId, id]
  )
  return result !== null
}

export async function getDocumentDriveFileId(id: number): Promise<string | null | undefined> {
  if (!isDbConfigured()) return undefined
  const rows = await queryRows<RowDataPacket & { drive_file_id: string | null }>(
    "SELECT drive_file_id FROM documents WHERE id = ? LIMIT 1",
    [id]
  )
  if (rows.length === 0) return undefined
  return rows[0].drive_file_id
}

export async function getDocumentForVectorization(id: number): Promise<any | null> {
  if (!isDbConfigured()) return null
  const rows = await queryRows<RowDataPacket>(
    "SELECT id, title, drive_file_id, subject_id, file_ext, download_url FROM documents WHERE id = ?",
    [id]
  )
  return rows[0] ?? null
}

export async function saveDocumentSummary(
  userId: number,
  documentName: string,
  summaryText: string,
  aiModel: string
): Promise<boolean> {
  if (!isDbConfigured()) return false
  const result = await executeCommand(
    "INSERT INTO document_summaries (user_id, document_name, summary_text, ai_model) VALUES (?, ?, ?, ?)",
    [userId, documentName, summaryText, aiModel]
  )
  return result !== null
}

export async function deleteDocument(id: number): Promise<boolean> {
  if (!isDbConfigured()) return false
  const result = await executeCommand(`DELETE FROM documents WHERE id = ?`, [id])
  return result !== null
}

export async function getAdminDocumentsPaginated(
  page: number,
  limit: number,
  search?: string,
  subjectId?: number,
  sortBy: string = "created_at",
  sortOrder: string = "DESC"
): Promise<{ documents: AdminDocument[]; total: number }> {
  if (!isDbConfigured()) return { documents: [], total: 0 }

  // Validate sort parameters to prevent SQL injection
  let orderColumn = "d.created_at"
  if (sortBy === "id") {
    orderColumn = "d.id"
  } else if (sortBy === "title") {
    orderColumn = "d.title"
  } else if (sortBy === "created_at") {
    orderColumn = "d.created_at"
  }

  const direction = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"

  const offset = (page - 1) * limit
  const params: any[] = []
  const countParams: any[] = []

  let whereClause = "1=1"

  if (subjectId && subjectId > 0) {
    whereClause += " AND d.subject_id = ?"
    params.push(subjectId)
    countParams.push(subjectId)
  }

  if (search && search.trim() !== "") {
    const searchVal = `%${search.trim()}%`
    whereClause += " AND (d.title LIKE ? OR d.description LIKE ? OR s.name LIKE ? OR s.code LIKE ? OR u.full_name LIKE ?)"
    params.push(searchVal, searchVal, searchVal, searchVal, searchVal)
    countParams.push(searchVal, searchVal, searchVal, searchVal, searchVal)
  }

  // Query total count
  const countRows = await queryRows<RowDataPacket & { total: number }>(
    `
      SELECT COUNT(d.id) AS total
      FROM documents d
      INNER JOIN subjects s ON d.subject_id = s.id
      LEFT JOIN users u ON u.id = d.uploader_id
      WHERE ${whereClause}
    `,
    countParams
  )
  const total = countRows[0]?.total ?? 0

  // Query paginated documents
  // MySQL requires numeric params for LIMIT and OFFSET in prepared statements when using queryRows
  params.push(limit, offset)
  const rows = await queryRows<RowDataPacket & { subject_name: string; subject_code: string; uploader_name: string | null }>(
    `
      SELECT d.id, d.title, d.description, d.created_at, d.views_count, d.downloads_count,
             d.file_name, d.file_ext, d.drive_file_id, d.subject_id,
             s.name as subject_name, s.code as subject_code,
             u.full_name as uploader_name
      FROM documents d
      INNER JOIN subjects s ON d.subject_id = s.id
      LEFT JOIN users u ON u.id = d.uploader_id
      WHERE ${whereClause}
      ORDER BY ${orderColumn} ${direction}
      LIMIT ? OFFSET ?
    `,
    params
  )

  const documents = rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    created_at: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    views_count: row.views_count ?? 0,
    downloads_count: row.downloads_count ?? 0,
    file_name: row.file_name,
    file_ext: row.file_ext,
    drive_file_id: row.drive_file_id,
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    subject_code: row.subject_code,
    uploader_name: row.uploader_name
  }))

  return { documents, total }
}

export async function checkUserEmailExists(email: string): Promise<boolean> {
  if (!isDbConfigured()) return false
  const rows = await queryRows<RowDataPacket>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  )
  return rows.length > 0
}

export async function createUser(
  fullName: string,
  email: string,
  passwordHash: string,
  role = "student",
  status = "active"
): Promise<boolean> {
  if (!isDbConfigured()) return false
  const result = await executeCommand(
    "INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
    [fullName, email, passwordHash, role, status]
  )
  return result !== null
}

export async function authenticateUser(email: string, passwordHash: string): Promise<any | null> {
  if (!isDbConfigured()) return null
  const rows = await queryRows<RowDataPacket>(
    "SELECT id, email, full_name, role, avatar_url FROM users WHERE email = ? AND password_hash = ? LIMIT 1",
    [email, passwordHash]
  )
  return rows[0] ?? null
}


