import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily, mono } from '../theme';
import { Rings, useBeat } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { Scene, Split } from '../ui/Scene';

export const CUT = 11;
const CUTS = [
  { word: 'เขียนโค้ด', bg: null },
  { word: 'บินจริง', bg: 'mission-3d' },
  { word: 'แปรอักษร', bg: 'demo-result' },
  { word: 'คว้ารางวัล', bg: 'work-3' },
];
export const MONTAGE = CUT * CUTS.length;

/** S1 (0–4 วิ): ตัดภาพเร็ว 4 ช็อตตามจังหวะ แล้วเข้าคำถามเปิดเรื่องพร้อมโดรนลอย */
export function S1Hook() {
  const frame = useCurrentFrame();
  if (frame < MONTAGE) return <Montage />;
  return <Title />;
}

function Montage() {
  const frame = useCurrentFrame();
  const L = useLayout();
  const i = Math.min(CUTS.length - 1, Math.floor(frame / CUT));
  const t = frame - i * CUT;
  const c = CUTS[i];
  const zoom = interpolate(t, [0, CUT], [1.22, 1.05]);
  const punch = interpolate(t, [0, 4, CUT], [1.35, 1, 0.97], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.dark, overflow: 'hidden' }}>
      {c.bg ? (
        <Img src={staticFile(`img/${c.bg}.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom}) rotate(${(i % 2 ? -1 : 1) * 1.5}deg)` }} />
      ) : (
        <AbsoluteFill style={{ display: 'grid', placeItems: 'center', transform: `scale(${zoom})`, background: '#16171b' }}>
          <pre style={{ fontFamily: mono, fontSize: L.portrait ? 40 : 52, color: '#7cc4ff', lineHeight: 1.6, margin: 0 }}>{'pArduino->take_off();\ndelay(3000);\npArduino->move_forward_cm(100);'}</pre>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: 'rgba(15,15,18,0.55)' }} />
      <AbsoluteFill style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ fontFamily, fontWeight: 800, fontSize: L.portrait ? 150 : 190, color: '#fff', transform: `scale(${punch})` }}>{c.word}</div>
      </AbsoluteFill>
          </AbsoluteFill>
  );
}

function Title() {
  const L = useLayout();
  const frame = useCurrentFrame() - MONTAGE;
  const { fps } = useVideoConfig();
  const show = spring({ frame, fps, config: { damping: 12 } });
  const pulse = useBeat();
  const float = Math.sin(frame / 10) * 14;
  const tilt = Math.sin(frame / 18) * 3;
  const drone = (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <Rings at={MONTAGE} color={C.blueOnDark} size={520} />
      <Img src={staticFile('img/drone-iso.webp')} style={{ width: L.portrait ? '100%' : '92%', maxHeight: '100%', objectFit: 'contain', transform: `translateY(${float + (1 - show) * 200}px) rotate(${tilt}deg) scale(${0.7 + 0.32 * show + pulse * 0.015})`, filter: 'drop-shadow(0 24px 24px rgba(0,0,0,0.35))' }} />
    </div>
  );
  return (
    <Scene dark>
      <Split ratio={0.5} text={<Headline dark delay={MONTAGE + 2} lines={['อยากสั่งโดรนให้บิน', ['ด้วย', { em: 'โค้ด' }, 'ที่เขียนเอง?']]} />} visual={drone} />
    </Scene>
  );
}
