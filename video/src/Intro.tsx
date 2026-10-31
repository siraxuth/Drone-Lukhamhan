import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { Fragment } from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';
import { S1Hook } from './scenes/S1Hook';
import { S2Brand } from './scenes/S2Brand';
import { S3Docs } from './scenes/S3Docs';
import { S4Code } from './scenes/S4Code';
import { S5Learn } from './scenes/S5Learn';
import { S6Field } from './scenes/S6Field';
import { S7Lettering } from './scenes/S7Lettering';
import { S8Works } from './scenes/S8Works';
import { S9Cta } from './scenes/S9Cta';

/** ความยาวแต่ละฉาก (เฟรม @30fps) · ช่วงต่อทับกันฉากละ 12 เฟรม รวมแล้ว 1800 เฟรม = 60 วินาที */
export const SCENES = [
  { C: S1Hook, dur: 132 },
  { C: S2Brand, dur: 132 },
  { C: S3Docs, dur: 252 },
  { C: S4Code, dur: 282 },
  { C: S5Learn, dur: 222 },
  { C: S6Field, dur: 222 },
  { C: S7Lettering, dur: 252 },
  { C: S8Works, dur: 192 },
  { C: S9Cta, dur: 210 },
];
export const T = 12;
export const DURATION = SCENES.reduce((n, s) => n + s.dur, 0) - T * (SCENES.length - 1);
/** เฟรมที่ฉาก i เริ่มบนไทม์ไลน์รวม */
export const startOf = (i: number) => SCENES.slice(0, i).reduce((n, s) => n + s.dur, 0) - T * i;

// ฉากมืด ↔ สว่าง ใช้ fade ส่วนฉากสว่างต่อกันสลับ slide / wipe ให้รู้ว่าเปลี่ยนเรื่อง
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSITIONS: TransitionPresentation<any>[] = [fade(), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-top-left' }), fade(), slide({ direction: 'from-bottom' }), fade()];
const transitionAfter = (i: number) => TRANSITIONS[i];

const BEAT = (60 / 116) * 30;
const b = (k: number) => Math.round(40 + k * BEAT);
/** เสียงประกอบ: [ไฟล์, ฉาก, เฟรมในฉาก, ความดัง, ความยาวสูงสุด(เฟรม)] */
const SFX: Array<[string, number, number, number, number?]> = [
  // S1 ตัดภาพเร็ว 4 ช็อต แล้วมอเตอร์เร่ง
  ['hit', 0, 0, 0.8], ['hit', 0, 11, 0.6], ['hit', 0, 22, 0.6], ['hit', 0, 33, 0.7], ['motor', 0, 44, 0.45],
  // S2 โลโก้กระแทก พิมพ์ url ตัวเลขเด้ง
  ['hit', 1, 2, 0.8], ['typing', 1, 32, 0.35, 26], ['pop', 1, 58, 0.5], ['pop', 1, 66, 0.5], ['pop', 1, 74, 0.5],
  // S3 ป้ายเด้งตามจังหวะ
  ['pop', 2, b(0), 0.45], ['pop', 2, b(1), 0.45], ['pop', 2, b(2), 0.45], ['pop', 2, b(3), 0.45],
  // S4 พิมพ์ → กดรัน → บิน → ผ่าน
  ['typing', 3, 18, 0.35, 110], ['hit', 3, 136, 0.5], ['whoosh', 3, 162, 0.3], ['whoosh', 3, 198, 0.3], ['hit', 3, 238, 0.7], ['chime', 3, 238, 0.55],
  // S5 ผ่านด่านทีละอัน แล้วขึ้นอันดับ 1
  ['pop', 4, 40, 0.45], ['pop', 4, 62, 0.45], ['pop', 4, 84, 0.45], ['pop', 4, 106, 0.45], ['hit', 4, 176, 0.6], ['chime', 4, 176, 0.5],
  // S6 การ์ดพลิกเข้า
  ['whoosh', 5, 18, 0.4], ['whoosh', 5, 30, 0.4], ['whoosh', 5, 42, 0.4],
  // S7 จุดแสงรวมตัว เปลี่ยนรูป และภาพ Blender
  ['sparkle', 6, 14, 0.5], ['sparkle', 6, 92, 0.5], ['sparkle', 6, 150, 0.55], ['pop', 6, 196, 0.45],
  // S8 ตัดภาพผลงานตามจังหวะ
  ['hit', 7, 0, 0.6], ['hit', 7, 23, 0.6], ['hit', 7, 46, 0.6], ['hit', 7, 69, 0.6], ['hit', 7, 92, 0.7], ['riser', 7, 140, 0.5],
  // S9 ปิดท้าย
  ['hit', 8, 0, 0.8], ['hit', 8, 42, 0.6], ['chime', 8, 42, 0.6],
];

export function Intro() {
  return (
    <AbsoluteFill style={{ background: '#27272a' }}>
      <TransitionSeries>
        {SCENES.map(({ C, dur }, i) => (
          <Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={dur}><C /></TransitionSeries.Sequence>
            {i < SCENES.length - 1 && <TransitionSeries.Transition presentation={transitionAfter(i)} timing={linearTiming({ durationInFrames: T })} />}
          </Fragment>
        ))}
      </TransitionSeries>

      <Audio src={staticFile('audio/music.wav')} volume={(f) => 0.8 * interpolate(f, [0, 30, DURATION - 60, DURATION], [0, 1, 1, 0], { extrapolateRight: 'clamp' })} />
      {SCENES.slice(1).map((_, i) => (
        <Sequence key={`w${i}`} from={startOf(i + 1) - 6} durationInFrames={20}>
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.45} />
        </Sequence>
      ))}
      {SFX.map(([name, scene, at, vol, len], i) => (
        <Sequence key={`s${i}`} from={startOf(scene) + at} durationInFrames={len}>
          <Audio src={staticFile(`audio/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
