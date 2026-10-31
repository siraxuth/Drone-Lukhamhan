import type { CSSProperties, ReactNode } from 'react';
import { C, fontFamily } from '../theme';

/** หน้าต่างเบราว์เซอร์ (ใช้ในภาพ 16:9) */
export function BrowserFrame({ url, children, style }: { url: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ boxSizing: 'border-box', borderRadius: 28, overflow: 'hidden', border: `2px solid ${C.line}`, background: C.surface, boxShadow: '0 30px 80px rgba(28,31,37,0.14)', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', background: C.surface2, borderBottom: `2px solid ${C.line}`, flexShrink: 0 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />)}
        <div style={{ fontFamily, marginLeft: 18, flex: 1, height: 34, borderRadius: 12, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 20, color: C.muted }}>{url}</div>
      </div>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

/** กรอบมือถือ (ใช้ในภาพ 9:16) */
export function PhoneFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ boxSizing: 'border-box', borderRadius: 64, padding: 16, background: C.fg, boxShadow: '0 30px 80px rgba(28,31,37,0.25)', ...style }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 50, overflow: 'hidden', background: C.surface }}>
        {children}
        <div style={{ position: 'absolute', top: 14, left: '50%', width: 120, height: 32, marginLeft: -60, borderRadius: 99, background: C.fg }} />
      </div>
    </div>
  );
}

/** การ์ดมุมโค้งแบบเว็บ */
export function Card({ children, style, dark }: { children: ReactNode; style?: CSSProperties; dark?: boolean }) {
  return <div style={{ borderRadius: 32, border: `2px solid ${dark ? C.darkLine : C.line}`, background: dark ? C.darkSurface : C.surface, boxShadow: dark ? 'none' : '0 16px 40px rgba(28,31,37,0.07)', ...style }}>{children}</div>;
}
