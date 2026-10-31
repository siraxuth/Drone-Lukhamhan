import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';

/** จังหวะเพลง 116 BPM ที่ 30 fps */
export const BEAT = (60 / 116) * 30;

/** ค่ากระตุก 1 → 0 ทุกจังหวะ (ใช้เต้นตามเพลง) */
export function useBeat(offset = 0) {
  const frame = useCurrentFrame();
  const local = ((frame + offset) % BEAT + BEAT) % BEAT;
  return Math.exp(-local / 3.5);
}

/** พื้นหลังเคลื่อนไหวแบบเรียบ: กริดจุดไหล + ดาวลอย (ฉากมืด) ไม่มีแสงฟุ้ง */
export function Backdrop({ dark }: { dark?: boolean; hue?: 'blue' | 'red' | 'mix' }) {
  const frame = useCurrentFrame();
  const dot = dark ? 'rgba(255,255,255,0.09)' : 'rgba(28,31,37,0.07)';
  const shift = (frame * 0.6) % 48;
  return (
    <AbsoluteFill style={{ background: dark ? C.dark : C.canvas, overflow: 'hidden' }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${dot} 2px, transparent 2.4px)`, backgroundSize: '48px 48px', backgroundPosition: `${shift}px ${shift * 0.5}px` }} />
      {dark && <Stars />}
    </AbsoluteFill>
  );
}

function Stars() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <>
      {Array.from({ length: 70 }, (_, i) => {
        const x = random(`sx${i}`) * width;
        const y = ((random(`sy${i}`) * height + frame * (0.3 + random(`sv${i}`) * 1.2)) % height);
        const s = 1.5 + random(`ss${i}`) * 2.5;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: 9, background: '#fff', opacity: 0.25 + 0.5 * Math.abs(Math.sin(frame / 12 + i)) }} />;
      })}
    </>
  );
}

/** กล้องค่อยๆ ซูมและเลื่อนตลอดฉาก ให้ภาพไม่นิ่ง */
export function Camera({ children, dur, from = 1, to = 1.06, panX = 0, panY = 0 }: { children: ReactNode; dur: number; from?: number; to?: number; panX?: number; panY?: number }) {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, dur], [0, 1], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ transform: `translate(${panX * k}px, ${panY * k}px) scale(${from + (to - from) * k})` }}>{children}</AbsoluteFill>;
}

/** แฟลชขาวสั้นๆ ตอนตัดภาพ */
export function Flash({ at, color = '#fff' }: { at: number; color?: string }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 2, at + 9], [0, 0.85, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return o > 0 ? <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: 'none' }} /> : null;
}

/** วงคลื่นขยายออก (ใช้ตอนโลโก้/ปุ่มโผล่) */
export function Rings({ at, color, size, count = 3, style }: { at: number; color: string; size: number; count?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, ...style }}>
      {Array.from({ length: count }, (_, i) => {
        const t = frame - at - i * 7;
        if (t < 0 || t > 40) return null;
        const k = t / 40;
        return <div key={i} style={{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: '50%', border: `${6 * (1 - k) + 1}px solid ${color}`, opacity: 1 - k, transform: `scale(${0.4 + k * 1.6})` }} />;
      })}
    </div>
  );
}

/** ตัวเลขนับขึ้น */
export function Counter({ to, from = 0, start, dur = 30, suffix = '' }: { to: number; from?: number; start: number; dur?: number; suffix?: string }) {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [start, start + dur], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - (1 - t) ** 3 });
  return <>{Math.round(v).toLocaleString('th-TH')}{suffix}</>;
}

/** แถบข้อความวิ่งยาวๆ (marquee) */
export function Marquee({ items, speed = 3, reverse, style, itemStyle }: { items: string[]; speed?: number; reverse?: boolean; style?: CSSProperties; itemStyle?: CSSProperties }) {
  const frame = useCurrentFrame();
  const x = (reverse ? 1 : -1) * ((frame * speed) % 2400);
  const list = [...items, ...items, ...items, ...items];
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', ...style }}>
      <div style={{ display: 'inline-flex', gap: 20, transform: `translateX(${x - (reverse ? 2400 : 0)}px)` }}>
        {list.map((t, i) => <span key={i} style={itemStyle}>{t}</span>)}
      </div>
    </div>
  );
}

/** อนุภาคระเบิดออกจากจุดหนึ่ง (confetti) */
export function Burst({ at, x, y, colors, count = 28, spread = 420 }: { at: number; x: number | string; y: number | string; colors: string[]; count?: number; spread?: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 50) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const ang = random(`ba${at}${i}`) * Math.PI * 2;
        const v = 0.4 + random(`bv${at}${i}`) * 0.6;
        const k = 1 - (1 - t / 50) ** 3;
        const dx = Math.cos(ang) * spread * v * k;
        const dy = Math.sin(ang) * spread * v * k + 180 * (t / 50) ** 2;
        const s = 10 + random(`bs${at}${i}`) * 14;
        return <div key={i} style={{ position: 'absolute', left: dx, top: dy, width: s, height: s * 0.6, borderRadius: 3, background: colors[i % colors.length], opacity: 1 - t / 50, transform: `rotate(${t * 12 * (v - 0.7)}rad)` }} />;
      })}
    </div>
  );
}
