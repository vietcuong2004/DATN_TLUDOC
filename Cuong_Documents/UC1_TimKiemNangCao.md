# UC1 - Hướng dẫn code tính năng Tìm kiếm nâng cao

## 1) Mục tiêu tính năng

Trang Tìm kiếm nâng cao cho phép người dùng:
- Tìm tài liệu theo từ khóa.
- Lọc theo ngành học, môn học, loại tài liệu, đánh giá, thời gian cập nhật.
- Xem kết quả theo dạng thẻ và sắp xếp theo nhiều tiêu chí.

## 2) Các file chính đang tham gia tính năng

- Giao diện trang tìm kiếm: `app/advanced-search/page.tsx`
- Hiển thị danh sách kết quả + sắp xếp: `components/search-results.tsx`
- API xử lý tìm kiếm: `app/api/search/advanced/route.ts`
- Repository truy vấn dữ liệu: `lib/repositories.ts`
- API lấy nhóm môn học cho bộ lọc: `app/api/subjects/groups/route.ts`

## 3) Luồng hoạt động tổng thể (dễ hiểu)

1. Người dùng mở trang `/advanced-search`.
2. Trang gọi `GET /api/subjects/groups` để lấy danh sách ngành/môn học và đổ vào bộ lọc.
3. Người dùng nhập từ khóa + chọn các bộ lọc.
4. Khi bấm nút `Tìm kiếm`, hàm `runSearch()` trên frontend sẽ tạo query string.
5. Frontend gọi `GET /api/search/advanced?...`.
6. API route đọc query params, lọc giá trị hợp lệ rồi gọi `searchDocumentsAdvanced(...)` trong repository.
7. Repository dựng SQL động theo filter thực tế, truy vấn bảng `documents` + `subjects`.
8. Kết quả trả về frontend dưới dạng `items`.
9. `SearchResults` nhận `items`, cho phép người dùng sắp xếp (Tên, Mới nhất, Cũ nhất, Đánh giá, Lượt tải) và render ra card.

## 4) Giải thích code theo từng file

### 4.1 `app/advanced-search/page.tsx`

#### A. Khai báo kiểu dữ liệu và hằng số

```ts
type SidebarGroup = {
	group: string
	courses: Array<{ code: string; name: string }>
}

type AdvancedSearchResponse = {
	items: SearchResult[]
}

const DOC_TYPE_OPTIONS = [ ... ]
const FILTER_CONTROL_CLASS = "..."
```

Giải thích từng dòng:
1. `SidebarGroup`: mô tả dữ liệu nhóm môn học trả về từ API.
2. `AdvancedSearchResponse`: mô tả JSON trả về từ API tìm kiếm.
3. `DOC_TYPE_OPTIONS`: danh sách loại tài liệu dùng để render checkbox.
4. `FILTER_CONTROL_CLASS`: class Tailwind dùng chung để ép checkbox/radio về màu xanh dương theo chủ đề.

#### B. State quản lý giao diện và bộ lọc

```ts
const [isFilterOpen, setIsFilterOpen] = useState(false)
const [searchResults, setSearchResults] = useState<SearchResult[]>([])
const [searchQuery, setSearchQuery] = useState("")

const [groups, setGroups] = useState<SidebarGroup[]>([])
const [selectedGroup, setSelectedGroup] = useState("all")
const [selectedSubjectCode, setSelectedSubjectCode] = useState("all")
const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])
const [selectedRating, setSelectedRating] = useState("any")
const [updatedWithin, setUpdatedWithin] = useState("any")

const [isLoading, setIsLoading] = useState(false)
const [errorMessage, setErrorMessage] = useState("")
```

Giải thích từng dòng:
1. `isFilterOpen`: mở/đóng panel bộ lọc trên mobile.
2. `searchResults`: chứa danh sách kết quả để render.
3. `searchQuery`: từ khóa tìm kiếm.
4. `groups`: dữ liệu ngành/môn từ API.
5. `selectedGroup`: ngành đang chọn (`all` nghĩa là tất cả).
6. `selectedSubjectCode`: môn đang chọn (`all` nghĩa là tất cả).
7. `selectedDocTypes`: nhiều loại tài liệu được chọn (checkbox nhiều lựa chọn).
8. `selectedRating`: mức sao tối thiểu (`any`, `2`, `3`, `4`).
9. `updatedWithin`: khoảng thời gian (`any`, `week`, `month`, `year`).
10. `isLoading`: hiển thị trạng thái đang gọi API.
11. `errorMessage`: báo lỗi thân thiện nếu API lỗi.

#### C. Nạp dữ liệu ngành/môn lúc mở trang

```ts
useEffect(() => {
	let isMounted = true

	async function loadGroups() {
		try {
			const response = await fetch("/api/subjects/groups", { cache: "no-store" })
			const data = (await response.json()) as { groups?: SidebarGroup[] }
			if (isMounted) {
				setGroups(data.groups ?? [])
			}
		} catch {
			if (isMounted) {
				setGroups([])
			}
		}
	}

	void loadGroups()
	return () => {
		isMounted = false
	}
}, [])
```

Giải thích từng dòng:
1. `useEffect(..., [])`: chỉ chạy 1 lần khi component mount.
2. `isMounted`: cờ an toàn để tránh setState sau khi component unmount.
3. `fetch('/api/subjects/groups')`: gọi API lấy danh sách nhóm/môn.
4. `setGroups(...)`: lưu dữ liệu vào state để đổ vào `<Select>`.
5. `catch`: nếu lỗi mạng/server, fallback về mảng rỗng.
6. `return cleanup`: set `isMounted = false` để chống warning memory leak.

#### D. Tính danh sách môn học hiển thị theo ngành

```ts
const allSubjects = useMemo(() => {
	return groups.flatMap((group) => group.courses)
}, [groups])

const subjectOptions = useMemo(() => {
	if (selectedGroup === "all") {
		return allSubjects
	}

	const foundGroup = groups.find((group) => group.group === selectedGroup)
	return foundGroup?.courses ?? []
}, [allSubjects, groups, selectedGroup])
```

Giải thích từng dòng:
1. `allSubjects`: gom toàn bộ môn học của tất cả nhóm.
2. `subjectOptions`: danh sách môn thực tế sẽ hiển thị trong dropdown môn học.
3. Nếu chọn `all` ngành thì hiển thị tất cả môn.
4. Nếu chọn 1 ngành cụ thể thì chỉ hiển thị môn thuộc ngành đó.

#### E. Hàm cốt lõi gọi API tìm kiếm

```ts
const runSearch = async () => {
	setIsLoading(true)
	setErrorMessage("")

	try {
		const params = new URLSearchParams()

		if (searchQuery.trim()) params.set("q", searchQuery.trim())
		if (selectedGroup !== "all") params.set("groupName", selectedGroup)
		if (selectedSubjectCode !== "all") params.set("subjectCode", selectedSubjectCode)
		if (selectedDocTypes.length > 0) params.set("docTypes", selectedDocTypes.join(","))

		if (selectedRating !== "any") {
			const minRating = Number.parseInt(selectedRating, 10)
			if (!Number.isNaN(minRating)) params.set("minRating", String(minRating))
		}

		if (updatedWithin !== "any") params.set("updatedWithin", updatedWithin)

		const response = await fetch(`/api/search/advanced?${params.toString()}`, { cache: "no-store" })
		if (!response.ok) throw new Error("Không thể lấy dữ liệu tìm kiếm")

		const data = (await response.json()) as AdvancedSearchResponse
		setSearchResults(data.items ?? [])
	} catch {
		setSearchResults([])
		setErrorMessage("Có lỗi khi tìm kiếm. Vui lòng thử lại sau.")
	} finally {
		setIsLoading(false)
	}
}
```

Giải thích từng dòng:
1. Bật loading và xóa thông báo lỗi cũ.
2. Tạo `URLSearchParams` để build query string chuẩn.
3. Chỉ set param khi filter có ý nghĩa (tránh gửi rác `all`, `any`).
4. Parse `selectedRating` từ chuỗi sang số trước khi gửi.
5. Gọi API thật `/api/search/advanced`.
6. Nếu API trả lỗi HTTP thì throw để vào nhánh `catch`.
7. Thành công: cập nhật `searchResults`.
8. Lỗi: clear kết quả + hiện message cho người dùng.
9. `finally`: luôn tắt loading.

#### F. Các hàm phụ của trang

```ts
const handleSearch = (e: React.FormEvent) => {
	e.preventDefault()
	void runSearch()
}

const toggleDocType = (docType: string, checked: boolean) => {
	setSelectedDocTypes((previous) => {
		if (checked) {
			if (previous.includes(docType)) return previous
			return [...previous, docType]
		}
		return previous.filter((item) => item !== docType)
	})
}

const clearFilters = () => {
	setSelectedGroup("all")
	setSelectedSubjectCode("all")
	setSelectedDocTypes([])
	setSelectedRating("any")
	setUpdatedWithin("any")
}

const handleGroupChange = (nextGroup: string) => {
	setSelectedGroup(nextGroup)
	if (nextGroup === "all") return

	const nextSubjects = groups.find((group) => group.group === nextGroup)?.courses ?? []
	const currentExists = nextSubjects.some((course) => course.code === selectedSubjectCode)
	if (!currentExists) setSelectedSubjectCode("all")
}
```

Giải thích từng dòng:
1. `handleSearch`: chặn reload trang mặc định của form và gọi `runSearch`.
2. `toggleDocType`: thêm/bỏ 1 loại tài liệu trong mảng checkbox.
3. `clearFilters`: đưa tất cả bộ lọc về trạng thái mặc định.
4. `handleGroupChange`: khi đổi ngành, kiểm tra môn học hiện tại còn hợp lệ không; nếu không thì reset về `all`.

#### G. Phần JSX quan trọng

- Hero section chứa tiêu đề và thanh tìm kiếm.
- Thanh tìm kiếm đã đặt `Input + Button` cùng một hàng.
- Cột trái (desktop): panel bộ lọc.
- Mobile: bộ lọc dạng panel nổi (`isFilterOpen`).
- Cột phải: render `SearchResults` khi có dữ liệu; nếu rỗng thì hiển thị trạng thái “Chưa có kết quả”.

### 4.2 `components/search-results.tsx`

#### A. Model dữ liệu đầu vào

```ts
export interface SearchResult {
	id: number
	title: string
	date: string
	views: number
	downloads: number
	rating: number
	image: string
	downloadUrl?: string
}
```

Giải thích:
1. Đây là kiểu dữ liệu 1 tài liệu hiển thị trên card.
2. `downloadUrl` là optional để fallback sang trang chi tiết nếu thiếu link tải.

#### B. State sắp xếp và logic sắp xếp

```ts
const [sortBy, setSortBy] = useState<"name" | "newest" | "oldest" | "rating" | "downloads">("newest")

const sortedResults = useMemo(() => {
	const parseDate = (dateText: string) => {
		const [day, month, year] = dateText.split("-").map((item) => Number.parseInt(item, 10))
		if (!day || !month || !year) return 0
		return new Date(year, month - 1, day).getTime()
	}

	const list = [...results]
	list.sort((a, b) => {
		if (sortBy === "name") return a.title.localeCompare(b.title, "vi")
		if (sortBy === "oldest") return parseDate(a.date) - parseDate(b.date)
		if (sortBy === "rating") return b.rating - a.rating
		if (sortBy === "downloads") return b.downloads - a.downloads
		return parseDate(b.date) - parseDate(a.date)
	})

	return list
}, [results, sortBy])
```

Giải thích theo dòng:
1. `sortBy` lưu tiêu chí sắp xếp đang chọn.
2. `useMemo` giúp chỉ tính lại khi `results` hoặc `sortBy` đổi.
3. `parseDate` đổi chuỗi `dd-mm-yyyy` sang timestamp để so sánh.
4. Copy mảng `results` sang `list` để không mutate props.
5. `sort(...)` xử lý lần lượt từng tiêu chí.
6. Mặc định là `newest` (mới nhất).

#### C. Hành động trên mỗi card kết quả

- Nút `Xem chi tiết`: điều hướng sang `/document/{id}`.
- Nút `Tải xuống`: đi thẳng link tải (`downloadUrl`) và không mở tab mới.
- Cả hai nút được căn phải theo yêu cầu UI mới.

### 4.3 `app/api/search/advanced/route.ts`

```ts
const ALLOWED_DOC_TYPES = new Set(["exam", "lecture", "slides", "assignment", "research", "other"])
const ALLOWED_UPDATED_WITHIN = new Set(["week", "month", "year"])
```

Giải thích:
1. Dùng whitelist để chặn giá trị lạ từ query string.
2. Tránh lọc sai và giảm rủi ro thao tác ngoài ý muốn.

```ts
const query = searchParams.get("q")?.trim() || undefined
...
const docTypes = (searchParams.get("docTypes") || "")
	.split(",")
	.map((item) => item.trim())
	.filter((item) => item.length > 0 && ALLOWED_DOC_TYPES.has(item))
```

Giải thích:
1. Đọc tham số từ URL.
2. Chuẩn hóa (trim) dữ liệu.
3. Với `docTypes`: tách chuỗi CSV thành mảng và giữ lại phần tử hợp lệ.

```ts
const items = await searchDocumentsAdvanced({ ... })
return NextResponse.json({ items })
```

Giải thích:
1. Chuyển toàn bộ filter hợp lệ xuống repository.
2. Trả kết quả dạng JSON để frontend render.
3. Nếu có lỗi sẽ trả `{ items: [] }` với status 500.

### 4.4 `lib/repositories.ts` - hàm `searchDocumentsAdvanced(...)`

```ts
const whereClauses = ["d.status = 'published'"]
const params: unknown[] = []
```

Giải thích:
1. Điều kiện mặc định: chỉ lấy tài liệu đã xuất bản.
2. `params` là mảng giá trị bind cho placeholder `?`.

```ts
if (filters.query?.trim()) {
	const keyword = `%${filters.query.trim()}%`
	whereClauses.push("(d.title LIKE ? OR COALESCE(d.description, '') LIKE ?)")
	params.push(keyword, keyword)
}
```

Giải thích:
1. Nếu có từ khóa thì tìm theo `title` hoặc `description`.
2. Dùng `LIKE` + `%` để tìm gần đúng.
3. Dùng placeholder `?` để tránh SQL injection.

```ts
if (filters.groupName?.trim()) { ... }
if (filters.subjectCode?.trim()) { ... }
if (filters.docTypes?.length) { ... }
if (typeof filters.minRating === "number" && Number.isFinite(filters.minRating)) { ... }
```

Giải thích:
1. Mỗi filter chỉ thêm vào `WHERE` khi có dữ liệu.
2. `docTypes` dùng `IN (?, ?, ...)` động theo số phần tử.
3. `minRating` lọc theo `d.avg_rating >= ?`.

```ts
if (filters.updatedWithin === "week") {
	whereClauses.push("d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
} else if (filters.updatedWithin === "month") {
	whereClauses.push("d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
} else if (filters.updatedWithin === "year") {
	whereClauses.push("d.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)")
}
```

Giải thích:
1. Lọc theo thời gian cập nhật tương đối.
2. Dùng hàm SQL `DATE_SUB` để tính mốc thời gian.

```ts
const rows = await queryRows<DocumentRow>(`
	SELECT d.id, d.title, d.created_at, d.views_count, d.downloads_count, d.avg_rating, d.drive_file_id, d.download_url
	FROM documents d
	INNER JOIN subjects s ON s.id = d.subject_id
	WHERE ${whereClauses.join(" AND ")}
	ORDER BY d.created_at DESC
	LIMIT ?
`, [...params, limit])
```

Giải thích:
1. Truy vấn join `documents` với `subjects` để lọc theo ngành/môn.
2. Ghép động `WHERE` bằng các điều kiện đã chọn.
3. Mặc định sắp xếp mới nhất trước.
4. Giới hạn số lượng kết quả bằng `LIMIT`.

```ts
return rows.map((row) => ({
	id: row.id,
	title: row.title,
	date: toDateString(row.created_at),
	views: row.views_count ?? 0,
	downloads: row.downloads_count ?? 0,
	rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
	image: buildDriveThumbnail(row.drive_file_id, 720),
	downloadUrl: row.download_url || `https://drive.google.com/uc?export=download&id=${row.drive_file_id}`,
}))
```

Giải thích:
1. Chuyển row DB sang DTO frontend cần.
2. Chuẩn hóa ngày/thống kê/rating.
3. Nếu DB chưa có `download_url` thì fallback tự tạo từ `drive_file_id`.

## 5) Mapping bộ lọc UI -> query params API

- Từ khóa: `q`
- Ngành học: `groupName`
- Môn học: `subjectCode`
- Loại tài liệu (nhiều lựa chọn): `docTypes=exam,slides,...`
- Đánh giá:
	- `any` -> không gửi `minRating`
	- `2`, `3`, `4` -> gửi `minRating` tương ứng
- Thời gian cập nhật:
	- `any` -> không gửi `updatedWithin`
	- `week`, `month`, `year` -> gửi trực tiếp

## 6) Các thay đổi UI đã chốt trong phiên bản hiện tại

- Bỏ bộ lọc Số trang.
- Bỏ bộ lọc Định dạng.
- Bỏ nút `Áp dụng bộ lọc`.
- Search box và nút `Tìm kiếm` đặt chung một hàng.
- Nút hành động trong card:
	- `Xem chi tiết` có icon mắt.
	- `Tải xuống` có icon download, không mở tab mới.
- Dropdown sắp xếp còn: `Tên`, `Mới nhất`, `Cũ nhất`, `Đánh giá`, `Lượt tải`.

## 7) Lưu ý vận hành

- API tìm kiếm hiện chưa phân trang; đang giới hạn tối đa 100 bản ghi/lần.
- Sắp xếp đang làm ở frontend (`search-results.tsx`), không phải sort ở SQL.
- Nếu cần hiệu năng tốt hơn với dữ liệu lớn, nên đẩy sort + pagination xuống API/repository.

## 8) Tóm tắt nhanh cho người mới

Nếu bạn cần hiểu nhanh toàn bộ luồng, chỉ cần nhớ:
1. `page.tsx` thu thập filter + gọi API.
2. `route.ts` xác thực/filter query params.
3. `repositories.ts` dựng SQL động và truy vấn DB.
4. `search-results.tsx` sắp xếp và render card.

Như vậy, bạn có thể debug rất nhanh theo thứ tự: UI -> API -> SQL -> render.
