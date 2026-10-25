/**
 * ภาพเส้น (line illustration) อธิบายหลักการบินทีละขั้น — โทนเดียวกับ LunoRX: เส้นสีหลัก + เส้นจาง + สีเน้นไม่เกิน 2 สี
 * viewBox 480×400 · ทุกฉากอยู่ใน <svg> เดียว สลับด้วย data-on (เส้นค่อยๆ ลากออก, ป้ายค่อยๆ ขึ้น)
 * ไม่วาดโดรนซ้ำ: โดรนตัวจริงคือโมเดล 3 มิติที่ซ้อนอยู่กึ่งกลางภาพนี้ (ช่องว่างราว x 140-340, y 120-280) SVG วาดเฉพาะลูกศร ลม ป้าย และกราฟรอบตัวมัน
 */
const INK = 'var(--foreground)';
const SOFT = 'var(--muted-foreground)';
const BLUE = 'var(--brand-blue)';
const RED = 'var(--brand-red)';
const PAPER = 'var(--canvas)';

type P = { d: string; c?: string; w?: number; delay?: number; head?: 'b' | 'r' | 'k'; dash?: boolean };
function Line({ d, c = INK, w = 3, delay = 0, head, dash }: P) {
  return (
    <path
      d={d}
      pathLength={1}
      className={dash ? undefined : 'draw'}
      style={{ ['--d' as string]: `${delay}ms` }}
      stroke={c}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash ? '0.015 0.02' : undefined}
      fill="none"
      markerEnd={head ? `url(#h-${head})` : undefined}
    />
  );
}

function Text({ x, y, children, c = INK, anchor = 'middle', size = 17, delay = 300, weight = 600 }: { x: number; y: number; children: React.ReactNode; c?: string; anchor?: 'start' | 'middle' | 'end'; size?: number; delay?: number; weight?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={c} className="pop" style={{ ['--d' as string]: `${delay}ms` }}>
      {children}
    </text>
  );
}

const Wind = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
  <path d={`M${x1} ${y1} L${x2} ${y2}`} pathLength={1} className="flow" stroke={SOFT} strokeWidth={2.5} strokeLinecap="round" />
);

/** ลูกศรโค้งหมุนรอบจุด (cw = ตามเข็ม) */
const spinArc = (cx: number, cy: number, r: number, cw: boolean) => (cw ? `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}` : `M${cx + r} ${cy} A${r} ${r} 0 0 0 ${cx - r} ${cy}`);

/** กราฟ PID: ความสูงโดนลมกดลงก่อน แล้วส่ายกลับขึ้นลงจนนิ่งที่เส้นเป้าหมาย (อยู่ใต้โดรน) */
const pidPath = (() => {
  const pts: string[] = ['M50 330 L110 330'];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    pts.push(`L${(110 + t * 330).toFixed(1)} ${(330 + 44 * Math.exp(-4.2 * t) * Math.cos(t * 17)).toFixed(1)}`);
  }
  return pts.join(' ');
})();

/** ฉากหลังที่อยู่ทุกฉาก: วงจางๆ รอบโดรน เป็นเวทีให้ตาโฟกัสตรงกลาง */
function Backdrop() {
  return (
    <g stroke={SOFT} strokeWidth={1.5} opacity={0.35} fill="none">
      <circle cx={240} cy={200} r={118} strokeDasharray="2 7" strokeLinecap="round" />
      <circle cx={240} cy={200} r={176} strokeDasharray="2 11" strokeLinecap="round" />
      <path d="M240 12 V28 M240 372 V388 M16 200 H32 M448 200 H464" strokeLinecap="round" />
    </g>
  );
}

/** ตัวอย่างสี: ฟ้า = หมุนตามเข็ม · แดง = ทวนเข็ม */
function SpinKey({ y = 382 }: { y?: number }) {
  return (
    <g className="pop" style={{ ['--d' as string]: '400ms' }}>
      <path d={spinArc(104, y - 6, 12, true)} stroke={BLUE} strokeWidth={4} strokeLinecap="round" markerEnd="url(#h-b)" />
      <text x={126} y={y} fontSize={16} fontWeight={600} fill={BLUE}>ฟ้า = หมุนตามเข็ม</text>
      <path d={spinArc(300, y - 6, 12, false)} stroke={RED} strokeWidth={4} strokeLinecap="round" markerEnd="url(#h-r)" />
      <text x={322} y={y} fontSize={16} fontWeight={600} fill={RED}>แดง = ทวนเข็ม</text>
    </g>
  );
}

export function StoryArt({ step }: { step: string }) {
  const on = (id: string) => (step === id ? '' : undefined);
  return (
    <svg viewBox="0 0 480 400" className="size-full overflow-visible" fill="none" role="img" aria-label="ภาพประกอบการเคลื่อนที่ของโดรน">
      <defs>
        {([['b', BLUE], ['r', RED], ['k', INK]] as const).map(([k, c]) => (
          <marker key={k} id={`h-${k}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={c} />
          </marker>
        ))}
      </defs>
      <Backdrop />

      {/* 1 ลอยนิ่ง: แรงดันขึ้น = น้ำหนัก */}
      <g className="art" data-on={on('lift')}>
        <Line d="M240 120 V40" c={BLUE} w={5} head="b" delay={100} />
        <Text x={240} y={26} c={BLUE}>แรงดันขึ้น</Text>
        <Wind x1={190} y1={262} x2={190} y2={330} />
        <Wind x1={240} y1={268} x2={240} y2={340} />
        <Wind x1={290} y1={262} x2={290} y2={330} />
        <Text x={240} y={366} c={SOFT} size={16}>ใบพัดตีลมลงข้างล่าง</Text>
        <Line d="M418 160 V270" c={RED} w={5} head="r" delay={250} />
        <Text x={418} y={296} c={RED}>น้ำหนัก</Text>
        <Text x={418} y={316} c={RED} size={16}>310 กรัม</Text>
        <Line d="M62 200 H110" c={SOFT} w={2} dash />
        <Text x={62} y={184} c={SOFT} anchor="start" size={16}>ลอยอยู่ระดับเดิม</Text>
      </g>

      {/* 2 ใบพัดสวนกัน */}
      <g className="art" data-on={on('rotors')}>
        <Line d={spinArc(70, 90, 34, true)} c={BLUE} w={5} head="b" />
        <Line d={spinArc(410, 90, 34, false)} c={RED} w={5} head="r" delay={150} />
        <Text x={70} y={150} c={BLUE} size={16}>ตามเข็ม 2 ใบ</Text>
        <Text x={410} y={150} c={RED} size={16}>ทวนเข็ม 2 ใบ</Text>
        <Line d="M118 108 C150 128 160 140 170 150" c={BLUE} w={2} dash />
        <Line d="M362 108 C330 128 320 140 310 150" c={RED} w={2} dash />
        <SpinKey />
      </g>

      {/* 3 ก้มหัว = ไปข้างหน้า */}
      <g className="art" data-on={on('pitch')}>
        <Line d="M60 200 H110" c={SOFT} w={2} dash />
        <Line d="M290 80 H430" c={BLUE} w={5} head="b" delay={200} />
        <Text x={360} y={62} c={BLUE}>ไปข้างหน้า</Text>
        <Line d="M330 150 A70 70 0 0 1 345 205" c={BLUE} w={3} delay={350} />
        <Text x={380} y={150} c={BLUE} anchor="start" size={16}>ก้มหัว</Text>
        <Wind x1={215} y1={262} x2={180} y2={335} />
        <Wind x1={265} y1={258} x2={230} y2={331} />
        <Text x={190} y={366} c={SOFT} size={16}>ลมเฉียงไปข้างหลัง</Text>
        <Text x={240} y={392} size={17} delay={500}>ยิ่งก้มมาก ยิ่งพุ่งเร็ว</Text>
      </g>

      {/* 4 เอียงข้าง = เลื่อนข้าง */}
      <g className="art" data-on={on('roll')}>
        <Line d="M60 200 H110" c={SOFT} w={2} dash />
        <Text x={60} y={128} c={SOFT} anchor="start" size={16}>ข้างนี้สูง</Text>
        <Text x={420} y={292} c={BLUE} anchor="end" size={16}>ข้างนี้ต่ำ</Text>
        <Line d="M250 80 H410" c={BLUE} w={5} head="b" delay={250} />
        <Text x={330} y={62} c={BLUE}>เลื่อนไปทางที่ต่ำ</Text>
        <Wind x1={205} y1={262} x2={180} y2={335} />
        <Wind x1={265} y1={266} x2={240} y2={339} />
        <Text x={240} y={392} size={17} delay={500}>หัวโดรนยังหันไปทางเดิม</Text>
      </g>

      {/* 5 หมุนตัวอยู่กับที่ */}
      <g className="art" data-on={on('yaw')}>
        <Line d="M70 250 A180 140 0 0 1 150 70" c={BLUE} w={5} head="b" />
        <Line d="M410 150 A180 140 0 0 1 330 330" c={BLUE} w={5} head="b" delay={150} />
        <Text x={74} y={284} c={BLUE} anchor="start" size={16}>หมุนตัวอยู่กับที่</Text>
        <Text x={240} y={392} size={17} delay={500}>ใบพัดคู่หนึ่งหมุนเร็วขึ้น → ตัวโดรนค่อยๆ หมุน</Text>
      </g>

      {/* 6 แบ่งแรงให้ 4 ใบพัด: คู่สีแดงเร็ว คู่สีฟ้าช้า */}
      <g className="art" data-on={on('mixing')}>
        {[[44, 0.28, BLUE, 'ใบพัดสีฟ้า', 'หมุนช้า'], [422, 0.88, RED, 'ใบพัดสีแดง', 'หมุนเร็ว']].map(([x, v, c, a, b], i) => (
          <g key={i} className="pop" style={{ ['--d' as string]: `${i * 120}ms` }}>
            <rect x={x as number} y={110} width={14} height={160} rx={7} fill="var(--surface-2)" stroke="var(--line)" />
            <rect x={x as number} y={110 + 160 * (1 - (v as number))} width={14} height={160 * (v as number)} rx={7} fill={c as string} className="meter" />
            <text x={(x as number) + 7} y={296} textAnchor="middle" fontSize={16} fontWeight={600} fill={c as string}>{a as string}</text>
            <text x={(x as number) + 7} y={316} textAnchor="middle" fontSize={16} fontWeight={600} fill={c as string}>{b as string}</text>
          </g>
        ))}
        <Text x={240} y={392} size={17} delay={450}>คู่ที่เร็วกว่าดันแรงมากกว่า → โดรนหมุนไปทางนั้น</Text>
      </g>

      {/* 7 โดนลมแล้วกลับมานิ่ง: ลมพัดจากซ้าย + กราฟความสูงใต้โดรน */}
      <g className="art" data-on={on('pid')}>
        <Line d="M50 150 H120" c={SOFT} w={4} head="k" delay={100} />
        <Wind x1={50} y1={176} x2={120} y2={176} />
        <Wind x1={50} y1={124} x2={120} y2={124} />
        <Text x={50} y={108} c={SOFT} anchor="start" size={16}>ลมพัด</Text>
        <Line d="M50 280 V380 H450" c={INK} w={2.5} />
        <Line d="M50 330 H450" c={RED} w={2.5} dash />
        <Text x={446} y={316} c={RED} anchor="end" size={16}>ความสูงที่ต้องการ</Text>
        <path d={pidPath} pathLength={1} className="draw" style={{ ['--d' as string]: '300ms' }} stroke={BLUE} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Text x={190} y={374} c={BLUE} size={16}>ส่ายแรงตอนแรก</Text>
        <Text x={400} y={364} c={BLUE} size={16}>แล้วค่อยๆ นิ่ง</Text>
      </g>
    </svg>
  );
}
