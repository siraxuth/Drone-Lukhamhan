import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily, mono } from '../theme';
import { Card } from '../ui/Frames';
import { Burst, Counter, Rings } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { useIn } from '../ui/motion';
import { Scene } from '../ui/Scene';

const CODE = [
  'void setup() {',
  '  pArduino->calibration();',
  '  delay(3000);',
  '  pArduino->take_off();',
  '  delay(3000);',
  '  pArduino->move_forward_cm(200);',
  '  pArduino->poshold(3);',
  '  delay(300);',
  '  pArduino->move_right_cm(100);',
  '  pArduino->poshold(3);',
  '  delay(300);',
  '  pArduino->auto_land();',
  '}',
];
const TYPE_FROM = 18;
const TYPE_TO = 128;
const RUN = 136; // กดปุ่มรัน
const PHASE = { up: [146, 160], fw: [162, 192], rt: [198, 218], land: [222, 236] } as const;
const PASS = PHASE.land[1] + 2;
const CELL = 100;

/** S4 (16–25 วิ): พิมพ์โค้ด กดรัน กล้องซูมเข้าสนาม โดรนบินตามจริง ได้คะแนนเต็ม */
export function S4Code() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src = CODE.join('\n');
  const shown = Math.round(interpolate(frame, [TYPE_FROM, TYPE_TO], [0, src.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const typed = src.slice(0, shown).split('\n');
  // บรรทัดที่กำลังทำงาน: take_off → move_forward → poshold → move_right → poshold → auto_land
  const running = frame < PHASE.up[0] ? -1 : frame < PHASE.fw[0] ? 3 : frame < PHASE.fw[1] ? 5 : frame < PHASE.rt[0] ? 6 : frame < PHASE.rt[1] ? 8 : frame < PHASE.land[0] ? 9 : frame < PHASE.land[1] ? 11 : -1;
  const editorIn = useIn(2, 16);
  const fieldIn = useIn(10, 16);
  const press = spring({ frame: frame - RUN, fps, config: { damping: 10 } });
  const passIn = spring({ frame: frame - PASS, fps, config: { damping: 9 } });

  const lerp = (r: readonly [number, number], a: number, b: number) => interpolate(frame, r, [a, b], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = 250 + lerp(PHASE.rt, 0, CELL);
  const y = 450 - lerp(PHASE.fw, 0, 2 * CELL);
  const lift = lerp(PHASE.up, 0, 1) - lerp(PHASE.land, 0, 1);
  const zoom = 1 + 0.18 * (lerp([RUN, RUN + 20], 0, 1) - lerp([PASS + 10, PASS + 40], 0, 1));
  const rotor = frame * (lift > 0 ? 1.4 : 0.2);

  const font = L.portrait ? 27 : 28;
  const editor = (
    <Card dark style={{ position: 'relative', padding: L.portrait ? '26px 32px' : '30px 38px', opacity: editorIn, transform: `translateX(${(1 - editorIn) * -120}px) rotate(${(1 - editorIn) * -4}deg)`, background: '#16171b', border: `2px solid ${running >= 0 ? C.blueOnDark : C.darkLine}`, boxShadow: '0 24px 50px rgba(0,0,0,0.25)' }}>
      {CODE.map((_, i) => (
        <div key={i} style={{ fontFamily: mono, fontSize: font, lineHeight: 1.55, whiteSpace: 'pre', color: '#e6e6e6', borderRadius: 10, padding: '0 10px', margin: '0 -10px', background: running === i ? 'rgba(64,190,253,0.22)' : 'transparent', transform: `translateX(${running === i ? 8 : 0}px)` }}>
          <Syntax text={typed[i] ?? ''} />
          {i === typed.length - 1 && shown < src.length && <span style={{ display: 'inline-block', width: font * 0.55, height: font * 1.1, verticalAlign: 'text-bottom', background: C.blueOnDark, opacity: Math.floor(frame / 6) % 2 ? 0.3 : 1 }} />}
        </div>
      ))}
      <div style={{ position: 'absolute', right: 24, top: 22, fontFamily, fontSize: font * 0.8, fontWeight: 800, padding: '8px 22px', borderRadius: 999, color: C.dark, background: frame >= RUN ? C.emerald : C.blueOnDark, transform: `scale(${frame >= RUN ? 1.15 - 0.15 * press : 1})`, opacity: useIn(TYPE_TO - 6) }}>{frame >= RUN ? '● กำลังบิน' : '▶ รัน'}</div>
    </Card>
  );

  const trail = Array.from({ length: 10 }, (_, k) => {
    const f = frame - k * 3;
    const tx = 250 + interpolate(f, PHASE.rt, [0, CELL], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const ty = 450 - interpolate(f, PHASE.fw, [0, 2 * CELL], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return <circle key={k} cx={tx} cy={ty} r={14 - k} fill={C.blue} opacity={lift > 0.5 ? 0.25 - k * 0.022 : 0} />;
  });

  const field = (
    <div style={{ position: 'relative', height: '100%', aspectRatio: '1 / 1', maxWidth: '100%', opacity: fieldIn, transform: `translateX(${(1 - fieldIn) * 120}px) scale(${(0.85 + 0.15 * fieldIn) * zoom})` }}>
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%', borderRadius: 32, background: '#e8eef5', border: `2px solid ${C.line}`, overflow: 'hidden' }}>
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} stroke="#c7d2de" strokeWidth={2}>
            <line x1={i * CELL} y1={0} x2={i * CELL} y2={500} />
            <line x1={0} y1={i * CELL} x2={500} y2={i * CELL} />
          </g>
        ))}
        <rect x={210} y={410} width={80} height={80} rx={14} fill="none" stroke={C.blue} strokeWidth={4} strokeDasharray="10 8" strokeDashoffset={-frame} />
        <rect x={310} y={210} width={80} height={80} rx={14} fill={frame >= PASS ? 'rgba(5,150,105,0.35)' : 'rgba(5,150,105,0.15)'} stroke={C.emerald} strokeWidth={4} />
        <polyline points={`250,450 250,${Math.min(450, y)} ${x},${y}`} fill="none" stroke={C.blue} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 10" strokeDashoffset={-frame * 2} opacity={frame > PHASE.fw[0] ? 0.6 : 0} />
        {trail}
        <g transform={`translate(${x} ${y}) scale(${0.75 + 0.4 * lift})`}>
          <circle r={36} fill="rgba(0,0,0,0.12)" cy={10 + 16 * lift} />
          {[[-22, -22], [22, -22], [-22, 22], [22, 22]].map(([dx, dy], i) => (
            <g key={i} transform={`translate(${dx} ${dy})`}>
              <circle r={15} fill="#fff" stroke={C.fg} strokeWidth={3} />
              <line x1={-12} y1={0} x2={12} y2={0} stroke={C.fg} strokeWidth={3} transform={`rotate(${(i % 2 ? -1 : 1) * rotor * 57})`} />
            </g>
          ))}
          <rect x={-14} y={-14} width={28} height={28} rx={8} fill={C.blue} />
          <polygon points="0,-28 -7,-18 7,-18" fill={C.red} />
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 18, top: 18, fontFamily, fontSize: L.body * 0.8, fontWeight: 800, color: C.fg, background: '#ffffffd9', padding: '8px 18px', borderRadius: 999 }}>
        คะแนน <span style={{ color: C.emerald }}><Counter to={100} start={PHASE.fw[0]} dur={PASS - PHASE.fw[0]} /></span>
      </div>
      <Rings at={PASS} color={C.emerald} size={260} />
      <Burst at={PASS} x="50%" y="50%" colors={[C.emerald, C.blue, C.red, C.amber]} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${passIn}) rotate(${(1 - passIn) * -12}deg)`, opacity: Math.min(1, passIn * 2), fontFamily, fontSize: L.h2 * 1.4, fontWeight: 800, color: '#fff', background: C.emerald, padding: '18px 46px', borderRadius: 999, boxShadow: '0 20px 50px rgba(5,150,105,0.4)', whiteSpace: 'nowrap' }}>ผ่าน! 100/100</div>
    </div>
  );

  const title = L.portrait
    ? <Headline lines={[['เขียน', { em: 'โค้ด' }], 'แล้วดูโดรนบินทันที']} sub="ซ้อมในตัวจำลองบนเว็บ ไม่ต้องมีโดรนจริง" />
    : <Headline lines={[['เขียน', { em: 'โค้ด' }, ' แล้วดูโดรนบินทันที']]} sub="ซ้อมในตัวจำลองบนเว็บ ไม่ต้องมีโดรนจริงก็ลองได้" />;

  return (
    <Scene>
      <div style={{ display: 'flex', flexDirection: 'column', gap: L.portrait ? 36 : 44, height: '100%' }}>
        {title}
        {L.portrait ? (
          <>
            {editor}
            <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center' }}>{field}</div>
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 64 }}>
            <div style={{ flex: '0 0 54%' }}>{editor}</div>
            <div style={{ flex: 1, height: '100%', display: 'grid', placeItems: 'center' }}>{field}</div>
          </div>
        )}
      </div>
    </Scene>
  );
}

/** สีโค้ดแบบง่าย: ชื่อคำสั่ง ฟ้า · ตัวเลข เหลือง · void แดง */
function Syntax({ text }: { text: string }) {
  const parts = text.split(/(\bvoid\b|\bpArduino\b|->|\b[a-z_]+(?=\()|\d+)/g);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} style={{ color: p === 'void' ? '#ff7b9c' : p === 'pArduino' ? '#c4a7ff' : p === '->' ? '#8b8f98' : /^\d+$/.test(p) ? '#f6c177' : /^[a-z_]+$/.test(p) && text.includes(`${p}(`) ? '#7cc4ff' : undefined }}>{p}</span>
      ))}
    </>
  );
}
