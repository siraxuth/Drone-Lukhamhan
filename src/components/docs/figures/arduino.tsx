import type { ComponentType } from 'react';
import { Arrow, Box, C, Svg, T } from '../svg';

/** เขียน → คอมไพล์ → อัปโหลด → Nano รัน */
export function BuildFlow() {
  const steps = [
    { t: 'เขียน', s: 'ไฟล์ .ino' },
    { t: 'คอมไพล์', s: 'เป็นรหัสเครื่อง' },
    { t: 'อัปโหลด', s: 'ผ่านสาย USB' },
    { t: 'รันบน Nano', s: 'setup() → loop()' },
  ];
  return (
    <Svg w={760} h={310} title="ขั้นตอนจากโค้ดถึงบอร์ด" desc="เขียนโค้ด คอมไพล์ อัปโหลด แล้ว Nano รันโปรแกรม พร้อมการตั้งค่าบอร์ดสามข้อก่อนอัปโหลด">
      {steps.map((s, i) => {
        const x = 20 + i * 184;
        return (
          <g key={s.t}>
            <Box x={x} y={20} w={150} h={84} tone={i === 3 ? 'blue' : 'paper2'} />
            <T x={x + 75} y={56}>{s.t}</T>
            <T x={x + 75} y={84} size={14} c={C.soft} weight={500}>{s.s}</T>
            {i < 3 && <Arrow d={`M${x + 152} 62 H${x + 182}`} tone="ink" w={3} />}
          </g>
        );
      })}
      <T x={20} y={150} anchor="start" size={15} c={C.soft}>ก่อนกดอัปโหลด ตั้งสามอย่างในเมนู Tools:</T>
      {[
        { k: 'Board', v: 'Arduino Nano' },
        { k: 'Processor', v: 'ATmega328P (Old Bootloader)' },
        { k: 'Port', v: 'พอร์ตที่เพิ่งเสียบ' },
      ].map((r, i) => (
        <g key={r.k}>
          <Box x={20 + i * 240} y={168} w={228} h={86} tone="paper" r={10} />
          <T x={134 + i * 240} y={198} c={C.blue}>{r.k}</T>
          <T x={134 + i * 240} y={228} size={14} weight={500}>{r.v}</T>
        </g>
      ))}
      <T x={380} y={290} size={14} c={C.red} weight={500}>ลืม Old Bootloader → ขึ้น "not in sync"</T>
    </Svg>
  );
}

/** ใครเรียกใคร ในโปรเจกต์ drone_sanam5 */
export function ProjectMap() {
  return (
    <Svg w={760} h={420} title="โครงสร้างโปรเจกต์: ตัวเลือกโหมด, ตัวกระจายโหมด, ไฟล์โหมด, และไลบรารีสั่งโดรน" desc="mode_config.hpp เลือกโหมด drone_sanam5.ino เรียก setup และ loop ของโหมดนั้น โหมดเรียก drone ของ DroneEasy ซึ่งเรียก pArduino ของ protocol">
      <Box x={230} y={14} w={300} h={64} tone="red" />
      <T x={380} y={42}>mode_config.hpp</T>
      <T x={380} y={66} size={14} c={C.soft} weight={500}>ACTIVE_FLIGHT_MODE = 1, 2 หรือ 3</T>
      <Arrow d="M380 80 V108" tone="ink" />
      <Box x={230} y={110} w={300} h={64} tone="blue" />
      <T x={380} y={138}>drone_sanam5.ino</T>
      <T x={380} y={162} size={14} c={C.soft} weight={500}>setup() / loop() → MODE_SETUP / MODE_LOOP</T>
      {[
        { x: 20, t: 'Drone_Mission.ino', s: 'โหมด 1 · KEY 1–14' },
        { x: 270, t: 'Aviation_Mastery.ino', s: 'โหมด 2 · KEY 1–4' },
        { x: 520, t: 'Drone_Innovation…ino', s: 'โหมด 3 · ว่าง' },
      ].map((m) => (
        <g key={m.t}>
          <Arrow d={`M380 176 C380 200 ${m.x + 110} 196 ${m.x + 110} 220`} tone="ink" w={2.5} />
          <Box x={m.x} y={222} w={220} h={64} tone="paper2" />
          <T x={m.x + 110} y={250} size={15}>{m.t}</T>
          <T x={m.x + 110} y={274} size={14} c={C.soft} weight={500}>{m.s}</T>
          <Arrow d={`M${m.x + 110} 288 V316`} tone="ink" w={2.5} />
        </g>
      ))}
      <Box x={20} y={318} w={720} h={44} tone="paper" r={10} />
      <T x={380} y={347}>drone.takeOff(), drone.fw(100)  ← DroneEasy.hpp / .cpp</T>
      <Arrow d="M380 364 V386" tone="ink" w={2.5} />
      <Box x={20} y={388} w={720} h={26} tone="paper2" r={8} />
      <T x={380} y={408} size={14} c={C.soft}>pArduino-&gt;… ← protocol.hpp / .cpp  →  I2C  →  FC</T>
    </Svg>
  );
}

/** setup() รัน 1 ครั้ง แล้ว loop() วนซ้ำ */
export function SetupLoop() {
  return (
    <Svg w={760} h={300} title="setup รันครั้งเดียว แล้ว loop วนซ้ำตลอด" desc="เปิดบอร์ดหรือกดรีเซ็ต setup ทำงานหนึ่งครั้ง จากนั้น loop ทำซ้ำไม่จบ">
      <Box x={20} y={100} w={130} h={70} tone="paper2" />
      <T x={85} y={142}>เปิดบอร์ด</T>
      <Arrow d="M152 135 H206" tone="ink" />
      <Box x={208} y={80} w={200} h={110} tone="blue" />
      <T x={308} y={118}>setup()</T>
      <T x={308} y={148} size={14} c={C.soft} weight={500}>ตั้งค่า ทำครั้งเดียว</T>
      <T x={308} y={170} size={14} c={C.soft} weight={500}>pinMode, Serial.begin</T>
      <Arrow d="M410 135 H484" tone="ink" />
      <Box x={486} y={80} w={200} h={110} tone="paper2" />
      <T x={586} y={118}>loop()</T>
      <T x={586} y={148} size={14} c={C.soft} weight={500}>ทำซ้ำไม่จบ</T>
      <T x={586} y={170} size={14} c={C.soft} weight={500}>อ่านปุ่ม สั่งโดรน</T>
      <Arrow d="M640 192 C640 262 530 262 530 194" tone="red" />
      <T x={585} y={284} c={C.red} size={15}>จบแล้ววนกลับ</T>
      <T x={308} y={50} size={14} c={C.soft} weight={500}>กดรีเซ็ต = กลับมาเริ่มที่นี่ใหม่</T>
    </Svg>
  );
}

/** คลื่น LED กระพริบ: HIGH 500 ms, LOW 500 ms */
export function BlinkWave() {
  const x0 = 70, u = 0.62; // 1 ms = 0.62 px
  const X = (ms: number) => x0 + ms * u;
  const d = `M${X(0)} 170 L${X(0)} 80 L${X(500)} 80 L${X(500)} 170 L${X(1000)} 170 L${X(1000)} 80 L${X(1500)} 80 L${X(1500)} 170 L${X(2000)} 170`;
  return (
    <Svg w={760} h={270} title="ขา 13 สลับสูงต่ำทุก 500 มิลลิวินาที" desc="LED ติด 0.5 วินาที ดับ 0.5 วินาที สลับไปเรื่อยๆ">
      <path d={d} stroke={C.blue} strokeWidth={4} />
      <T x={62} y={86} anchor="end" size={15} c={C.soft}>HIGH</T>
      <T x={62} y={176} anchor="end" size={15} c={C.soft}>LOW</T>
      <T x={X(250)} y={66} c={C.blue} size={15}>ติด</T>
      <T x={X(750)} y={196} c={C.soft} size={15}>ดับ</T>
      <T x={X(1250)} y={66} c={C.blue} size={15}>ติด</T>
      <path d={`M${X(0)} 218 H${X(500)}`} stroke={C.red} strokeWidth={2.5} markerStart="url(#ah-red)" markerEnd="url(#ah-red)" />
      <T x={X(250)} y={246} c={C.red} size={15}>delay(500)</T>
      <path d={`M${X(500)} 218 H${X(1000)}`} stroke={C.red} strokeWidth={2.5} markerStart="url(#ah-red)" markerEnd="url(#ah-red)" />
      <T x={X(750)} y={246} c={C.red} size={15}>delay(500)</T>
      <T x={700} y={246} size={14} c={C.soft} weight={500}>เวลา →</T>
    </Svg>
  );
}

/** ชนิดข้อมูลเป็น "กล่อง" ขนาดต่างกัน */
export function TypeSizes() {
  const rows = [
    { t: 'uint8_t', b: 1, r: '0 – 255', e: 'speed, เลขโหมด' },
    { t: 'uint16_t', b: 2, r: '0 – 65,535', e: 'ความสูง cm, pulse µs' },
    { t: 'uint32_t', b: 4, r: '0 – 4,294,967,295', e: 'เวลาจาก millis()' },
    { t: 'float', b: 4, r: 'ทศนิยม', e: 'MS_PER_CM_FWD = 15.46' },
  ];
  return (
    <Svg w={760} h={330} title="ชนิดข้อมูลที่ใช้ในโค้ดชมรมและขนาดเป็นไบต์" desc="uint8_t 1 ไบต์ uint16_t 2 ไบต์ uint32_t และ float 4 ไบต์">
      {rows.map((r, i) => {
        const y = 20 + i * 74;
        return (
          <g key={r.t}>
            <T x={20} y={y + 30} anchor="start" mono>{r.t}</T>
            {Array.from({ length: r.b }).map((_, k) => (
              <Box key={k} x={170 + k * 62} y={y} w={56} h={44} tone="blue" r={8} />
            ))}
            <T x={170 + r.b * 62 + 8} y={y + 20} anchor="start" size={14} weight={500} c={C.soft}>{r.b} ไบต์ · {r.r}</T>
            <T x={170 + r.b * 62 + 8} y={y + 40} anchor="start" size={14} weight={500}>{r.e}</T>
          </g>
        );
      })}
      <T x={20} y={322} anchor="start" size={14} c={C.soft} weight={500}>Nano มี RAM รวมแค่ 2,048 ไบต์ เลือกกล่องให้พอดี</T>
    </Svg>
  );
}

/** ผังลูปตรวจความสูงจาก reach_height_shoot_stable() ใน shooting.ino */
export function LoopFlow() {
  return (
    <Svg w={760} h={420} title="ผังงานลูปรอความสูงนิ่ง" desc="อ่านความสูง ถ้าเป็น 0 หรือเกิน 300 ทิ้งค่า ถ้าอยู่ในช่วง 120 บวกลบ 4 ให้นับเวลา ครบ 500 ms ออกจากลูป">
      <Box x={20} y={20} w={200} h={54} tone="paper2" />
      <T x={120} y={54}>อ่าน h = ความสูง</T>
      <Arrow d="M120 76 V104" tone="ink" />
      <Box x={20} y={106} w={200} h={64} tone="paper" />
      <T x={120} y={134} size={15}>h = 0 หรือ h &gt; 300 ?</T>
      <T x={120} y={156} size={14} c={C.soft} weight={500}>(ค่าเพี้ยน)</T>
      <Arrow d="M222 138 H300" tone="red" />
      <T x={262} y={126} size={14} c={C.red}>ใช่</T>
      <Box x={302} y={108} w={210} h={60} tone="red" />
      <T x={407} y={134} size={15}>ทิ้งค่า เริ่มนับใหม่</T>
      <T x={407} y={156} size={14} c={C.soft} weight={500}>stableSince = 0</T>
      <Arrow d="M120 172 V210" tone="ink" />
      <T x={140} y={196} size={14} c={C.soft}>ไม่</T>
      <Box x={20} y={212} w={200} h={64} tone="paper" />
      <T x={120} y={240} size={15}>|h − 120| ≤ 4 ?</T>
      <T x={120} y={262} size={14} c={C.soft} weight={500}>(อยู่ในช่วงเป้า)</T>
      <Arrow d="M222 244 H300" tone="blue" />
      <T x={262} y={232} size={14} c={C.blue}>ใช่</T>
      <Box x={302} y={214} w={210} h={60} tone="blue" />
      <T x={407} y={240} size={15}>เริ่มจับเวลา (ถ้ายังไม่เริ่ม)</T>
      <T x={407} y={262} size={14} c={C.soft} weight={500}>ครบ 500 ms → break</T>
      <Arrow d="M120 278 V316" tone="ink" />
      <T x={140} y={302} size={14} c={C.soft}>ไม่</T>
      <Box x={20} y={318} w={200} h={54} tone="paper2" />
      <T x={120} y={352} size={15}>รีเซ็ตเวลานิ่ง</T>
      <T x={620} y={150} size={14} c={C.soft} weight={500}>ทุกเส้นทางวนกลับไปอ่านใหม่</T>
      <T x={620} y={174} size={14} c={C.soft} weight={500}>จนกว่าเวลาจะหมด (3500 ms)</T>
      <path d="M512 138 H560 V30 H220" stroke={C.soft} strokeWidth={2.5} strokeDasharray="2 7" markerEnd="url(#ah-soft)" />
      <path d="M512 244 H560" stroke={C.soft} strokeWidth={2.5} strokeDasharray="2 7" />
    </Svg>
  );
}

/** อาร์เรย์ 4 ช่อง จากบรรทัดแรกของ Drone_Mission.ino */
export function ArrayCells() {
  return (
    <Svg w={760} h={260} title="อาร์เรย์ forwardDistanceCM มี 4 ช่อง" desc="ช่อง 0 ถึง 3 เก็บค่า 352 เหมือนกันทุกช่อง">
      <T x={380} y={34} mono>int forwardDistanceCM[4] = {'{'} 352, 352, 352, 352 {'}'};</T>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Box x={90 + i * 150} y={70} w={130} h={64} tone="blue" />
          <T x={155 + i * 150} y={110} mono size={20}>352</T>
          <T x={155 + i * 150} y={164} mono c={C.red}>[{i}]</T>
        </g>
      ))}
      <T x={380} y={210} size={15} c={C.soft} weight={500}>นับเริ่มที่ 0 เสมอ ช่องสุดท้ายคือ [3] ไม่ใช่ [4]</T>
      <T x={380} y={240} size={14} c={C.soft} weight={500}>ใช้ [4] = อ่านหน่วยความจำนอกอาร์เรย์ ได้ค่ามั่ว</T>
    </Svg>
  );
}

/** ฟังก์ชันเป็นกล่อง: รับค่าเข้า คืนค่าออก */
export function FunctionBox() {
  return (
    <Svg w={760} h={290} title="ฟังก์ชันรับค่าเข้าและคืนค่าออก" desc="servo_degree_to_pulse รับองศา คืนความกว้างพัลส์">
      <Box x={20} y={90} w={170} h={80} tone="paper2" />
      <T x={105} y={124} mono size={16}>angle = 90</T>
      <T x={105} y={152} size={14} c={C.soft} weight={500}>ค่าเข้า (พารามิเตอร์)</T>
      <Arrow d="M192 130 H268" tone="ink" />
      <Box x={270} y={50} w={230} h={160} tone="blue" />
      <T x={385} y={82} mono size={15}>servo_degree_to_pulse</T>
      <T x={385} y={116} size={14} c={C.soft} weight={500}>1) จำกัด angle 0–180</T>
      <T x={385} y={142} size={14} c={C.soft} weight={500}>2) map() เป็น 490–2550</T>
      <T x={385} y={180} size={14} c={C.soft} weight={500}>int คือชนิดที่คืน</T>
      <Arrow d="M502 130 H578" tone="ink" />
      <Box x={580} y={90} w={160} h={80} tone="paper2" />
      <T x={660} y={124} mono size={16}>1520</T>
      <T x={660} y={152} size={14} c={C.soft} weight={500}>ค่าที่ return</T>
      <T x={380} y={256} size={14} c={C.soft} weight={500}>ฟังก์ชันที่ไม่ต้องคืนค่าใช้ void ที่หน้าชื่อ เช่น void hold_now()</T>
    </Svg>
  );
}

/** pointer: ตัวแปรหนึ่งกล่อง + กล่องที่เก็บที่อยู่ของมัน */
export function PointerDiagram() {
  return (
    <Svg w={760} h={330} title="ตัวชี้ (pointer) เก็บที่อยู่ของตัวแปรอื่น" desc="x เก็บค่า 42 ที่ที่อยู่หนึ่ง p เก็บที่อยู่นั้นและชี้ไปที่ x">
      <T x={20} y={34} anchor="start" size={15} c={C.soft}>หน่วยความจำคือแถวช่องที่มีเลขที่อยู่</T>
      <Box x={60} y={70} w={170} h={80} tone="paper2" />
      <T x={145} y={104} mono>x = 42</T>
      <T x={145} y={134} size={14} c={C.soft} weight={500}>ชนิด int</T>
      <T x={145} y={176} mono size={15} c={C.red}>ที่อยู่ 0x0200</T>

      <Box x={400} y={70} w={220} h={80} tone="blue" />
      <T x={510} y={104} mono>p = 0x0200</T>
      <T x={510} y={134} size={14} c={C.soft} weight={500}>ชนิด int*</T>
      <Arrow d="M400 110 H232" tone="blue" w={4} />
      <T x={316} y={98} size={14} c={C.blue}>ชี้ไปที่</T>

      <Box x={20} y={226} w={720} h={86} tone="paper" />
      <T x={380} y={256} mono size={15}>int* p = &amp;x;   // &amp;x = "ที่อยู่ของ x"</T>
      <T x={380} y={284} mono size={15}>*p = 99;     // เข้าไปที่ที่อยู่ที่ p ถือ แล้วเขียนทับ → x เป็น 99</T>
    </Svg>
  );
}

/** pArduino->take_off(): ตัวชี้ → วัตถุ → เมธอด */
export function ClassObject() {
  return (
    <Svg w={760} h={420} title="คลาส Arduino, วัตถุ และตัวชี้ pArduino" desc="คลาสคือพิมพ์เขียว new Arduino() สร้างวัตถุหนึ่งตัวใน RAM pArduino เก็บที่อยู่ของวัตถุนั้น ลูกศร -> เรียกเมธอด">
      <Box x={20} y={20} w={330} h={186} tone="paper2" />
      <T x={185} y={50}>class Arduino  (พิมพ์เขียว)</T>
      <T x={36} y={82} anchor="start" size={14} c={C.soft} weight={500}>ข้อมูล: m_i2cData[6], m_remoteKey</T>
      <T x={36} y={112} anchor="start" size={14} mono>void take_off();</T>
      <T x={36} y={138} anchor="start" size={14} mono>void set_height(uint16_t z);</T>
      <T x={36} y={164} anchor="start" size={14} mono>void move_forward_cm(...);</T>
      <T x={36} y={190} anchor="start" size={14} c={C.soft} weight={500}>…อีกกว่า 30 เมธอดใน protocol.hpp</T>
      <Arrow d="M352 112 H430" tone="ink" w={3} />
      <T x={392} y={98} size={14} c={C.soft}>new</T>
      <Box x={432} y={20} w={308} h={186} tone="blue" />
      <T x={586} y={50}>วัตถุ Arduino  (ของจริง 1 ตัว)</T>
      <T x={586} y={86} size={14} c={C.soft} weight={500}>อยู่ที่ RAM ที่อยู่ 0x0300 (ตัวอย่าง)</T>
      <T x={586} y={116} size={14} mono>m_i2cData = [ ... ]</T>
      <T x={586} y={142} size={14} mono>m_remoteKey = NONE (0)</T>
      <T x={586} y={176} size={14} c={C.soft} weight={500}>สร้างตอนเริ่มโปรแกรม ที่ protocol.cpp</T>

      <Box x={432} y={264} w={308} h={64} tone="red" />
      <T x={586} y={292} mono>pArduino = 0x0300</T>
      <T x={586} y={316} size={14} c={C.soft} weight={500}>ตัวชี้ที่ถือที่อยู่ของวัตถุ</T>
      <Arrow d="M586 262 V210" tone="red" w={4} />

      <Box x={20} y={264} w={380} h={130} tone="paper" />
      <T x={210} y={296} mono size={16}>pArduino-&gt;take_off();</T>
      <T x={210} y={326} size={14} c={C.soft} weight={500}>"ไปที่วัตถุที่ pArduino ชี้อยู่</T>
      <T x={210} y={348} size={14} c={C.soft} weight={500}>แล้วสั่งเมธอด take_off ของมัน"</T>
      <T x={210} y={376} size={14} c={C.soft} weight={500}>-&gt; คือ "ตามตัวชี้ไป แล้วเข้าถึงสมาชิก"</T>
    </Svg>
  );
}

/** reg |= (1 << 3) บน 8 บิต */
export function BitRegister() {
  const cell = (label: string, bits: string, y: number, hot: number) => (
    <g>
      <T x={20} y={y + 30} anchor="start" mono size={15}>{label}</T>
      {bits.split('').map((b, i) => (
        <g key={i}>
          <Box x={250 + i * 58} y={y} w={52} h={46} tone={i === hot ? 'red' : 'paper'} r={8} />
          <T x={276 + i * 58} y={y + 31} mono size={18}>{b}</T>
        </g>
      ))}
    </g>
  );
  return (
    <Svg w={760} h={380} title="การเปิด ปิด สลับบิตด้วย OR, AND และ XOR" desc="reg เริ่มเป็น 00000000 เปิดบิต 3 ได้ 00001000 ปิดคืนได้ 00000000 สลับบิตได้ 00001000">
      {[7, 6, 5, 4, 3, 2, 1, 0].map((n, i) => (
        <T key={n} x={276 + i * 58} y={26} size={14} c={C.soft} mono>{n}</T>
      ))}
      <T x={20} y={26} anchor="start" size={14} c={C.soft}>เลขบิต →</T>
      {cell('reg', '00000000', 44, 4)}
      {cell('reg |= (1<<3)', '00001000', 118, 4)}
      {cell('reg &= ~(1<<3)', '00000000', 192, 4)}
      {cell('reg ^= (1<<3)', '00001000', 266, 4)}
      <T x={380} y={352} size={14} c={C.soft} weight={500}>1&lt;&lt;3 = เลข 1 เลื่อนไป 3 ตำแหน่ง = 00001000 (บิตที่ 3 = เลข 8)</T>
    </Svg>
  );
}

/** interrupt: loop ถูกขัด ไปทำ ISR แล้วกลับ */
export function InterruptFlow() {
  return (
    <Svg w={760} h={300} title="Interrupt หยุดงานหลักไปทำ ISR แล้วกลับมา" desc="loop ทำงานต่อเนื่อง เมื่อมีเหตุการณ์เช่น FC ส่งไบต์เข้ามา ฮาร์ดแวร์หยุด loop ไปรัน receiveEvent แล้วกลับ">
      <path d="M40 120 H280" stroke={C.blue} strokeWidth={5} />
      <path d="M440 120 H720" stroke={C.blue} strokeWidth={5} />
      <T x={160} y={92} c={C.blue}>loop() ทำงานปกติ</T>
      <T x={580} y={92} c={C.blue}>loop() ทำต่อจากเดิม</T>
      <Arrow d="M280 122 C300 122 310 190 330 190" tone="red" w={4} />
      <Box x={330} y={160} w={110} h={56} tone="red" r={10} />
      <T x={385} y={184} size={15}>ISR</T>
      <T x={385} y={206} size={14} c={C.soft} weight={500}>สั้น เร็ว</T>
      <Arrow d="M440 190 C460 190 470 122 440 122" tone="red" w={4} />
      <T x={385} y={246} size={15} c={C.red}>เหตุการณ์: FC ส่งปุ่มมาที่ 0x33</T>
      <T x={385} y={274} size={14} c={C.soft} weight={500}>Wire.onReceive(receiveEvent) ผูกฟังก์ชันไว้ล่วงหน้า</T>
    </Svg>
  );
}

/** delay() บล็อก vs millis() ไม่บล็อก */
export function TimingCompare() {
  return (
    <Svg w={760} h={360} title="เปรียบเทียบ delay กับ millis" desc="delay หยุดทุกอย่างระหว่างรอ millis ให้ loop วนทำงานอื่นแล้วเช็กเวลาไปเรื่อยๆ">
      <T x={20} y={34} anchor="start" c={C.red}>delay(1000)</T>
      <Box x={20} y={48} w={720} h={44} tone="red" r={8} />
      <T x={380} y={77} size={15}>รอเฉยๆ 1,000 ms · อ่านปุ่มไม่ได้ · เช็กความสูงไม่ได้</T>

      <T x={20} y={140} anchor="start" c={C.blue}>millis()</T>
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i}>
          <Box x={20 + i * 80} y={154} w={74} h={44} tone="blue" r={8} />
          <T x={57 + i * 80} y={182} size={14}>{i === 8 ? 'ครบ!' : 'ทำงาน'}</T>
        </g>
      ))}
      <T x={20} y={228} anchor="start" size={14} c={C.soft} weight={500}>ในแต่ละช่องมีสามอย่าง: อ่านปุ่ม · ทำงานอื่น · เช็ก millis() − t0 ≥ 1000</T>
      <path d="M20 270 H740" stroke={C.soft} strokeWidth={2.5} markerEnd="url(#ah-soft)" />
      <T x={380} y={304} size={15} c={C.soft}>เวลา 0 → 1,000 ms</T>
      <T x={380} y={338} size={14} c={C.soft} weight={500}>ทั้งสองแบบรอ 1 วินาทีเท่ากัน ต่างกันที่ระหว่างรอทำอะไรอื่นได้ไหม</T>
    </Svg>
  );
}

/** แกะโค้ด 1 บรรทัดเป็นชิ้นๆ ว่าแต่ละส่วนคืออะไร */
export function LineAnatomy() {
  const parts: { t: string; x: number; w: number; label: string; sub: string; tone: 'blue' | 'red' | 'paper' }[] = [
    { t: 'pArduino', x: 20, w: 190, label: 'วัตถุ', sub: 'ตัวที่เราสั่ง (เหมือนรีโมท)', tone: 'blue' },
    { t: '->', x: 214, w: 58, label: 'ลูกศร', sub: 'กดปุ่มของมัน', tone: 'paper' },
    { t: 'set_height', x: 276, w: 210, label: 'เมธอด', sub: 'ชื่อปุ่ม = สิ่งที่ให้ทำ', tone: 'red' },
    { t: '(110)', x: 490, w: 110, label: 'ค่า', sub: 'บอกรายละเอียด', tone: 'paper' },
    { t: ';', x: 604, w: 36, label: 'จบ', sub: 'จบประโยค', tone: 'paper' },
  ];
  return (
    <Svg w={680} h={250} title="แกะโค้ดหนึ่งบรรทัด" desc="pArduino คือวัตถุ ลูกศรคือกดปุ่ม set_height คือเมธอด 110 คือค่า เครื่องหมาย ; คือจบประโยค">
      {parts.map((p) => (
        <g key={p.t}>
          <Box x={p.x} y={20} w={p.w} h={56} tone={p.tone} />
          <T x={p.x + p.w / 2} y={57} mono size={p.t.length > 6 ? 19 : 22}>{p.t}</T>
          <Arrow d={`M${p.x + p.w / 2} 82 V122`} tone="soft" w={2} />
          <T x={p.x + p.w / 2} y={150} size={17}>{p.label}</T>
        </g>
      ))}
      <T x={115} y={178} size={14} c={C.soft} weight={500}>ตัวที่เราสั่ง</T>
      <T x={115} y={198} size={14} c={C.soft} weight={500}>(เหมือนรีโมท)</T>
      <T x={381} y={178} size={14} c={C.soft} weight={500}>ชื่อปุ่ม = สิ่งที่</T>
      <T x={381} y={198} size={14} c={C.soft} weight={500}>ให้โดรนทำ</T>
      <T x={545} y={178} size={14} c={C.soft} weight={500}>รายละเอียด</T>
      <T x={545} y={198} size={14} c={C.soft} weight={500}>(ความสูง 110 ซม.)</T>
      <T x={340} y={238} size={15} c={C.soft} weight={500}>อ่านเป็นภาษาคนว่า "รีโมท กดปุ่มตั้งความสูง ที่ 110"</T>
    </Svg>
  );
}

/** ตัวแปรคือกล่องมีป้ายชื่อ ใส่ค่าได้และเปลี่ยนค่าได้ */
export function VariableBox() {
  return (
    <Svg w={680} h={230} title="ตัวแปรคือกล่องที่มีป้ายชื่อ" desc="กล่องชื่อ height ใส่เลข 110 แล้วเปลี่ยนเป็น 60 ได้ภายหลัง">
      <Box x={40} y={60} w={170} h={90} tone="blue" />
      <T x={125} y={50} mono size={18}>height</T>
      <T x={125} y={116} size={34}>110</T>
      <T x={125} y={178} size={14} c={C.soft} weight={500}>ป้ายชื่อ + ของข้างใน</T>
      <Arrow d="M225 105 H305" tone="ink" w={3} />
      <T x={265} y={90} mono size={14}>height = 60;</T>
      <Box x={320} y={60} w={170} h={90} tone="red" />
      <T x={405} y={50} mono size={18}>height</T>
      <T x={405} y={116} size={34}>60</T>
      <T x={405} y={178} size={14} c={C.soft} weight={500}>ป้ายเดิม ของข้างในเปลี่ยน</T>
      <T x={595} y={92} size={15} c={C.soft} weight={500}>ใช้ชื่อแทนเลข</T>
      <T x={595} y={114} size={15} c={C.soft} weight={500}>แก้ที่เดียว</T>
      <T x={595} y={136} size={15} c={C.soft} weight={500}>เปลี่ยนทั้งโปรแกรม</T>
    </Svg>
  );
}

export const arduinoFigures: Record<string, ComponentType<Record<string, unknown>>> = {
  BuildFlow, ProjectMap, SetupLoop, BlinkWave, TypeSizes, LoopFlow, ArrayCells, FunctionBox,
  PointerDiagram, ClassObject, LineAnatomy, VariableBox, BitRegister, InterruptFlow, TimingCompare,
};
