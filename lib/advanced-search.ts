import type { RowDataPacket } from "mysql2"
import { isDbConfigured, queryRows } from "@/lib/mysql"

type DocumentRow = RowDataPacket & {
  id: number
  title: string
  created_at: Date | string
  views_count: number
  downloads_count: number
  avg_rating: number
  drive_file_id: string | null
  download_url: string | null
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

export async function searchDocumentsAdvanced(filters: AdvancedSearchFilters): Promise<AdvancedSearchDocument[]> {
  if (!isDbConfigured()) {
    return []
  }

  const whereClauses = ["d.status = 'published'"]
  const params: unknown[] = []

  if (filters.query?.trim()) {
    const keyword = `%${filters.query.trim()}%`
    whereClauses.push("(d.title LIKE ? OR COALESCE(d.description, '') LIKE ? OR s.name LIKE ? OR s.code LIKE ?)")
    params.push(keyword, keyword, keyword, keyword)
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
