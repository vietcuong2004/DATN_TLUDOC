import fs from "node:fs"
import path from "node:path"
import mysql from "mysql2/promise"

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

async function getMd5FromDrive(fileId, apiKey) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=md5Checksum&key=${apiKey}`
  const response = await fetch(url)
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Drive API lỗi: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.md5Checksum
}

async function main() {
  console.log("🚀 Bắt đầu tiến trình đồng bộ mã băm (MD5) từ Google Drive...");
  loadLocalEnv()

  const requiredEnv = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"]
  const missingEnv = requiredEnv.filter((name) => process.env[name] === undefined || process.env[name] === null)
  if (missingEnv.length > 0) {
    throw new Error(`Thiếu biến môi trường cơ sở dữ liệu: ${missingEnv.join(", ")}`)
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  if (!apiKey) {
    throw new Error("⚠️ BẠN CHƯA CÓ GOOGLE_DRIVE_API_KEY TRONG FILE .env.local! Vui lòng lấy API Key từ Google Cloud Console và điền vào để chạy script này.")
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

  try {
    // Chỉ chọn những bản ghi có drive_file_id và chưa có file_hash
    const [rows] = await pool.query(
      "SELECT id, title, drive_file_id FROM documents WHERE file_hash IS NULL AND drive_file_id IS NOT NULL"
    )

    if (rows.length === 0) {
      console.log("✅ Toàn bộ tài liệu trong CSDL đã có mã băm. Không cần đồng bộ thêm.");
      return;
    }

    console.log(`Tìm thấy ${rows.length} tài liệu chưa có mã băm. Đang tiến hành truy xuất từ Google Drive...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const doc = rows[i]
      try {
        process.stdout.write(`[${i + 1}/${rows.length}] Đang xử lý: ${doc.title.substring(0, 30)}... `)
        
        const md5 = await getMd5FromDrive(doc.drive_file_id, apiKey)
        
        if (md5) {
          await pool.execute("UPDATE documents SET file_hash = ? WHERE id = ?", [md5, doc.id])
          console.log(`✅ OK (${md5})`)
          successCount++
        } else {
          console.log(`⚠️ KHÔNG CÓ MD5 (Có thể là Google Doc/Sheet/Slide nội bộ)`)
          errorCount++
        }
      } catch (err) {
        console.log(`❌ LỖI: ${err.message}`)
        errorCount++
      }

      // Nghỉ 100ms giữa các request để tránh rate limit của Google
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log("\n===========================================")
    console.log(`🎉 HOÀN TẤT ĐỒNG BỘ:`)
    console.log(`- Thành công: ${successCount} file`)
    console.log(`- Thất bại / Không có MD5: ${errorCount} file`)
    console.log("===========================================")

  } catch (error) {
    console.error("Lỗi trong quá trình xử lý CSDL:", error)
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
