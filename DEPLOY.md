# ขึ้นเว็บและออกเวอร์ชัน (drone.dekgp.com บน Vercel)

## แนวคิดสองสาขา

| สาขา | หน้าที่ | เกิดอะไรขึ้นเมื่อ push |
| --- | --- | --- |
| `main` | รวมงานที่พัฒนาเสร็จแล้ว | Vercel สร้าง **Preview** (ลิงก์ทดลอง ไม่ขึ้นเว็บจริง ไม่ถูกค้นหา) · CI ตรวจ typecheck + build |
| `release` | สิ่งที่เว็บจริงใช้อยู่ | Vercel deploy ขึ้น **Production** ที่ drone.dekgp.com |

เว็บจริงจะเปลี่ยนก็ต่อเมื่อโค้ดถูกรวมเข้า `release` เท่านั้น ทุกการเปลี่ยนต้องเดินทาง `main` → ดูใน Preview → `release`

## ตั้งค่าครั้งแรก

### 1) Git

```bash
git branch -m master main                 # เปลี่ยนชื่อสาขาเริ่มต้นเป็น main
git remote add origin git@github.com:<OWNER>/<REPO>.git
git add -A && git commit -m "เปิดตัวเว็บเวอร์ชัน 1.0.0"
git push -u origin main
git checkout -b release && git push -u origin release
git checkout main
```

แล้วที่ GitHub: Settings → Branches → ตั้ง protection ให้ `release` (ต้องผ่าน CI, ห้าม force push) และแก้ลิงก์ `OWNER/REPO` ท้ายไฟล์ `CHANGELOG.md`

### 2) Vercel

1. Add New → Project → เลือก repo นี้ (Framework = Next.js จะอ่านจาก `vercel.json` เอง)
2. Settings → **Git → Production Branch = `release`** (สำคัญที่สุด ไม่ตั้งแล้ว `main` จะขึ้นเว็บจริง)
3. Settings → Domains → เพิ่ม `drone.dekgp.com`
4. ที่ DNS ของ dekgp.com เพิ่มระเบียน `CNAME` ชื่อ `drone` ชี้ `cname.vercel-dns.com` (Vercel จะออกใบรับรอง HTTPS ให้เอง)
5. Settings → Environment Variables (ตารางด้านล่าง)
6. Region ของฟังก์ชันตั้งเป็นสิงคโปร์ (`sin1` ใน `vercel.json`) ใกล้ผู้ใช้และฐานข้อมูล Neon

### ตัวแปรสภาพแวดล้อม

| ชื่อ | Production | Preview | หมายเหตุ |
| --- | --- | --- | --- |
| `DATABASE_URL` | จำเป็น | จำเป็น | แนะนำให้ Preview ใช้ Neon branch แยก ไม่ใช้ฐานข้อมูลจริง |
| `BETTER_AUTH_SECRET` | จำเป็น | จำเป็น | สุ่ม 32+ ตัวอักษร (`openssl rand -base64 32`) แยกจาก dev |
| `BETTER_AUTH_URL` | `https://drone.dekgp.com` | **ไม่ต้องตั้ง** | Preview ใช้ลิงก์ของตัวเอง ระบบรับ `VERCEL_URL` เป็นต้นทางที่เชื่อถือได้ให้แล้ว |
| `NEXT_PUBLIC_SITE_URL` | `https://drone.dekgp.com` | ไม่ต้องตั้ง | ใช้ทำ canonical/sitemap/ภาพแชร์ |
| `ADMIN_EMAILS` | จำเป็น | ตามต้องการ | อีเมลที่เข้าสู่ระบบแล้วเป็นแอดมินทันที และข้ามข้อบังคับโดเมนโรงเรียนได้ |
| `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` | จำเป็น | จำเป็น (ถ้าจะทดสอบล็อกอิน) | OAuth client ของ Google สำหรับเข้าสู่ระบบด้วยบัญชีโรงเรียน (ดูหัวข้อด้านล่าง) |
| `ALLOWED_EMAIL_DOMAIN` | ไม่บังคับ | ไม่บังคับ | โดเมนอีเมลที่อนุญาต ค่าเริ่มต้น `lukhamhan.ac.th` |
| `R2_ENDPOINT` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET_NAME` | จำเป็น | ตามต้องการ | อัปโหลดรูป |
| `R2_PUBLIC_URL` | จำเป็น | จำเป็น | ต้องมีตอน build ไม่งั้นรูปจาก R2 ไม่แสดง |
| `GOOGLE_SITE_VERIFICATION` `BING_SITE_VERIFICATION` | ไม่บังคับ | — | ยืนยันเจ้าของเว็บใน Search Console |

ข้อควรระวัง: Vercel build ไม่รัน `prisma db push` ถ้าแก้ `prisma/schema.prisma` ต้องรัน `bun run db:push` กับฐานข้อมูลนั้นเองก่อนออกเวอร์ชัน (เพิ่มคอลัมน์ได้ปลอดภัย การลบหรือเปลี่ยนชนิดควรสำรองก่อน) และใส่ข้อมูลตั้งต้นโจทย์ฝึกด้วย `bun run prisma/seed-challenges.ts` ได้เมื่อต้องการ

### ตั้งค่าเข้าสู่ระบบด้วย Google (ทำครั้งเดียว)

ระบบเปิดให้เฉพาะอีเมล `@lukhamhan.ac.th` (และอีเมลใน `ADMIN_EMAILS`) เข้าสู่ระบบด้วย Google เท่านั้น ไม่มีสมัครด้วยรหัสผ่านบนเว็บจริง

1. เข้า <https://console.cloud.google.com> ด้วยบัญชีผู้ดูแล Google Workspace ของโรงเรียน → สร้าง Project (เช่น `drone-lukhamhan`)
2. APIs & Services → **OAuth consent screen** → User Type เลือก **Internal** (ถ้าโปรเจกต์อยู่ในองค์กรโรงเรียน Google จะอนุญาตเฉพาะบัญชีในโดเมนเองอีกชั้น) ถ้าไม่มีตัวเลือก Internal ใช้ External แล้วระบบฝั่งเว็บจะกันโดเมนอื่นให้
3. Credentials → Create Credentials → **OAuth client ID** → Web application
   - Authorized JavaScript origins: `https://drone.dekgp.com` และ `http://localhost:3000`
   - Authorized redirect URIs: `https://drone.dekgp.com/api/auth/callback/google` และ `http://localhost:3000/api/auth/callback/google`
4. คัดลอก Client ID / Client secret ไปใส่ `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ที่ Vercel และ `.env.local`
5. แอดมินเดิมที่เคยสมัครด้วยรหัสผ่าน: ล็อกอินด้วย Google อีเมลเดียวกัน (ต้องอยู่ใน `ADMIN_EMAILS`) ระบบจะผูกเข้ากับบัญชีเดิมให้เอง
6. ทดสอบ: ล็อกอินด้วย gmail ธรรมดาต้องถูกปฏิเสธ, อีเมลโรงเรียนต้องผ่านและเห็นหน้า `/learn`

### 3) หลังขึ้นเว็บครั้งแรก

- เปิด Google Search Console เพิ่มทรัพย์สิน `https://drone.dekgp.com` แล้วส่ง `https://drone.dekgp.com/sitemap.xml`
- ตรวจ `https://drone.dekgp.com/robots.txt` ต้องเห็น `Allow: /` และ `Disallow: /admin`
- เช็กภาพแชร์: ส่งลิงก์เข้า LINE/Facebook Sharing Debugger ดูว่าแสดงภาพและชื่อถูกต้อง
- เข้าสู่ระบบด้วย Google ด้วยอีเมลใน `ADMIN_EMAILS` แล้วเข้า `/admin`

## ออกเวอร์ชันใหม่ (ทุกครั้งก่อนอัปเดตเว็บจริง)

1. พัฒนาบนสาขาแยก แล้วเปิด PR เข้า `main` (CI ต้องผ่าน)
2. เพิ่มรายการใน `CHANGELOG.md` ใต้ `## [Unreleased]` ว่าเปลี่ยนอะไร (กลุ่ม: เพิ่ม / เปลี่ยน / แก้ / เอาออก)
3. เมื่อพร้อมออก: เปลี่ยน `[Unreleased]` เป็น `## [x.y.z] - YYYY-MM-DD` เพิ่มหัว `## [Unreleased]` ว่างๆ ไว้บนสุด แก้ `version` ใน `package.json` ให้ตรง แล้วรวมเข้า `main`
   - แก้ข้อผิดพลาดเล็ก → PATCH (1.0.1) · เพิ่มความสามารถ → MINOR (1.1.0) · เปลี่ยนโครงสร้างใหญ่ → MAJOR (2.0.0)
4. ดูผลใน Preview ของ `main` (ลองเข้าสู่ระบบ ตัวจำลอง บทเรียน)
5. GitHub → Actions → **Release** → Run workflow → พิมพ์ `release`
   - ระบบตรวจว่า CHANGELOG มีหัวข้อของเวอร์ชันนี้ รวม `main` เข้า `release` (fast-forward เท่านั้น) ติดแท็ก `vx.y.z` และสร้าง GitHub Release
   - Vercel เห็น `release` เปลี่ยนแล้ว deploy ขึ้น drone.dekgp.com เอง
6. เช็กหน้า `/changelog` บนเว็บจริงว่าขึ้นเวอร์ชันใหม่

ทำมือแทน Actions ก็ได้: `git checkout release && git merge --ff-only main && git push && git tag vX.Y.Z && git push --tags`

## ย้อนกลับเมื่อพัง

- เร็วสุด: Vercel → Deployments → เลือก deploy ก่อนหน้า → **Promote to Production** (ไม่ต้องแก้โค้ด)
- ถาวร: `git revert` คอมมิตที่มีปัญหาบน `main` แล้วออกเวอร์ชัน PATCH ใหม่ตามขั้นตอนเดิม

## คำสั่งที่ใช้บ่อย

```bash
bun install            # ติดตั้งแพ็กเกจ
bun run dev            # รันเครื่องตัวเอง
bun run typecheck      # ตรวจชนิดข้อมูล
bun run build          # build เหมือนบน Vercel
bun run db:push        # ซิงก์ schema ไปฐานข้อมูล
```
