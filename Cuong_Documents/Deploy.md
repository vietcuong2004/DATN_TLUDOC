# Huong Dan Deploy Tu Dau Den Cuoi (Cho Nguoi Moi)

Tai lieu nay huong dan tung thao tac de website deploy tren Vercel van hien du tai lieu (khong bi trang rong).

## Muc tieu

Sau khi lam xong, ban se dat duoc 3 ket qua:

1. Link deploy Vercel hien du danh sach mon va tai lieu.
2. API deploy tra ra du lieu that, khong phai object rong.
3. Moi lan deploy tiep theo, web van doc du lieu on dinh.

## Tong quan de ban de hinh dung

He thong cua ban dang chay theo luong:

1. Google Drive: noi chua file tai lieu.
2. Script import: lay metadata file va ghi vao MySQL.
3. Vercel: app Next.js doc du lieu tu MySQL online va hien len web.

Loi ban dang gap xay ra khi deploy Vercel khong ket noi duoc DB online (hoac DB online chua co data), nen giao dien hien rong.

---

## Phan A - Chuan bi truoc khi deploy

### Buoc 1: Chuan bi tai khoan can thiet

Ban can co:

1. Tai khoan GitHub (da co repo DATN_TLUDOC).
2. Tai khoan Vercel.
3. Tai khoan Railway (de tao MySQL online).

### Buoc 2: Kiem tra code da day len GitHub

Mo terminal tai thu muc du an va chay:

```bash
git status
```

Neu con file chua commit, lam tiep:

```bash
git add .
git commit -m "chuan bi deploy"
git push origin main
```

---

## Phan B - Tao MySQL online tren Railway

### Buoc 3: Tao project Railway

1. Vao website Railway.
2. Dang nhap.
3. Nhan New Project.
4. Chon Provision MySQL.

Sau khi tao xong, ban se thay service MySQL.

### Buoc 4: Lay thong so ket noi MySQL

Trong Railway, mo service MySQL -> tab Variables / Connect (ten tab co the hoi khac tuy giao dien).

Lay cac gia tri sau:

1. Host
2. Port
3. User
4. Password
5. Database

Ghi lai 5 gia tri nay vi se dung o Vercel.

---

## Phan C - Dua schema + du lieu len DB online

Ban co 2 cach. C1 la de nhat cho nguoi moi.

### Cach 1 (khuyen dung): Export SQL tu phpMyAdmin local roi import len online

#### Buoc 5: Export database local

1. Mo phpMyAdmin local (thuong: http://localhost/phpmyadmin).
2. Chon database local cua ban (vi du: tlu_document).
3. Bam tab Export.
4. Chon Quick + SQL.
5. Bam Go de tai file `.sql` ve may.

#### Buoc 6: Import file SQL vao MySQL online

Ban co the import bang mot trong 2 cach:

1. Dung SQL client (TablePlus, DBeaver, MySQL Workbench).
2. Dung terminal voi lenh `mysql`.

Vi du import bang terminal (neu may ban co mysql client):

```bash
mysql -h <HOST> -P <PORT> -u <USER> -p <DATABASE> < backup.sql
```

Nhap password khi duoc hoi.

#### Buoc 7: Kiem tra data da len online chua

Chay cac cau SQL nay tren DB online:

```sql
SELECT COUNT(*) AS total_subjects FROM subjects;
SELECT COUNT(*) AS total_documents FROM documents;
SELECT COUNT(*) AS total_users FROM users;
```

Dieu kien dat:

1. `subjects` > 0
2. `documents` > 0
3. `users` > 0

---

## Phan D - Cau hinh Vercel dung DB online

### Buoc 8: Tao project tren Vercel (neu chua co)

1. Vao Vercel.
2. Nhan Add New Project.
3. Chon repo GitHub: DATN_TLUDOC.
4. Nhan Deploy.

### Buoc 9: Dat Environment Variables tren Vercel

Vao:

1. Vercel -> Project DATN_TLUDOC
2. Settings
3. Environment Variables

Them dung cac bien sau (gia tri lay tu Railway):

1. DB_HOST
2. DB_PORT
3. DB_USER
4. DB_PASSWORD
5. DB_NAME

Luu y quan trong:

1. Khong duoc de `DB_HOST=127.0.0.1` tren Vercel.
2. 127.0.0.1 chi dung cho may local cua ban.
3. Phai dung host online do Railway cap.

### Buoc 10: Redeploy

Sau khi them env:

1. Vao tab Deployments.
2. Chon ban deploy moi nhat.
3. Bam Redeploy.

---

## Phan E - Kiem tra ket qua deploy

### Buoc 11: Kiem tra API truc tiep

Mo tren trinh duyet:

1. `https://datn-tludoc.vercel.app/api/documents/counts`
2. `https://datn-tludoc.vercel.app/api/subjects/groups`

Ket qua dung:

1. `counts` khong rong (co so theo mon).
2. `groups` khong rong.

Neu API van rong, quay lai Buoc 7 va Buoc 9.

### Buoc 12: Kiem tra giao dien

1. Mo trang chu deploy.
2. Kiem tra sidebar co so tai lieu tung mon.
3. Kiem tra muc "Tai lieu noi bat / moi nhat / pho bien" co card.
4. Click vao 1 mon va 1 tai lieu de test.

---

## Phan F - Import tu Google Drive vao DB online (neu can cap nhat data)

Neu ban muon cap nhat tai lieu moi tu Drive vao DB online, lam tren may local:

### Buoc 13: Tao file `.env.local` tro toi DB online

Trong thu muc goc du an, tao file `.env.local` voi noi dung mau:

```env
DB_HOST=<HOST_RAILWAY>
DB_PORT=<PORT_RAILWAY>
DB_USER=<USER_RAILWAY>
DB_PASSWORD=<PASSWORD_RAILWAY>
DB_NAME=<DATABASE_RAILWAY>
GOOGLE_DRIVE_ROOT_FOLDER_ID=<ID_FOLDER_GOC_DRIVE>
DOCUMENT_UPLOADER_EMAIL=admin@tlu.edu.vn
```

### Buoc 14: Chay dry-run truoc

```bash
npm run import:drive:dry
```

Muc dich:

1. Xem script doc duoc folder Drive chua.
2. Xem map dung folder_key chua.
3. Chua ghi vao DB.

### Buoc 15: Chay import that

```bash
npm run import:drive
```

Sau do vao DB online kiem tra lai so dong trong `documents`.

---

## Phan G - Loi thuong gap va cach sua nhanh

### Loi 1: Deploy hien rong hoan toan

Nguyen nhan thuong gap:

1. Chua set env DB_* tren Vercel.
2. Set sai host/port/user/password/database.
3. DB online chua co data.

Sua:

1. Kiem tra lai env (Buoc 9).
2. Kiem tra so luong data (Buoc 7).
3. Redeploy lai (Buoc 10).

### Loi 2: Co mon hoc nhung 0 tai lieu

Nguyen nhan thuong gap:

1. `documents.status` khong phai `published`.
2. Import chua map dung folder_key voi subjects.

Kiem tra:

```sql
SELECT s.code, s.folder_key, COUNT(d.id) AS total
FROM subjects s
LEFT JOIN documents d
	ON d.subject_id = s.id
 AND d.status = 'published'
GROUP BY s.code, s.folder_key
ORDER BY s.code;
```

### Loi 3: Script import bao loi thieu DB_PASSWORD

Neu DB khong dat password, co the de:

```env
DB_PASSWORD=
```

Khong duoc xoa hn key `DB_PASSWORD`.

---

## Phan H - Checklist nhanh truoc khi nop

Truoc khi gui link cho thay/co giao hay ban be, check nhanh:

1. API `/api/documents/counts` co du lieu.
2. API `/api/subjects/groups` co du lieu.
3. Trang chu co card tai lieu.
4. Sidebar hien so tai lieu theo mon.
5. Click vao 1 mon thay danh sach tai lieu.
6. Click vao 1 tai lieu vao duoc trang chi tiet.

Neu 6 muc nay pass, link deploy cua ban da on.

---

## Ghi chu cuoi

Neu ban dang bi ket o buoc nao, dung doan sau de tu check:

1. Data online da co chua?
2. Vercel env da dung chua?
3. Da redeploy sau khi doi env chua?
4. API deploy tra du lieu chua?

Chi can 4 cau nay "YES" thi web deploy se hien du lieu.
