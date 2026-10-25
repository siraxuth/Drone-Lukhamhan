# ชมรมโดรน ลือคำหาญฯ — drone.dekgp.com

เว็บเรียนโดรนของชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ: บทเรียนภาษาไทยตั้งแต่หลักการบินจนถึงเขียนโค้ดสั่งโดรน, ตัวจำลองการบิน 3 มิติขนาดสนามจริง, สนามและกติกาแข่งขัน, และหลังบ้านจัดการเนื้อหา

เวอร์ชันปัจจุบัน: ดู [CHANGELOG.md](CHANGELOG.md) (และหน้า `/changelog` บนเว็บ)

## เทคโนโลยี

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · shadcn/ui (Base UI) · Fumadocs (บทเรียน MDX) · React Three Fiber (โดรน/สนาม 3 มิติ) · Prisma 7 + Neon Postgres · Better Auth · Cloudflare R2 · Tiptap · ใช้ Bun

## เริ่มพัฒนา

```bash
bun install
cp .env.example .env.local     # แล้วใส่ค่าจริง
bun run db:push                # สร้างตารางในฐานข้อมูล
bun run prisma/seed-challenges.ts   # (ไม่บังคับ) ใส่โจทย์ฝึกตัวอย่าง 14 ข้อ
bun run dev                    # http://localhost:3000
```

## โครงสร้างโฟลเดอร์

| พาธ | อะไร |
| --- | --- |
| `content/docs/` | บทเรียน (MDX) แยกหมวด `meta.json` กำหนดลำดับ |
| `src/app/` | หน้าและ API (หน้าแรก, `/docs`, `/simulator`, `/field`, `/works`, `/changelog`, `/team`, `/admin`) |
| `src/flight/` | เอนจินและตัวจำลองการบิน |
| `src/field/` | สนาม 3 มิติ/2 มิติ |
| `src/scene/` | โดรน 3 มิติบนหน้าแรก |
| `src/rules/` | กติกาแข่งขันรายปี (ข้อมูล ไม่ใช่ UI) |
| `src/lib/` | ฐานข้อมูล, auth, SEO (`site.ts`, `schema.ts`, `og.tsx`) |
| `prisma/` | schema และ seed |
| `assets/blender/` | ไฟล์ต้นฉบับโมเดลโดรน (ไม่เสิร์ฟสาธารณะ) |
| `.claude/skills/` | สกิลผู้ช่วยเขียน (`humanizer-th` ขัดข้อความภาษาไทย) |

## ขึ้นเว็บ

สองสาขา: `main` (รวมงาน → ลิงก์ทดลอง) และ `release` (→ drone.dekgp.com) อ่านขั้นตอนเต็มใน [DEPLOY.md](DEPLOY.md)

## ที่มาและเครดิต

- กติกาและขนาดสนามอ้างอิงเอกสารการแข่งขัน ปี ๒๕๖๙ ของสมาคมกีฬาเครื่องบินจำลองและวิทยุบังคับ
- ภาพจากคู่มือ RCSA EDU ในบทเรียนเป็นลิขสิทธิ์ของ RCSA ใช้เพื่อการศึกษาและใส่เครดิตไว้ที่แต่ละภาพ (รายการใน `docs-images.md`)
- `humanizer-th` ดัดแปลงจาก [blader/humanizer](https://github.com/blader/humanizer) (MIT)
