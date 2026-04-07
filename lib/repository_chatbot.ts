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
}

export type ChatbotCandidateDocument = {
  id: number
  title: string
  description: string
  image: string
  downloadUrl: string
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

export async function searchDocumentsForChatbot(query: string, limit = 5): Promise<ChatbotCandidateDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const rawQuery = query.trim().slice(0, 120)
  const lowerQuery = rawQuery.toLowerCase()
  const limitValue = Math.max(1, Math.min(10, Math.trunc(limit)))

  // Strict subject-first strategy for known aliases.
  let strictSubjectCode: string | null = null
  if (lowerQuery.includes("giải tích 1") || lowerQuery.includes("giai tich 1")) {
    strictSubjectCode = "MATH111"
  } else if (lowerQuery.includes("giải tích 2") || lowerQuery.includes("giai tich 2")) {
    strictSubjectCode = "MATH122"
  }

  if (strictSubjectCode) {
    const strictRows = await queryRows<DocumentRow>(
      `
        SELECT d.id, d.title, d.description, d.drive_file_id, d.download_url, d.views_count, d.downloads_count, d.created_at
        FROM documents d
        INNER JOIN subjects s ON s.id = d.subject_id
        WHERE d.status = 'published'
          AND UPPER(s.code) = UPPER(?)
        ORDER BY d.views_count DESC, d.downloads_count DESC, d.created_at DESC
        LIMIT ?
      `,
      [strictSubjectCode, limitValue],
    )

    if (strictRows.length > 0) {
      return strictRows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description?.trim() || "",
        image: buildDriveThumbnail(row.drive_file_id, 720),
        downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
      }))
    }
  }

  const expandedPhrases = new Set<string>()
  if (rawQuery.length > 0) {
    expandedPhrases.add(rawQuery)
  }

  const cleaned = lowerQuery
    .replace(/\b(tôi muốn|toi muon|mình muốn|minh muon|giúp tôi|giup toi|hãy|hay|vui lòng|vui long)\b/g, " ")
    .replace(/\b(tìm kiếm|tim kiem|tìm|tim|tài liệu|tai lieu|môn|mon|về|ve|cho tôi|cho toi|giúp|giup)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (cleaned.length > 0) {
    expandedPhrases.add(cleaned)
  }

  if (lowerQuery.includes("giải tích 1") || lowerQuery.includes("giai tich 1")) {
    expandedPhrases.add("Giải tích hàm một biến")
    expandedPhrases.add("MATH111")
  }

  if (lowerQuery.includes("giải tích 2") || lowerQuery.includes("giai tich 2")) {
    expandedPhrases.add("Giải tích hàm nhiều biến")
    expandedPhrases.add("MATH122")
  }

  const tokens = cleaned
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)

  for (const token of tokens) {
    expandedPhrases.add(token)
  }

  const phraseList = Array.from(expandedPhrases).slice(0, 12)

  let rows: DocumentRow[] = []

  if (phraseList.length > 0) {
    const likeClauses = phraseList
      .map(() => "(d.title LIKE ? OR COALESCE(d.description, '') LIKE ? OR s.name LIKE ? OR s.code LIKE ?)")
      .join(" OR ")

    const likeParams = phraseList.flatMap((phrase) => {
      const keyword = `%${phrase}%`
      return [keyword, keyword, keyword, keyword]
    })

    rows = await queryRows<DocumentRow>(
      `
        SELECT d.id, d.title, d.description, d.drive_file_id, d.download_url, d.views_count, d.downloads_count, d.created_at
        FROM documents d
        INNER JOIN subjects s ON s.id = d.subject_id
        WHERE d.status = 'published'
          AND (${likeClauses})
        ORDER BY d.views_count DESC, d.downloads_count DESC, d.created_at DESC
        LIMIT ?
      `,
      [...likeParams, limitValue],
    )
  }

  if (!rows.length) {
    rows = await queryRows<DocumentRow>(
      `
        SELECT d.id, d.title, d.description, d.drive_file_id, d.download_url, d.views_count, d.downloads_count, d.created_at
        FROM documents d
        WHERE d.status = 'published'
        ORDER BY d.views_count DESC, d.downloads_count DESC, d.created_at DESC
        LIMIT ?
      `,
      [limitValue],
    )
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description?.trim() || "",
    image: buildDriveThumbnail(row.drive_file_id, 720),
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
  }))
}

export async function searchDocumentsForChatbotBySubject(
  subjectCode: string,
  limit = 3,
): Promise<ChatbotCandidateDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const normalizedCode = subjectCode.trim().toUpperCase()
  if (!normalizedCode) {
    return []
  }

  const limitValue = Math.max(1, Math.min(10, Math.trunc(limit)))
  const rows = await queryRows<DocumentRow>(
    `
      SELECT d.id, d.title, d.description, d.drive_file_id, d.download_url, d.views_count, d.downloads_count, d.created_at
      FROM documents d
      INNER JOIN subjects s ON s.id = d.subject_id
      WHERE d.status = 'published'
        AND UPPER(s.code) = UPPER(?)
      ORDER BY d.views_count DESC, d.downloads_count DESC, d.created_at DESC
      LIMIT ?
    `,
    [normalizedCode, limitValue],
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description?.trim() || "",
    image: buildDriveThumbnail(row.drive_file_id, 720),
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
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
