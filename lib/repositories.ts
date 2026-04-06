import type { RowDataPacket } from "mysql2"
import { isDbConfigured, queryRows } from "@/lib/mysql"

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
  image: string
}

export type SubjectDocument = {
  id: number
  title: string
  date: string
  views: number
  downloads: number
  rating: number
  image: string
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
}

export type AdvancedSearchFilters = {
  query?: string
  groupName?: string
  subjectCode?: string
  docTypes?: string[]
  minRating?: number
  updatedWithin?: "week" | "month" | "year"
  limit?: number
}

export type AdvancedSearchDocument = {
  id: number
  title: string
  date: string
  views: number
  downloads: number
  rating: number
  image: string
  downloadUrl: string
}

function buildDriveThumbnail(fileId: string | null, size = 1200) {
  if (!fileId) {
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
      ? "is_featured DESC, created_at DESC"
      : mode === "latest"
        ? "created_at DESC"
        : "views_count DESC, created_at DESC"

  const rows = await queryRows<DocumentRow>(
    `
      SELECT id, title, created_at, views_count, downloads_count, avg_rating, drive_file_id
      FROM documents
      WHERE status = 'published'
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
    image: buildDriveThumbnail(row.drive_file_id, 720),
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

export async function getDocumentsBySubjectCode(subjectCode: string): Promise<SubjectDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const rows = await queryRows<DocumentRow>(
    `
      SELECT d.id, d.title, d.created_at, d.views_count, d.downloads_count, d.avg_rating, d.drive_file_id
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
  }))
}

export async function getDocumentDetailById(id: number): Promise<DocumentDetail | null> {
  if (!isDbConfigured()) {
    return null
  }

  const rows = await queryRows<DocumentRow>(
    `
      SELECT
        id,
        title,
        description,
        subject_id,
        created_at,
        views_count,
        downloads_count,
        avg_rating,
        review_count,
        file_name,
        file_ext,
        drive_file_id,
        file_url,
        preview_url,
        download_url
      FROM documents
      WHERE id = ? AND status = 'published'
      LIMIT 1
    `,
    [id],
  )

  if (!rows.length) {
    return null
  }

  const row = rows[0] as DocumentRow & { review_count: number }
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
    image: buildDriveThumbnail(row.drive_file_id, 720),
  }))
}

export async function searchDocumentsAdvanced(filters: AdvancedSearchFilters): Promise<AdvancedSearchDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const whereClauses = ["d.status = 'published'"]
  const params: unknown[] = []

  if (filters.query?.trim()) {
    const keyword = `%${filters.query.trim()}%`
    whereClauses.push("(d.title LIKE ? OR COALESCE(d.description, '') LIKE ?)")
    params.push(keyword, keyword)
  }

  if (filters.groupName?.trim()) {
    whereClauses.push("UPPER(COALESCE(s.group_name, '')) = UPPER(?)")
    params.push(filters.groupName.trim())
  }

  if (filters.subjectCode?.trim()) {
    whereClauses.push("UPPER(s.code) = UPPER(?)")
    params.push(filters.subjectCode.trim())
  }

  if (filters.docTypes?.length) {
    const sanitizedDocTypes = filters.docTypes.filter((item) => item.trim().length > 0)
    if (sanitizedDocTypes.length) {
      whereClauses.push(`d.doc_type IN (${sanitizedDocTypes.map(() => "?").join(",")})`)
      params.push(...sanitizedDocTypes)
    }
  }

  if (typeof filters.minRating === "number" && Number.isFinite(filters.minRating)) {
    whereClauses.push("d.avg_rating >= ?")
    params.push(filters.minRating)
  }

  if (filters.updatedWithin === "week") {
    whereClauses.push("d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
  } else if (filters.updatedWithin === "month") {
    whereClauses.push("d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
  } else if (filters.updatedWithin === "year") {
    whereClauses.push("d.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)")
  }

  const limit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(100, Math.trunc(filters.limit as number))) : 50

  const rows = await queryRows<DocumentRow>(
    `
      SELECT d.id, d.title, d.created_at, d.views_count, d.downloads_count, d.avg_rating, d.drive_file_id, d.download_url
      FROM documents d
      INNER JOIN subjects s ON s.id = d.subject_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY d.created_at DESC
      LIMIT ?
    `,
    [...params, limit],
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: toDateString(row.created_at),
    views: row.views_count ?? 0,
    downloads: row.downloads_count ?? 0,
    rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
    image: buildDriveThumbnail(row.drive_file_id, 720),
    downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
  }))
}
