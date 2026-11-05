import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { Fragment } from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';
import { CurrentEnd } from './scenes/CurrentEnd';
import { WebSequence } from './scenes/WebSequence';

const T = 12;
const shots = (items: Array<{ key: string; title: string; note?: string }>, suffix: 'desktop' | 'mobile') => items.map((s) => ({ file: `home-${s.key}-${suffix}.webp`, title: s.title, note: s.note }));

const how = [
  { key: 'how-lift', title: 'ใบพัดสร้างแรงยก', note: 'หลักการบิน' },
  { key: 'how-rotors', title: 'ใบพัดหมุนสวนกัน', note: 'สมดุลการหมุน' },
  { key: 'how-pitch', title: 'ก้มหัวเพื่อบินหน้า', note: 'Pitch' },
  { key: 'how-roll', title: 'เอียงเพื่อเลื่อนข้าง', note: 'Roll' },
  { key: 'how-yaw', title: 'หมุนตัวเปลี่ยนทิศ', note: 'Yaw' },
  { key: 'how-mixing', title: 'แบ่งแรงให้มอเตอร์ทั้งสี่', note: 'Motor mixing' },
  { key: 'how-pid', title: 'แก้การเอียงให้กลับมานิ่ง', note: 'PID' },
];
const features = [
  { key: 'about-learn', title: 'เรียนโดรนจากศูนย์' },
  { key: 'about-code', title: 'เขียนโค้ดสั่งโดรน' },
  { key: 'about-simulator', title: 'ซ้อมบินในสนามจำลอง' },
  { key: 'about-field', title: 'ดูสนามและกติกาแข่ง' },
  { key: 'about-works', title: 'ดูผลงานรุ่นพี่' },
];
const events = [
  { key: 'event-mission', title: 'ปล่อยสัมภาระ', note: 'Drone Mission' },
  { key: 'event-aviation', title: 'ทำลายลูกโป่ง', note: 'Aviation Mastery' },
  { key: 'event-innovation', title: 'ยิงลูกดอก', note: 'Drone Innovation Challenge' },
];
const works = [
  { key: 'work-1', title: 'ผลงานที่ผ่านมา', note: 'สนามแข่งจริง' },
  { key: 'work-2', title: 'ลงมือทำเป็นทีม', note: 'ชมรมโดรนลือคำหาญฯ' },
  { key: 'work-3', title: 'ทุกผลงานเริ่มจากการลอง', note: 'ของพวกเรา' },
];

const HomeHero = () => <WebSequence desktop={shots([{ key: 'hero', title: 'จากไม่เคยจับโดรน ถึงลงสนามแข่ง' }], 'desktop')} mobile={shots([{ key: 'hero', title: 'จากไม่เคยจับโดรน ถึงลงสนามแข่ง' }], 'mobile')} duration={96} poster />;
const HowItWorks = () => <WebSequence desktop={shots(how, 'desktop')} mobile={shots(how, 'mobile')} duration={390} poster />;
const Features = () => <WebSequence desktop={shots(features, 'desktop')} mobile={shots(features, 'mobile')} duration={222} />;
const Competition = () => <WebSequence desktop={shots(events, 'desktop')} mobile={shots(events, 'mobile')} duration={210} />;
const Lettering = () => <WebSequence desktop={shots([{ key: 'lettering', title: 'ออกแบบโชว์โดรนแปรอักษร', note: 'เรียนรู้การสร้างโชว์ใน Blender' }], 'desktop')} mobile={shots([{ key: 'lettering', title: 'ออกแบบโชว์โดรนแปรอักษร', note: 'เรียนรู้การสร้างโชว์ใน Blender' }], 'mobile')} duration={180} />;
const Showcase = () => <WebSequence desktop={shots(works, 'desktop')} mobile={shots(works, 'mobile')} duration={192} />;
const Practice = () => <WebSequence desktop={shots([{ key: 'simulator-page', title: 'ลองเขียนคำสั่ง แล้วดูโดรนบิน' }, { key: 'field-page', title: 'ซ้อมในสนามจำลอง' }], 'desktop')} mobile={shots([{ key: 'simulator-page', title: 'ลองเขียนคำสั่ง แล้วดูโดรนบิน' }, { key: 'field-page', title: 'ซ้อมในสนามจำลอง' }], 'mobile')} duration={180} />;
const Join = () => <WebSequence desktop={shots([{ key: 'join', title: 'เริ่มจากบทเรียน แล้วลองบินในจอ' }, { key: 'closing', title: 'มาซ้อมด้วยกันที่ชมรมโดรน' }, { key: 'makers', title: 'ก้าวข้ามขีดจำกัด ทะยานเหนือทุกสิ่ง' }, { key: 'footer', title: 'ติดตามข้อมูลล่าสุดของเว็บ' }], 'desktop')} mobile={shots([{ key: 'join', title: 'เริ่มจากบทเรียน แล้วลองบินในจอ' }, { key: 'closing', title: 'มาซ้อมด้วยกันที่ชมรมโดรน' }, { key: 'makers', title: 'ก้าวข้ามขีดจำกัด ทะยานเหนือทุกสิ่ง' }, { key: 'footer', title: 'ติดตามข้อมูลล่าสุดของเว็บ' }], 'mobile')} duration={210} />;

/** Each scene uses the current live page captures. Scene transitions overlap by 12 frames. */
export const SCENES = [
  { C: HomeHero, dur: 96 },
  { C: HowItWorks, dur: 390 },
  { C: Features, dur: 222 },
  { C: Competition, dur: 210 },
  { C: Lettering, dur: 180 },
  { C: Showcase, dur: 192 },
  { C: Practice, dur: 180 },
  { C: Join, dur: 210 },
  { C: CurrentEnd, dur: 216 },
];
export const DURATION = SCENES.reduce((n, s) => n + s.dur, 0) - T * (SCENES.length - 1);
export const startOf = (i: number) => SCENES.slice(0, i).reduce((n, s) => n + s.dur, 0) - T * i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSITIONS: TransitionPresentation<any>[] = [fade(), slide({ direction: 'from-bottom' }), fade(), slide({ direction: 'from-right' }), fade(), slide({ direction: 'from-bottom' }), fade(), fade()];
const transitionAfter = (i: number) => TRANSITIONS[i];

/** [audio, scene, frame, gain, max duration in frames] */
const SFX: Array<[string, number, number, number, number?]> = [
  ['hit', 0, 0, 0.9], ['motor', 0, 18, 0.42],
  ...how.map((_, i): [string, number, number, number] => ['pop', 1, 30 + i * 50, 0.42]),
  ...features.map((_, i): [string, number, number, number] => ['pop', 2, 18 + i * 38, 0.38]),
  ['hit', 3, 10, 0.45], ['hit', 3, 78, 0.45], ['hit', 3, 146, 0.5],
  ['sparkle', 4, 25, 0.42], ['sparkle', 4, 108, 0.42],
  ['hit', 5, 8, 0.4], ['hit', 5, 72, 0.4], ['hit', 5, 136, 0.45],
  ['whoosh', 6, 14, 0.35], ['whoosh', 6, 95, 0.35],
  ['riser', 7, 90, 0.42], ['hit', 8, 0, 0.56], ['chime', 8, 64, 0.45],
];

export function Intro({ withNarration = true }: { withNarration?: boolean }) {
  return (
    <AbsoluteFill style={{ background: '#27272a' }}>
      <TransitionSeries>
        {SCENES.map(({ C: Component, dur }, i) => (
          <Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={dur}><Component /></TransitionSeries.Sequence>
            {i < SCENES.length - 1 && <TransitionSeries.Transition presentation={transitionAfter(i)} timing={linearTiming({ durationInFrames: T })} />}
          </Fragment>
        ))}
      </TransitionSeries>
      <Audio src={staticFile('audio/score.wav')} volume={(f) => 0.4 * interpolate(f, [0, 24, DURATION - 60, DURATION], [0.75, 1, 1, 0], { extrapolateRight: 'clamp' })} />
      {withNarration && <Audio src={staticFile('audio/narration.mp3')} volume={1} />}
      {SCENES.slice(1).map((_, i) => (
        <Sequence key={`w${i}`} from={startOf(i + 1) - 6} durationInFrames={20}>
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.34} />
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
