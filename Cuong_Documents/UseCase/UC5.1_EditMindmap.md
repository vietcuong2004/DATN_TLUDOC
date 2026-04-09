# UC5.1 - Chinh Sua Mindmap (Edit Mode)

Tai lieu nay mo ta use case "Chinh sua mindmap" sau khi he thong da sinh so do tu duy. Muc tieu la user chi duoc phep sua khi bam nut `Chinh sua`, va phai bam `Luu lai` de commit thay doi.

---

## 1. Muc tieu chuc nang

Sau khi hoan thanh UC5.1, nguoi dung co the:

1. Bam `Chinh sua` de vao che do edit.
2. Sua noi dung node (title).
3. Them node con.
4. Xoa node.
5. Bam `Luu lai` de luu ket qua chinh sua.
6. Thoat edit mode va quay lai che do xem.

Rang buoc nghiep vu:

1. Khi chua bam `Chinh sua`, khong cho sua noi dung/them/xoa node.
2. Khi dang edit, hien thao tac lien quan den edit.
3. Khi bam `Luu lai`, validate du lieu roi moi luu.
4. Neu co loi validate, khong luu va hien thong bao ro rang.

---

## 2. Pham vi

Trong pham vi UC5.1:

1. Edit tren frontend (local state) la bat buoc.
2. Co API luu mindmap la khuyen nghi (neu can luu vao DB).
3. Khong bat buoc realtime collaboration.

Ngoai pham vi UC5.1:

1. Phan quyen chi tiet theo vai tro.
2. Chinh sua dong thoi nhieu nguoi.
3. Versioning phuc tap.

---

## 3. Actor va tien dieu kien

Actor chinh:

1. Nguoi dung da co ket qua mindmap.

Tien dieu kien:

1. Mindmap JSON da duoc render trong `MindmapViewer`.
2. User dang o man hinh xem mindmap.

Hau dieu kien:

1. Mindmap da duoc cap nhat theo thao tac user.
2. Du lieu hop le va da duoc luu (local hoac backend).

---

## 4. Luong use case chi tiet

### 4.1 Main flow

1. User bam nut `Chinh sua`.
2. He thong set `isEditMode = true`.
3. He thong hien control edit tren tung node:
	 1. Sua noi dung.
	 2. Them node con.
	 3. Xoa node.
4. User thuc hien cac thay doi.
5. User bam `Luu lai`.
6. He thong validate mindmap:
	 1. title khong rong.
	 2. do sau khong vuot nguong.
	 3. so luong node con trong gioi han.
7. Neu hop le:
	 1. commit du lieu edit vao state chinh.
	 2. goi API luu (neu co).
	 3. set `isEditMode = false`.
8. He thong thong bao luu thanh cong.

### 4.2 Alternative flow A - Huy chinh sua

1. User dang o edit mode.
2. User bam `Huy` (khuyen nghi them).
3. He thong rollback ve snapshot truoc edit.
4. Set `isEditMode = false`.

### 4.3 Alternative flow B - Validate fail khi luu

1. User bam `Luu lai`.
2. He thong phat hien loi (vd: title rong).
3. He thong hien message loi tai node/toolbar.
4. Van giu edit mode de user sua lai.

---

## 5. Thiet ke du lieu

Du lieu node dang dung:

```ts
type MindmapNode = {
	id: string
	title: string
	important: boolean
	sourceRefs: string[]
	children: MindmapNode[]
}
```

Them state cho edit:

```ts
const [isEditMode, setIsEditMode] = useState(false)
const [mindmapData, setMindmapData] = useState<MindmapNode>(root)
const [draftMindmap, setDraftMindmap] = useState<MindmapNode | null>(null)
const [editError, setEditError] = useState<string>("")
```

Nguyen tac:

1. `mindmapData`: ban dang xem/chinh thuc.
2. `draftMindmap`: ban dang sua trong edit mode.
3. Bam `Luu lai` moi copy `draftMindmap -> mindmapData`.

---

## 6. Thiet ke UI/UX

### 6.1 Nut toolbar

Trang thai xem (`isEditMode = false`):

1. Hien nut `Chinh sua`.
2. An cac thao tac them/xoa/sua node.

Trang thai edit (`isEditMode = true`):

1. Hien nut `Luu lai`.
2. Hien them nut `Huy` (khuyen nghi).
3. Cho phep thao tac tren node.

### 6.2 Hanh vi tren node khi edit

1. Double click vao title -> hien input inline.
2. Enter de xac nhan title, Esc de huy sua title.
3. Nut `+` de them child node.
4. Nut thung rac de xoa node (co confirm).

### 6.3 Hanh vi khi khong edit

1. Node chi read-only.
2. Khong hien input, khong hien nut +/xoa.

---

## 7. Thuat toan cap nhat cay

Can bo ham thao tac tren tree bat bien (immutable).

### 7.1 Cap nhat title theo nodeId

```ts
function updateNodeTitle(node: MindmapNode, nodeId: string, newTitle: string): MindmapNode {
	if (node.id === nodeId) {
		return { ...node, title: newTitle }
	}

	return {
		...node,
		children: node.children.map((child) => updateNodeTitle(child, nodeId, newTitle)),
	}
}
```

### 7.2 Them child node

```ts
function addChildNode(node: MindmapNode, parentId: string, newNode: MindmapNode): MindmapNode {
	if (node.id === parentId) {
		return { ...node, children: [...node.children, newNode] }
	}

	return {
		...node,
		children: node.children.map((child) => addChildNode(child, parentId, newNode)),
	}
}
```

### 7.3 Xoa node

```ts
function removeNode(node: MindmapNode, nodeId: string): MindmapNode {
	return {
		...node,
		children: node.children
			.filter((child) => child.id !== nodeId)
			.map((child) => removeNode(child, nodeId)),
	}
}
```

Luu y:

1. Khong cho xoa root node.
2. Neu xoa node co children, xoa ca subtree (hoac confirm user).

---

## 8. Validate truoc khi Luu lai

Ham validate de de bao tri:

```ts
type ValidateResult = {
	isValid: boolean
	errors: string[]
}

function validateMindmap(root: MindmapNode): ValidateResult {
	const errors: string[] = []

	function walk(node: MindmapNode, depth: number) {
		if (!node.title.trim()) {
			errors.push(`Node ${node.id} khong duoc de trong title`)
		}

		if (depth > 3) {
			errors.push(`Node ${node.id} vuot qua do sau toi da`)
		}

		if (node.children.length > 8) {
			errors.push(`Node ${node.id} co qua nhieu node con`)
		}

		node.children.forEach((child) => walk(child, depth + 1))
	}

	walk(root, 0)
	return { isValid: errors.length === 0, errors }
}
```

---

## 9. Trien khai trong code hien tai

File chinh: `components/mindmap-viewer.tsx`

### 9.1 Bo sung props de luu

```ts
type MindmapViewerProps = {
	root: MindmapNode
	className?: string
	onDownload?: (format: "png" | "jpg" | "pdf") => void
	onSave?: (nextMindmap: MindmapNode) => Promise<void> | void
}
```

### 9.2 Them state edit mode

```ts
const [isEditMode, setIsEditMode] = useState(false)
const [draftMindmap, setDraftMindmap] = useState<MindmapNode>(root)
const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
const [editingValue, setEditingValue] = useState("")
```

### 9.3 Nut Chinh sua / Luu lai

Trong toolbar:

1. Neu `!isEditMode`: hien `Chinh sua`.
2. Neu `isEditMode`: hien `Luu lai` + `Huy`.

Xu ly `Chinh sua`:

```ts
setDraftMindmap(structuredClone(mindmapData))
setIsEditMode(true)
```

Xu ly `Luu lai`:

```ts
const result = validateMindmap(draftMindmap)
if (!result.isValid) {
	setEditError(result.errors[0])
	return
}

setMindmapData(draftMindmap)
await onSave?.(draftMindmap)
setIsEditMode(false)
```

### 9.4 Khoa/cho phep interaction

1. Kéo node/nhom: chi cho phep khi `isEditMode = true`.
2. Them/xoa/sua text: chi cho phep khi `isEditMode = true`.
3. Zoom/pan: van co the cho phep o ca 2 mode.

---

## 10. API luu (khuyen nghi)

Endpoint de luu:

1. `PUT /api/mindmap/:id`

Request body:

```json
{
	"mindmap": {
		"id": "root",
		"title": "...",
		"children": []
	},
	"updatedBy": "userId"
}
```

Response:

```json
{
	"success": true,
	"updatedAt": "2026-04-10T10:00:00.000Z"
}
```

---

## 11. Quy tac UX nen ap dung

1. Luon hien ro banner `Dang chinh sua` khi vao edit mode.
2. Tranh mat du lieu:
	 1. Canh bao neu roi trang khi chua luu.
3. Xoa node can confirm:
	 1. "Ban co chac chan muon xoa node nay va toan bo node con?"
4. Luu xong hien toast:
	 1. "Da luu thay doi mindmap".

---

## 12. Tieu chi nghiem thu UC5.1

Pass khi dat du:

1. Khong bam `Chinh sua` thi khong sua/them/xoa duoc node.
2. Bam `Chinh sua` thi sua/them/xoa duoc.
3. Bam `Luu lai` thi validate va commit dung.
4. Bam `Huy` thi rollback ve du lieu truoc edit.
5. Khong crash khi thao tac lien tiep nhieu node.
6. Dung layout sau khi save (edge/node khop nhau).

---

## 13. Lo trinh trien khai de xuat

### Phase 1 (MVP)

1. Them `isEditMode` + nut `Chinh sua` / `Luu lai`.
2. Cho sua title node inline.
3. Validate title khong rong.

### Phase 2

1. Them node con.
2. Xoa node + confirm.
3. Them nut `Huy` + rollback.

### Phase 3

1. Ket noi API save.
2. Them undo/redo.
3. Toi uu UX va thong bao loi.

---

## 14. Ket luan

UC5.1 co do kho trung binh: hoan toan kha thi tren code base hien tai.

Truc chinh ky thuat:

1. Tach ro `view mode` va `edit mode`.
2. Dung `draftMindmap` de tranh cap nhat truc tiep du lieu goc.
3. Validate truoc khi `Luu lai`.
4. Co co che rollback de an toan du lieu.

Huong tiep can nay de mo rong sang:

1. Undo/redo,
2. Luu phien ban,
3. Dong bo nhieu nguoi dung trong tuong lai.

