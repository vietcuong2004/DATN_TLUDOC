import { NextResponse } from "next/server"
import path from "path"
import crypto from "crypto"
import { checkDuplicateByHash, createDocument, getSubjectIdByFolderKey } from "@/lib/repositories"
import { uploadFileToDrive } from "@/lib/drive"
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const subject = formData.get("subject") as string // this is folder_key
    const doc_type = formData.get("category") as string
    const uploader_id = parseInt(formData.get("uploader_id") as string) || 1
    
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file đính kèm" }, { status: 400 })
    }

    // 1. Sinh mã băm MD5 (UC11)
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const fileHash = crypto.createHash('md5').update(uint8Array).digest('hex')

    // 2. Kiểm tra trùng lặp
    const isDuplicate = await checkDuplicateByHash(fileHash)
    if (isDuplicate) {
      return NextResponse.json(
        { error: "Tài liệu này đã tồn tại trên hệ thống, vui lòng tải tài liệu khác!" }, 
        { status: 409 }
      )
    }

    // Lấy ID môn học
    const subjectId = await getSubjectIdByFolderKey(subject)
    if (!subjectId) {
       return NextResponse.json({ error: "Không tìm thấy thông tin môn học hợp lệ" }, { status: 400 })
    }

    // 3. Upload file lên Google Drive qua OAuth2
    const fileName = file.name
    const driveResult = await uploadFileToDrive(uint8Array, fileName, file.type)
    const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
    
    // 4. Lưu vào Database
    const docId = await createDocument({
      title: title || fileName,
      description: description || "",
      subject_id: subjectId,
      uploader_id: uploader_id,
      doc_type: doc_type || "other",
      storage_provider: 'gdrive',
      drive_folder_key: subject,
      drive_file_id: driveResult.id,
      file_name: fileName,
      file_ext: fileExt,
      file_hash: fileHash,
      file_url: driveResult.fileUrl,
      preview_url: driveResult.previewUrl,
      download_url: driveResult.downloadUrl
    })

    // 5. Pinecone Vector (Chờ tích hợp sau)
    // await vectorizeAndUpsert(...)
    
    return NextResponse.json({ success: true, document_id: docId, url: driveResult.previewUrl })

  } catch (error: any) {
    console.error("Upload API Error:", error)
    return NextResponse.json({ error: "Lỗi máy chủ: " + error.message }, { status: 500 })
  }
}
