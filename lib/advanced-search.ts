import type { RowDataPacket } from "mysql2"
import { isDbConfigured, queryRows } from "@/lib/mysql"
import { getHuggingFaceEmbedding } from "@/lib/hf-embedder"
import { index as pineconeIndex } from "@/lib/pinecone"

type DocumentRow = RowDataPacket & {
  id: number
  title: string
  created_at: Date | string
  views_count: number
  downloads_count: number
  avg_rating: number
  drive_file_id: string | null
  download_url: string | null
  file_ext: string | null
  file_name: string | null
  subject_code: string | null
  subject_name: string | null
  uploader_name: string | null
}

export type AdvancedSearchFilters = {
  query?: string
  mode?: "regular" | "semantic"
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
  fileExt?: string
  subjectCode?: string
  subjectName?: string
  uploaderName?: string
  similarity?: number
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

  // 1. Chạy Tìm kiếm thường (SQL LIKE) trước tiên làm mặc định
  const regularResults = await runRegularSearch(filters)

  // 2. Nếu tìm kiếm thường có kết quả, hoặc không có từ khóa tìm kiếm (chỉ chọn bộ lọc)
  // thì trả về kết quả luôn, không cần gọi AI/Pinecone.
  if (regularResults.length > 0 || !filters.query?.trim()) {
    return regularResults
  }

  // 3. Nếu tìm kiếm thường trả về 0 kết quả (và có từ khóa), tiến hành Tìm kiếm ngữ nghĩa (Semantic Search)
  console.log(`[SEARCH] Không tìm thấy kết quả khớp trực tiếp cho từ khóa "${filters.query}". Kích hoạt AI Tìm kiếm (Semantic Search)...`)
  return await runSemanticSearch(filters)
}

async function runRegularSearch(filters: AdvancedSearchFilters): Promise<AdvancedSearchDocument[]> {
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
      SELECT 
        d.id, 
        d.title, 
        d.created_at, 
        d.views_count, 
        d.downloads_count, 
        d.avg_rating, 
        d.drive_file_id, 
        d.download_url,
        d.file_ext,
        d.file_name,
        s.code AS subject_code,
        s.name AS subject_name,
        u.full_name AS uploader_name
      FROM documents d
      INNER JOIN subjects s ON s.id = d.subject_id
      LEFT JOIN users u ON u.id = d.uploader_id
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
    fileExt: row.file_ext || (row.file_name?.split(".").pop()) || "FILE",
    subjectCode: row.subject_code || undefined,
    subjectName: row.subject_name || undefined,
    uploaderName: row.uploader_name || "Không rõ",
  }))
}

async function runSemanticSearch(filters: AdvancedSearchFilters): Promise<AdvancedSearchDocument[]> {
  if (!filters.query?.trim()) return []

  try {
    const queryText = filters.query.trim()
    
    // 1. Gọi HuggingFace sinh vector nhúng 384 chiều
    const queryVector = await getHuggingFaceEmbedding(queryText)
    
    // 2. Gọi Pinecone truy vấn các vector tương đồng nhất
    const queryResponse = await pineconeIndex.query({
      vector: queryVector,
      topK: 50,
      includeMetadata: true,
    })

    // 3. Trích xuất danh sách Document ID duy nhất kèm điểm tương đồng cao nhất
    const scoreMap = new Map<number, number>()
    queryResponse.matches.forEach((match: any) => {
      const docId = match.metadata?.document_id
      if (typeof docId === "number") {
        if (!scoreMap.has(docId) || (match.score || 0) > (scoreMap.get(docId) || 0)) {
          scoreMap.set(docId, match.score || 0)
        }
      }
    })

    const docIds = Array.from(scoreMap.keys())

    if (docIds.length === 0) {
      return []
    }

    const whereClauses = ["d.status = 'published'", `d.id IN (${docIds.map(() => "?").join(",")})`]
    const params: unknown[] = [...docIds]

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

    // Truy vấn MySQL để lấy thông tin chi tiết các tài liệu tương đồng
    // Sử dụng ORDER BY FIELD để giữ nguyên thứ tự điểm tương đồng xếp hạng bởi Pinecone
    const sql = `
      SELECT 
        d.id, 
        d.title, 
        d.created_at, 
        d.views_count, 
        d.downloads_count, 
        d.avg_rating, 
        d.drive_file_id, 
        d.download_url,
        d.file_ext,
        d.file_name,
        s.code AS subject_code,
        s.name AS subject_name,
        u.full_name AS uploader_name
      FROM documents d
      INNER JOIN subjects s ON s.id = d.subject_id
      LEFT JOIN users u ON u.id = d.uploader_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY FIELD(d.id, ${docIds.map(() => "?").join(",")})
    `

    const rows = await queryRows<DocumentRow>(sql, [...params, ...docIds])

    return rows.map((row) => {
      const rawScore = scoreMap.get(row.id) ?? 0
      // Quy đổi độ tương đồng Cosine sang phần trăm [0, 100]%
      const similarityPercent = Math.max(0, Math.min(100, Math.round(rawScore * 100)))

      return {
        id: row.id,
        title: row.title,
        date: toDateString(row.created_at),
        views: row.views_count ?? 0,
        downloads: row.downloads_count ?? 0,
        rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
        image: buildDriveThumbnail(row.drive_file_id, 720),
        downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
        fileExt: row.file_ext || (row.file_name?.split(".").pop()) || "FILE",
        subjectCode: row.subject_code || undefined,
        subjectName: row.subject_name || undefined,
        uploaderName: row.uploader_name || "Không rõ",
        similarity: similarityPercent,
      }
    }).sort((a, b) => {
      const indexA = docIds.indexOf(a.id)
      const indexB = docIds.indexOf(b.id)
      return indexA - indexB
    })
  } catch (error) {
    console.error("[SEMANTIC_SEARCH_FAIL_IN_HELPER]", error)
    return []
  }
}

