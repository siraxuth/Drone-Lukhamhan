import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';
import { Rings } from '../ui/fx';

export function CurrentEnd() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const qr = L.portrait ? 360 : 430;
  return (
    <AbsoluteFill style={{ background: C.dark, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Img src={staticFile(`img/home-footer-${L.portrait ? 'mobile' : 'desktop'}.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2, transform: `scale(${1 + frame * 0.0007})` }} />
      <AbsoluteFill style={{ background: 'rgba(16,18,22,0.78)' }} />
      <div style={{ zIndex: 1, display: 'flex', flexDirection: L.portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: L.portrait ? 55 : 110, padding: L.portrait ? '0 70px' : '0 120px', width: '100%', fontFamily, textAlign: L.portrait ? 'center' : 'left', color: '#fff' }}>
        <div style={{ maxWidth: L.portrait ? '100%' : '56%' }}>
          <Img src={staticFile('img/logo.webp')} style={{ width: L.portrait ? 104 : 112, height: L.portrait ? 104 : 112, objectFit: 'contain', margin: L.portrait ? '0 auto 24px' : '0 0 22px' }} />
          <div style={{ fontSize: L.portrait ? 38 : 38, color: '#b9bec8', fontWeight: 600 }}>ชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ</div>
          <div style={{ marginTop: 16, fontSize: L.portrait ? 78 : 76, lineHeight: 1.1, fontWeight: 800 }}>เริ่มเรียนรู้<br/><span style={{ color: C.blueOnDark }}>แล้วลองบิน</span></div>
          <div style={{ marginTop: 24, fontSize: L.portrait ? 42 : 40, fontWeight: 700, color: '#fff' }}>drone.dekgp.com</div>
        </div>
        <div style={{ position: 'relative', padding: 24, borderRadius: 28, background: '#fff', transform: `scale(${1 + Math.sin(frame / 7) * 0.012})` }}>
          <Img src={staticFile('img/qr.svg')} style={{ width: qr, height: qr, display: 'block' }} />
          {[0, 1, 2].map((i) => <Rings key={i} at={10 + i * 34} color={C.blueOnDark} size={qr * 1.4} count={1} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
}
