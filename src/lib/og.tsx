import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE } from './site';

export const OG_SIZE = { width: 1200, height: 630 } as const;

const font = (f: string) => readFile(join(process.cwd(), 'src/lib/fonts', f));

/** ภาพแชร์ 1200×630 (Facebook/LINE/X) ฟอนต์ Noto Sans Thai (ตัวเดียวกับทั้งเว็บ) */
export async function ogImage({ title, kicker = SITE.fullName, sub }: { title: string; kicker?: string; sub?: string }) {
  const [thai700, latin700, thai400, latin400] = await Promise.all([
    font('noto-sans-thai-thai-700-normal.woff'), font('noto-sans-thai-latin-700-normal.woff'), font('noto-sans-thai-thai-400-normal.woff'), font('noto-sans-thai-latin-400-normal.woff'),
  ]);
  const size = title.length > 46 ? 58 : title.length > 28 ? 72 : 88;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: 'linear-gradient(135deg,#0b0d12 0%,#10203f 100%)', color: '#fff', fontFamily: 'NotoLatin, NotoThai' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 32, color: '#9db4ff' }}>
          <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 7, background: '#3b82f6' }} />
          {kicker}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', fontSize: size, fontWeight: 700, lineHeight: 1.18, letterSpacing: -1 }}>{title}</div>
          {sub && <div style={{ display: 'flex', fontSize: 34, color: '#b8c2d6', lineHeight: 1.4 }}>{sub.slice(0, 120)}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, color: '#7f8aa3' }}>
          <div style={{ display: 'flex' }}>drone.dekgp.com</div>
          <div style={{ display: 'flex', gap: 12 }}><span style={{ color: '#3b82f6' }}>เรียน</span><span>ซ้อม</span><span style={{ color: '#f43f5e' }}>แข่ง</span></div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'NotoThai', data: thai700, weight: 700, style: 'normal' },
        { name: 'NotoLatin', data: latin700, weight: 700, style: 'normal' },
        { name: 'NotoThai', data: thai400, weight: 400, style: 'normal' },
        { name: 'NotoLatin', data: latin400, weight: 400, style: 'normal' },
      ],
    },
  );
}
