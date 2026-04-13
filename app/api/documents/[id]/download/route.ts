import { NextResponse } from "next/server"
import { incrementDownloads } from "@/lib/repositories"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    await incrementDownloads(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Increment downloads error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
