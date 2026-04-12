"use client"

import * as pdfjsLib from "pdfjs-dist"

// Thiết lập Worker để bóc tách PDF đa luồng không dập UI
// Sử dụng CDN phiên bản tương ứng với pdfjs-dist 3.11.174
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * Đọc nội dung file PDF trực tiếp trên trình duyệt Client
 * @param file - Tham số là File Object (thu thập từ thẻ input type=file)
 * @returns string - Toàn bộ text bóc tách từ file PDF
 */
export async function extractTextFromPDFFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ""
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(" ")
      fullText += pageText + "\n\n"
    }

    return fullText.trim()
  } catch (error) {
    console.error("Lỗi trích xuất PDF ở Client:", error)
    throw new Error("Không thể đọc được file PDF này. File có thể bị khóa hoặc bị hỏng định dạng.")
  }
}
