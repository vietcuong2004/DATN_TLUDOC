import { NextRequest, NextResponse } from "next/server"
import { getAdminDocumentsPaginated, getAllSubjects, updateDocument, deleteDocument, getDocumentDriveFileId } from "@/lib/repositories"
import { deleteFileFromDrive } from "@/lib/drive"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = Number(searchParams.get("page") || "1")
    const limit = Number(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const subjectIdStr = searchParams.get("subjectId")
    const subjectId = subjectIdStr && subjectIdStr !== "all" ? Number(subjectIdStr) : undefined
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "DESC"

    const { documents, total } = await getAdminDocumentsPaginated(page, limit, search, subjectId, sortBy, sortOrder)
    const subjects = await getAllSubjects()
    return NextResponse.json({ success: true, documents, total, subjects })
  } catch (error: any) {
    console.error("GET Admin Documents Error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, title, description, subjectId } = body

    if (!id || !title || !subjectId) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin bắt buộc (id, tiêu đề, môn học)" }, { status: 400 })
    }

    const success = await updateDocument(Number(id), title, description || "", Number(subjectId))
    if (success) {
      return NextResponse.json({ success: true, message: "Cập nhật tài liệu thành công" })
    } else {
      return NextResponse.json({ success: false, message: "Không tìm thấy tài liệu để cập nhật hoặc lỗi DB" }, { status: 404 })
    }
  } catch (error: any) {
    console.error("PUT Admin Document Error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get("id")

    if (!idStr) {
      return NextResponse.json({ success: false, message: "Thiếu ID tài liệu" }, { status: 400 })
    }

    const id = Number(idStr)

    // Lấy drive_file_id trước để xóa trên Google Drive từ Repository
    const driveFileId = await getDocumentDriveFileId(id)

    if (driveFileId === undefined) {
      return NextResponse.json({ success: false, message: "Không tìm thấy tài liệu trong CSDL" }, { status: 404 })
    }

    // Xóa file trên Google Drive nếu có drive_file_id
    if (driveFileId) {
      try {
        await deleteFileFromDrive(driveFileId)
      } catch (driveError: any) {
        console.error("Google Drive deletion error:", driveError)
        // Luồng ngoại lệ 5a: "Lỗi kết nối Google Drive API khi xóa: Hệ thống thông báo lỗi, giữ nguyên bản ghi MySQL để admin kiểm tra lại hoặc thử lại sau."
        return NextResponse.json({
          success: false,
          message: `Lỗi kết nối Google Drive API khi xóa: ${driveError.message || driveError}. Đã giữ nguyên bản ghi trong CSDL MySQL để thử lại sau.`
        }, { status: 502 })
      }
    }

    // Xóa bản ghi trong MySQL sau khi xóa thành công trên Google Drive
    const success = await deleteDocument(id)
    if (success) {
      return NextResponse.json({ success: true, message: "Xóa tài liệu và tệp trên Google Drive thành công" })
    } else {
      return NextResponse.json({ success: false, message: "Lỗi khi xóa tài liệu khỏi CSDL" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("DELETE Admin Document Error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
