import { NextResponse } from "next/server"
import { searchDocumentsAdvanced } from "@/lib/repository_advanced_search"

const ALLOWED_DOC_TYPES = new Set(["exam", "lecture", "slides", "assignment", "research", "other"])
const ALLOWED_UPDATED_WITHIN = new Set(["week", "month", "year"])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get("q")?.trim() || undefined
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
      groupName,
      subjectCode,
      docTypes,
      minRating: Number.isFinite(minRating) ? minRating : undefined,
      updatedWithin,
      limit: 100,
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("[api/search/advanced]", error)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
