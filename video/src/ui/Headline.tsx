import type { ReactNode } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, fontFamily } from '../theme';
import { useLayout } from '../layout';
import { rise, useIn } from './motion';

/** ส่วนของบรรทัด: ข้อความธรรมดา หรือ { em } = คำเน้นสีแบรนด์ */
export type Seg = string | { em: string };
type Props = { lines: Array<string | Seg[]>; sub?: ReactNode; delay?: number; dark?: boolean; align?: 'left' | 'center'; scale?: number };

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const words = (s: string) => (seg ? [...seg.segment(s)].map((x) => x.segment) : s.split(/(\s+)/));

/** หัวเรื่องแบบ kinetic: ทีละคำโผล่จากใต้เส้น (มี mask) เอียงนิดแล้วตั้งตรง · ไม่เกิน 2 บรรทัด */
export function Headline({ lines, sub, delay = 0, dark = false, align, scale = 1 }: Props) {
  const L = useLayout();
  const center = (align ?? (L.portrait ? 'center' : 'left')) === 'center';
  let n = 0;
  const lineEls = lines.map((line, li) => {
    const parts = (typeof line === 'string' ? [line] : line).flatMap((p) => (typeof p === 'string' ? words(p).map((w) => ({ w, em: false })) : words(p.em).map((w) => ({ w, em: true }))));
    return (
      <div key={li} style={{ fontSize: L.h1 * scale, fontWeight: 800, lineHeight: 1.28, letterSpacing: '-0.01em' }}>
        {parts.map((p, i) => <Word key={i} delay={delay + 2 * n++} em={p.em} dark={dark}>{p.w}</Word>)}
      </div>
    );
  });
  const subIn = useIn(delay + 2 * n + 6);
  return (
    <div style={{ fontFamily, textAlign: center ? 'center' : 'left', color: dark ? '#fff' : C.fg }}>
      {lineEls}
      {sub && <p style={{ ...rise(subIn, 24), margin: `${L.portrait ? 26 : 22}px 0 0`, fontSize: L.h2, fontWeight: 400, lineHeight: 1.45, color: dark ? '#c9cbd1' : C.muted }}>{sub}</p>}
    </div>
  );
}

function Word({ children, delay, em, dark }: { children: string; delay: number; em: boolean; dark: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
  if (/^\s+$/.test(children)) return <span style={{ whiteSpace: 'pre' }}>{children}</span>;
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.12em 0.02em 0.18em', margin: '-0.12em -0.02em -0.18em' }}>
      <span style={{ display: 'inline-block', color: em ? (dark ? C.blueOnDark : C.blue) : undefined, transform: `translateY(${(1 - p) * 115}%) rotate(${(1 - p) * 7}deg)`, transformOrigin: 'left bottom' }}>{children}</span>
    </span>
  );
}
