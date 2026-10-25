import type { ComponentType } from 'react';
import { TopQuad } from '../quad';
import { Arrow, Box, C, Svg, T } from '../svg';

/** โดรนมองด้านข้างแบบเส้นง่ายๆ (ตัว + แกนใบพัด 2 ข้าง) วาดรอบจุด (0,0) */
function SideDrone() {
  return (
    <g>
      <Box x={-70} y={-12} w={140} h={26} tone="paper" r={10} stroke={C.ink} sw={2.5} />
      <rect x={-24} y={-30} width={48} height={18} rx={6} fill={C.paper} stroke={C.ink} strokeWidth={2.5} />
      {[-96, 96].map((x) => (
        <g key={x}>
          <path d={`M${x} -2 H${x > 0 ? 70 : -70}`} stroke={C.ink} strokeWidth={4} />
          <path d={`M${x - 36} -8 H${x + 36}`} stroke={C.blue} strokeWidth={5} />
        </g>
      ))}
      <path d="M-50 14 V32 M50 14 V32" stroke={C.soft} strokeWidth={3} />
    </g>
  );
}

export function ForcesDiagram() {
  return (
    <Svg w={760} h={420} title="แรงที่กระทำต่อโดรนที่ลอยนิ่ง" desc="แรงยกชี้ขึ้นเท่ากับน้ำหนักที่ชี้ลง">
      <g transform="translate(380 215)"><SideDrone /></g>
      <Arrow d="M380 170 V50" tone="blue" w={5} />
      <T x={400} y={44} c={C.blue} anchor="start">แรงยก T จากใบพัด</T>
      <Arrow d="M380 262 V380" tone="red" w={5} />
      <T x={400} y={392} c={C.red} anchor="start">น้ำหนัก W = m × g</T>
      <Box x={40} y={150} w={210} h={120} tone="blue" />
      <T x={145} y={186}>ลอยนิ่งเมื่อ</T>
      <T x={145} y={218} size={22} c={C.blue}>T = W</T>
      <T x={145} y={248} size={14} c={C.soft} weight={500}>ไม่ขึ้น ไม่ลง ไม่เร่ง</T>
      <Box x={510} y={150} w={210} h={120} tone="paper2" />
      <T x={615} y={182} size={15}>โดรนชมรม 310 กรัม</T>
      <T x={615} y={210} c={C.red}>W = 0.31 × 9.81</T>
      <T x={615} y={240} c={C.red} size={20}>≈ 3.04 N</T>
    </Svg>
  );
}

export function TiltForces() {
  const o = { x: 330, y: 250 };
  return (
    <Svg w={760} h={440} title="โดรนเอียงตัว แรงยกแตกเป็นแรงขึ้นกับแรงไปข้างหน้า" desc="แรงยกตั้งฉากกับตัวโดรน แยกเป็นส่วนที่ต้านน้ำหนักและส่วนที่ดันไปข้างหน้า">
      <path d={`M${o.x} ${o.y} H700`} stroke={C.line} strokeWidth={2} strokeDasharray="3 8" />
      <g transform={`translate(${o.x} ${o.y}) rotate(20)`}><SideDrone /></g>
      {/* แรงยกตั้งฉากตัว: ยาว 170 ชี้ขึ้นและเฉียงไปข้างหน้า 20° */}
      <Arrow d={`M${o.x} ${o.y} L${o.x + 58} ${o.y - 160}`} tone="blue" w={5} />
      <T x={o.x + 74} y={o.y - 168} c={C.blue} anchor="start">แรงยก T</T>
      <path d={`M${o.x + 58} ${o.y - 160} V${o.y}`} stroke={C.blue} strokeWidth={2.5} strokeDasharray="6 6" />
      <T x={o.x + 70} y={o.y - 80} c={C.blue} anchor="start" size={15}>T cos θ (ต้านน้ำหนัก)</T>
      <Arrow d={`M${o.x} ${o.y + 2} H${o.x + 150}`} tone="blue" w={4} />
      <T x={o.x + 150} y={o.y + 34} c={C.blue} anchor="end" size={15}>T sin θ (ดันไปหน้า)</T>
      <Arrow d={`M${o.x} ${o.y + 40} V${o.y + 190}`} tone="red" w={5} />
      <T x={o.x + 16} y={o.y + 196} c={C.red} anchor="start">น้ำหนัก W</T>
      <path d={`M${o.x - 74} ${o.y} A74 74 0 0 0 ${o.x - 69.5} ${o.y + 25}`} stroke={C.ink} strokeWidth={2} />
      <T x={o.x - 110} y={o.y + 44} anchor="middle">θ</T>
      <T x={560} y={410} c={C.soft} size={14} weight={500}>ยิ่งเอียงมาก ส่วนที่ดันไปหน้ายิ่งมาก</T>
    </Svg>
  );
}

/** 4 ท่าพื้นฐาน: ลอยนิ่ง · ขึ้น · ก้มไปหน้า · หมุนตัว (สีเข้ม = ใบพัดหมุนเร็ว) */
export function FourMoves() {
  const panels: Array<{ t: string; s: [number, number, number, number]; note: string }> = [
    { t: 'ลอยนิ่ง', s: [0.5, 0.5, 0.5, 0.5], note: 'ทั้ง 4 ใบเท่ากัน' },
    { t: 'ขึ้น', s: [0.8, 0.8, 0.8, 0.8], note: 'เร็วขึ้นทั้ง 4 ใบ' },
    { t: 'ไปข้างหน้า', s: [0.3, 0.3, 0.8, 0.8], note: 'ท้ายเร็ว หัวก้มลง' },
    { t: 'หมุนตัว', s: [0.8, 0.3, 0.8, 0.3], note: 'คู่ตามเข็มเร็วกว่า' },
  ];
  return (
    <Svg w={1000} h={330} title="การเปลี่ยนความเร็วใบพัดเพื่อทำท่าพื้นฐาน 4 ท่า">
      {panels.map((p, i) => (
        <g key={p.t} transform={`translate(${125 + i * 250} 150) scale(0.62)`}>
          <TopQuad speeds={p.s} labels={false} arrows={false} />
          <g transform="scale(1.6129)">
            <T x={0} y={150} size={20}>{p.t}</T>
            <T x={0} y={176} size={14} c={C.soft} weight={500}>{p.note}</T>
          </g>
        </g>
      ))}
    </Svg>
  );
}

/** ใบพัดสวนกัน: แรงบิดหักล้าง · และเมื่อคู่หนึ่งเร็วกว่า ตัวโดรนจึงหมุน */
export function RotorTorque() {
  return (
    <Svg w={880} h={400} title="แรงบิดของใบพัดตามเข็มและทวนเข็มหักล้างกัน" desc="ซ้าย: ทุกใบเท่ากัน แรงบิดสุทธิเป็นศูนย์ ขวา: คู่ตามเข็มหมุนเร็วกว่า ตัวโดรนหมุนทวนเข็ม">
      <g transform="translate(220 190)"><TopQuad speeds={[0.55, 0.55, 0.55, 0.55]} /></g>
      <T x={220} y={365} size={18}>ทุกใบหมุนเท่ากัน</T>
      <T x={220} y={390} size={14} c={C.soft} weight={500}>แรงบิดหักล้าง → ตัวไม่หมุน</T>
      <g transform="translate(660 190)"><TopQuad speeds={[0.9, 0.25, 0.9, 0.25]} /></g>
      <path d="M770 60 A52 52 0 1 0 735 40" stroke={C.ink} strokeWidth={3.5} markerEnd="url(#ah-ink)" />
      <T x={660} y={365} size={18}>คู่ตามเข็มเร็วกว่า</T>
      <T x={660} y={390} size={14} c={C.soft} weight={500}>ตัวโดรนหมุนทวนเข็ม</T>
    </Svg>
  );
}

/** แกนของโดรน: roll / pitch / yaw มองจากด้านบนและด้านข้าง */
export function AxesDiagram() {
  return (
    <Svg w={900} h={420} title="แกนหมุนของโดรน roll pitch yaw" desc="pitch ก้มเงยรอบแกนซ้ายขวา roll เอียงข้างรอบแกนหน้าหลัง yaw หมุนรอบแกนตั้ง">
      <g transform="translate(170 190) scale(0.9)"><TopQuad labels={false} arrows={false} speeds={[0.5, 0.5, 0.5, 0.5]} /></g>
      <path d="M170 60 A46 46 0 0 1 238 100" stroke={C.red} strokeWidth={3.5} markerEnd="url(#ah-red)" />
      <T x={170} y={36} c={C.red}>Yaw หันหัว</T>
      <T x={170} y={360} size={15} c={C.soft} weight={500}>มองจากด้านบน (หัวอยู่บน)</T>
      {/* ข้าง: pitch */}
      <g transform="translate(470 190)">
        <rect x={-62} y={-10} width={124} height={22} rx={9} fill={C.paper} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={62} cy={0} r={8} fill={C.red} />
        <path d="M-90 -2 H-62 M62 -2 H90" stroke={C.soft} strokeWidth={4} />
      </g>
      <path d="M545 150 A82 82 0 0 1 555 235" stroke={C.blue} strokeWidth={3.5} markerEnd="url(#ah-blue)" />
      <T x={470} y={116} c={C.blue}>Pitch ก้ม–เงย</T>
      <T x={470} y={360} size={15} c={C.soft} weight={500}>มองจากด้านข้าง (หัวอยู่ขวา)</T>
      {/* หน้า: roll */}
      <g transform="translate(770 190)">
        <rect x={-62} y={-10} width={124} height={22} rx={9} fill={C.paper} stroke={C.ink} strokeWidth={2.5} />
        <path d="M-90 -2 H-62 M62 -2 H90" stroke={C.soft} strokeWidth={4} />
        <rect x={-14} y={-28} width={28} height={18} rx={6} fill={C.paper} stroke={C.ink} strokeWidth={2.5} />
      </g>
      <path d="M702 235 A82 82 0 0 1 700 150" stroke={C.blue} strokeWidth={3.5} markerEnd="url(#ah-blue)" />
      <T x={770} y={116} c={C.blue}>Roll เอียงข้าง</T>
      <T x={770} y={360} size={15} c={C.soft} weight={500}>มองจากด้านหน้า</T>
    </Svg>
  );
}

/** ตัวผสมแรง: สั่งอะไร → ใบพัดไหนเร็ว (+) หรือช้า (−) */
export function MixingDiagram() {
  const cols: Array<{ t: string; v: [string, string, string, string] }> = [
    { t: 'ขึ้น', v: ['+', '+', '+', '+'] },
    { t: 'ก้มหัว (ไปหน้า)', v: ['−', '−', '+', '+'] },
    { t: 'เอียงขวา', v: ['−', '+', '+', '−'] },
    { t: 'หมุนตามเข็ม', v: ['−', '+', '−', '+'] },
  ];
  const pos = [[56, -56], [-56, -56], [-56, 56], [56, 56]];
  return (
    <Svg w={1000} h={330} title="ตัวอย่างการเพิ่ม (+) และลด (−) ความเร็วใบพัดแต่ละท่า">
      {cols.map((c, i) => (
        <g key={c.t} transform={`translate(${125 + i * 250} 140)`}>
          <rect x={-26} y={-34} width={52} height={68} rx={12} fill={C.paper} stroke={C.ink} strokeWidth={2.5} />
          <path d="M0 -50 L9 -38 H-9 Z" fill={C.red} />
          {pos.map(([x, y], k) => {
            const plus = c.v[k] === '+';
            return (
              <g key={k}>
                <path d={`M${x * 0.45} ${y * 0.45} L${x} ${y}`} stroke={C.soft} strokeWidth={5} />
                <circle cx={x} cy={y} r={30} fill={`color-mix(in oklab, ${plus ? 'var(--brand-red)' : 'var(--brand-blue)'} 18%, var(--surface))`} stroke={plus ? C.red : C.blue} strokeWidth={3} />
                <text x={x} y={y + 9} textAnchor="middle" fontSize={26} fontWeight={800} fill={plus ? C.red : C.blue}>{c.v[k]}</text>
              </g>
            );
          })}
          <T x={0} y={150} size={18}>{c.t}</T>
        </g>
      ))}
      <T x={500} y={318} size={14} c={C.soft} weight={500}>แดง + = หมุนเร็วขึ้น · ฟ้า − = หมุนช้าลง · ภาพเป็นหลักการ ไม่ใช่ค่าจาก firmware จริง</T>
    </Svg>
  );
}

/** PID: ตอบสนองต่อลมที่ทำให้ความสูงตก */
export function PidResponse() {
  const W = 880, H = 430, x0 = 70, y0 = 60, w = 760, h = 300;
  const t = (u: number) => x0 + u * w;
  const y = (v: number) => y0 + h / 2 - v * (h / 2 - 20); // v: -1..1
  const curve = (f: (u: number) => number) => Array.from({ length: 121 }, (_, i) => { const u = i / 120; return `${i ? 'L' : 'M'}${t(u).toFixed(1)} ${y(f(u)).toFixed(1)}`; }).join(' ');
  const pOnly = (u: number) => (u < 0.1 ? 0 : -0.7 * Math.exp(-0.9 * (u - 0.1)) * Math.cos(34 * (u - 0.1)));
  const pid = (u: number) => (u < 0.1 ? 0 : -0.8 * Math.exp(-7 * (u - 0.1)) * Math.cos(10 * (u - 0.1)));
  return (
    <Svg w={W} h={H} title="เปรียบเทียบการตอบสนองของตัวควบคุมเมื่อโดนลมกด" desc="เส้นแดงคือแก้แรงเกินจนส่าย เส้นฟ้าคือปรับดีแล้วกลับเข้าเป้าเร็วและนิ่ง">
      <path d={`M${x0} ${y0} V${y0 + h} H${x0 + w}`} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${x0} ${y(0)} H${x0 + w}`} stroke={C.soft} strokeWidth={2} strokeDasharray="5 6" />
      <T x={x0 + w} y={y(0) - 10} anchor="end" c={C.soft} size={14}>ความสูงที่ต้องการ</T>
      <Arrow d={`M${t(0.1)} ${y0 - 6} V${y0 + 40}`} tone="ink" w={3} />
      <T x={t(0.1) + 8} y={y0 + 12} anchor="start" size={14}>ลมกด</T>
      <path d={curve(pOnly)} stroke={C.red} strokeWidth={4} />
      <path d={curve(pid)} stroke={C.blue} strokeWidth={5} />
      <g transform="translate(560 330)">
        <rect x={0} y={0} width={14} height={14} rx={4} fill={C.red} />
        <T x={22} y={13} anchor="start" size={15} weight={500}>แก้แรงเกิน (ส่ายนาน)</T>
        <rect x={0} y={26} width={14} height={14} rx={4} fill={C.blue} />
        <T x={22} y={39} anchor="start" size={15} weight={500}>จูนดีแล้ว (กลับเร็ว นิ่ง)</T>
      </g>
      <T x={x0 + w / 2} y={H - 18} c={C.soft} size={15} weight={500}>เวลา →</T>
    </Svg>
  );
}

/** เซ็นเซอร์บนโดรนมองจากด้านข้าง */
export function SensorsDiagram() {
  return (
    <Svg w={880} h={420} title="เซ็นเซอร์บนโดรนและสิ่งที่แต่ละตัววัด">
      <path d="M40 360 H840" stroke={C.ink} strokeWidth={3} />
      <path d="M40 360 H840" stroke={C.line} strokeWidth={14} opacity={0.35} />
      <g transform="translate(440 170)">
        <rect x={-96} y={-14} width={192} height={32} rx={12} fill={C.paper} stroke={C.ink} strokeWidth={3} />
        <rect x={-30} y={-40} width={60} height={26} rx={8} fill={C.paper} stroke={C.ink} strokeWidth={3} />
        <path d="M-130 0 H-96 M96 0 H130" stroke={C.soft} strokeWidth={5} />
        <path d="M-160 -8 H-100 M100 -8 H160" stroke={C.blue} strokeWidth={6} />
      </g>
      {/* LiDAR + optical flow ชี้ลงพื้น */}
      <path d="M440 195 V350" stroke={C.blue} strokeWidth={3} strokeDasharray="4 7" markerEnd="url(#ah-blue)" />
      <T x={456} y={290} anchor="start" c={C.blue} size={15}>LiDAR วัดระยะถึงพื้น</T>
      <path d="M470 195 L560 345 M410 195 L320 345" stroke={C.red} strokeWidth={2.5} strokeDasharray="3 6" />
      <T x={600} y={330} anchor="start" c={C.red} size={15}>กล้อง Optical flow</T>
      <T x={600} y={352} anchor="start" c={C.red} size={13} weight={500}>ดูลายพื้นว่าเลื่อนไปทางไหน</T>
      <Box x={60} y={40} w={220} h={64} tone="paper2" />
      <T x={170} y={68} size={15}>IMU (ไจโร + มาตรความเร่ง)</T>
      <T x={170} y={90} size={14} c={C.soft} weight={500}>รู้ว่าเอียงเท่าไร หมุนเร็วแค่ไหน</T>
      <Arrow d="M280 72 L400 140" tone="ink" w={2.5} />
      <Box x={600} y={40} w={220} h={64} tone="paper2" />
      <T x={710} y={68} size={15}>บารอมิเตอร์</T>
      <T x={710} y={90} size={14} c={C.soft} weight={500}>วัดความสูงจากความกดอากาศ</T>
      <Arrow d="M600 80 L500 140" tone="ink" w={2.5} />
    </Svg>
  );
}

/** ความผิดพลาดสะสมของ dead reckoning */
export function DriftDiagram() {
  return (
    <Svg w={880} h={420} title="ความคลาดเคลื่อนสะสมเมื่อบินด้วยการกะเวลา" desc="เส้นประคือเส้นทางที่ตั้งใจ เส้นทึบคือที่โดรนไปจริง ซึ่งเบี่ยงออกทีละนิดแล้วสะสม">
      <rect x={60} y={50} width={760} height={300} rx={20} fill={C.paper2} stroke={C.line} strokeWidth={2} />
      <path d="M120 300 H700 V120 H260" stroke={C.soft} strokeWidth={3} strokeDasharray="8 8" />
      <path d="M120 300 C 300 296, 520 290, 690 276 C 700 220, 706 170, 716 134 C 600 136, 400 150, 262 168" stroke={C.red} strokeWidth={4.5} markerEnd="url(#ah-red)" />
      <circle cx={120} cy={300} r={9} fill={C.blue} />
      <T x={120} y={332} size={15}>เริ่ม</T>
      <T x={470} y={92} size={15} c={C.soft} weight={500}>เส้นทางที่ตั้งใจ (เส้นประ)</T>
      <T x={470} y={254} size={15} c={C.red}>ที่ไปจริง (เบี่ยงสะสมทุกช่วง)</T>
      <path d="M262 168 L260 120" stroke={C.ink} strokeWidth={2.5} markerStart="url(#ah-ink)" markerEnd="url(#ah-ink)" />
      <T x={284} y={146} anchor="start" size={15}>คลาดไปนี้</T>
    </Svg>
  );
}

export const physicsFigures: Record<string, ComponentType<Record<string, unknown>>> = { ForcesDiagram, TiltForces, FourMoves, RotorTorque, AxesDiagram, MixingDiagram, PidResponse, SensorsDiagram, DriftDiagram };
