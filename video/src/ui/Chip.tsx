import type { ReactNode } from 'react';
import { C, fontFamily } from '../theme';
import { useLayout } from '../layout';
import { useIn } from './motion';

/** ป้ายข้อดีสั้นๆ เด้งเข้าทีละอัน */
export function Chip({ children, delay, color = C.blue }: { children: ReactNode; delay: number; color?: string }) {
  const L = useLayout();
  const p = useIn(delay, 14);
  return (
    <div style={{ fontFamily, display: 'inline-flex', alignItems: 'center', gap: 16, padding: L.portrait ? '18px 30px' : '16px 28px', borderRadius: 999, background: C.surface, border: `2px solid ${C.line}`, fontSize: L.body, fontWeight: 600, color: C.fg, opacity: Math.min(1, p * 1.4), transform: `scale(${0.6 + 0.4 * p})`, transformOrigin: 'left center', boxShadow: '0 8px 24px rgba(28,31,37,0.06)' }}>
      <span style={{ width: 16, height: 16, borderRadius: 999, background: color, flexShrink: 0 }} />
      {children}
    </div>
  );
}
