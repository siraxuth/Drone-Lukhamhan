# syntax=docker/dockerfile:1.7
# เว็บชมรมโดรน ลือคำหาญฯ สำหรับรันเองบนเซิร์ฟเวอร์ (Komodo) · ขั้นตอนเต็มดู DEPLOY-KOMODO.md
# build บน Vercel ไม่ได้ใช้ไฟล์นี้

# Node รันเว็บ ส่วน bun ใช้ติดตั้งแพ็กเกจและเรียกสคริปต์ build (เวอร์ชันตรงกับ packageManager ใน package.json)
FROM node:22-slim AS base
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ค่าสองตัวนี้ฝังตอน build (รูปจาก R2 และลิงก์ canonical) ส่งผ่าน build args จาก compose.yaml
ARG NEXT_PUBLIC_SITE_URL=https://drone.dekgp.com
ARG R2_PUBLIC_URL=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    R2_PUBLIC_URL=$R2_PUBLIC_URL \
    BUILD_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1
# ค่าหลอกแบบเดียวกับ CI (.github/workflows/ci.yml): build ไม่ต่อฐานข้อมูลจริง
# และเป็น ENV ของ stage นี้เท่านั้น ไม่ติดไปกับ image ที่ใช้รัน
ENV DATABASE_URL=postgresql://ci:ci@localhost/ci \
    BETTER_AUTH_SECRET=ci-secret-ci-secret-ci-secret-1234 \
    BETTER_AUTH_URL=http://localhost:3000
RUN bun run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# ท้ายเว็บอ่าน CHANGELOG.md จาก process.cwd() ตอนรัน (src/lib/changelog.ts)
COPY --from=build --chown=node:node /app/CHANGELOG.md ./CHANGELOG.md
USER node
EXPOSE 3000
CMD ["node", "server.js"]
