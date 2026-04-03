import { NextResponse } from "next/server"
import { getSidebarGroups } from "@/lib/repositories"

export async function GET() {
  try {
    const groups = await getSidebarGroups()
    return NextResponse.json({ groups })
  } catch (error) {
    console.error("[api/subjects/groups]", error)
    return NextResponse.json({ groups: [] }, { status: 500 })
  }
}
