<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Skills ของ repo นี้

skill อยู่ที่ `.agents/skills/<ชื่อ>/SKILL.md` (Codex และ agent ที่รองรับมาตรฐาน Agent Skills อ่านจากที่นี่ · Claude Code เห็นผ่าน symlink ใน `.claude/skills/`) ถ้า agent ของคุณไม่โหลด skill เอง ให้เปิดอ่าน `SKILL.md` ที่ตรงกับงานก่อนเริ่ม

- `remotion-skill` — ทำ/แก้คลิปวิดีโอด้วย Remotion ในโฟลเดอร์ `video/` (16:9 และ 9:16, motion แน่นแต่คลีน, เสียงสังเคราะห์, เรนเดอร์และตรวจ)
