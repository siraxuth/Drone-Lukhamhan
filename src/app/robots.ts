import type { MetadataRoute } from 'next';
import { abs, SITE } from '@/lib/site';

/** production: เปิดให้ค้นหา ยกเว้นหลังบ้านและ API · preview/dev: ปิดทั้งหมด */
export default function robots(): MetadataRoute.Robots {
  if (!SITE.isProduction) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/login'] }],
    sitemap: abs('/sitemap.xml'),
    host: SITE.url,
  };
}
