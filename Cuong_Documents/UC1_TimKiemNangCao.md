# UC1 - Huong dan code tinh nang Tim kiem nang cao

## 1) Muc tieu tinh nang

Trang Tim kiem nang cao cho phep nguoi dung:
- Nhap tu khoa tim tai lieu.
- Chon bo loc theo nhieu tieu chi (nganh hoc, mon hoc, loai tai lieu, danh gia, thoi gian cap nhat).
- Xem danh sach ket qua va sap xep ket qua.

## 2) File lien quan trong codebase

- Giao dien trang: `app/advanced-search/page.tsx`
- Hien thi ket qua: `components/search-results.tsx`
- API dang co san (chua duoc noi vao trang Tim kiem nang cao):
	- `app/api/subjects/groups/route.ts`
	- `app/api/documents/counts/route.ts`
- Tang truy van du lieu DB: `lib/repositories.ts`

## 3) Kien truc hien tai (as-is)

### 3.1 Trang `app/advanced-search/page.tsx`

Trang dang la Client Component (`"use client"`) va quan ly state bang `useState`:

- `isFilterOpen`: dong/mo panel bo loc tren mobile.
- `searchResults`: danh sach ket qua tim kiem de render.
- `searchQuery`: tu khoa tim kiem.
- `pageRange`: khoang so trang, mac dinh `[0, 500]`.
- `selectedRating`: bo loc danh gia, mac dinh `"any"`.

Ham su kien chinh:
- `handleSearch(e)`: chan submit mac dinh, gia lap goi API bang `setTimeout`, sau do set du lieu mock vao `searchResults`.
- `clearFilters()`: reset `pageRange` va `selectedRating` ve gia tri mac dinh.

Nhan xet:
- Chua co fetch API that su.
- Nhieu bo loc tren UI chua gan state rieng (Select/Checkbox/Radio thoi gian).
- Nut `Ap dung bo loc` hien chua trigger logic query.

### 3.2 Component `components/search-results.tsx`

Component nhan props:
- `results: SearchResult[]`

Model `SearchResult` hien tai:
- `id, title, date, views, downloads, rating, price, image`

Chuc nang:
- Hien thi so luong ket qua.
- Co dropdown "Sap xep theo" (hien dang chi la UI, chua xu ly sort).
- Render card ket qua + link chi tiet tai lieu theo route `/document/{id}`.

## 4) Luong xu ly hien tai

1. Nguoi dung mo trang `/advanced-search`.
2. Nhap tu khoa tai o Input.
3. Bam nut `Tim kiem` -> submit form.
4. `handleSearch` chay va nap du lieu mock.
5. `SearchResults` render danh sach.

Neu chua co ket qua (`searchResults.length === 0`) thi hien thong bao "Chua co ket qua tim kiem".

## 5) API/repository dang co san va kha nang tai su dung

Hien tai he thong da co mot so ham truy van trong `lib/repositories.ts`:
- `getSidebarGroups()`
- `getDocumentCountsBySubjectCode()`
- `getHomepageDocuments(...)`
- `getDocumentsBySubjectCode(...)`
- `getDocumentDetailById(...)`

Tuy nhien, chua co ham truy van tong quat cho "advanced search" (tim theo keyword + bo loc tong hop). Vi vay can bo sung:
- 1 ham repository moi de tim tai lieu theo dieu kien.
- 1 API route moi de frontend goi.

## 6) De xuat thiet ke code cho Tim kiem nang cao (to-be)

### 6.1 Tao API route moi

De xuat file moi:
- `app/api/search/advanced/route.ts`

Nhan query params, vi du:
- `q`: tu khoa
- `subjectCode`: ma mon
- `docTypes`: danh sach loai tai lieu
- `minRating`
- `updatedWithin`: week/month/year
- `sortBy`: relevance/newest/priceAsc/priceDesc/rating/downloads
- `page`, `pageSize`

Response de xuat:

```json
{
	"items": [
		{
			"id": 1,
			"title": "...",
			"date": "08-05-2024",
			"views": 1200,
			"downloads": 300,
			"rating": 4.5,
			"price": 50000,
			"image": "https://..."
		}
	],
	"total": 120,
	"page": 1,
	"pageSize": 12
}
```

### 6.2 Bo sung repository function

De xuat them trong `lib/repositories.ts`:
- `searchDocumentsAdvanced(filters)`

Huong tiep can:
- Xay dung SQL dong theo dieu kien co du lieu (chi append WHERE khi filter duoc chon).
- Dung placeholder `?` cho toan bo gia tri de tranh SQL injection.
- Tach rieng phan `ORDER BY` va whitelist gia tri sort de tranh chen SQL.

### 6.3 Noi frontend voi API that

Trong `app/advanced-search/page.tsx`:
- Mo rong state de quan ly day du bo loc.
- `handleSearch` chuyen tu mock sang `fetch('/api/search/advanced?...')`.
- Them `isLoading`, `error` de cai thien UX.
- Nut `Ap dung bo loc` nen trigger tim kiem (hoac submit form).

## 7) Mapping UI filter -> query param

- O "Nganh hoc" va "Mon hoc": map vao `subjectCode` hoac `group` tuy schema DB.
- "Loai tai lieu" (checkbox): map `docTypes=exam,thesis,slide,...`
- Danh gia radio:
	- `any` -> bo qua filter
	- `4+` -> `minRating=4`
	- `3+` -> `minRating=3`
	- `2+` -> `minRating=2`
- Thoi gian cap nhat:
	- `week` -> `updatedWithin=7d`
	- `month` -> `updatedWithin=30d`
	- `year` -> `updatedWithin=365d`

## 8) Ke hoach trien khai de xuat

1. Chuan hoa model du lieu ket qua (type/interface) dung chung cho frontend + API.
2. Tao API `app/api/search/advanced/route.ts`.
3. Bo sung ham `searchDocumentsAdvanced` trong `lib/repositories.ts`.
4. Noi `app/advanced-search/page.tsx` voi API that, bo mock data.
5. Bat su kien cho tat ca bo loc (desktop + mobile).
6. Them xu ly sap xep that su trong `SearchResults`.
7. Test case:
	 - keyword only
	 - filter only
	 - keyword + filter
	 - khong co ket qua
	 - loi API/DB

## 9) Cac diem can luu y

- Hien tai `SearchResults` su dung field `price`, nhung repository hien co chua tra gia. Can thong nhat schema.
- Bo loc "So trang" va "Dinh dang" da duoc loai bo khoi UI theo yeu cau.
- Du lieu ngay dang dang string `dd-mm-yyyy`; neu can sort theo ngay o client thi nen giu them timestamp.
- Trang desktop/mobile dang co 2 bo UI filter rieng; can dam bao dong bo state tranh lech gia tri.

## 10) Tom tat nhanh

- Tinh nang Tim kiem nang cao hien da co giao dien day du va luong tim kiem mock.
- Chua co backend search thuc te.
- Huong dung: bo sung API + repository search tong hop, sau do noi lai frontend de chay du lieu that.
