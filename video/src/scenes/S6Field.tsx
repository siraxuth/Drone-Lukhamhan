import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';
import { useBeat } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { Scene } from '../ui/Scene';

const EVENTS = [
  { img: 'mission-3d', name: 'ปล่อยสัมภาระ', en: 'Drone Mission', tag: 'ปล่อยบอลลงหลุม' },
  { img: 'aviation-3d', name: 'ทำลายลูกโป่ง', en: 'Aviation Mastery', tag: 'ลอดห่วง เจาะลูกโป่ง' },
  { img: 'innovation-3d', name: 'ยิงลูกดอก', en: 'Drone Innovation Challenge', tag: 'เล็ง ยิงเป้า' },
];

/** S6 (32–39 วิ): การ์ดสนามสามใบพลิกเข้าแบบ 3 มิติ */
export function S6Field() {
  const L = useLayout();
  return (
    <Scene hue="mix">
      <div style={{ display: 'flex', flexDirection: 'column', gap: L.portrait ? 36 : 52, height: '100%' }}>
        <Headline lines={L.portrait ? ['ซ้อมกับสนามจริง', [{ em: '3 ประเภท' }]] : [['ซ้อมกับสนามจริง ', { em: '3 ประเภท' }]]} sub={L.portrait ? 'สนามจำลอง 3 มิติ ขนาดเท่าของจริง' : 'สนามจำลอง 3 มิติ ขนาดเท่าของจริงที่ใช้แข่ง'} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: L.portrait ? 'column' : 'row', gap: L.portrait ? 24 : 36, perspective: 1600 }}>
          {EVENTS.map((e, i) => <FieldCard key={e.img} {...e} index={i} />)}
        </div>
      </div>
    </Scene>
  );
}

function FieldCard({ img, name, en, tag, index }: { img: string; name: string; en: string; tag: string; index: number }) {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 20 - index * 12, fps, config: { damping: 13, mass: 0.8 } });
  const beat = useBeat(index * 5);
  const zoom = interpolate(frame, [0, 222], [1.05, 1.2]);
  const flip = L.portrait ? `rotateX(${(1 - p) * 80}deg)` : `rotateY(${(1 - p) * -85}deg)`;
  const sway = L.portrait ? `rotateX(${Math.sin(frame / 25 + index) * 3}deg)` : `rotateY(${Math.sin(frame / 25 + index) * 4}deg)`;
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 32, overflow: 'hidden', background: '#0b0d12', opacity: Math.min(1, p * 1.5), transform: `${flip} ${sway} scale(${1 + beat * 0.012})`, transformOrigin: L.portrait ? 'center top' : 'left center', boxShadow: '0 30px 60px rgba(28,31,37,0.25)' }}>
      <Img src={staticFile(`img/${img}.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom}) translateX(${Math.sin(frame / 40 + index) * 12}px)`, opacity: 0.9 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.05) 62%)' }} />
      <div style={{ position: 'absolute', left: 30, right: 30, bottom: 26, fontFamily, color: '#fff' }}>
        <div style={{ display: 'inline-block', fontSize: L.body * 0.72, fontWeight: 700, padding: '4px 14px', borderRadius: 999, background: C.blue, marginBottom: 10 }}>0{index + 1} · {tag}</div>
        <div style={{ fontSize: L.h2 * (L.portrait ? 1.05 : 1.15), fontWeight: 800, lineHeight: 1.2 }}>{name}</div>
        <div style={{ fontSize: L.body * 0.78, color: '#d4d4d8' }}>{en}</div>
      </div>
    </div>
  );
}
