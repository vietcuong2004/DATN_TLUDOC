import { NextResponse } from "next/server"
import { addDocumentReview } from "@/lib/repositories"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    const body = await request.json()
    const { rating, comment, userId } = body

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid Document ID" }, { status: 400 })
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Default to user_id = 1 if not provided (for dev/demo)
    const finalUserId = userId || 1

    await addDocumentReview({
      documentId: id,
      userId: finalUserId,
      rating: Number(rating),
      comment: comment || "",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Submit review error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
