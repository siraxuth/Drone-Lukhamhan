# ขึ้นเว็บด้วย Komodo + Cloudflare Tunnel (drone.dekgp.com)

คู่มือนี้ใช้แทน Vercel ในช่วงที่โควตาเต็ม เว็บรันเป็น Docker บนเซิร์ฟเวอร์ที่คุม ด้วย Komodo แล้วออกเน็ตผ่าน Cloudflare Tunnel ไม่ต้องเปิดพอร์ตเข้าเซิร์ฟเวอร์ ส่วนฐานข้อมูล (Neon) และรูป (Cloudflare R2) ใช้ตัวเดิม ไม่ต้องย้าย

DEPLOY.md เดิมยังใช้ได้ทุกอย่างที่ไม่เกี่ยวกับ Vercel (สาขา `main` / `release`, CHANGELOG, Google OAuth, ตัวแปร)

## ภาพรวม

```
ผู้ใช้ ──https──▶ Cloudflare ──tunnel──▶ drone-lukhamhan-tunnel ──▶ drone-lukhamhan-web:3000
                                          (cloudflared)             (Next.js)
                                          └──── เครือข่าย Docker ชื่อ 46554454 ────┘
```

- เว็บฟังพอร์ต **3000 ภายในคอนเทนเนอร์เท่านั้น** ไม่มี `ports:` เปิดออกเครื่อง จึงไม่ชนกับเว็บอื่นที่ใช้พอร์ต 3000 บนเซิร์ฟเวอร์เดียวกัน
- ทุกอย่างอยู่ในเครือข่าย Docker ชื่อ `46554454`

> **สมมติฐานที่ผมตั้ง:** `46554454` คือ **ชื่อเครือข่าย Docker** ที่ให้เว็บนี้ใช้ ถ้าที่ตั้งใจจะบอกคืออย่างอื่น (เช่น เลขพอร์ตบนเครื่อง ซึ่งเป็นไปไม่ได้เพราะพอร์ตสูงสุด 65535) บอกได้เลย แก้ได้ที่เดียวใน `compose.yaml` ท้ายไฟล์

## ไฟล์ที่เพิ่มใน repo

| ไฟล์ | ทำอะไร |
| --- | --- |
| `Dockerfile` | build เว็บเป็น image (หลาย stage, Next standalone, Alpine และ Node 22; ผู้ใช้ไม่ใช่ root) |
| `.dockerignore` | ตัด `video/` (1 GB), `assets/`, `.git`, `.env*` ออกจากตอน build |
| `compose.yaml` | Stack ที่ Komodo ใช้: เว็บ + cloudflared บนเครือข่าย `46554454` |
| `next.config.mjs` | เพิ่มบรรทัดเดียว: ถ้ามี `BUILD_STANDALONE=1` ให้ออกไฟล์รันเดี่ยว (บน Vercel ไม่ตั้งค่านี้ ไม่มีผล) |

ไฟล์เหล่านี้ต้องอยู่บนสาขาที่ Komodo ดึง (ใช้ `release` ตาม DEPLOY.md) ให้รวมเข้า `main` → `release` ตามขั้นตอนปกติก่อน

**ที่ทดสอบแล้ว:** `next build` แบบ standalone ด้วยค่าหลอกแบบเดียวกับ CI ผ่าน และรัน `node server.js` จากโฟลเดอร์ที่ได้ ทุกหน้าหลักตอบ 200 (`/`, `/docs`, `/parts`, `/changelog`, `/login`, `/models/drone.glb`) `robots.txt` เปิดให้ค้นหา `/changelog` อ่าน CHANGELOG ได้
**ที่ยังไม่ได้ทดสอบ:** `docker build` จริง (เครื่องที่เขียนไม่มี Docker) ล็อกอิน Google ผ่านโดเมนจริง และตัว tunnel ดูหัวข้อ "ทดสอบครั้งแรก" ท้ายไฟล์

## 1. เตรียมเซิร์ฟเวอร์

ต้องมีบนเครื่องที่ Komodo Periphery รันอยู่:

- Docker กับ Docker Compose v2 (`docker compose version`)
- RAM ว่างอย่างน้อย **2 GB** ตอน build (Next.js build กินเยอะ ถ้าเครื่องเล็กให้เพิ่ม swap ไม่งั้น build ถูกฆ่ากลางทาง)
- ที่ว่างดิสก์ประมาณ 3 GB สำหรับ image และ cache
- ออกอินเทอร์เน็ตได้ (เว็บต่อ Neon, R2, Google ผ่านเน็ต และ cloudflared ต่อออกไปหา Cloudflare)

สร้างเครือข่าย (ทำครั้งเดียว ถ้ามีอยู่แล้วจะขึ้น error ว่ามีแล้ว ข้ามได้):

```bash
docker network create 46554454
docker network inspect 46554454 --format '{{.Name}} {{.Driver}}'
```

ถ้าเครือข่ายนี้มีเว็บอื่นใช้อยู่แล้ว ไม่ต้องทำอะไรเพิ่ม เว็บนี้เข้าไปอยู่ร่วมได้ ชื่อ service ใน `compose.yaml` ขึ้นต้นด้วย `drone-lukhamhan-` เพื่อไม่ซ้ำกับของใคร (ชื่อสั้นอย่าง `web` ซ้ำง่ายมาก และ Docker จะสุ่มส่งคำขอไปหาเว็บอื่นโดยไม่แจ้งเตือน)

## 2. สร้าง Tunnel ที่ Cloudflare

ต้องการ: โดเมน `dekgp.com` ใช้ DNS ของ Cloudflare (nameserver ชี้มาที่ Cloudflare) ถ้ายังไม่ใช่ ต้องย้ายก่อน ไม่งั้นสร้างเส้นทางให้อัตโนมัติไม่ได้

1. Cloudflare Dashboard → **Zero Trust** → Networks → **Tunnels** → Create a tunnel
2. เลือก **Cloudflared** ตั้งชื่อ `drone-lukhamhan`
3. หน้าติดตั้ง จะมีคำสั่งยาว ๆ ให้คัดลอก **เฉพาะ token** (สตริงยาวหลัง `--token`) เก็บไว้ ห้ามลงใน repo ไม่ต้องรันคำสั่งที่หน้านั้น เพราะเราให้ Komodo รันแทน
4. ไปแท็บ **Public Hostname** → Add:
   - Subdomain `drone` · Domain `dekgp.com` · Path ว่าง
   - Service: Type **HTTP** · URL **`drone-lukhamhan-web:3000`**
   - ชื่อต้องตรงกับ `container_name` / ชื่อ service ใน `compose.yaml` เป๊ะ ๆ และห้ามเป็น `localhost` เพราะ cloudflared อยู่คอนเทนเนอร์คนละตัวกับเว็บ
5. Cloudflare จะสร้างระเบียน DNS `drone` ให้เอง **แต่จะสร้างไม่ได้ถ้ามีระเบียน `drone` เดิมอยู่** (CNAME ไป `cname.vercel-dns.com` ที่ตั้งไว้ตาม DEPLOY.md) ดูหัวข้อสลับโดเมนด้านล่าง ว่าเมื่อไหร่ควรลบ

## 3. ตั้ง Stack ที่ Komodo

ชื่อเมนูและปุ่มอาจต่างเล็กน้อยตามเวอร์ชันของ Komodo ถ้าไม่เจอชื่อตรงนี้ ให้ดูช่องที่ความหมายใกล้เคียง

1. Resources → **Stacks** → New Stack ชื่อ `drone-lukhamhan`
2. **Server**: เลือกเซิร์ฟเวอร์ที่เตรียมไว้ในหัวข้อ 1
3. **Source** เลือก Git Repo
   - Git Provider `github.com` · Repo `siraxuth/Drone-Lukhamhan` · Branch **`release`**
   - ถ้า repo เป็น private ต้องเพิ่ม Git Provider Account (GitHub personal access token สิทธิ์อ่าน repo) ในการตั้งค่า Komodo ก่อน แล้วเลือกบัญชีนั้น
4. **Run Directory** `.` · **File Paths** `compose.yaml`
5. ปิด **Auto Pull** เพราะเว็บนี้สร้าง image เองจาก `build:` ไม่ได้ดึง `drone-lukhamhan:latest` จาก registry
6. เปิดตัวเลือก build ก่อน deploy (ชื่อประมาณ *Run Build* หรือ *Build before deploy*) เพื่อให้ Komodo สร้าง image ก่อนเริ่มเว็บ
7. ช่อง **Environment** ใส่ค่าตามตารางด้านล่าง (Komodo เขียนลงไฟล์ `.env` ข้าง `compose.yaml` ให้) ค่าลับให้เก็บเป็น Komodo **Secret / Variable** แล้วอ้างด้วย `[[ชื่อ]]` จะไม่โชว์ในหน้าเว็บ
8. กด Save → **Deploy** แล้วดู log ของ Stack ครั้งแรกใช้เวลา build ราว 5–10 นาที

### ตัวแปรของ Stack

| ชื่อ | ค่า | หมายเหตุ |
| --- | --- | --- |
| `TUNNEL_TOKEN` | token จากข้อ 2 | ลับ |
| `DATABASE_URL` | Neon pooled connection string | ลับ · ใช้ตัวเดียวกับที่ Vercel ใช้ |
| `BETTER_AUTH_SECRET` | ค่าเดียวกับบน Vercel | ลับ · ถ้าเปลี่ยนเป็นค่าใหม่ ทุกคนจะถูกล็อกเอาต์ |
| `BETTER_AUTH_URL` | `https://drone.dekgp.com` | |
| `NEXT_PUBLIC_SITE_URL` | `https://drone.dekgp.com` | ฝังตอน build |
| `ADMIN_EMAILS` | อีเมลแอดมิน คั่นด้วย `,` | |
| `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` | ชุดเดิม | ลับ · redirect URI `https://drone.dekgp.com/api/auth/callback/google` ลงทะเบียนไว้แล้วตาม DEPLOY.md ไม่ต้องแก้ |
| `ALLOWED_EMAIL_DOMAIN` | `lukhamhan.ac.th` | ไม่ใส่ก็ได้ |
| `R2_ENDPOINT` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET_NAME` | ชุดเดิม | ลับ |
| `R2_PUBLIC_URL` | ชุดเดิม | **ต้องมีตอน build** ไม่งั้นรูปจาก R2 ไม่แสดง |
| `GOOGLE_SITE_VERIFICATION` `BING_SITE_VERIFICATION` | ถ้ามี | ไม่บังคับ |
| `IMAGE_TAG` | `latest` | ไม่บังคับ ใช้ตั้งเลขเวอร์ชัน image |

ตัวแปรที่ขาด `compose.yaml` จะหยุดพร้อมข้อความบอกว่าขาดตัวไหน ก่อนเริ่ม build

### Deploy อัตโนมัติเมื่อออกเวอร์ชัน

ให้ GitHub แจ้ง Komodo ทุกครั้งที่ `release` เปลี่ยน (Release workflow ใน DEPLOY.md push เข้า `release` อยู่แล้ว):

1. ใน Stack กดเปิด Webhook แล้วคัดลอก URL ของ Deploy (หน้าตาประมาณ `https://<โดเมน Komodo>/listener/github/stack/<ชื่อหรือ id>/deploy`)
2. GitHub → repo → Settings → Webhooks → Add: Payload URL = URL นั้น · Content type `application/json` · Secret = webhook secret ที่ตั้งไว้ใน Komodo · เลือกเฉพาะ event **push**
3. Komodo จะ deploy เฉพาะเมื่อ push เข้าสาขาที่ Stack ตั้งไว้ (`release`) การ push เข้า `main` ไม่กระทบเว็บจริง

ถ้า Komodo ของคุณเข้าจากเน็ตไม่ได้ (ไม่มีโดเมนสาธารณะ) ใช้ตัวเลือก Poll for updates ของ Stack แทน จะดึงตามรอบเวลา

## 4. สลับโดเมนจาก Vercel มา Tunnel

ลำดับนี้ทำให้เว็บล่มสั้นที่สุด

1. Deploy Stack ให้สำเร็จก่อน ตรวจว่าคอนเทนเนอร์ทั้งสองสถานะ healthy / running และ log ของ `drone-lukhamhan-tunnel` ขึ้นว่าเชื่อมกับ Cloudflare แล้ว (`Registered tunnel connection`)
2. ทดสอบหน้าที่ไม่ต้องล็อกอินผ่านชื่อชั่วคราว: เพิ่ม Public Hostname อีกอัน เช่น `drone-test.dekgp.com` → `drone-lukhamhan-web:3000` แล้วเปิดดู ล็อกอินจะยังใช้ไม่ได้ที่ชื่อนี้ เพราะ `BETTER_AUTH_URL` ผูกกับ `drone.dekgp.com`
3. ถึงเวลาสลับ: ที่ DNS ของ Cloudflare **ลบระเบียน `drone` (CNAME → `cname.vercel-dns.com`)** แล้วกลับไปหน้า Tunnel ผูก Public Hostname `drone.dekgp.com` (ถ้าสร้างไว้แล้วในข้อ 2.4 ให้กดบันทึกซ้ำเพื่อให้สร้าง DNS) ช่วงนี้เว็บอาจเข้าไม่ได้ไม่กี่นาที
4. เปิด `https://drone.dekgp.com` ตรวจตามรายการ "ทดสอบครั้งแรก"
5. **อย่าเพิ่งลบโปรเจกต์ Vercel** เก็บไว้เป็นทางถอย ถ้าพัง ลบระเบียน tunnel แล้วใส่ CNAME เดิมคืน เว็บกลับไปที่ Vercel (ถ้ายังไม่ถูกระงับ) ลบ Domain `drone.dekgp.com` ออกจาก Vercel เมื่อมั่นใจแล้ว

## 5. ทดสอบครั้งแรก

- `https://drone.dekgp.com/robots.txt` ต้องเห็น `Allow: /` และ `Disallow: /admin` (ถ้าเห็น `Disallow: /` ทั้งเว็บ แปลว่าโหมด production ไม่ติด)
- เปิด `/parts`, `/simulator`, `/docs`, `/changelog` โมเดลโดรนต้องโหลด
- รูปจาก R2 แสดง (ถ้าไม่ขึ้น ดู `R2_PUBLIC_URL` ตอน build)
- ล็อกอินด้วยอีเมลโรงเรียน ต้องผ่านและเห็น `/learn` ส่วน gmail ธรรมดาต้องถูกปฏิเสธ
- เข้า `/admin` ด้วยอีเมลใน `ADMIN_EMAILS`
- ท้ายเว็บแสดงเวอร์ชันล่าสุดจาก CHANGELOG
- ดูว่ารีสตาร์ตเซิร์ฟเวอร์แล้วทั้งสองคอนเทนเนอร์กลับมาเอง (`restart: unless-stopped`)

## ออกเวอร์ชันและย้อนกลับ

**ออกเวอร์ชัน:** ทำตาม DEPLOY.md ทุกขั้น (CHANGELOG → `main` → Run Release workflow) พอ `release` เปลี่ยน Komodo จะ build และเปลี่ยนคอนเทนเนอร์เอง เว็บหยุดชั่วครู่ระหว่างสลับคอนเทนเนอร์ (ไม่กี่วินาที)

**ย้อนกลับ:** ที่ Stack ตั้ง **Commit** (หรือ Branch) เป็นคอมมิตก่อนหน้าที่ใช้ได้ แล้ว Deploy อีกครั้ง หรือ `git revert` บน `main` แล้วออกเวอร์ชัน PATCH ตามปกติ

**ฐานข้อมูล:** การ deploy ไม่รัน `prisma db push` (เหมือนบน Vercel) ถ้ามีการแก้ `prisma/schema.prisma` ให้รัน `bun run db:push` จากเครื่องคุณกับ `DATABASE_URL` จริงก่อนออกเวอร์ชัน

## ทำไมไม่ชนกับเว็บอื่น

- ไม่มี `ports:` เว็บไม่ได้ผูกพอร์ตใด ๆ บนเครื่องโฮสต์ พอร์ต 3000 ของเว็บอื่นจึงไม่เกี่ยว
- ชื่อ container และ service ขึ้นต้นด้วย `drone-lukhamhan-` ไม่ซ้ำกับของใคร
- ชื่อโปรเจกต์ compose `drone-lukhamhan` แยก volume / เครือข่ายอัตโนมัติจาก stack อื่น (stack นี้ไม่มี volume เพราะเก็บข้อมูลที่ Neon กับ R2)
- cloudflared ของเว็บนี้เป็นอุโมงค์แยก (token แยก) ถ้าเซิร์ฟเวอร์มี cloudflared ตัวอื่นอยู่แล้ว ไม่ชนกัน ตราบใดที่ไม่ใช้ token เดียวกัน
- ถ้าอยากใช้ cloudflared ตัวเดียวร่วมกับเว็บอื่น: ลบ service `drone-lukhamhan-tunnel` และ `TUNNEL_TOKEN` ออก ให้ cloudflared ตัวนั้นอยู่บนเครือข่าย `46554454` แล้วเพิ่ม Public Hostname `drone.dekgp.com` → `http://drone-lukhamhan-web:3000` ในอุโมงค์เดิม

## แก้ปัญหา

| อาการ | ตรวจอะไร |
| --- | --- |
| Cloudflare ขึ้น 502 / 1033 | `docker logs drone-lukhamhan-tunnel` · ชื่อใน Public Hostname ต้องเป็น `drone-lukhamhan-web:3000` · `docker network inspect 46554454` ต้องเห็นทั้งสองคอนเทนเนอร์ |
| ขึ้น 1016 / DNS error | ระเบียน `drone` เดิมยังอยู่ หรือยังไม่ได้ผูก Public Hostname |
| Deploy ล้มทันทีด้วย "ต้องตั้ง …" | ขาดตัวแปรที่ Environment ของ Stack |
| Build ตายกลางทางไม่มีข้อความ (exit 137) | RAM ไม่พอ เพิ่ม swap หรือ build ที่เครื่องอื่นแล้ว push เป็น image |
| ล็อกอินแล้วเด้งกลับ / `invalid origin` | `BETTER_AUTH_URL` และ `NEXT_PUBLIC_SITE_URL` ต้องเป็น `https://drone.dekgp.com` ตรง ๆ ไม่มี `/` ท้าย แล้ว Deploy ใหม่ |
| รูปไม่ขึ้น | `R2_PUBLIC_URL` ตอน build ว่างหรือผิด แก้แล้วต้อง build ใหม่ (restart เฉย ๆ ไม่พอ) |
| เว็บ unhealthy | `docker logs drone-lukhamhan-web` ส่วนมากคือ `DATABASE_URL` ผิด หรือเซิร์ฟเวอร์ออกเน็ตไม่ได้ |

## หมายเหตุ

- ใน container ไม่มีตัวแปร `VERCEL_*` โค้ดจึงตัดสินโหมด production จาก `NODE_ENV=production` (ตั้งไว้ใน `compose.yaml` แล้ว) และ origin ที่เชื่อถือได้มาจาก `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL`
- `cloudflare/cloudflared:latest` ควรปักเลขเวอร์ชันหลังทดสอบแล้ว เพื่อไม่ให้ตัวใหม่เปลี่ยนพฤติกรรมเองตอน deploy
- ถ้าเว็บถูกใช้หนักขึ้น อุโมงค์เดียวมีจุดเดียวที่ล้มได้ Cloudflare ให้รัน cloudflared หลายตัวด้วย token เดียวกันได้ (เพิ่ม `deploy.replicas` หรือรันบนอีกเซิร์ฟเวอร์)
