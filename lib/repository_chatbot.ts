import type { RowDataPacket } from "mysql2"
import { getDbPool, isDbConfigured, queryRows } from "@/lib/mysql"

type DocumentRow = RowDataPacket & {
  id: number
  title: string
  description: string | null
  drive_file_id: string | null
  download_url: string | null
  views_count: number
  downloads_count: number
  created_at: Date | string
  subject_code: string | null
  subject_name: string | null
}

export type ChatbotCandidateDocument = {
  id: number
  title: string
  description: string
  image: string
  downloadUrl: string
  subjectCode?: string
}

export type ChatbotHistoryInput = {
  userId: number
  documentId?: number | null
  question: string
  answer: string
  aiModel?: string | null
}

function buildDriveThumbnail(fileId: string | null, size = 1200) {
  if (!fileId) {
    return "/placeholder.svg?height=200&width=300"
  }
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
}

/**
 * Loại bỏ dấu tiếng Việt và chuẩn hóa chuỗi
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Tìm kiếm tài liệu nâng cao bằng từ khóa (Plan B - Fallback cho RAG)
 */
export async function searchDocumentsForChatbot(query: string, limit = 5): Promise<ChatbotCandidateDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const rawQuery = query.trim().slice(0, 150)
  const normalizedQuery = normalizeText(rawQuery)
  const limitValue = Math.max(1, Math.min(10, Math.trunc(limit)))

  // 1. Trích xuất các thực thể quan trọng (Mã môn học)
  const subjectCodeMatch = rawQuery.match(/\b([A-Z]{2,4}\d{3})\b/i)
  const targetSubjectCode = subjectCodeMatch ? subjectCodeMatch[0].toUpperCase() : null

  // 2. Tách từ khóa (Tokens)
  const tokens = normalizedQuery.split(" ").filter(t => t.length >= 2 && !["tim", "kiem", "cho", "minh", "mon", "tai", "lieu", "ve"].includes(t))

  // 3. Xây dựng câu truy vấn xếp hạng (Ranking Query)
  // Trọng số: Khớp mã môn (100) > Khớp tiêu đề chính xác (50) > Khớp từ khóa tiêu đề (10) > Khớp mô tả (1)
  let sql = `
    SELECT d.id, d.title, d.description, d.drive_file_id, d.download_url, d.views_count, d.downloads_count, d.created_at,
           s.code as subject_code, s.name as subject_name,
           (
             (CASE WHEN UPPER(s.code) = UPPER(?) THEN 100 ELSE 0 END) +
             (CASE WHEN d.title LIKE ? THEN 50 ELSE 0 END) +
             (CASE WHEN d.title LIKE ? THEN 20 ELSE 0 END)
           ) as relevance_score
    FROM documents d
    INNER JOIN subjects s ON s.id = d.subject_id
    WHERE d.status = 'published'
      AND (
        UPPER(s.code) = UPPER(?)
        OR d.title LIKE ?
        OR d.title LIKE ?
        OR s.name LIKE ?
  `
  
  const params: any[] = [
    targetSubjectCode || "___NONE___", // relevance_score match code
    `%${rawQuery}%`,                   // relevance_score exact title match
    `%${normalizedQuery}%`,            // relevance_score normalized title match
    targetSubjectCode || "___NONE___", // WHERE match code
    `%${rawQuery}%`,                   // WHERE title
    `%${normalizedQuery}%`,            // WHERE normalized title
    `%${rawQuery}%`                    // WHERE subject name
  ]

  // Thêm các token vào WHERE và điểm số
  if (tokens.length > 0) {
    sql += " OR " + tokens.map(() => "(d.title LIKE ? OR s.name LIKE ?)").join(" OR ")
    tokens.forEach(t => {
      params.push(`%${t}%`, `%${t}%`)
    })
  }

  sql += `
      )
    ORDER BY relevance_score DESC, d.views_count DESC, d.created_at DESC
    LIMIT ?
  `
  params.push(limitValue)

  const rows = await queryRows<DocumentRow>(sql, params)

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description?.trim() || "",
    image: buildDriveThumbnail(row.drive_file_id, 720),
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
    subjectCode: row.subject_code || undefined
  }))
}

/**
 * Tìm kiếm theo môn học cụ thể
 */
export async function searchDocumentsForChatbotBySubject(
  subjectCode: string,
  limit = 3,
): Promise<ChatbotCandidateDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const normalizedCode = subjectCode.trim().toUpperCase()
  const limitValue = Math.max(1, Math.min(10, Math.trunc(limit)))

  const rows = await queryRows<DocumentRow>(
    `
      SELECT d.id, d.title, d.description, d.drive_file_id, d.download_url, d.views_count, d.downloads_count, d.created_at,
             s.code as subject_code, s.name as subject_name
      FROM documents d
      INNER JOIN subjects s ON s.id = d.subject_id
      WHERE d.status = 'published'
        AND (UPPER(s.code) = UPPER(?) OR s.name LIKE ?)
      ORDER BY d.views_count DESC, d.downloads_count DESC, d.created_at DESC
      LIMIT ?
    `,
    [normalizedCode, `%${subjectCode}%`, limitValue],
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description?.trim() || "",
    image: buildDriveThumbnail(row.drive_file_id, 720),
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
    subjectCode: row.subject_code || undefined
  }))
}

export async function saveChatbotHistory(input: ChatbotHistoryInput): Promise<void> {
  if (!isDbConfigured()) {
    return
  }
  const db = getDbPool()
  await db.execute(
    `
      INSERT INTO chatbot_history (user_id, document_id, question, answer, ai_model)
      VALUES (?, ?, ?, ?, ?)
    `,
    [input.userId, input.documentId ?? null, input.question, input.answer, input.aiModel ?? null],
  )
}

export async function getChatbotRecentHistory(userId: number, limit = 10) {
  if (!isDbConfigured()) {
    return []
  }

  const limitValue = Math.max(1, Math.min(50, Math.trunc(limit)))
  
  const sql = `
    SELECT
      h.id as history_id,
      h.question,
      h.answer,
      h.created_at,
      d.id as doc_id,
      d.title as doc_title,
      d.drive_file_id,
      d.download_url
    FROM chatbot_history h
    LEFT JOIN documents d ON h.document_id = d.id
    WHERE h.user_id = ?
    ORDER BY h.created_at DESC
    LIMIT ?
  `
  
  const rows = await queryRows<RowDataPacket>(sql, [userId, limitValue])
  
  return rows.map((row) => ({
    id: row.history_id,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at,
    document: row.doc_id ? {
      id: row.doc_id,
      title: row.doc_title,
      image: buildDriveThumbnail(row.drive_file_id, 720),
      downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`
    } : null
  }))
}
