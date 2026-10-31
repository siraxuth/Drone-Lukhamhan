import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';
import { BEAT } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { Scene, Split } from '../ui/Scene';

const PHOTOS = ['work-1', 'work-3', 'work-5', 'work-6'];
const CUT = Math.round(BEAT * 1.5);
const GRID = CUT * PHOTOS.length;

/** S8 (47–53 วิ): ตัดภาพผลงานเต็มจอตามจังหวะ แล้วรวบเป็นตาราง 2×2 */
export function S8Works() {
  const frame = useCurrentFrame();
  return frame < GRID ? <Cuts /> : <Grid />;
}

function Cuts() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const i = Math.min(PHOTOS.length - 1, Math.floor(frame / CUT));
  const t = frame - i * CUT;
  const dir = i % 2 ? -1 : 1;
  return (
    <AbsoluteFill style={{ background: C.dark, overflow: 'hidden' }}>
      <Img src={staticFile(`img/${PHOTOS[i]}.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${interpolate(t, [0, CUT], [1.25, 1.08])}) translateX(${dir * interpolate(t, [0, CUT], [30, -30])}px)` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0) 55%)' }} />
      <div style={{ position: 'absolute', left: L.safe.left, right: L.safe.right, bottom: L.safe.bottom, fontFamily, color: '#fff' }}>
        <div style={{ fontSize: L.h2, fontWeight: 600, opacity: 0.85 }}>ผลงานของชมรม</div>
        <div style={{ fontSize: L.h1 * 1.1, fontWeight: 800, lineHeight: 1.2 }}>จากสนามแข่งจริง</div>
      </div>
    </AbsoluteFill>
  );
}

function Grid() {
  const L = useLayout();
  const frame = useCurrentFrame() - GRID;
  const { fps } = useVideoConfig();
  const grid = (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: L.portrait ? 20 : 26 }}>
      {PHOTOS.map((p, i) => {
        const k = spring({ frame: frame - i * 3, fps, config: { damping: 13 } });
        return (
          <div key={p} style={{ borderRadius: 28, overflow: 'hidden', opacity: k, transform: `scale(${1.6 - 0.6 * k}) rotate(${(1 - k) * (i % 2 ? 6 : -6)}deg)` }}>
            <Img src={staticFile(`img/${p}.webp`)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.05 + frame * 0.0012})` }} />
          </div>
        );
      })}
    </div>
  );
  return (
    <Scene>
      <Split ratio={0.36} text={<Headline delay={GRID} lines={['ผลงานจาก', [{ em: 'สนามแข่งจริง' }]]} sub="รางวัลจากการแข่งขันโดรนของรุ่นพี่ในชมรม" />} visual={grid} />
    </Scene>
  );
}
