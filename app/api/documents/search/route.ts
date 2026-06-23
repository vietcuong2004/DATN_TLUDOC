import { NextResponse } from "next/server"
import { searchDocumentsAdvanced } from "@/lib/advanced-search"

const ALLOWED_DOC_TYPES = new Set(["exam", "lecture", "slides", "assignment", "research", "other"])
const ALLOWED_UPDATED_WITHIN = new Set(["week", "month", "year"])
const ALLOWED_MODES = new Set(["regular", "semantic"])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get("q")?.trim() || undefined
    const mode = "semantic"

    const groupName = searchParams.get("groupName")?.trim() || undefined
    const subjectCode = searchParams.get("subjectCode")?.trim() || undefined

    const docTypes = (searchParams.get("docTypes") || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && ALLOWED_DOC_TYPES.has(item))

    const minRatingRaw = searchParams.get("minRating")
    const minRating = minRatingRaw ? Number(minRatingRaw) : undefined

    const updatedWithinRaw = searchParams.get("updatedWithin") || ""
    const updatedWithin = ALLOWED_UPDATED_WITHIN.has(updatedWithinRaw)
      ? (updatedWithinRaw as "week" | "month" | "year")
      : undefined

    const items = await searchDocumentsAdvanced({
      query,
      mode,
      groupName,
      subjectCode,
      docTypes,
      minRating: Number.isFinite(minRating) ? minRating : undefined,
      updatedWithin,
      limit: 50,
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("[api/documents/search] Error:", error)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
