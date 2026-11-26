# ขึ้นเว็บและออกเวอร์ชัน (drone.dekgp.com บน Vercel)

> ช่วงที่โควตา Vercel เต็ม ใช้ [DEPLOY-KOMODO.md](DEPLOY-KOMODO.md) แทนส่วน Vercel (รันเป็น Docker บน Komodo ผ่าน Cloudflare Tunnel) หัวข้อสาขา ตัวแปร Google OAuth และการออกเวอร์ชันในไฟล์นี้ยังใช้ร่วมกัน

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

แล้วที่ GitHub เปิด Settings → Branches เพื่อตั้ง protection ให้ `release` ต้องผ่าน CI และห้าม force push

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


### เช็กลิสต์ปล่อยเวอร์ชัน 1.1.0 (แพลตฟอร์มเรียน)

1. ฐานข้อมูล: `bun run db:push` กับ `DATABASE_URL` ของจริง เพิ่มตาราง `LearnProfile`, `UnitProgress`, `Attempt`, `SkillStat`, `DailyRun` และคอลัมน์ใหม่ (เพิ่มอย่างเดียว ไม่แตะข้อมูลเดิม) ถ้าโจทย์ในหลังบ้านยังเป็นโค้ดตั้งต้นเก่า ใช้ชื่อย่อ (`sh`, `fw`) ต้องสลับโหมดเป็น "ย่อ" หรือแก้โค้ดตั้งต้นให้เป็นชื่อเต็ม
2. Google OAuth: ทำตามหัวข้อ "ตั้งค่าเข้าสู่ระบบด้วย Google" ด้านบน แล้วทดสอบด้วยบัญชี `@lukhamhan.ac.th` และบัญชี gmail ธรรมดา (ต้องถูกปฏิเสธ)
3. ตัวแปร: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL_DOMAIN` (ไม่ตั้งใช้ `lukhamhan.ac.th`) และ `ADMIN_EMAILS` ต้องมีอีเมลผู้ดูแลอย่างน้อยหนึ่งคน (เข้าได้แม้ไม่ใช่โดเมนโรงเรียน)
4. หลังขึ้นเว็บ: เข้า `/learn` ด้วยบัญชีโรงเรียน จบหน่วยแรก ทำภารกิจรายวันระดับง่าย แล้วเปิด `/admin/learners` ดูว่าข้อมูลเข้า
5. ถ้ามีปัญหา: ย้อนกลับด้วยการ deploy เวอร์ชันก่อนหน้าบน Vercel ตารางที่เพิ่มไม่ขวางเวอร์ชันเก่า

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

## เปิดห้องแข่ง Battle

ก่อนขึ้นโค้ด Battle ให้เพิ่มตารางใหม่ในฐานข้อมูลเป้าหมาย ติดตั้งด้วย `bun run db:push` ตามวิธีของโปรเจกต์ หรือรันไฟล์ `prisma/migrations/20261119090000_battle/migration.sql` ครั้งเดียวกับฐานข้อมูลเดิม เลือกวิธีเดียว

ทดสอบห้องซ้อมและห้องแข่งผ่านโดเมนจริงด้วยเบราว์เซอร์แยกกันอย่างน้อยสองตัว ดูว่าคะแนนขึ้นระหว่างบิน การกลับเข้าห้องกลางรอบยังเล่นต่อได้ และผู้ชมเปิดโค้ดได้เมื่อเก็บห้องแล้ว จากนั้นตั้ง `BATTLE_RANKED_ENABLED=1` บนเซิร์ฟเวอร์เพื่อเปิดห้องเก็บแต้ม

## เปิดรีโมทมือถือ

รหัสเชื่อมต่อ ก้าน และภาพสดของรีโมทมือถือเก็บในหน่วยความจำของเซิร์ฟเวอร์ ให้คอมและมือถือเปิดเว็บผ่านโดเมนเดียวกันที่ส่งคำขอไปยังโปรเซส Next.js ตัวเดียว เช่น Docker หนึ่งคอนเทนเนอร์ตาม [DEPLOY-KOMODO.md](DEPLOY-KOMODO.md) ถ้าแยกคำขอไปหลายโปรเซส รหัสอาจใช้ข้ามเครื่องไม่ได้

กล้องสำหรับสแกน QR ในเว็บใช้ HTTPS เมื่อเปิดจากมือถือ หากกำลังลองผ่าน HTTP บน Wi-Fi ในวงเดียวกัน ให้ใช้แอปกล้องเปิด QR หรือกรอกรหัสในหน้ารีโมท
