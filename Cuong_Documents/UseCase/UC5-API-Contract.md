# Hop Dong API UC5 - Tao So Do Tu Duy Tu Dong

Tai lieu nay dinh nghia hop dong API cho tinh nang UC5. Muc tieu la dong bo backend va frontend theo cung mot schema JSON, giam loi parse va de test.

---

## 1) Tong Quan

- Endpoint: POST /api/summarize
- Muc dich: Nhan file tai lieu, tra ve ban tom tat va mindmap JSON dang cay.
- Kieu payload: multipart/form-data
- Xac thuc: theo co che chung cua he thong (neu da ap dung middleware auth)

---

## 2) Request Contract

## 2.1. Form Data Fields

Bat buoc:

1. file: Tep tai lieu dau vao

Tuy chon:

1. summaryType: paragraph | bullets | outline
2. summaryLength: so nguyen 10..90 (phan tram)
3. language: vi | en
4. mode: summary-only | mindmap-only | both

Gia tri mac dinh khuyen nghi neu frontend khong gui:

- summaryType = paragraph
- summaryLength = 30
- language = vi
- mode = both

## 2.2. Rang buoc tep

- Dinh dang ho tro: .pdf, .docx, .txt
- Dung luong toi da: 50MB
- Neu vuot gioi han: tra 413

## 2.3. Curl Mau

```bash
curl -X POST http://localhost:3000/api/summarize \
  -F "file=@./sample.pdf" \
  -F "summaryType=outline" \
  -F "summaryLength=35" \
  -F "language=vi" \
  -F "mode=both"
```

---

## 3) Response Contract Thanh Cong

## 3.1. HTTP Status

- 200 OK

## 3.2. JSON Schema Logic

```json
{
  "summary": "string",
  "mindmap": {
    "id": "string",
    "title": "string",
    "important": false,
    "sourceRefs": ["string"],
    "children": []
  },
  "meta": {
    "requestId": "string",
    "fileName": "string",
    "fileType": "pdf|docx|txt",
    "summaryType": "paragraph|bullets|outline",
    "language": "vi|en",
    "mode": "summary-only|mindmap-only|both",
    "chunkCount": 0,
    "nodeCount": 0,
    "depth": 0,
    "processingMs": 0,
    "warnings": []
  }
}
```

## 3.3. Quy uoc theo mode

1. mode = both
- summary co du lieu
- mindmap co du lieu

2. mode = summary-only
- summary co du lieu
- mindmap = null

3. mode = mindmap-only
- summary = ""
- mindmap co du lieu

---

## 4) Mindmap Node Contract

Moi node bat buoc co:

1. id: string, duy nhat trong cay
2. title: string, toi da 10 tu
3. important: boolean
4. sourceRefs: string[]
5. children: MindmapNode[]

Kieu TypeScript khuyen nghi:

```ts
export type MindmapNode = {
  id: string
  title: string
  important: boolean
  sourceRefs: string[]
  children: MindmapNode[]
}
```

Gioi han he thong:

- Do sau toi da: 3 cap
- So con toi da moi node: 8
- Tong so node toi da: 80

Neu AI tra qua gioi han, backend phai cat bot va dua canh bao vao meta.warnings.

---

## 5) Error Contract

## 5.1. Cau truc loi chung

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {},
    "requestId": "string"
  }
}
```

## 5.2. Danh sach ma loi

1. 400 BAD_REQUEST
- INVALID_FORM_DATA
- MISSING_FILE
- INVALID_SUMMARY_TYPE
- INVALID_SUMMARY_LENGTH
- INVALID_LANGUAGE
- UNSUPPORTED_FILE_TYPE

2. 401 UNAUTHORIZED
- UNAUTHORIZED

3. 413 PAYLOAD_TOO_LARGE
- FILE_TOO_LARGE

4. 422 UNPROCESSABLE_ENTITY
- EMPTY_EXTRACTED_TEXT
- MINDMAP_JSON_INVALID
- MINDMAP_SCHEMA_INVALID

5. 429 TOO_MANY_REQUESTS
- RATE_LIMIT_EXCEEDED

6. 500 INTERNAL_SERVER_ERROR
- AI_PROVIDER_ERROR
- TEXT_EXTRACTION_FAILED
- INTERNAL_ERROR

## 5.3. Vi du loi

```json
{
  "error": {
    "code": "MINDMAP_SCHEMA_INVALID",
    "message": "Khong the tao so do tu duy hop le tu ket qua AI",
    "details": {
      "retryable": true
    },
    "requestId": "req_01HSXYZ"
  }
}
```

---

## 6) Validation Rules (Backend Bat Buoc)

1. Validate input file va mime/extension.
2. Validate schema mindmap bang zod.
3. Ep title <= 10 tu.
4. Ep depth <= 3.
5. Loai bo node title rong.
6. Dam bao children luon la mang.
7. Dam bao id khong trung.

Neu parse JSON that bai:

1. Thu retry 1 lan voi prompt sua JSON.
2. Neu tiep tuc loi, tra 422 voi code MINDMAP_JSON_INVALID.

---

## 7) Prompt Contract (No Markdown, Strict JSON)

Quy tac prompt:

1. Bat buoc cau lenh chi tra ve JSON object duy nhat.
2. Cam code block markdown.
3. Cam giai thich ngoai JSON.
4. Bat buoc key: id, title, important, sourceRefs, children.

Chuoi huong dan nen chen cuoi prompt:

```text
Chi tra ve JSON object duy nhat. Khong markdown. Khong giai thich.
```

---

## 8) Frontend Mapping Contract

Frontend can tin tuong:

1. mindmap hop le de render truc tiep.
2. Neu mode summary-only thi mindmap la null.
3. Neu co warnings thi hien thi badge canh bao nhe.

Trang ap dung:

- app/summarize/page.tsx

Khuyen nghi state:

```ts
type SummarizeApiResponse = {
  summary: string
  mindmap: MindmapNode | null
  meta: {
    requestId: string
    fileName: string
    fileType: "pdf" | "docx" | "txt"
    summaryType: "paragraph" | "bullets" | "outline"
    language: "vi" | "en"
    mode: "summary-only" | "mindmap-only" | "both"
    chunkCount: number
    nodeCount: number
    depth: number
    processingMs: number
    warnings: string[]
  }
}
```

---

## 9) Test Cases Toi Thieu

1. Upload txt nho, mode both -> 200, summary + mindmap.
2. Upload pdf lon -> chunking van 200.
3. Upload file sai dinh dang -> 400 UNSUPPORTED_FILE_TYPE.
4. Upload file rong -> 422 EMPTY_EXTRACTED_TEXT.
5. AI tra JSON sai -> retry, neu that bai tra 422 MINDMAP_JSON_INVALID.
6. mode summary-only -> mindmap = null.
7. mode mindmap-only -> summary = "".

---

## 10) Tieu Chi Chap Nhan (Acceptance Criteria)

Dat khi:

1. Frontend render duoc mindmap tu JSON khong can Mermaid.
2. Khong crash UI khi AI tra sai format.
3. Co thong diep loi ro rang theo error.code.
4. API response on dinh va test qua cac case chinh.

---

## 11) Versioning Contract

- Version hien tai: v1
- Cach version de xuat: /api/summarize?v=1 hoac header X-API-Version: 1

Khi thay doi break schema, can:

1. Tang version.
2. Giu tuong thich nguoc toi thieu 1 chu ky phat hanh.
3. Cap nhat tai lieu nay truoc khi merge.
