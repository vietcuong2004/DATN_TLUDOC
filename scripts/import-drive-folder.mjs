import fs from "node:fs"
import path from "node:path"
import mysql from "mysql2/promise"

const DEFAULT_ROOT_FOLDER_ID = "1LfQxNaki0yQyXsOJS7rSoHJYQ6sBPW2s"
const PROJECT_ROOT = process.cwd()

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, "utf8")
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#") || !line.includes("=")) continue

    const indexOfEquals = line.indexOf("=")
    const key = line.slice(0, indexOfEquals).trim()
    let value = line.slice(indexOfEquals + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function loadLocalEnv() {
  loadEnvFile(path.join(PROJECT_ROOT, ".env.local"))
  loadEnvFile(path.join(PROJECT_ROOT, ".env"))
}

function parseArgs(argv) {
  const options = {
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DEFAULT_ROOT_FOLDER_ID,
    uploaderEmail: process.env.DOCUMENT_UPLOADER_EMAIL || "admin@tlu.edu.vn",
    dryRun: false,
    publishedStatus: process.env.DOCUMENT_DEFAULT_STATUS || "published",
  }

  for (const item of argv) {
    if (item === "--dry-run") {
      options.dryRun = true
      continue
    }

    const [key, rawValue] = item.startsWith("--") ? item.slice(2).split("=") : []
    if (!key) continue

    switch (key) {
      case "root-folder-id":
        options.rootFolderId = rawValue || options.rootFolderId
        break
      case "uploader-email":
        options.uploaderEmail = rawValue || options.uploaderEmail
        break
      case "status":
        options.publishedStatus = rawValue || options.publishedStatus
        break
      default:
        break
    }
  }

  return options
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}

function sanitizeName(value) {
  return decodeHtml(value).trim()
}

function extractDriveId(href, kind) {
  const patterns = {
    folder: /\/drive\/folders\/([^/?#"]+)/,
    file: /\/file\/d\/([^/?#"]+)/,
  }

  const match = href.match(patterns[kind])
  return match ? match[1] : null
}

async function fetchFolderHtml(folderId) {
  const url = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Không đọc được Google Drive folder ${folderId}: ${response.status} ${body}`)
  }

  return response.text()
}

function parseFolderEntries(html) {
  const entries = []
  const entryRegex = /<div class="flip-entry" id="entry-[^"]+"[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g
  let match

  while ((match = entryRegex.exec(html))) {
    const href = match[1]
    const title = sanitizeName(match[2].replace(/<[^>]+>/g, ""))
    const folderId = href.includes("/drive/folders/") ? extractDriveId(href, "folder") : null
    const fileId = href.includes("/file/d/") ? extractDriveId(href, "file") : null

    if (!folderId && !fileId) {
      continue
    }

    entries.push({
      title,
      href,
      folderId,
      fileId,
    })
  }

  return entries
}

function inferDocType(fileName, mimeType) {
  const lowerName = fileName.toLowerCase()
  const ext = path.extname(lowerName).replace(".", "")

  if (ext === "ppt" || ext === "pptx" || mimeType === "application/vnd.google-apps.presentation") {
    return "slides"
  }

  if (ext === "doc" || ext === "docx" || ext === "pdf" || mimeType === "application/vnd.google-apps.document") {
    return "lecture"
  }

  return "other"
}

function isSupportedDocument(fileName, mimeType) {
  const ext = path.extname(fileName).replace(".", "").toLowerCase()
  const supportedExtensions = new Set(["pdf", "doc", "docx", "ppt", "pptx"])
  const supportedGoogleMimeTypes = new Set([
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.presentation",
  ])

  return supportedExtensions.has(ext) || supportedGoogleMimeTypes.has(mimeType)
}

async function main() {
  loadLocalEnv()
  const options = parseArgs(process.argv.slice(2))

  const requiredEnv = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"]
  const missingEnv = requiredEnv.filter((name) => process.env[name] === undefined || process.env[name] === null)
  if (missingEnv.length > 0) {
    throw new Error(`Thiếu biến môi trường cơ sở dữ liệu: ${missingEnv.join(", ")}`)
  }

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  })

  const [subjectRows, uploaderRows, existingRows] = await Promise.all([
    pool.query("SELECT id, code, name, folder_key FROM subjects"),
    pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [options.uploaderEmail]),
    pool.query("SELECT drive_file_id FROM documents"),
  ])

  const subjects = subjectRows[0]
  const uploader = uploaderRows[0]
  const existingDocuments = existingRows[0]

  if (!uploader.length) {
    throw new Error(`Không tìm thấy user uploader với email: ${options.uploaderEmail}`)
  }

  const subjectByFolderKey = new Map(subjects.map((row) => [String(row.folder_key).toUpperCase(), row]))
  const existingDriveFileIds = new Set(existingDocuments.map((row) => String(row.drive_file_id)))

  const summary = {
    inserted: 0,
    skippedAlreadyExists: 0,
    skippedUnmappedFolder: 0,
    skippedFileType: 0,
    scannedFolders: 0,
  }

  async function walkFolder(folderId, currentFolderKey = null, trail = []) {
    summary.scannedFolders += 1
    const html = await fetchFolderHtml(folderId)
    const entries = parseFolderEntries(html)

    for (const entry of entries) {
      const nextTrail = [...trail, entry.title]

      if (entry.folderId) {
        const nextFolderKey = subjectByFolderKey.has(entry.title.toUpperCase()) ? entry.title.toUpperCase() : currentFolderKey
        if (!nextFolderKey && trail.length === 0) {
          console.log(`Bỏ qua thư mục không khớp môn học: ${nextTrail.join("/")}`)
        }
        await walkFolder(entry.folderId, nextFolderKey, nextTrail)
        continue
      }

      if (!currentFolderKey) {
        summary.skippedUnmappedFolder += 1
        console.log(`Bỏ qua file không xác định được môn học: ${nextTrail.join("/")}`)
        continue
      }

      if (!isSupportedDocument(entry.title, "")) {
        summary.skippedFileType += 1
        console.log(`Bỏ qua file không phải tài liệu: ${nextTrail.join("/")}`)
        continue
      }

      const subject = subjectByFolderKey.get(currentFolderKey)
      if (!subject) {
        summary.skippedUnmappedFolder += 1
        console.log(`Bỏ qua file vì không tìm thấy subject map: ${nextTrail.join("/")}`)
        continue
      }

      if (existingDriveFileIds.has(String(entry.fileId))) {
        summary.skippedAlreadyExists += 1
        continue
      }

      const fileName = entry.title
      const fileExt = path.extname(fileName).replace(".", "").toLowerCase() || null
      const fileUrl = entry.href.includes("/file/d/") ? entry.href : `https://drive.google.com/file/d/${entry.fileId}/view?usp=drive_link`
      const previewUrl = `https://drive.google.com/file/d/${entry.fileId}/preview`
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${entry.fileId}`
      const docType = inferDocType(fileName, "")

      if (options.dryRun) {
        summary.inserted += 1
        console.log(`[DRY RUN] ${subject.folder_key} -> ${fileName}`)
        continue
      }

      await pool.execute(
        `
          INSERT INTO documents (
            title,
            description,
            subject_id,
            uploader_id,
            doc_type,
            storage_provider,
            drive_folder_key,
            drive_file_id,
            file_name,
            file_ext,
            file_url,
            preview_url,
            download_url,
            status,
            is_featured
          )
          VALUES (?, ?, ?, ?, ?, 'gdrive', ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          path.basename(fileName, path.extname(fileName)),
          `Tài liệu tải lên từ Google Drive: ${fileName}`,
          subject.id,
          uploader[0].id,
          docType,
          subject.folder_key,
          entry.fileId,
          fileName,
          fileExt,
          fileUrl,
          previewUrl,
          downloadUrl,
          options.publishedStatus,
        ],
      )

      existingDriveFileIds.add(String(entry.fileId))
      summary.inserted += 1
      console.log(`Đã thêm: [${subject.code}] ${fileName}`)
    }
  }

  await walkFolder(options.rootFolderId)
  await pool.end()

  console.log("\nHoàn tất nhập dữ liệu từ Google Drive")
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error("Lỗi import Google Drive:")
  console.error(error)
  process.exit(1)
})
