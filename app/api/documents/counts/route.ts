import { NextResponse } from "next/server"
import { getDocumentCountsBySubjectCode } from "@/lib/repositories"

export async function GET() {
  try {
    const counts = await getDocumentCountsBySubjectCode()
    return NextResponse.json({ counts })
  } catch (error) {
    console.error("[api/documents/counts]", error)
    return NextResponse.json({ counts: {} }, { status: 500 })
  }
}
