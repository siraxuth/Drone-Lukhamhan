import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';
import { Chip } from '../ui/Chip';
import { BrowserFrame, PhoneFrame } from '../ui/Frames';
import { BEAT, Marquee } from '../ui/fx';
import { Headline } from '../ui/Headline';
import { Scene, Split } from '../ui/Scene';

// ชื่อบทจริงบางส่วนจาก content/docs วิ่งเป็นฉากหลัง
const TOPICS_A = ['โดรนบินได้ยังไง', 'ประกอบและผูกรีโมท', 'ติดตั้ง Arduino IDE', 'ตัวแปรและเงื่อนไข', 'ฟังก์ชันและอาร์เรย์', 'อ่านโค้ดชมรม'];
const TOPICS_B = ['คุมความสูง', 'หมุนหัวโดรน', 'ปล่อยสัมภาระ', 'เจาะลูกโป่ง', 'แรงยกและ PID', 'ออกแบบใน Blender'];

/** S3 (8–16 วิ): บทเรียนบนเว็บ หน้าจอเอียงแบบ 3 มิติ ชื่อบทวิ่งข้างหลัง ป้ายเด้งตามจังหวะ */
export function S3Docs() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shot = spring({ frame: frame - 8, fps, config: { damping: 15 } });
  const rotY = interpolate(frame, [0, 252], [-18, -6]) * (L.portrait ? 0.6 : 1);
  const rotX = 6 + Math.sin(frame / 30) * 2;
  const floatY = Math.sin(frame / 20) * 10;
  const beat = (k: number) => Math.round(40 + k * BEAT);
  const chips = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: L.portrait ? 28 : 40, justifyContent: L.portrait ? 'center' : 'flex-start' }}>
      <Chip delay={beat(0)}>บทเรียนกว่า 60 หน้า</Chip>
      <Chip delay={beat(1)} color={C.red}>มีภาพและคลิปประกอบ</Chip>
      <Chip delay={beat(2)} color={C.emerald}>อ่านบนมือถือได้</Chip>
      <Chip delay={beat(3)} color={C.amber}>เรียงจากง่ายไปยาก</Chip>
    </div>
  );
  const tilt = { transform: `perspective(1800px) rotateY(${rotY}deg) rotateX(${rotX}deg) translateY(${floatY + (1 - shot) * 300}px) scale(${0.8 + 0.2 * shot})`, opacity: shot };
  const visual = L.portrait ? (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}>
      <PhoneFrame style={{ height: '100%', aspectRatio: '9 / 17', ...tilt }}>
        <Img src={staticFile('img/docs-mobile.webp')} style={{ width: '100%', transform: `translateY(${interpolate(frame, [40, 250], [0, -58], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%)` }} />
      </PhoneFrame>
    </div>
  ) : (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
      <BrowserFrame url="drone.dekgp.com/docs" style={{ width: '100%', aspectRatio: '16 / 10.6', ...tilt }}>
        <Img src={staticFile('img/docs-desktop.webp')} style={{ width: '100%', transformOrigin: '30% 20%', transform: `scale(${interpolate(frame, [20, 252], [1, 1.18])})` }} />
      </BrowserFrame>
    </div>
  );
  const big = { fontFamily, fontWeight: 800, fontSize: L.portrait ? 84 : 110, color: 'rgba(0,111,215,0.05)', padding: '0 20px' };
  return (
    <Scene
      back={
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          <Marquee items={TOPICS_A} speed={4} itemStyle={big} />
          <Marquee items={TOPICS_B} speed={3} reverse itemStyle={big} />
          <Marquee items={TOPICS_A} speed={5} itemStyle={big} />
        </div>
      }
    >
      <Split text={<><Headline lines={['เรียนฟรี', 'ตั้งแต่ศูนย์']} sub="บทเรียนภาษาไทย ไม่ต้องรู้โค้ดมาก่อน" />{chips}</>} visual={visual} />
    </Scene>
  );
}
