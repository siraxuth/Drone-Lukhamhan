import { source } from '@/lib/source';
import { abs, SITE } from '@/lib/site';

export const revalidate = 3600;

/** llms.txt: สารบัญเว็บสำหรับโมเดลภาษา/ตัวช่วยค้นหา (มาตรฐาน llmstxt.org) */
export function GET() {
  const pages = source.getPages();
  const lines = [
    `# ${SITE.fullName}`,
    '',
    `> ${SITE.description}`,
    '',
    '## หน้าหลัก',
    `- [หน้าแรก](${abs('/')}): แนะนำชมรมและภาพรวม`,
    `- [ตัวจำลองการบิน](${abs('/simulator')}): เขียนโค้ดสั่งโดรนแล้วดูบินในสนาม 3 มิติ`,
    `- [สนามและกติกา](${abs('/field')}): กติกาการแข่งขันและสนามขนาดจริง`,
    `- [ผลงาน](${abs('/works')}): ผลงานที่ผ่านมาของชมรม`,
    '',
    '## บทเรียน',
    ...pages.map((p) => `- [${p.data.title}](${abs(p.url)})${p.data.description ? `: ${p.data.description}` : ''}`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
