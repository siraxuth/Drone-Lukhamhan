# สูตร motion ที่ใช้ได้จริง (Remotion 4)

ทุกสูตรมีอยู่จริงใน `video/src` ของ repo นี้ อ้างไฟล์ไว้ท้ายหัวข้อ ลอกไปใช้ได้เลย

## 1. Composition สองขนาดจาก component เดียว (`src/Root.tsx`, `src/layout.ts`)

```tsx
<Composition id="Intro16x9" component={Intro} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
<Composition id="Intro9x16" component={Intro} durationInFrames={DURATION} fps={30} width={1080} height={1920} />

export function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return portrait
    ? { portrait, safe: { top: 220, bottom: 380, left: 80, right: 120 }, h1: 92, h2: 46, body: 38, gap: 48 }
    : { portrait, safe: { top: 96, bottom: 96, left: 120, right: 120 }, h1: 96, h2: 44, body: 32, gap: 64 };
}
```

ทุกฉากอ่าน `L.portrait` แล้วจัดวางเอง ห้ามใช้ `scale` ทั้งจอแทนการจัดวางใหม่

## 2. ไทม์ไลน์ฉาก + ช่วงต่อ (`src/Intro.tsx`)

```tsx
export const SCENES = [{ C: S1Hook, dur: 132 }, /* ... */];
export const T = 12; // เฟรมที่ฉากซ้อนกันตอนเปลี่ยน
export const DURATION = SCENES.reduce((n, s) => n + s.dur, 0) - T * (SCENES.length - 1);
export const startOf = (i: number) => SCENES.slice(0, i).reduce((n, s) => n + s.dur, 0) - T * i;

<TransitionSeries>
  {SCENES.map(({ C, dur }, i) => (
    <Fragment key={i}>
      <TransitionSeries.Sequence durationInFrames={dur}><C /></TransitionSeries.Sequence>
      {i < SCENES.length - 1 && <TransitionSeries.Transition presentation={TRANSITIONS[i]} timing={linearTiming({ durationInFrames: T })} />}
    </Fragment>
  ))}
</TransitionSeries>
```

ช่วงต่อ: มืด↔สว่าง ใช้ `fade()` · สว่าง→สว่าง สลับ `slide({direction})` กับ `wipe({direction})` · array ต้องพิมพ์เป็น `TransitionPresentation<any>[]`

## 3. Kinetic headline ทีละคำ (`src/ui/Headline.tsx`)

```tsx
const seg = new Intl.Segmenter('th', { granularity: 'word' });
// แต่ละคำ: กล่อง overflow hidden + ตัวคำเลื่อนขึ้นจาก 115% และเอียง 7° → 0
const p = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
<span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.12em 0.02em 0.18em', margin: '-0.12em -0.02em -0.18em' }}>
  <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 115}%) rotate(${(1 - p) * 7}deg)`, transformOrigin: 'left bottom' }}>{word}</span>
</span>
```

padding/margin ลบ ±0.12em กันสระบน-ล่างภาษาไทยถูก mask ตัด · stagger 2 เฟรมต่อคำ · บรรทัดรองเข้าตามหลังคำสุดท้าย 6 เฟรม

## 4. เต้นตามจังหวะเพลง (`src/ui/fx.tsx`)

```tsx
export const BEAT = (60 / BPM) * FPS; // 116 BPM @30fps ≈ 15.52
export function useBeat(offset = 0) {
  const local = (((frame + offset) % BEAT) + BEAT) % BEAT;
  return Math.exp(-local / 3.5); // 1 ตอนลงจังหวะ แล้วลดลงเร็ว
}
// ใช้: transform: `scale(${1 + beat * 0.03})`
```

ของที่ควรเต้น: โลโก้ ปุ่ม QR ตัวเลขใหญ่ โหนดปัจจุบัน ไม่ควรเต้น: ตัวหนังสือยาว (อ่านยาก) จังหวะเข้าของ: `Math.round(40 + k * BEAT)`

## 5. ตัดภาพเร็วตามจังหวะ ไม่มีแฟลช (`S1Hook.tsx`, `S8Works.tsx`)

```tsx
const CUT = 11; // หรือ Math.round(BEAT * 1.5)
const i = Math.min(N - 1, Math.floor(frame / CUT));
const t = frame - i * CUT;
const zoom = interpolate(t, [0, CUT], [1.22, 1.05]);            // ซูมถอยในแต่ละช็อต
const punch = interpolate(t, [0, 4, CUT], [1.35, 1, 0.97]);      // คำใหญ่กระแทกเข้า
```

ตัดภาพด้วยการเปลี่ยนรูป + ซูม + ทิศสลับซ้ายขวา และเสียง `hit` ตรงเฟรมตัด **ไม่ใส่จอขาว** ตัดเร็วกว่า 8 เฟรมต่อช็อตอ่านไม่ทัน

## 6. ส่วนย่อยในฉาก (montage → title)

```tsx
export function S1Hook() {
  const frame = useCurrentFrame();
  return frame < MONTAGE ? <Montage /> : <Title />;
}
// ใน Title: frame ยังเป็นเฟรมของฉาก → ส่ง delay={MONTAGE + 2} ให้ Headline
```

## 7. พิมพ์โค้ด → กดรัน → โดรนบิน (`S4Code.tsx`)

```tsx
const shown = Math.round(interpolate(frame, [TYPE_FROM, TYPE_TO], [0, src.length], clamp));
const typed = src.slice(0, shown).split('\n');
const PHASE = { up: [146, 160], fw: [162, 192], rt: [198, 218], land: [222, 236] } as const;
const x = 250 + lerp(PHASE.rt, 0, CELL);
const y = 450 - lerp(PHASE.fw, 0, 2 * CELL);
const lift = lerp(PHASE.up, 0, 1) - lerp(PHASE.land, 0, 1); // ใช้ scale โดรน + เงา
// running = บรรทัดที่กำลังทำงาน ไฮไลต์พื้นหลัง + เลื่อนขวา 8px
```

ส่วนเสริม: หาง (วาดวงกลมซ้ำที่ตำแหน่ง frame − 3k), ใบพัดหมุน (เส้นใน rotor `rotate(frame * k)`), กล้องซูมสนามตอนรัน, คะแนนนับขึ้น, ป้าย "ผ่าน!" + `Rings` + `Burst` · ไฮไลต์ syntax: `pArduino` ม่วง `->` เทา ชื่อคำสั่งฟ้า ตัวเลขเหลือง `void` ชมพู

## 8. จุดแสง morph เป็นรูปและคำ (`S7Lettering.tsx`)

```tsx
// รูปพาราเมตริก
const HEART = range(N).map((i) => { const t = (i / N) * 2 * Math.PI;
  return { x: 16 * Math.sin(t) ** 3, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) }; });
// คำ: วาดบน canvas หลังโหลดฟอนต์ แล้วเก็บจุดบนกริด (dot-matrix)
const handle = delayRender('sample word');
document.fonts.load(`800 120px "${fontFamily}"`).then(() => {
  ctx.font = `800 150px ${fontFamily}`; ctx.fillText(word, W / 2, H / 2);
  let step = 3, all = grid(step); while (all.length > N) all = grid(++step);
  setPts(Array.from({ length: N }, (_, i) => all[i % all.length]).sort((a, b) => a.x - b.x));
  continueRender(handle);
});
// ซ้อน morph หลายชั้น: กระจาย → หัวใจ (k1) → ดาว (k2) → คำ (k3)
const k = (at, i) => spring({ frame: frame - at - (i % 20) * 0.9, fps, config: { damping: 16, mass: 0.7 } });
x = lerp(lerp(lerp(scatter.x, heart.x, k1), star.x, k2), word.x, k3);
```

สีเปลี่ยนตามรูป (ชมพู-แดง → ทอง → ฟ้า) จุดกะพริบเบาๆ ด้วย opacity ไม่ใช้ drop-shadow · N 300 จุด r 0.42 ใน viewBox 48×44 อ่านคำไทย 8 ตัวอักษรได้

## 9. กระดานอันดับสลับที่ (`S5Learn.tsx`)

```tsx
const swap = interpolate(frame, [150, 176], [0, 1], clamp);
const order = (i: number) => (i === ME ? 2 - 2 * swap : i + swap); // ฉันขึ้นจากที่ 3 ไป 1 คนอื่นเลื่อนลง
<div style={{ position: 'absolute', top: order(i) * rowH }} />
```

## 10. การ์ดพลิก 3 มิติ (`S6Field.tsx`)

```tsx
<div style={{ perspective: 1600 }}>
  {/* แนวนอน: rotateY(-85° → 0) origin ซ้าย · แนวตั้ง: rotateX(80° → 0) origin บน */}
  transform: `${flip} ${sway} scale(${1 + beat * 0.012})`
```

## 11. ภาพหน้าเว็บเอียงลอย (`S3Docs.tsx`)

```tsx
transform: `perspective(1800px) rotateY(${interpolate(frame, [0, dur], [-18, -6])}deg) rotateX(${6 + Math.sin(frame / 30) * 2}deg) translateY(${Math.sin(frame / 20) * 10}px)`
```

มือถือ: ภาพหน้าจอยาว 3 จอ เลื่อน `translateY(0 → -58%)` ในกรอบโทรศัพท์ (`boxSizing: 'border-box'`)

## 12. เสียงตรงกับภาพ (`src/Intro.tsx`)

```tsx
<Audio src={staticFile('audio/music.wav')} volume={(f) => 0.8 * interpolate(f, [0, 30, DURATION - 60, DURATION], [0, 1, 1, 0])} />
{SFX.map(([name, scene, at, vol, len], i) => (
  <Sequence key={i} from={startOf(scene) + at} durationInFrames={len}>
    <Audio src={staticFile(`audio/${name}.wav`)} volume={vol} />
  </Sequence>
))}
// whoosh ทุกช่วงต่อฉาก: from={startOf(i) - 6}
```
