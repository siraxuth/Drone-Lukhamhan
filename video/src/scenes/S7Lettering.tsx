import { useEffect, useState } from 'react';
import { continueRender, delayRender, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';
import { useBeat } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { Scene, Split } from '../ui/Scene';

const N = 300;
type P = { x: number; y: number };
// สามรูปที่จุดแสงเรียงต่อกัน: กระจาย → หัวใจ → ดาว → คำ "ลือคำหาญ"
const HEART: P[] = Array.from({ length: N }, (_, i) => {
  const t = (i / N) * Math.PI * 2;
  return { x: 16 * Math.sin(t) ** 3, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 1 };
});
const STAR: P[] = Array.from({ length: N }, (_, i) => {
  const k = (i / N) * 10; const seg = Math.floor(k); const f = k - seg;
  const pt = (j: number) => { const r = j % 2 ? 7.5 : 18; const a = (j / 10) * Math.PI * 2 - Math.PI / 2; return { x: r * Math.cos(a), y: r * Math.sin(a) }; };
  const a = pt(seg); const b = pt(seg + 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
});
const SCATTER: P[] = Array.from({ length: N }, (_, i) => ({ x: (random(`x${i}`) - 0.5) * 48, y: (random(`y${i}`) - 0.5) * 44 }));
const T = { heart: 14, star: 92, word: 150, blender: 196 };

/** วาดคำลง canvas แล้วสุ่มจุดจากพิกเซลที่ทึบ (ได้ผลเหมือนเดิมทุกครั้ง) */
function useWordPoints(word: string) {
  const [pts, setPts] = useState<P[] | null>(null);
  const [handle] = useState(() => delayRender('sample word'));
  useEffect(() => {
    document.fonts.load(`800 120px "${fontFamily}"`).then(() => {
      const W = 720, H = 200, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!; ctx.fillStyle = '#000'; ctx.font = `800 150px ${fontFamily}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(word, W / 2, H / 2 + 10);
      const data = ctx.getImageData(0, 0, W, H).data;
      // หาระยะห่างกริดที่ได้จุดใกล้ N ที่สุดโดยไม่เกิน แล้วใช้จุดบนกริดตรงๆ (อ่านเป็นตัวอักษรแบบ dot-matrix ได้ชัดกว่าสุ่ม)
      const grid = (step: number) => { const out: P[] = []; for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 140) out.push({ x: ((x - W / 2) / W) * 46, y: ((y - H / 2) / W) * 46 }); return out; };
      let step = 3; let all = grid(step);
      while (all.length > N) all = grid(++step);
      const picked = Array.from({ length: N }, (_, i) => all[i % all.length]).sort((a, b) => a.x - b.x);
      setPts(picked); continueRender(handle);
    });
  }, [handle, word]);
  return pts;
}

const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;

/** S7 (39–47 วิ): จุดแสงรวมเป็นหัวใจ เปลี่ยนเป็นดาว แล้วเป็นคำว่าลือคำหาญ ตามด้วยภาพงานจริงใน Blender */
export function S7Lettering() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const word = useWordPoints('ลือคำหาญ');
  const beat = useBeat();
  const blender = spring({ frame: frame - T.blender, fps, config: { damping: 14 } });
  const stage = (at: number, i: number) => spring({ frame: frame - at - (i % 20) * 0.9, fps, config: { damping: 16, mass: 0.7 } });

  const sky = (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg viewBox="-24 -22 48 44" style={{ width: '100%', height: L.portrait ? '66%' : '74%', transform: `perspective(1200px) rotateY(${Math.sin(frame / 30) * 10}deg) scale(${1 + beat * 0.02})` }}>
        {HEART.map((h, i) => {
          const w = word?.[i] ?? h;
          const k1 = stage(T.heart, i), k2 = stage(T.star, i), k3 = stage(T.word, i);
          const ax = SCATTER[i].x + (h.x - SCATTER[i].x) * k1, ay = SCATTER[i].y + (h.y - SCATTER[i].y) * k1;
          const bx = ax + (STAR[i].x - ax) * k2, by = ay + (STAR[i].y - ay) * k2;
          const x = bx + (w.x - bx) * k3, y = by + (w.y - by) * k3;
          // สีเปลี่ยนตามรูป: ชมพู-แดง (หัวใจ) → เหลืองทอง (ดาว) → ฟ้า (คำ)
          const c1 = mix([255, 120, 190], [255, 40, 80], i / N);
          const c2 = mix([255, 210, 90], [255, 160, 40], i / N);
          const c3 = mix([64, 190, 253], [140, 220, 255], i / N);
          const color = k3 > 0.5 ? c3 : k2 > 0.5 ? c2 : c1;
          const tw = 0.7 + 0.3 * Math.sin(frame / 4 + i * 1.7);
          return <circle key={i} cx={x} cy={y} r={0.42} fill={color} opacity={interpolate(frame, [0, 12], [0, tw], { extrapolateRight: 'clamp' })} />;
        })}
      </svg>
      <div style={{ position: 'absolute', right: L.portrait ? '50%' : 0, bottom: 0, width: L.portrait ? '68%' : '44%', transform: `translate(${L.portrait ? '50%' : '0'}, ${(1 - blender) * 120}px) rotate(${(1 - blender) * 8}deg)`, opacity: blender, borderRadius: 24, overflow: 'hidden', border: `2px solid ${C.darkLine}`, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
        <Img src={staticFile('img/demo-result.webp')} style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  );

  return (
    <Scene dark hue="red">
      <Split ratio={0.42} text={<Headline dark lines={['ออกแบบโชว์', [{ em: 'โดรนแปรอักษร' }]]} sub="จุดแสงหลายสิบจุดเรียงเป็นภาพบนฟ้า ออกแบบด้วย Blender" />} visual={sky} />
    </Scene>
  );
}
