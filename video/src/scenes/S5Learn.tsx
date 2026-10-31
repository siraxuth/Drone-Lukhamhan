import { interpolate, useCurrentFrame } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';
import { Card } from '../ui/Frames';
import { Burst, Counter, Rings, useBeat } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { useIn } from '../ui/motion';
import { Scene, Split } from '../ui/Scene';

const NODES = [C.emerald, C.blue, C.blue, C.amber, C.red];
const DONE_AT = (i: number) => 40 + i * 22;
const SWAP = [150, 176] as const;

/** S5 (25–32 วิ): คอร์สเรียนแบบด่าน ผ่านด่าน ได้ XP แล้วขึ้นอันดับ */
export function S5Learn() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const pathIn = useIn(8);
  const sideIn = useIn(20);
  const xp = Math.round(interpolate(frame, [DONE_AT(0), DONE_AT(3) + 10], [0, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const node = L.portrait ? 104 : 112;
  const swap = interpolate(frame, SWAP, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const beat = useBeat();

  const path = (
    <Card style={{ padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: pathIn, transform: `translateY(${(1 - pathIn) * 50}px)` }}>
      {NODES.map((color, i) => {
        const done = frame >= DONE_AT(i) && i < 4;
        const pop = useNodePop(DONE_AT(i));
        const current = i === 4;
        return (
          <div key={i} style={{ position: 'relative', transform: `translateX(${[0, 56, 0, -56, 0][i]}px)` }}>
            <div style={{ width: node, height: node, borderRadius: 999, display: 'grid', placeItems: 'center', background: done || current ? color : C.surface2, border: `6px solid ${done || current ? color : C.line}`, boxShadow: current ? `0 0 0 ${8 + beat * 14}px ${color}33` : 'none', transform: `scale(${done ? 1 + 0.15 * Math.max(0, 1 - Math.abs(pop - 0.5) * 2) : 1})` }}>
              {done ? <Check /> : current ? <Play /> : null}
            </div>
            {i < 4 && <Rings at={DONE_AT(i)} color={color} size={node * 1.2} count={2} />}
            {i < 4 && <div style={{ position: 'absolute', left: '100%', top: '50%', marginLeft: 18, fontFamily, fontSize: L.body, fontWeight: 800, color: C.amber, whiteSpace: 'nowrap', opacity: frame >= DONE_AT(i) ? Math.max(0, 1 - (frame - DONE_AT(i)) / 30) : 0, transform: `translateY(${-50 - (frame - DONE_AT(i)) * 1.4}%)` }}>+30 XP</div>}
          </div>
        );
      })}
    </Card>
  );

  const rows = [
    { name: 'ฟ้า', xp: 410, color: C.blue },
    { name: 'ต้น', xp: 380, color: C.emerald },
    { name: 'คุณ', xp: 320 + xp, color: C.red, me: true },
  ];
  const rowH = L.portrait ? 92 : 84;
  // "คุณ" เลื่อนจากอันดับ 3 ขึ้นอันดับ 1 อีกสองแถวเลื่อนลง
  const order = (i: number) => (i === 2 ? 2 - 2 * swap : i + swap);
  const side = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: sideIn, transform: `translateY(${(1 - sideIn) * 50}px)`, fontFamily }}>
      <Card style={{ padding: '24px 30px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <Flame />
        <div>
          <div style={{ fontSize: L.body * 0.85, color: C.muted }}>เรียนต่อเนื่อง 7 วัน</div>
          <div style={{ fontSize: L.h2 * 1.2, fontWeight: 800, color: C.fg, transform: `scale(${1 + beat * 0.04})`, transformOrigin: 'left center' }}>+<Counter to={120} start={DONE_AT(0)} dur={DONE_AT(3) - DONE_AT(0) + 10} /> XP</div>
        </div>
      </Card>
      <Card style={{ padding: '24px 26px', position: 'relative' }}>
        <div style={{ fontSize: L.body * 0.85, color: C.muted, marginBottom: 14 }}>อันดับในโรงเรียน <span style={{ marginLeft: 10, color: C.amber, fontWeight: 800, opacity: swap }}>▲ ขึ้นที่ 1</span></div>
        <div style={{ position: 'relative', height: rowH * 3 }}>
          <Burst at={SWAP[1]} x="50%" y={rowH * 0.4} colors={[C.red, C.amber, C.blue, C.emerald]} count={34} spread={360} />
          {rows.map((r, i) => (
            <div key={r.name} style={{ position: 'absolute', left: 0, right: 0, top: order(i) * rowH, height: rowH - 12, display: 'flex', alignItems: 'center', gap: 18, padding: '0 18px', borderRadius: 20, background: r.me ? `${C.red}14` : C.surface2, border: r.me ? `2px solid ${C.red}55` : '2px solid transparent' }}>
              <span style={{ width: 40, fontSize: L.body, fontWeight: 800, color: r.me && swap > 0.5 ? C.amber : C.muted }}>{Math.round(order(i)) + 1}</span>
              <span style={{ width: 44, height: 44, borderRadius: 99, background: r.color }} />
              <span style={{ flex: 1, fontSize: L.body, fontWeight: r.me ? 800 : 600, color: C.fg }}>{r.name}</span>
              <span style={{ fontSize: L.body, fontWeight: 700, color: C.fg }}>{r.xp}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const visual = (
    <div style={{ display: 'flex', alignItems: 'center', gap: L.portrait ? 32 : 48, height: '100%' }}>
      <div style={{ flex: L.portrait ? '0 0 40%' : '0 0 38%' }}>{path}</div>
      <div style={{ flex: 1 }}>{side}</div>
    </div>
  );

  return (
    <Scene>
      <Split
        ratio={0.38}
        text={<Headline lines={[['เรียนเป็น', { em: 'ด่าน' }], 'สะสม XP']} sub={L.portrait ? 'แข่งอันดับกับเพื่อนในโรงเรียน' : 'แข่งอันดับกับเพื่อนในโรงเรียน เข้าด้วยอีเมลโรงเรียน'} />}
        visual={visual}
      />
    </Scene>
  );
}

function useNodePop(at: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

const Check = () => <svg width="46%" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const Play = () => <svg width="38%" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>;
const Flame = () => (
  <svg width={64} height={64} viewBox="0 0 24 24"><path d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-9z" fill={C.amber} /><path d="M12 13c1 1.4 2 2.2 2 3.6a2 2 0 0 1-4 0c0-1 .6-1.8 1.2-2.3.1.8.5 1.2.8 1.2 0-1-.3-1.7 0-2.5z" fill="#fde68a" /></svg>
);
