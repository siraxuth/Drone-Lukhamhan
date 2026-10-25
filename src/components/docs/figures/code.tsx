import type { ComponentType } from 'react';
import { Arrow, Box, C, Svg, T } from '../svg';

/** โดรนมองจากด้านบน (หัวโดรนชี้ขึ้น) วาดรอบจุด (0,0) */
function TopDrone({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <Box x={-36} y={-36} w={72} h={72} tone="paper" r={14} stroke={C.ink} sw={2.5} />
      {[[-52, -52], [52, -52], [-52, 52], [52, 52]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={18} stroke={C.blue} strokeWidth={3} fill="none" />
      ))}
      <path d="M-8 -22 L0 -34 L8 -22 z" fill={C.red} stroke={C.red} strokeWidth={1} />
    </g>
  );
}

/* ───────────────────────── parduino-api ───────────────────────── */

export function DirMap() {
  return (
    <Svg w={760} h={440} title="ทิศของ set_direction(dir, speed)" desc="dir 1 หน้า 2 หลัง 3 ซ้าย 4 ขวา 5 ขึ้น 6 ลง 7 ลอยนิ่ง">
      <circle cx={340} cy={220} r={62} stroke={C.red} strokeWidth={2.5} strokeDasharray="3 8" />
      <g transform="translate(340 220)"><TopDrone /></g>
      <Arrow d="M340 150 V50" tone="blue" w={5} />
      <T x={360} y={80} c={C.blue} anchor="start">1 หน้า</T>
      <Arrow d="M340 290 V390" tone="blue" w={5} />
      <T x={360} y={372} c={C.blue} anchor="start">2 หลัง</T>
      <Arrow d="M270 220 H100" tone="blue" w={5} />
      <T x={185} y={200} c={C.blue}>3 ซ้าย</T>
      <Arrow d="M410 220 H580" tone="blue" w={5} />
      <T x={495} y={200} c={C.blue}>4 ขวา</T>
      <T x={340} y={420} size={14} c={C.soft} weight={500}>ซ้าย-ขวา-หน้า-หลัง นับตามหัวโดรน (ลูกศรแดง)</T>
      <Box x={620} y={30} w={120} h={310} tone="paper2" />
      <T x={680} y={58} size={15}>แนวตั้ง</T>
      <Arrow d="M680 150 V84" tone="blue" w={5} />
      <T x={680} y={176} c={C.blue}>5 ขึ้น</T>
      <Arrow d="M680 206 V270" tone="blue" w={5} />
      <T x={680} y={302} c={C.blue}>6 ลง</T>
      <Box x={20} y={30} w={200} h={52} tone="red" />
      <T x={120} y={62} c={C.red}>7 = ลอยนิ่ง</T>
      <Box x={560} y={360} w={180} h={56} tone="blue" />
      <T x={650} y={384} size={14}>speed</T>
      <T x={650} y={406} size={14} weight={500}>1 ช้า · 2 ปกติ · 3 เร็ว</T>
    </Svg>
  );
}

export function I2cPacket() {
  const x0 = 250;
  const w = 80;
  const head = ['0', '1', '2', '3', '4', '5'];
  const rows: { cmd: string; cells: string[] }[] = [
    { cmd: 'take_off()', cells: ['+1', '1', '–', '–', '–', '–'] },
    { cmd: 'set_direction(1,2)', cells: ['+1', '15', '1', '2', '–', '–'] },
    { cmd: 'set_yaw(1,90)', cells: ['+1', '16', '1', '90', '0', '–'] },
  ];
  return (
    <Svg w={760} h={330} title="แพ็กเก็ต 6 ไบต์ m_i2cData" desc="ไบต์ 0 เป็นตัวนับ ไบต์ 1 เป็นรหัสคำสั่ง ไบต์ 2 ถึง 5 เป็นพารามิเตอร์">
      <T x={20} y={34} anchor="start" size={15}>ไบต์ที่</T>
      {head.map((h, i) => (
        <g key={h}>
          <Box x={x0 + i * w} y={14} w={w - 6} h={30} tone="blue" r={8} />
          <T x={x0 + i * w + (w - 6) / 2} y={36} size={15}>{h}</T>
        </g>
      ))}
      <T x={x0 + (w - 6) / 2} y={68} size={14} c={C.soft} weight={500}>นับ</T>
      <T x={x0 + w + (w - 6) / 2} y={68} size={14} c={C.soft} weight={500}>F_ ID</T>
      <T x={x0 + 3 * w + 2 * w - 3} y={68} size={14} c={C.soft} weight={500}>พารามิเตอร์ (ไบต์ 2–5)</T>
      {rows.map((r, ri) => (
        <g key={r.cmd}>
          <T x={20} y={124 + ri * 70} anchor="start" mono size={15}>{r.cmd}</T>
          {r.cells.map((v, i) => (
            <g key={i}>
              <Box x={x0 + i * w} y={100 + ri * 70} w={w - 6} h={40} tone={i === 1 ? 'red' : 'paper2'} r={8} />
              <T x={x0 + i * w + (w - 6) / 2} y={126 + ri * 70} size={16} c={v === '–' ? C.soft : C.ink}>{v}</T>
            </g>
          ))}
        </g>
      ))}
      <T x={380} y={318} size={14} c={C.soft} weight={500}>ทุกคำสั่งบวกไบต์ 0 ขึ้น 1 เพื่อให้ฝั่งรับรู้ว่ามีคำสั่งใหม่</T>
    </Svg>
  );
}

/* ───────────────────────── drone-easy ───────────────────────── */

export function EasyLayers() {
  const rows = [
    { t: 'drone.fw(250)', s: 'Drone_Mission.ino', d: 'ชั้นที่เราเขียนทุกวัน' },
    { t: 'pArduino->move_forward_cm(250)', s: 'DroneEasy.cpp  +  settle(400)', d: 'ห่อให้สั้น + เบรกต่อท้าย' },
    { t: 'set_direction(1, 2) · delay · poshold', s: 'protocol.cpp', d: 'นับเวลาจาก MS_PER_CM_FWD' },
    { t: 'แพ็กเก็ต 6 ไบต์ผ่าน I2C', s: 'ไปที่ Flight Controller', d: 'FC คุมใบพัดเอง' },
  ];
  return (
    <Svg w={760} h={420} title="ลำดับชั้นของคำสั่ง drone.fw()" desc="จาก drone.fw ลงไป pArduino แล้วเป็นไบต์ I2C">
      {rows.map((r, i) => (
        <g key={r.t}>
          <Box x={20} y={14 + i * 104} w={440} h={68} tone={i === 0 ? 'blue' : 'paper2'} />
          <T x={240} y={44 + i * 104} mono size={15}>{r.t}</T>
          <T x={240} y={68 + i * 104} size={14} c={C.soft} weight={500}>{r.s}</T>
          <T x={480} y={54 + i * 104} anchor="start" size={15} weight={500}>{r.d}</T>
          {i < 3 && <Arrow d={`M240 ${82 + i * 104} V${112 + i * 104}`} tone="ink" w={3} />}
        </g>
      ))}
    </Svg>
  );
}

export function FwTimeline() {
  const x = (t: number) => 100 + t * 0.1088;
  return (
    <Svg w={760} h={300} title="เส้นเวลาของ drone.fw(250)" desc="สั่งหน้า รอ 3865 มิลลิวินาที เบรกด้วย poshold แล้ว settle 400 มิลลิวินาที">
      <path d="M60 170 H730" stroke={C.line} strokeWidth={2} />
      <Box x={x(0)} y={140} w={x(3865) - x(0)} h={60} tone="blue" />
      <T x={(x(0) + x(3865)) / 2} y={168} size={16}>เครื่องบินหน้าอยู่ (delay 3865 ms)</T>
      <T x={(x(0) + x(3865)) / 2} y={190} size={14} c={C.soft} weight={500}>250 × 15.46 = 3865</T>
      <Box x={x(3865)} y={140} w={x(4265) - x(3865)} h={60} tone="red" />
      <T x={(x(3865) + x(4265)) / 2} y={226} size={14} c={C.red}>settle 400 ms</T>
      <Arrow d={`M${x(0)} 100 V138`} tone="ink" w={2.5} />
      <T x={x(0)} y={90} mono size={14}>set_direction(1,2)</T>
      <Arrow d={`M${x(3865) - 4} 130 V104`} tone="ink" w={2.5} />
      <T x={x(3865) - 20} y={90} mono size={14} anchor="end">poshold(2)</T>
      <Arrow d={`M${x(4265)} 100 V138`} tone="ink" w={2.5} />
      <T x={x(4265) + 14} y={90} mono size={14} anchor="start">dir 7 ความเร็ว 1</T>
      <T x={380} y={272} size={15} c={C.soft} weight={500}>รวมประมาณ 4.27 วินาทีต่อ fw(250)</T>
    </Svg>
  );
}

/* ───────────────────────── first-flight ───────────────────────── */

export function MissionPath() {
  return (
    <Svg w={760} h={420} title="เส้นทางบินมองจากด้านบน" desc="เริ่มที่แท่น บินหน้า 250 ซม. เลื่อนซ้าย 255 ซม. ปล่อยบอลแล้วลงจอด">
      <rect x={20} y={20} width={720} height={380} rx={16} fill={C.paper2} stroke={C.line} strokeWidth={1.5} />
      <Box x={540} y={330} w={100} h={52} tone="blue" />
      <T x={590} y={362}>จุดเริ่ม</T>
      <Arrow d="M590 326 V150 H300" tone="blue" w={5} />
      <T x={608} y={240} anchor="start" mono>fw(250)</T>
      <T x={440} y={130} mono>ml(255)</T>
      <circle cx={282} cy={150} r={22} stroke={C.red} strokeWidth={3} />
      <circle cx={282} cy={150} r={6} fill={C.red} />
      <T x={282} y={210} c={C.red}>ปล่อยบอล แล้วลงจอด</T>
      <T x={130} y={56} size={14} c={C.soft} weight={500} anchor="start">ภาพไม่ตรงสเกลจริง</T>
    </Svg>
  );
}

export function AltitudeProfile() {
  const g = 300;
  const y = (h: number) => g - h * 1.6;
  return (
    <Svg w={760} h={380} title="ความสูงตามเวลาในภารกิจแรก" desc="calibration บนพื้น takeOff ขึ้น sh 110 บินหน้าและซ้ายที่ความสูงเท่าเดิม แล้ว autoLand ลง">
      <path d={`M60 ${g} H730`} stroke={C.line} strokeWidth={2} />
      <path d={`M60 ${y(110)} H730`} stroke={C.blue} strokeWidth={2} strokeDasharray="3 8" />
      <T x={70} y={y(110) - 10} anchor="start" size={14} c={C.blue}>110 ซม.</T>
      <path d={`M60 ${g} H150 L215 ${y(60)} L270 ${y(110)} H560 L690 ${g}`} stroke={C.ink} strokeWidth={4} />
      {[
        { x1: 60, x2: 150, t: 'calibration' },
        { x1: 150, x2: 270, t: 'takeOff' },
        { x1: 270, x2: 330, t: 'sh' },
        { x1: 330, x2: 560, t: 'fw · ml · ปล่อย' },
        { x1: 560, x2: 690, t: 'autoLand' },
      ].map((p) => (
        <g key={p.t}>
          <path d={`M${p.x1} ${g + 22} H${p.x2}`} stroke={C.soft} strokeWidth={2} />
          <T x={(p.x1 + p.x2) / 2} y={g + 46} size={14} mono>{p.t}</T>
        </g>
      ))}
    </Svg>
  );
}

/* ───────────────────────── remote-keys ───────────────────────── */

export function KeyFlow() {
  const items = [
    { t: 'รีโมท', s: 'กด KEY3' },
    { t: 'Flight Controller', s: 'ส่งเลขปุ่มมา I2C' },
    { t: 'receiveEvent()', s: 'เก็บ m_remoteKey = 3' },
    { t: 'keyDo(KEY_3, f)', s: 'เรียก f() หนึ่งครั้ง' },
  ];
  return (
    <Svg w={760} h={190} title="เส้นทางของปุ่มรีโมทถึงฟังก์ชันของเรา">
      {items.map((it, i) => (
        <g key={it.t}>
          <Box x={10 + i * 188} y={50} w={160} h={84} tone={i === 3 ? 'blue' : 'paper2'} />
          <T x={90 + i * 188} y={86} size={15} mono={i > 1}>{it.t}</T>
          <T x={90 + i * 188} y={114} size={14} c={C.soft} weight={500}>{it.s}</T>
          {i < 3 && <Arrow d={`M${172 + i * 188} 92 H${196 + i * 188}`} tone="ink" w={3} />}
        </g>
      ))}
      <T x={380} y={172} size={14} c={C.soft} weight={500}>Arduino เป็นฝั่งรับ ที่อยู่ I2C 0x33</T>
    </Svg>
  );
}

export function KeyEdge() {
  const ticks = [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700];
  const yRem = (hi: boolean) => (hi ? 60 : 110);
  const yPrev = (hi: boolean) => (hi ? 170 : 220);
  return (
    <Svg w={760} h={340} title="การตรวจขอบสัญญาณของ keyDo" desc="กดค้างหนึ่งครั้ง handler ทำงานครั้งเดียวที่ tick แรก">
      <T x={20} y={92} anchor="start" mono size={15}>m_remoteKey</T>
      <path d={`M170 ${yRem(false)} H270 V${yRem(true)} H520 V${yRem(false)} H730`} stroke={C.blue} strokeWidth={4} />
      <T x={395} y={yRem(true) - 10} c={C.blue} size={14}>กดค้าง KEY3</T>
      <T x={20} y={202} anchor="start" mono size={15}>m_prevKey</T>
      <path d={`M170 ${yPrev(false)} H300 V${yPrev(true)} H550 V${yPrev(false)} H730`} stroke={C.red} strokeWidth={4} />
      <path d="M170 255 H730" stroke={C.line} strokeWidth={2} />
      {ticks.map((t) => {
        const fired = t === 300;
        const reset = t === 550;
        return (
          <circle key={t} cx={t} cy={255} r={7} fill={fired ? C.red : reset ? C.blue : C.paper} stroke={fired ? C.red : reset ? C.blue : C.soft} strokeWidth={2.5} />
        );
      })}
      <T x={300} y={290} c={C.red} size={14}>เรียก f()</T>
      <T x={425} y={290} c={C.soft} size={14} weight={500}>ข้าม (prev = remote)</T>
      <T x={560} y={316} c={C.blue} size={14}>prev ← NONE</T>
      <T x={20} y={260} anchor="start" size={14} c={C.soft} weight={500}>loop()</T>
    </Svg>
  );
}

/* ───────────────────────── distance-time ───────────────────────── */

export function DistanceTime() {
  const x0 = 90;
  const sx = 1.75;
  const yb = 340;
  const sy = 0.064;
  const px = (cm: number) => x0 + cm * sx;
  const py = (ms: number) => yb - ms * sy;
  const line = (r: number) => `M${px(0)} ${py(0)} L${px(300)} ${py(300 * r)}`;
  return (
    <Svg w={760} h={400} title="ระยะทางกับเวลา delay" desc="ยิ่งไกลยิ่งต้องรอนาน เส้นตรง ความชันคือ ms ต่อ cm">
      {[0, 100, 200, 300].map((cm) => (
        <g key={cm}>
          <path d={`M${px(cm)} 30 V${yb}`} stroke={C.line} strokeWidth={1.5} />
          <T x={px(cm)} y={yb + 26} size={14} c={C.soft}>{cm}</T>
        </g>
      ))}
      {[0, 1000, 2000, 3000, 4000, 5000].map((ms) => (
        <g key={ms}>
          <path d={`M${x0} ${py(ms)} H${px(300)}`} stroke={C.line} strokeWidth={1.5} />
          <T x={x0 - 8} y={py(ms) + 5} size={14} c={C.soft} anchor="end">{ms / 1000}</T>
        </g>
      ))}
      <T x={px(150)} y={yb + 50} size={14}>ระยะ (ซม.)</T>
      <T x={20} y={24} size={14} anchor="start">เวลา (วินาที)</T>
      <path d={`${line(15.16)} L${px(300)} ${py(300 * 15.65)} z`} fill={C.blue} fillOpacity={0.18} stroke="none" />
      <path d={line(15.46)} stroke={C.blue} strokeWidth={4} />
      <path d={line(11.89)} stroke={C.red} strokeWidth={4} />
      <T x={px(300) + 10} y={py(300 * 15.46) + 5} anchor="start" c={C.blue} size={14}>ปกติ 15.2–15.7</T>
      <T x={px(300) + 10} y={py(300 * 11.89) + 5} anchor="start" c={C.red} size={14}>เร็ว 11.89</T>
      <path d={`M${px(250)} ${yb} V${py(250 * 15.46)} H${x0}`} stroke={C.ink} strokeWidth={2} strokeDasharray="3 7" />
      <circle cx={px(250)} cy={py(250 * 15.46)} r={7} fill={C.blue} />
      <T x={px(250) - 14} y={py(250 * 15.46) + 34} anchor="end" size={14}>250 ซม. → 3865 ms</T>
    </Svg>
  );
}

export function CalibrateLoop() {
  const rows = [
    ['1', 'ติดเทปที่พื้น ทำเส้นเริ่มและวัดระยะไว้'],
    ['2', 'สั่งไปหน้า delay(3000) แล้ว poshold รอให้นิ่ง'],
    ['3', 'วัดระยะที่โดรนหยุดจริง (ซม.)'],
    ['4', 'ms/cm = 3000 ÷ ระยะ ทำ 5 รอบ แล้วเฉลี่ย'],
    ['5', 'ใส่ค่าใน config.hpp แล้วลอง fw(100) เทียบ'],
  ];
  return (
    <Svg w={760} h={340} title="ขั้นตอนวัด ms ต่อ cm">
      {rows.map(([n, t], i) => (
        <g key={n}>
          <Box x={20} y={10 + i * 64} w={720} h={50} tone={i === 3 ? 'blue' : 'paper2'} />
          <circle cx={54} cy={35 + i * 64} r={17} fill={C.blue} />
          <text x={54} y={41 + i * 64} textAnchor="middle" fontSize={16} fontWeight={700} fill="#fff">{n}</text>
          <T x={86} y={42 + i * 64} anchor="start" size={16}>{t}</T>
        </g>
      ))}
    </Svg>
  );
}

/* ───────────────────────── yaw-control ───────────────────────── */

export function YawProfile() {
  const x0 = 90;
  const sx = 0.1297;
  const yb = 330;
  const sy = 3.1;
  const px = (ms: number) => x0 + ms * sx;
  const py = (deg: number) => yb - deg * sy;
  const pts: [number, number][] = [[0, 0], [2766, 63], [2986, 63], [4240, 90], [4350, 90], [4638, 86], [4858, 86]];
  const d = pts.map(([t, a], i) => `${i ? 'L' : 'M'}${px(t)} ${py(a)}`).join(' ');
  const settles: [number, number][] = [[2766, 2986], [4240, 4350], [4638, 4858]];
  return (
    <Svg w={760} h={400} title="yaw_soft_stop(true, 90): มุมที่สั่งสะสมกับเวลา" desc="หมุน 63 องศา พัก หมุน 27 องศา พัก แล้วหมุนย้อน 4 องศา">
      {settles.map(([a, b]) => (
        <rect key={a} x={px(a)} y={40} width={px(b) - px(a)} height={yb - 40} fill={C.red} fillOpacity={0.14} />
      ))}
      <path d={`M${x0} 30 V${yb} H730`} stroke={C.ink} strokeWidth={2} />
      <path d={`M${x0} ${py(90)} H730`} stroke={C.blue} strokeWidth={2} strokeDasharray="3 8" />
      <T x={x0 + 6} y={py(90) - 10} anchor="start" size={14} c={C.blue}>เป้า 90°</T>
      <path d={d} stroke={C.ink} strokeWidth={4} />
      <T x={px(1400)} y={py(30) - 14} size={15}>ก้อน 70% = 63°</T>
      <T x={px(3700)} y={py(55) + 6} size={15}>ก้อน 30% = 27°</T>
      <T x={px(4700)} y={py(86) + 40} size={14} c={C.red}>trim −4°</T>
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <T key={s} x={px(s * 1000)} y={yb + 24} size={14} c={C.soft}>{s}</T>
      ))}
      <T x={px(2500)} y={yb + 50} size={14}>เวลา (วินาที) · แถบแดง = พักนิ่ง</T>
    </Svg>
  );
}

export function YawDir() {
  return (
    <Svg w={760} h={340} title="ทิศหมุนของ set_yaw" desc="rotate 1 หมุนขวา rotate 2 หมุนซ้าย">
      <g transform="translate(380 180)"><TopDrone s={1.2} /></g>
      <Arrow d="M450 90 A110 110 0 0 1 500 200" tone="blue" w={5} />
      <T x={560} y={120} c={C.blue} mono size={15}>set_yaw(1, deg)</T>
      <T x={560} y={146} c={C.blue} size={15}>หมุนขวา</T>
      <Arrow d="M310 90 A110 110 0 0 0 260 200" tone="red" w={5} />
      <T x={200} y={120} c={C.red} mono size={15}>set_yaw(2, deg)</T>
      <T x={200} y={146} c={C.red} size={15}>หมุนซ้าย</T>
      <T x={380} y={316} size={14} c={C.soft} weight={500}>deg คือองศาที่ต้องการหมุน 0–65535 ตามชนิด uint16_t</T>
    </Svg>
  );
}

/* ───────────────────────── height-control ───────────────────────── */

export function HeightLevels() {
  const g = 400;
  const y = (h: number) => g - h * 2;
  const lv: { h: number; t: string; tone: 'blue' | 'red' | 'ink' }[] = [
    { h: 170, t: 'HEIGHT_K5 = 170', tone: 'blue' },
    { h: 120, t: 'HEIGHT_SHOOT = 120', tone: 'blue' },
    { h: 110, t: 'HEIGHT_TAKEOFF = 110', tone: 'blue' },
    { h: 100, t: 'HEIGHT_FLIGHT = HEIGHT_GROUND = 100', tone: 'blue' },
    { h: 70, t: 'ALT_GUARD_MIN_CM = 70 (ห้ามลงต่ำกว่านี้)', tone: 'red' },
    { h: 45, t: 'HEIGHT_DROP = 45', tone: 'blue' },
  ];
  return (
    <Svg w={760} h={450} title="ระดับความสูงที่ตั้งไว้ใน config.hpp" desc="จากพื้นถึง 170 เซนติเมตร">
      <path d={`M40 ${g} H300`} stroke={C.ink} strokeWidth={3} />
      <T x={170} y={g + 26} size={14} c={C.soft}>พื้น 0 ซม.</T>
      {lv.map((l) => (
        <g key={l.t}>
          <path d={`M40 ${y(l.h)} H300`} stroke={l.tone === 'red' ? C.red : C.blue} strokeWidth={2.5} strokeDasharray={l.tone === 'red' ? '6 6' : undefined} />
          <T x={312} y={y(l.h) + 5} anchor="start" size={14} c={l.tone === 'red' ? C.red : C.ink} mono>{l.t}</T>
        </g>
      ))}
      <g transform={`translate(120 ${y(110)}) scale(0.5)`}><TopDrone /></g>
    </Svg>
  );
}

export function HeightStairs() {
  const yy = (h: number) => 300 - (h - 80) * 5.6;
  const steps = [
    { x: 100, h: 95 },
    { x: 250, h: 105 },
    { x: 400, h: 115 },
  ];
  return (
    <Svg w={760} h={360} title="smooth_set_height(120): ขั้นบันไดที่ส่งจริง" desc="เริ่มที่ 85 ส่ง 95 105 115 แล้วจบ ยังไม่ถึง 120">
      <path d={`M60 ${yy(85)} H100`} stroke={C.soft} strokeWidth={3} />
      <T x={72} y={yy(85) + 28} size={14} c={C.soft}>85 เริ่ม</T>
      {steps.map((s, i) => (
        <g key={s.h}>
          <path d={`M${s.x} ${i ? yy(steps[i - 1].h) : yy(85)} V${yy(s.h)} H${s.x + 150}`} stroke={C.ink} strokeWidth={4} />
          <T x={s.x + 75} y={yy(s.h) - 12} size={15} mono>{s.h}</T>
          <T x={s.x + 75} y={yy(s.h) + 26} size={14} c={C.soft} weight={500}>รอ 200 ms</T>
        </g>
      ))}
      <path d={`M60 ${yy(120)} H700`} stroke={C.blue} strokeWidth={2.5} strokeDasharray="3 8" />
      <T x={70} y={yy(120) - 10} anchor="start" c={C.blue} size={14}>เป้า 120</T>
      <Arrow d={`M610 ${yy(115) - 2} V${yy(120) + 6}`} tone="red" w={3} />
      <T x={620} y={yy(117)} c={C.red} size={14} anchor="start">ขาด 5 ซม.</T>
    </Svg>
  );
}

export function ClosedLoop() {
  const items = [
    { t: 'set_height(เป้า)', s: 'ส่งเป้าให้ FC' },
    { t: 'poll()', s: 'ขอข้อมูลจาก FC' },
    { t: 'get_height_cm()', s: 'อ่านความสูงจริง' },
    { t: '|ต่าง| ≤ TOL ?', s: 'นิ่งครบเวลา → ออก' },
  ];
  return (
    <Svg w={760} h={270} title="วงรอบควบคุมความสูงแบบ closed-loop" desc="สั่ง อ่าน เทียบ แล้ววนซ้ำจนนิ่ง">
      {items.map((it, i) => (
        <g key={it.t}>
          <Box x={10 + i * 188} y={30} w={160} h={84} tone={i === 3 ? 'red' : 'paper2'} />
          <T x={90 + i * 188} y={66} size={15} mono>{it.t}</T>
          <T x={90 + i * 188} y={94} size={14} c={C.soft} weight={500}>{it.s}</T>
          {i < 3 && <Arrow d={`M${172 + i * 188} 72 H${196 + i * 188}`} tone="ink" w={3} />}
        </g>
      ))}
      <Arrow d="M650 116 V196 H90 V120" tone="blue" w={3.5} />
      <T x={380} y={188} c={C.blue} size={15}>ยังไม่ถึง → วนใหม่</T>
    </Svg>
  );
}

/* ───────────────────────── modes ───────────────────────── */

export function ModeDispatch() {
  const modes = [
    { t: '1 · DRONE_MISSION', f: 'Drone_Mission.ino', hot: true },
    { t: '2 · AVIATION_MASTERY', f: 'Aviation_Mastery.ino', hot: false },
    { t: '3 · INNOVATION_CHALLENGE', f: 'Drone_Innovation_Challenge.ino', hot: false },
  ];
  return (
    <Svg w={760} h={400} title="ตัวกระจายโหมดใน drone_sanam5.ino" desc="ACTIVE_FLIGHT_MODE เลือกชุด setup และ loop ผ่าน #if">
      <Box x={10} y={150} w={180} h={90} tone="blue" />
      <T x={100} y={184} size={15} mono>mode_config.hpp</T>
      <T x={100} y={212} size={14} c={C.soft} weight={500}>ACTIVE_FLIGHT_MODE</T>
      {modes.map((m, i) => (
        <g key={m.t}>
          <Arrow d={`M192 195 L250 ${55 + i * 90}`} tone={m.hot ? 'blue' : 'soft'} w={m.hot ? 4 : 2.5} />
          <Box x={254} y={20 + i * 90} w={250} h={70} tone={m.hot ? 'blue' : 'paper2'} />
          <T x={379} y={50 + i * 90} size={15} mono>{m.t}</T>
          <T x={379} y={74 + i * 90} size={14} c={C.soft} weight={500}>{m.f}</T>
          <Arrow d={`M506 ${55 + i * 90} L560 ${150 + i * 10}`} tone={m.hot ? 'blue' : 'soft'} w={m.hot ? 4 : 2.5} />
        </g>
      ))}
      <Box x={254} y={290} w={250} h={70} tone="red" />
      <T x={379} y={320} size={15} mono>#error</T>
      <T x={379} y={344} size={14} c={C.soft} weight={500}>ค่าอื่น → compile ไม่ผ่าน</T>
      <Arrow d="M192 215 L250 310" tone="red" w={2.5} />
      <Box x={564} y={110} w={190} h={110} tone="paper2" />
      <T x={659} y={144} size={15} mono>MODE_SETUP</T>
      <T x={659} y={170} size={15} mono>MODE_LOOP</T>
      <T x={659} y={202} size={14} c={C.soft} weight={500}>ชื่อกลางสองตัว</T>
      <Arrow d="M659 222 V270" tone="ink" w={3} />
      <Box x={564} y={274} w={190} h={60} tone="blue" />
      <T x={659} y={310} size={15} mono>setup() / loop()</T>
    </Svg>
  );
}

/* ───────────────────────── debugging ───────────────────────── */

export function DebugLadder() {
  const rows = [
    ['อัปโหลดสำเร็จ ไม่มี error สีแดง', 'ไม่ผ่าน → Board / Port / driver'],
    ['ACTIVE_FLIGHT_MODE ตรงกับไฟล์ที่แก้', 'ไม่ผ่าน → เปิด mode_config.hpp'],
    ['loop() ผูก onKeyN กับ handler แล้ว', 'ไม่ผ่าน → เพิ่มบรรทัด drone.onKeyN'],
    ['Serial Monitor (9600) เห็นข้อความของเรา', 'ไม่ผ่าน → ตั้ง baud ให้ตรง'],
    ['โดรนทำตามคำสั่ง แต่ระยะ/ความสูงเพี้ยน', 'ไม่ผ่าน → วัด ms/cm และความสูงใหม่'],
  ];
  return (
    <Svg w={760} h={400} title="ไล่หาสาเหตุทีละขั้นเมื่อโดรนไม่ทำตามที่คิด">
      {rows.map(([a, b], i) => (
        <g key={a}>
          <Box x={10} y={10 + i * 78} w={430} h={56} tone="paper2" />
          <circle cx={42} cy={38 + i * 78} r={15} fill={C.blue} />
          <text x={42} y={44 + i * 78} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">{i + 1}</text>
          <T x={68} y={44 + i * 78} anchor="start" size={15}>{a}</T>
          <Arrow d={`M444 ${38 + i * 78} H470`} tone="red" w={3} />
          <T x={478} y={44 + i * 78} anchor="start" size={14} c={C.red}>{b}</T>
          {i < 4 && <Arrow d={`M225 ${66 + i * 78} V${88 + i * 78}`} tone="ink" w={3} />}
        </g>
      ))}
    </Svg>
  );
}

export function I2cBus() {
  return (
    <Svg w={760} h={300} title="Arduino กับ Flight Controller คุยกันผ่าน I2C" desc="สาย SDA และ SCL สองเส้น ที่อยู่ 0x33 กับ 0x34">
      <Box x={20} y={60} w={200} h={150} tone="blue" />
      <T x={120} y={100} size={16}>Arduino Nano</T>
      <T x={120} y={130} size={14} mono>ที่อยู่ 0x33</T>
      <T x={120} y={158} size={14} c={C.soft} weight={500}>เก็บ m_i2cData 6 ไบต์</T>
      <Box x={540} y={60} w={200} h={150} tone="paper2" />
      <T x={640} y={100} size={16}>Flight Controller</T>
      <T x={640} y={130} size={14} mono>ที่อยู่ 0x34</T>
      <T x={640} y={158} size={14} c={C.soft} weight={500}>ส่ง 8 ไบต์ให้ poll()</T>
      <path d="M222 100 H538" stroke={C.ink} strokeWidth={3} />
      <path d="M222 170 H538" stroke={C.ink} strokeWidth={3} />
      <T x={380} y={90} size={14} mono>SDA</T>
      <T x={380} y={160} size={14} mono>SCL</T>
      <T x={380} y={236} size={14} c={C.soft} weight={500}>เสียบผิดช่อง หรือสายหลวม = ไม่มีคำสั่งถึง FC</T>
      <T x={380} y={266} size={14} c={C.soft} weight={500}>ตรวจ: สาย Type-C อยู่ช่องฝั่ง Arduino ไม่ใช่ช่อง FC</T>
    </Svg>
  );
}

/* ───────────────────────── config-reference ───────────────────────── */

export function ConfigMap() {
  const g = [
    { t: 'ความสูง (ซม.)', a: 'HEIGHT_FLIGHT · TAKEOFF', b: 'GROUND · DROP · K5 · SHOOT' },
    { t: 'ระยะ ↔ เวลา', a: 'MS_PER_CM_FWD · BACK', b: 'LEFT · RIGHT · *_FAST' },
    { t: 'จิ้มลูกโป่ง (ซม.)', a: 'PRE_STOP · POKE_FAST', b: 'POKE_SLOW · POKE_RETREAT' },
    { t: 'เซอร์โวและยิง', a: 'S_CLOSE · S_LEFT · S_RIGHT', b: 'FIRE_HOLD_MS · RESET_HOLD_MS' },
    { t: 'หมุนหัวโดรน', a: 'YAW_MS_PER_DEG · EXTRA', b: 'YAW_SETTLE_MS · TRIM_DEG' },
    { t: 'ฟังก์ชันช่วย', a: 'hold_now · ms_round', b: 'yaw_block · yaw_soft_stop' },
  ];
  return (
    <Svg w={760} h={360} title="กลุ่มค่าคงที่ใน config.hpp" desc="หกกลุ่ม: ความสูง เวลา จิ้ม เซอร์โว หมุน ฟังก์ชันช่วย">
      {g.map((it, i) => {
        const x = 10 + (i % 3) * 250;
        const y = 10 + Math.floor(i / 3) * 170;
        return (
          <g key={it.t}>
            <Box x={x} y={y} w={236} h={150} tone={i === 1 ? 'blue' : 'paper2'} />
            <T x={x + 118} y={y + 38} size={16}>{it.t}</T>
            <T x={x + 118} y={y + 82} size={14} mono>{it.a}</T>
            <T x={x + 118} y={y + 112} size={14} mono c={C.soft}>{it.b}</T>
          </g>
        );
      })}
    </Svg>
  );
}

/* ───────────────────────── connect / basic-commands ───────────────────────── */

export function SendVsDone() {
  return (
    <Svg w={760} h={300} title="สั่งแล้วจบทันที แต่โดรนยังทำงานอยู่" desc="บรรทัดโค้ดจบในไม่กี่ไมโครวินาที ส่วนโดรนใช้เวลาเป็นวินาทีกว่าจะทำเสร็จ delay คือเวลาที่เรารอเอง">
      <T x={90} y={50} anchor="end" size={15} c={C.soft} weight={500}>โค้ด Arduino</T>
      <T x={90} y={150} anchor="end" size={15} c={C.soft} weight={500}>โดรน</T>
      <T x={90} y={250} anchor="end" size={15} c={C.soft} weight={500}>เราเขียน</T>
      <Box x={110} y={30} w={14} h={36} tone="red" />
      <T x={134} y={26} anchor="start" mono size={14}>takeOff()</T>
      <Box x={124} y={30} w={560} h={36} tone="paper" />
      <T x={404} y={54} size={15} c={C.soft} weight={500}>ถ้าไม่มี delay โค้ดวิ่งต่อไปบรรทัดถัดไปทันที</T>
      <Box x={124} y={125} w={400} h={50} tone="blue" />
      <T x={324} y={156}>ใบพัดเร่งรอบ แล้วยกตัวขึ้น</T>
      <Arrow d="M117 66 V122" tone="red" w={2.5} />
      <Box x={124} y={225} w={400} h={50} tone="paper" />
      <T x={324} y={256} mono size={15}>delay(4000);</T>
      <T x={560} y={256} anchor="start" size={15} c={C.soft} weight={500}>= รอให้โดรนทำเสร็จ</T>
      <path d="M524 120 V280" stroke={C.red} strokeWidth={2} strokeDasharray="6 6" />
      <T x={524} y={112} size={14} c={C.red}>ถึงตรงนี้ค่อยสั่งต่อ</T>
    </Svg>
  );
}

export function StartupTimeline() {
  const x = (ms: number) => 70 + ms * 0.0825;
  const rows: [string, number, number, 'blue' | 'red' | 'paper'][] = [
    ['calibration()  รอ 3000', 0, 3000, 'paper'],
    ['takeOff()  รอ 4000', 3000, 7000, 'blue'],
    ['sh(110)  รอ 400', 7000, 7400, 'red'],
  ];
  return (
    <Svg w={760} h={250} title="เวลาตั้งแต่ calibrate ถึงพร้อมบิน" desc="calibration 3000 มิลลิวินาที takeOff 4000 มิลลิวินาที setHeight 400 มิลลิวินาที รวม 7.4 วินาที">
      {rows.map(([label, a, b, tone], i) => (
        <g key={label}>
          <Box x={x(a)} y={30 + i * 56} w={Math.max(x(b) - x(a), 10)} h={42} tone={tone} />
          <T x={x(b) + 10} y={57 + i * 56} anchor="start" size={15} mono>{label}</T>
        </g>
      ))}
      <path d="M70 205 H680" stroke={C.line} strokeWidth={2} />
      {[0, 3, 7].map((t) => (
        <g key={t}><path d={`M${x(t * 1000)} 199 V211`} stroke={C.ink} strokeWidth={2} /><T x={x(t * 1000)} y={234} size={14} c={C.soft} weight={500}>{t} วินาที</T></g>
      ))}
      <T x={x(7400)} y={196} size={14} c={C.red} anchor="start">7.4 วินาที</T>
    </Svg>
  );
}

/** รูป SVG ของหมวด "code" — เรียกใน MDX ด้วยชื่อเดียวกัน (เช่น <DirMap />) */
export const codeFigures: Record<string, ComponentType<Record<string, unknown>>> = {
  DirMap, I2cPacket, EasyLayers, FwTimeline, MissionPath, AltitudeProfile, KeyFlow, KeyEdge,
  DistanceTime, CalibrateLoop, YawProfile, YawDir, HeightLevels, HeightStairs, ClosedLoop,
  ModeDispatch, DebugLadder, I2cBus, ConfigMap, SendVsDone, StartupTimeline,
};
