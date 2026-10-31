import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';
import { BEAT, Burst, Rings, useBeat } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { rise, useIn } from '../ui/motion';
import { Scene } from '../ui/Scene';

/** S9 (53–60 วิ): ชวนเข้าเว็บ ปุ่มเต้นตามจังหวะ QR มีวงหมุนและคลื่นวง */
export function S9Cta() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = useBeat();
  const logo = useIn(4);
  const url = spring({ frame: frame - 30, fps, config: { damping: 10 } });
  const qr = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  const qrSize = L.portrait ? 340 : 360;
  const text = (
    <div style={{ fontFamily, textAlign: L.portrait ? 'center' : 'left' }}>
      <div style={{ ...rise(logo), display: 'flex', alignItems: 'center', gap: 20, justifyContent: L.portrait ? 'center' : 'flex-start', marginBottom: 20 }}>
        <Img src={staticFile('img/logo.webp')} style={{ width: 96, height: 96, transform: `scale(${1 + beat * 0.06})` }} />
        <span style={{ fontSize: L.h2, color: '#c9cbd1', fontWeight: 600 }}>ชมรมโดรน ลือคำหาญฯ</span>
      </div>
      <Headline dark delay={10} scale={1.1} lines={['เริ่มเรียน', [{ em: 'ได้เลยวันนี้' }]]} />
      <div style={{ position: 'relative', overflow: 'hidden', marginTop: 30, display: 'inline-block', padding: '18px 44px', borderRadius: 999, background: C.blueOnDark, color: C.dark, fontSize: L.h2 * 1.1, fontWeight: 800, opacity: Math.min(1, url * 2), transform: `scale(${(0.6 + 0.4 * url) * (1 + beat * 0.04)})` }}>
        drone.dekgp.com
      </div>
      <div style={{ ...rise(useIn(44)), marginTop: 22, fontSize: L.body, color: '#a1a1aa' }}>สแกน QR หรือพิมพ์ที่อยู่เว็บ เปิดได้ทั้งมือถือและคอม</div>
    </div>
  );
  const code = (
    <div style={{ position: 'relative', opacity: Math.min(1, qr * 2), transform: `scale(${0.4 + 0.6 * qr}) rotate(${(1 - qr) * 20}deg)` }}>
      <svg width={qrSize + 120} height={qrSize + 120} style={{ position: 'absolute', left: -60, top: -60, transform: `rotate(${frame * 1.2}deg)` }}>
        <circle cx={(qrSize + 120) / 2} cy={(qrSize + 120) / 2} r={(qrSize + 100) / 2} fill="none" stroke={C.blueOnDark} strokeWidth={4} strokeDasharray="18 16" opacity={0.7} />
      </svg>
      {[0, 1, 2, 3].map((k) => <Rings key={k} at={40 + Math.round(k * BEAT * 2)} color={C.blueOnDark} size={qrSize * 1.2} count={1} />)}
      <div style={{ position: 'relative', padding: 24, borderRadius: 36, background: '#fff', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', transform: `scale(${1 + beat * 0.015})` }}>
        <Img src={staticFile('img/qr.svg')} style={{ width: qrSize, height: qrSize, display: 'block' }} />
      </div>
      <Burst at={42} x="50%" y="50%" colors={[C.blueOnDark, C.red, C.amber, '#fff']} count={36} spread={520} />
    </div>
  );
  return (
    <Scene dark style={{ display: 'flex', flexDirection: L.portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: L.portrait ? 80 : 150 }}>
      {text}
      {code}
    </Scene>
  );
}
