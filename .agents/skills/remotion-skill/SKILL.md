---
name: remotion-skill
description: สร้างและแก้คลิปวิดีโอด้วย Remotion (React) ให้ได้งานแน่น คลีน เคลื่อนไหวตลอด ทั้ง 16:9 และ 9:16 จากโค้ดชุดเดียว — วาง storyboard, เขียนฉาก, kinetic typography, motion ตามจังหวะเพลง, สังเคราะห์เพลงและเสียงประกอบเอง, เรนเดอร์ ปรับความดัง และตรวจด้วยภาพนิ่ง ใช้เมื่อผู้ใช้พูดถึง Remotion, "ทำคลิป", "วิดีโอแนะนำ", "motion graphics", "explainer", "promo", "Reels/TikTok/Shorts", "คลิปแนวตั้ง", "/remotion-skill" หรือสั่งแก้คลิปในโฟลเดอร์ video/ ของ repo นี้ Use for any Remotion / programmatic video task.
---

# Remotion Skill: คลิปแน่น คลีน เคลื่อนไหวตลอด

คู่มือนี้สรุปจากการทำคลิปแนะนำเว็บชมรมโดรน (`video/` ใน repo นี้) ที่ผู้ใช้ตรวจและสั่งแก้มาหลายรอบ ใช้ได้ทั้ง Claude Code, Codex และ agent ตัวอื่นที่อ่าน `SKILL.md` ได้

ถ้างานอยู่ใน repo นี้ **เริ่มจากโค้ดที่มีอยู่ใน `video/` เสมอ** (ธีม layout motion ฉาก เสียง สคริปต์ ครบแล้ว) อย่าเขียนใหม่จากศูนย์ ถ้าเป็นโปรเจกต์อื่น ให้ลอกโครงในหัวข้อ "โครงโปรเจกต์" ไปใช้

## กฎเหล็ก (ผู้ใช้สั่งไว้แล้ว ห้ามฝ่า)

1. **คลีน ไม่มี glow** — ห้ามวงแสงฟุ้ง (`filter: blur` ใหญ่ๆ บนสี), ห้าม `drop-shadow` สีเรืองรอบจุด/ตัวอักษร, ห้ามกรอบเรืองแสง, ห้ามแถบแสงวิ่ง (shine/scan sweep) เงาธรรมดาใต้การ์ด (สีดำโปร่ง) ใช้ได้
2. **ไม่มีแฟลช** — ห้ามจอขาว/สีวาบตอนตัดภาพหรือเปลี่ยนรูป การเปลี่ยนต้องไหลต่อเนื่อง (morph, spring, slide, fade) ถ้าใส่ overlay ไว้ในกล่องย่อย มันจะกลายเป็น "กรอบสี่เหลี่ยมสีขาว" ที่ผู้ใช้เห็นแล้วไม่ชอบ
3. **เนื้อหาแน่น motion ตลอด** — ทุกเฟรมต้องมีอะไรขยับ: พื้นหลังไหล, กล้องซูม/เลื่อนช้าๆ, ของเต้นตามจังหวะ, ตัวเลขนับ, ของเข้าทีละชิ้น ห้ามจอนิ่งเกิน ~1 วินาที
4. **ห้ามแต่งตัวเลขหรือข้อเท็จจริง** — ตัวเลขทุกตัวต้องนับจากของจริง (เช่น `find content/docs -name "*.mdx" | wc -l`) ถ้าตัวเลขน้อยจนดูไม่ดี **ตัดทิ้ง** อย่าปั้น (ผู้ใช้ให้เอา "จำนวนผลงาน" ออกเพราะน้อยเกิน) ชื่อคนในกราฟิกจำลองต้องเป็นชื่อสมมติ
5. **โค้ดในคลิปต้องเป็นสไตล์ชมรม** — ใช้ `pArduino->` ตามบทเรียนจริง:
   ```cpp
   pArduino->calibration();
   delay(3000);
   pArduino->take_off();
   delay(3000);
   pArduino->move_forward_cm(100);
   pArduino->poshold(3);
   delay(300);
   ```
   คำสั่งที่มีจริง: `calibration()` `take_off()` `auto_land()` `set_height(cm)` `move_forward_cm` `move_backward_cm` `move_left_cm` `move_right_cm` `poshold(n)` ตรวจกับ `content/docs` ก่อนใช้คำสั่งใหม่ทุกครั้ง (`grep -rhoE "pArduino->[a-z_]+" content/docs | sort | uniq -c`)
6. **ข้อความไทยเป็นภาษาคน** — หัวเรื่องสั้น ≤ 2 บรรทัด ไม่ขายของ ไม่ AI slop (ใช้ skill `humanizer-th` ถ้ามี) ตัวอักษรใหญ่พอดูบนมือถือ
7. **ไม่ commit/push เอง** จนกว่าผู้ใช้สั่ง และห้าม commit ไฟล์ใหญ่ที่สร้างใหม่ได้ (`video/out/`, `node_modules/`, pptx)

## Workflow มาตรฐาน

```
1. อ่าน video/README.md + src/Intro.tsx (SCENES, SFX) เพื่อรู้ของที่มี
2. Storyboard: ตาราง ช็อต | เวลา | ภาพ | ข้อความ | motion | เสียง  (ดู references/storyboard.md)
3. เตรียม asset: capture หน้าเว็บ, ดึงรูปจริง, QR, เสียง
4. เขียน/แก้ฉากทีละฉาก → bunx tsc --noEmit
5. เรนเดอร์พรีวิว --scale=0.5 ทั้งสองขนาด → contact sheet → ดูเองทุกครั้งก่อนบอกผู้ใช้
6. เรนเดอร์จริง (bun run render = render + loudnorm -14 LUFS) + ภาพปก
7. ส่งไฟล์ให้ผู้ใช้ บอกตรงๆ ว่าตรวจอะไรแล้ว อะไรยังไม่ได้ดู
```

คำสั่ง (รันใน `video/`):

```bash
bun install
bunx tsc --noEmit                                   # ต้องผ่านก่อนเรนเดอร์
bunx remotion render Intro16x9 out/preview-16x9.mp4 --scale=0.5 --log=error
bunx remotion render Intro9x16 out/preview-9x16.mp4 --scale=0.5 --log=error
python3 ../.agents/skills/remotion-skill/scripts/contact-sheet.py out/preview-9x16.mp4 --safe 9x16
bun run render                                      # ตัวจริง → out/intro-16x9.mp4, out/intro-9x16.mp4
bunx remotion still Intro16x9 out/cover-16x9.jpg --frame=150
```

พรีวิว 0.5 เท่าใช้เวลาราว 45 วินาทีต่อขนาด ตัวจริงราว 1 นาทีต่อขนาด (60 วินาที 30 fps)

## โครงโปรเจกต์ (video/)

```
video/
  package.json          remotion @remotion/{cli,renderer,transitions,google-fonts} ปักเวอร์ชันเท่ากันหมด, zod ปักตามที่ remotion ขอ
  remotion.config.ts    jpeg 92, overwrite, gl=angle
  src/index.ts          registerRoot
  src/Root.tsx          <Composition> 2 ตัว: Intro16x9 1920×1080, Intro9x16 1080×1920 ใช้ component เดียวกัน
  src/Intro.tsx         SCENES (ความยาว) + TransitionSeries + เพลง + SFX timeline
  src/theme.ts          สี (hex จาก oklch ของเว็บ) + ฟอนต์ Noto Sans Thai
  src/layout.ts         useLayout(): portrait?, safe area, h1/h2/body
  src/ui/fx.tsx         Backdrop, useBeat, Camera, Rings, Counter, Marquee, Burst
  src/ui/Headline.tsx   kinetic headline ทีละคำ (Intl.Segmenter ภาษาไทย)
  src/ui/{Chip,Frames,Scene,motion}.tsx
  src/scenes/S1..S9     ฉากละไฟล์
  scripts/capture.ts    puppeteer-core + Chrome ในเครื่อง ถ่ายหน้าเว็บเป็น webp
  scripts/qr.ts         QR svg
  scripts/make-audio.py สังเคราะห์เพลง + SFX ด้วย numpy (ไม่ติดลิขสิทธิ์)
  scripts/finish.sh     loudnorm -14 LUFS (copy video stream)
```

ราก repo: `tsconfig.json` ต้อง `exclude: ["video"]` และ `.gitignore` มี `video/node_modules/`, `video/out/` ไม่งั้น Next ไปตรวจไฟล์ Remotion

## ระบบออกแบบ

| เรื่อง | ค่า |
| --- | --- |
| สี (light) | canvas `#f9fafb` · surface `#fff` · line `#dcdee0` · fg `#1c1f25` · muted `#5e646c` |
| สีแบรนด์ | blue `#006fd7` · red `#de0040` · emerald `#059669` · amber `#d97706` |
| สี (dark) | dark `#27272a` · darkSurface `#303033` · darkLine `#424245` · blueOnDark `#40befd` |
| ฟอนต์ | Noto Sans Thai 400/600/800 (`@remotion/google-fonts/NotoSansThai`) |
| ขนาด 16:9 | h1 96 · h2 44 · body 32 · safe 96/120 |
| ขนาด 9:16 | h1 92 · h2 46 · body 38 · safe บน 220 ล่าง 380 ซ้าย 80 ขวา 120 (กันปุ่ม TikTok/Reels) |
| มุม | การ์ด 28–32px, ปุ่ม/ป้าย 999px |
| จังหวะฉาก | มืด (เปิด/ปิด/ฉากโชว์) สลับ สว่าง (เนื้อหา) |

เลย์เอาต์: `Split` แนวนอน = ข้อความซ้าย ภาพขวา, แนวตั้ง = ข้อความบน ภาพล่าง ฉากที่ภาพกว้าง (โค้ด+สนาม) ใช้ คอลัมน์: หัวเรื่องบน แล้วแถวภาพข้างล่าง ทุกฉากต้องดูดีทั้งสองขนาด ห้ามออกแบบแค่ขนาดเดียว

## Motion toolkit (src/ui/fx.tsx + Headline.tsx)

| ของ | ใช้ทำอะไร | หมายเหตุ |
| --- | --- | --- |
| `Backdrop` | กริดจุดไหล + ดาว (ฉากมืด) | **ไม่มี orb/แสงฟุ้ง** แล้ว |
| `useBeat(offset)` | 1→0 ทุกจังหวะเพลง | `BEAT = 60/116*30 ≈ 15.52` เฟรม ใช้กับ scale ±2–6% |
| `Headline` | kinetic ทีละคำ โผล่จากใต้ mask + เอียง 7° → 0 | ส่ง `lines` เป็น string หรือ `[ 'ข้อความ', { em: 'คำเน้น' } ]` |
| `Counter` | ตัวเลขนับขึ้น ease-out cubic | เฉพาะตัวเลขจริง |
| `Rings` | วงเส้นขยายออก (ไม่ใช่แสง) | ตอนของสำคัญโผล่ |
| `Burst` | พลุกระดาษสีแบนๆ | ตอน "ผ่าน", ขึ้นอันดับ |
| `Marquee` | แถวข้อความวิ่ง | ทำเป็นฉากหลังจางๆ alpha ≤ 0.05 |
| `Camera` | ซูม/เลื่อนช้าตลอดฉาก | 1 → 1.06 |
| spring | `damping 10–16` เด้ง · `200` นุ่ม | ของเข้า stagger 2–14 เฟรม |
| 3D | `perspective(1600px) rotateY/rotateX` | จอเว็บเอียง, การ์ดพลิก |

สูตรเพิ่มเติม (morph จุดเป็นรูป/คำ, ตัดภาพตามจังหวะ, พิมพ์โค้ด+โดรนบิน, กระดานอันดับสลับ) อยู่ใน `references/recipes.md`

## เสียง

- ไม่มีพากย์ = ข้อความบนจอต้องเล่าเรื่องได้ครบตอนปิดเสียง
- `scripts/make-audio.py` สร้าง: `music` (116 BPM คอร์ด C–G–Am–F เบส อาร์เปจจิโอ เตะ สแนร์ ฉาบ), `motor` `whoosh` `pop` `typing` `chime` `sparkle` `hit` `riser`
- วางเสียงใน `SFX` ของ `Intro.tsx`: `[ไฟล์, ฉาก, เฟรมในฉาก, ความดัง, ความยาวสูงสุด?]` เวลาจริง = `startOf(ฉาก) + เฟรม` ตั้งเสียงให้ตรงกับ motion เฟรมต่อเฟรม (ตัดภาพ = hit, ป้ายเด้ง = pop, ผ่าน = chime+hit, ก่อนท่อนปิด = riser)
- ใช้เพลงอื่น: วางทับ `public/audio/music.wav` (≥ 60 วิ) ต้องเป็นเพลงที่ใช้ได้โดยไม่ติดลิขสิทธิ์
- ความดังสุดท้าย −14 LUFS (`finish.sh`) วัดด้วย `ffmpeg -i out.mp4 -af ebur128 -vn -f null - 2>&1 | grep " I:"`

## ตรวจงาน (ห้ามข้าม)

1. `bunx tsc --noEmit` ใน `video/` และ `bunx tsc --noEmit` ที่ราก (ยืนยันว่าไม่กวนเว็บ)
2. เรนเดอร์พรีวิวทั้งสองขนาด แล้วทำ contact sheet ด้วย `scripts/contact-sheet.py` (วาดกรอบ safe area สีแดงให้ด้วย) **เปิดดูภาพเอง** หา: ข้อความตัดบรรทัดแปลก, ล้น safe area, ของทับกัน, ฉากว่าง, ตัวเลขผิด
3. ฉากที่มี morph/การเปลี่ยนรูป ใช้ `remotion still --frame=N` ดูทีละเฟรมสำคัญ
4. `ffprobe` ยืนยัน 60 วิ 30 fps ขนาดถูก มี audio
5. รายงานผู้ใช้ตามจริง: ตรวจจากภาพนิ่งกี่จุด ยังไม่ได้ดูเต็มความเร็วหรือไม่

## กับดักที่เจอมาแล้ว

| อาการ | สาเหตุ | แก้ |
| --- | --- | --- |
| กรอบสี่เหลี่ยมสีขาววาบในฉาก | overlay แฟลชอยู่ในกล่องย่อย | ไม่ใช้แฟลชเลย |
| มือถือในกรอบล้นลงล่าง | padding + `height:100%` ไม่ใช่ border-box | ใส่ `boxSizing: 'border-box'` และใช้ flex แทน grid placeItems |
| หัวเรื่องในฉากย่อยไม่ขยับ | `delay` นับจากเฟรมของฉาก แต่ส่วนย่อยเริ่มกลางฉาก | ส่ง `delay={จุดเริ่มส่วนย่อย}` |
| คำไทยตัดผิดที่ | ไม่ได้แบ่งคำ | `Intl.Segmenter('th', { granularity: 'word' })` และกำหนดบรรทัดเองเป็น array |
| จุดเรียงเป็นคำแล้วอ่านไม่ออก | สุ่มจุดจากพิกเซล | ใช้กริดที่ระยะห่างให้จำนวนจุด ≤ N (dot-matrix) |
| ฟอนต์ไม่ตรงตอนวาด canvas | วาดก่อนฟอนต์โหลด | `delayRender` + `document.fonts.load(...)` แล้ว `continueRender` |
| TS error ใน TransitionSeries | presentation หลายชนิดใน array เดียว | `TransitionPresentation<any>[]` |
| คำเตือน version mismatch | zod/remotion คนละเวอร์ชัน | ปักเวอร์ชัน remotion ทุกตัวเท่ากัน, `bun add zod@<ตามที่ขอ> --exact` |
| ภาพหน้าจอ docs sidebar หาย | ถ่ายยาวเกินจอ sidebar fixed อยู่จอแรก | คอม: ถ่ายจอเดียว · มือถือ: ถ่ายยาว 3 จอได้ |
| ปุ่ม "วิธีใช้"/dev indicator ติดภาพ | — | ซ่อนด้วย CSS ใน capture (`button[aria-label="ดูวิธีใช้หน้านี้"]`, `nextjs-portal`) |
| dev server ต่อไม่ได้ | `bun run build` ทับ `.next` หรือ server หยุด | เปิด dev server ใหม่ก่อน capture |
| เสียงเบาเกิน | ผสมเพลงเบา | `finish.sh` loudnorm |
| ตัวเลขดูน้อย | — | ตัดออก ไม่ปั้นตัวเลข |

## เมื่อผู้ใช้สั่งแก้

- "แน่นกว่านี้/โหดกว่านี้" → เพิ่มชั้น motion (พื้นหลัง, กล้อง, stagger, เต้นตามจังหวะ, ตัดภาพตามจังหวะ, ตัวเลขนับ, 3D tilt) **แต่ยังคลีน** ตามกฎข้อ 1–2
- "คลีนกว่านี้" → ลบเอฟเฟกต์ตกแต่ง ไม่ลดเนื้อหา
- แก้ข้อความ → แก้ในไฟล์ฉาก แล้วดูว่าตัดบรรทัดสวยทั้งสองขนาด
- เปลี่ยนความยาวฉาก → แก้ `SCENES` แล้วเลื่อน `SFX` ตาม (`DURATION` = ผลรวม − 12 × (จำนวนฉาก − 1) ต้องได้ 1800 สำหรับ 60 วิ)
