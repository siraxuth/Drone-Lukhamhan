import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, fontFamily } from '../theme';
import { useLayout } from '../layout';
import { Counter, Rings, useBeat } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { rise, useIn } from '../ui/motion';
import { Scene } from '../ui/Scene';

const URL = 'drone.dekgp.com';
const STATS = [
  { n: 68, label: 'หน้าบทเรียน', color: C.blue },
  { n: 5, label: 'สายคอร์สเรียน', color: C.emerald },
  { n: 3, label: 'สนามจำลอง', color: C.red },
];

/** S2 (4–8 วิ): โลโก้กระแทกเข้ากลางจอ ชื่อชมรม พิมพ์ที่อยู่เว็บ และตัวเลขสรุป */
export function S2Brand() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame: frame - 2, fps, config: { damping: 11, mass: 0.7 } });
  const pulse = useBeat(4);
  const url = useIn(30);
  const typed = Math.round(interpolate(frame, [32, 58], [0, URL.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const size = L.portrait ? 260 : 210;
  return (
    <Scene hue="mix" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <Rings at={6} color={C.blue} size={size * 1.3} />
        <Img src={staticFile('img/logo.webp')} style={{ width: size, height: size, opacity: Math.min(1, slam * 2), transform: `scale(${(2.6 - 1.6 * slam) * (1 + pulse * 0.03)}) rotate(${(1 - slam) * -25}deg)` }} />
      </div>
      <div style={{ marginTop: 28 }}>
        <Headline align="center" delay={10} scale={1.1} lines={['ชมรมโดรน']} sub={L.portrait ? <>โรงเรียนลือคำหาญ<br />วารินชำราบ</> : 'โรงเรียนลือคำหาญวารินชำราบ'} />
      </div>
      <div style={{ ...rise(url, 20), marginTop: 30, padding: '14px 34px', borderRadius: 999, background: C.blue, color: '#fff', fontSize: L.body * 1.1, fontWeight: 600, minWidth: L.body * 9, transform: `${rise(url, 20).transform} scale(${1 + pulse * 0.02})` }}>
        {URL.slice(0, typed)}<span style={{ opacity: typed < URL.length && Math.floor(frame / 6) % 2 ? 1 : 0 }}>|</span>
      </div>
      <div style={{ display: 'flex', gap: L.portrait ? 20 : 28, marginTop: L.portrait ? 56 : 40 }}>
        {STATS.map((s, i) => <Stat key={s.label} {...s} delay={58 + i * 8} />)}
      </div>
    </Scene>
  );
}

function Stat({ n, label, color, delay }: { n: number; label: string; color: string; delay: number }) {
  const L = useLayout();
  const p = useIn(delay, 13);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 50}px) scale(${0.7 + 0.3 * p})`, padding: L.portrait ? '18px 22px' : '16px 30px', borderRadius: 28, background: C.surface, border: `2px solid ${C.line}`, minWidth: L.portrait ? 230 : 220 }}>
      <div style={{ fontSize: L.h1 * 0.8, fontWeight: 800, color, lineHeight: 1.1 }}><Counter to={n} start={delay} dur={24} /></div>
      <div style={{ fontSize: L.body * 0.85, color: C.muted }}>{label}</div>
    </div>
  );
}
