import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ไฟล์ที่อ่านด้วย fs ตอนรัน ต้องบอกให้ Vercel แพ็กไปกับฟังก์ชันด้วย
  outputFileTracingIncludes: {
    '/sitemap.xml': ['./CHANGELOG.md'],
    '/changelog': ['./CHANGELOG.md'],
    // ท้ายเว็บอ่าน CHANGELOG.md เพื่อโชว์ "มีอะไรใหม่" ทุกหน้า
    '/**': ['./CHANGELOG.md'],
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];
    return [
      { source: '/:path*', headers: security },
      // หลังบ้านและ API ห้ามเข้าผลค้นหา (ซ้ำกับ robots.txt เพื่อกันกรณีลิงก์หลุด)
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/login', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      // ไฟล์โมเดล/ภาพ/ไฟล์โหลดเปลี่ยนไม่บ่อย: แคชที่เบราว์เซอร์ 7 วัน ตรวจใหม่ในพื้นหลัง
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/docs/:file(.+\\.webp)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/field/:file(.+\\.webp)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
  async redirects() {
    return [
      { source: '/docs/code/write-a-mission', destination: '/docs/code/first-flight', permanent: true },
      { source: '/docs/protocol/layers', destination: '/docs/advanced/protocol', permanent: true },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // รูปทั้งหมดอยู่บน Cloudflare R2
    remotePatterns: process.env.R2_PUBLIC_URL
      ? [{ protocol: 'https', hostname: new URL(process.env.R2_PUBLIC_URL).hostname }]
      : [],
  },
};

export default withMDX(config);
