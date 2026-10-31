import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { useLayout } from '../layout';
import { Backdrop } from './fx';

/** พื้นเคลื่อนไหวของแต่ละฉาก + กรอบเนื้อหาที่เว้นระยะปลอดภัยแล้ว */
export function Scene({ dark, hue, children, style, back }: { dark?: boolean; hue?: 'blue' | 'red' | 'mix'; children: ReactNode; style?: CSSProperties; back?: ReactNode }) {
  const L = useLayout();
  return (
    <AbsoluteFill>
      <Backdrop dark={dark} hue={hue} />
      {back}
      <AbsoluteFill style={{ paddingTop: L.safe.top, paddingBottom: L.safe.bottom, paddingLeft: L.safe.left, paddingRight: L.safe.right, ...style }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

/** แบ่งจอ: แนวนอน = ข้อความซ้าย ภาพขวา · แนวตั้ง = ข้อความบน ภาพล่าง */
export function Split({ text, visual, ratio = 0.42 }: { text: ReactNode; visual: ReactNode; ratio?: number }) {
  const L = useLayout();
  if (L.portrait) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: L.gap }}>
        <div style={{ flexShrink: 0 }}>{text}</div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>{visual}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: L.gap }}>
      <div style={{ width: `${ratio * 100}%`, flexShrink: 0 }}>{text}</div>
      <div style={{ position: 'relative', flex: 1, height: '100%' }}>{visual}</div>
    </div>
  );
}
