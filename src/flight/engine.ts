import { styleError, type Style } from "./style";
/**
 * เอนจินจำลองการบินบนสนามจริง 10×10 ม. (ไม่ผูกกับ UI)
 * - คำสั่งสะท้อน DroneEasy ของโค้ดชมรม (drone_sanam5) และค่า ms/ซม. จาก config.hpp
 * - คิดคะแนนตามกติกาในไฟล์ rules/season-*.ts
 * หน่วย: ระยะ = ซม., เวลา = มิลลิวินาที · พิกัด x ขวา, y ลง (เหนืออยู่ด้านบน), กลางสนาม = (500, 500)
 * ทิศหัวโดรน yaw: 0° = เหนือ, + = หมุนขวา (ตามเข็ม)
 */

export const FIELD_CM = 1000;
export const TIME_LIMIT_MS = 150_000;

/** ms ต่อ 1 ซม. จาก config.hpp — โดรนจริงใช้ dead-reckoning (เวลา × ความเร็ว) แบบเดียวกัน */
export const MS_PER_CM = { fw: 15.46, bw: 15.16, ml: 15.65, mr: 15.65 } as const;
const MS_PER_CM_CLIMB = 12;
const MS_PER_DEG_YAW = 42; // yaw_block ใน config.hpp
const YAW_SETTLE_MS = 220;
const TAKEOFF_CM = 80;
const SHOT_MIN_DIST_CM = 100;
const NEEDLE_REACH_CM = 12;
const NEEDLE_TOLERANCE_CM = 15;
const SPEED_LIMIT_CM = 600;
export const MAGAZINE_CAPACITY = 20; // บรรจุได้ทีละ 20 ลูกต่อชุด (ชุดซ้าย = ประตู 1&4, ชุดขวา = ประตู 2&3)
const RELOAD_MS = 6500; // คนแข่งเดินมาบรรจุสัมภาระด้วยมือบนแท่น (ชุดซ้าย + ชุดขวา)
const HAND_TURN_MS = 2500; // คนแข่งหมุนตัวโดรนด้วยมือบนแท่น
const MS_PER_BALL = 80; // ปล่อยทั้งชุด 20 ลูกใช้ ~1.6 วินาที
const HOLD_MS = 1200; // poshold: หยุดนิ่ง ล็อกตำแหน่ง
// ท่าออกตัว/เบรกของโดรนจริง (ค่าประมาณเพื่อให้เห็นแรงกระชาก ไม่ใช่ค่าที่วัดจากโดรน)
const ACC_MS = 220; // ออกตัว: เร่งจากนิ่งเป็นความเร็วเดินทางภายใน ~0.2 วินาที (เอียงหัวกระชาก)
const BRAKE_MS = 350; // เบรก: ใน fw/bw/ml/mr มี poshold ท้ายคำสั่ง โดรนลดความเร็วแล้วไหลต่อเล็กน้อย (~10 ซม. ที่ความเร็วปกติ)
export const PAD_TOP_CM = 20; // แท่น Takeoff / แท่นวงกลมสูง 20 ซม.
/** z ในเอนจิน = ความสูงของ "กึ่งกลางโดรน" จากพื้นสนาม (ค่าเดียวกับที่ sh() สั่ง) · ขาโดรนต่ำกว่ากึ่งกลาง 7 ซม. จึงจอดบนแท่นที่ z = 27 */
export const LEG_CM = 7.02;
export const REST_CM = PAD_TOP_CM + LEG_CM;

export type Gate = "ch1_ch4" | "ch2_ch3" | "any";
export type Platform = { id: string; x: number; y: number; r: number; gates: Gate };
export type Balloon = { id: string; x: number; y: number; z: number };
export type Board = { id: string; x: number; y: number; cz: number; r: number };
/** ห่วงอิสระ: ระนาบตั้งฉากกับทิศ yaw (0° = หันไปเหนือ) โดรนต้องผ่านช่องกว้าง size ซม. ที่ความสูงกึ่งกลางโดรน zMin–zMax */
export type FreeHoop = { id: string; x: number; y: number; size: number; yaw: number; zMin: number; zMax: number; points: number };
/** จุดผ่าน: โดรนต้องบินผ่านวงรัศมี r ซม. ที่ความสูง zMin–zMax · มี order = ต้องผ่านตามลำดับ */
export type Waypoint = { id: string; x: number; y: number; r: number; zMin: number; zMax: number; points: number; order?: number };

export type FlightConfig = {
    /** โหมดการเขียนโค้ด: any = ง่าย · drone = บังคับ drone. · parduino = บังคับ pArduino-> */
    style?: Style;
    start: { x: number; y: number };
    pad: { half: number };
    hoop: { half: number; zMin: number; zMax: number };
    platforms: Platform[];
    balloons: Balloon[];
    boards: Board[];
    /** ลูกบอลต่อแท่นสูงสุด (กติกา: 20 ลูก เกินหัก 1 คะแนน/ลูก) */
    ballCap: number;
    /** คะแนนต่อสิ่งที่ทำ (มาจากกติกา) */
    points: { ball: number; balloon: number; platformLanding: number; padThroughHoop: number; padNoHoop: number };
    boardRings: number[]; // วงกลาง → นอก
    /** สนามฝึกอิสระ: ไม่ใช้ห่วงมาตรฐานเหนือแท่น และลงจอดบนแท่นฐานได้ 10 คะแนนเสมอ */
    free?: boolean;
    /** ฐาน (แท่นลงจอด): ไม่ระบุ = อยู่ที่จุดเริ่ม · null = ไม่มีฐาน ลงตรงไหนก็จบภารกิจ */
    padAt?: { x: number; y: number } | null;
    /** ทิศหัวโดรนตอนเริ่ม (องศา 0 = เหนือ) */
    startYaw?: number;
    hoops?: FreeHoop[];
    waypoints?: Waypoint[];
};

/** rpm = รอบใบพัด 0–1 (ช่วงสตาร์ทหมุนจากช้าไปเร็วตาม delay หลัง takeOff) */
export type Frame = { t: number; x: number; y: number; z: number; yaw: number; rpm?: number };
export type EventKind = "info" | "warn" | "error" | "drop" | "pop" | "shot" | "shot_b" | "land" | "takeoff" | "hold";
export type SimEvent = {
    t: number;
    kind: EventKind;
    text: string;
    line?: number;
    at?: { x: number; y: number; z: number };
    ok?: boolean;
    id?: string;
    points?: number;
    /** จำนวนบอลที่ปล่อย/บรรจุ (ใช้ซิงก์เสียงและภาพ) */ n?: number;
    /** ระยะเวลาของเหตุการณ์ (มิลลิวินาที) */ dur?: number;
    /** จำนวนบอลที่ปล่อยจากแต่ละชุด */ from?: { L: number; R: number };
    /** ปลายทางของลูกดอก (สำหรับวาด) */ to?: { x: number; y: number; z: number };
};
export type Breakdown = { label: string; points: number };
export type Result = {
    frames: Frame[];
    events: SimEvent[];
    duration: number;
    score: number;
    breakdown: Breakdown[];
    stopTime: number | null; // เวลาที่หยุดนาฬิกา (ลงจอดแท่น Takeoff)
    landedOnPad: boolean;
    throughHoop: boolean;
    timedOut: boolean;
    ok: boolean;
    /** จุดผ่าน/ห่วงที่ทำสำเร็จ พร้อมเวลา (ใช้เปลี่ยนสีวัตถุในสนามตอนเล่น) */
    visits: Array<{ id: string; kind: "waypoint" | "hoop"; t: number; points: number }>;
};

type Call = { name: string; args: number[]; line: number };

/**
 * ชื่อเมธอดของโค้ดจริง (pArduino-> และ drone.) → คำสั่งของเอนจิน
 * to = ชื่อคำสั่งในเอนจิน · pick = เลือกอาร์กิวเมนต์ที่ใช้ (เช่น set_yaw(ทิศ, องศา) → ±องศา) · ไม่มีใน map = ใช้ชื่อเดิม
 */
const ALIAS: Record<string, { to: string; pick?: (a: number[]) => number[] }> = {
    take_off: { to: "takeOff" },
    auto_land: { to: "autoLand" },
    stopmotor: { to: "settle", pick: () => [0] },
    stop_motor: { to: "settle", pick: () => [0] },
    set_height: { to: "sh" }, set_heights: { to: "sh" }, smooth_set_height: { to: "sh" }, sethight: { to: "sh" },
    smoothsetheight: { to: "sh" }, holdheight: { to: "sh" }, poshold_heights: { to: "sh" },
    move_forward_cm: { to: "fw" }, move_backward_cm: { to: "bw" }, move_left_cm: { to: "ml" }, move_right_cm: { to: "mr" },
    move_forward_fast: { to: "fw" }, move_backward_fast: { to: "bw" }, move_left_fast: { to: "ml" }, move_right_fast: { to: "mr" },
    moveforward: { to: "fw" }, movebackward: { to: "bw" }, moveleft: { to: "ml" }, moveright: { to: "mr" },
    movefastforward: { to: "fw" }, movefastbackward: { to: "bw" }, movefastleft: { to: "ml" }, movefastright: { to: "mr" },
    // set_yaw(1, 90) = ขวา 90° · set_yaw(2, 90) = ซ้าย 90°
    set_yaw: { to: "yaw", pick: (a) => [(a[0] === 2 ? -1 : 1) * (a[1] ?? 0)] },
    setyaw: { to: "yaw", pick: (a) => [(a[0] === 2 ? -1 : 1) * (a[1] ?? 0)] },
    calibrate_and_delay: { to: "calibration" },
};

/** ข้ามเงียบๆ: โครงสเก็ตช์ Arduino ที่ตัวจำลองไม่ต้องใช้ (ไม่กระทบการบิน) */
const IGNORE = [
    /^#/, /^void\s+\w+\s*\(\s*(void)?\s*\)$/, /^(int|void)\s+main\s*\(.*\)$/,
    /^(?:Serial|Wire|SPI)\s*\.\s*\w+\s*\(.*\)$/, /^(?:pinMode|digitalWrite)\s*\(.*\)$/,
    /^(?:drone\s*\.\s*|pArduino\s*->\s*)(?:beginDefault|begin|poll|keyDo|raw)\s*\(.*\)$/,
    /^(?:return)\b.*$/, /^else$/, /^while\s*\(\s*(?:true|1)\s*\)$/,
];
const DECL = /^(?:static\s+)?(?:const\s+)?(?:u?int(?:8|16|32)?_t|int|long|unsigned\s+long|unsigned\s+int|short|float|byte|uint16_t)\s+(\w+)\s*=\s*(-?\d+(?:\.\d+)?)$/;

/** แยกโค้ดเป็นรายการคำสั่ง ไม่ใช้ eval จึงปลอดภัยแม้ผู้ใช้พิมพ์อะไรก็ได้
 *  รับทั้ง `takeOff();` `drone.takeOff();` และ `pArduino->take_off();` รวมโครง setup()/loop() และค่าคงที่ตัวเลขแบบสเก็ตช์จริง */
export function parse(code: string, style: Style = "any"): { calls: Call[]; errors: SimEvent[] } {
    const calls: Call[] = [];
    const errors: SimEvent[] = [];
    const consts = new Map<string, number>();
    let inBlock = false;
    code.split("\n").forEach((raw, i) => {
        // ตัดคอมเมนต์ // และ /* */ (คงเลขบรรทัดไว้)
        let text = "";
        for (let k = 0; k < raw.length; k++) {
            if (inBlock) { if (raw[k] === "*" && raw[k + 1] === "/") { inBlock = false; k++; } continue; }
            if (raw[k] === "/" && raw[k + 1] === "*") { inBlock = true; k++; continue; }
            if (raw[k] === "/" && raw[k + 1] === "/") break;
            text += raw[k];
        }
        // C++ ต้องจบคำสั่งด้วย ; (บรรทัดที่จบด้วย { } หรือเป็นหัวฟังก์ชัน/#include ไม่ต้อง)
        const tl = text.trim();
        if (tl && !/[;{}]$/.test(tl) && !IGNORE.some(r => r.test(tl)) && !/^(?:if|for|while|else|switch)\b/.test(tl)) {
            errors.push({ t: 0, kind: "error", line: i + 1, text: `บรรทัด ${i + 1}: ลืมเครื่องหมาย ; ท้ายคำสั่ง "${tl}"` });
            return;
        }
        // ปีกกาแยกคำสั่งเหมือน ; (void setup() { a(); b(); } ทั้งบรรทัดก็ได้)
        for (let stmt of text.replace(/[{}]/g, ";").split(";").map(s => s.trim()).filter(Boolean)) {
            if (IGNORE.some(r => r.test(stmt))) continue;
            const decl = DECL.exec(stmt);
            if (decl) { consts.set(decl[1], Number(decl[2])); continue; }
            const m = /^(?:drone\s*\.\s*|pArduino\s*->\s*|pArduino\s*\.\s*)?([A-Za-z_]\w*)\s*\(\s*([^)]*)\)$/.exec(stmt);
            if (!m && /^(?:drone\s*\.\s*|pArduino\s*->\s*)?[A-Za-z_]\w*$/.test(stmt)) {
                errors.push({ t: 0, kind: "error", line: i + 1, text: `บรรทัด ${i + 1}: "${stmt}" ลืมวงเล็บ () (ถ้าเป็นคำสั่งต้องเขียน ${stmt}();)` });
                continue;
            }
            if (!m) {
                errors.push({
                    t: 0,
                    kind: "error",
                    line: i + 1,
                    text: `บรรทัด ${i + 1}: อ่านคำสั่งไม่ออก "${stmt}" (ลืมวงเล็บหรือเปล่า?) · ตัวจำลองยังไม่รองรับ if / for / while`,
                });
                continue;
            }
            let args = m[2]
                ? m[2].split(",").map(a => {
                      const tok = a.trim();
                      return consts.has(tok) ? (consts.get(tok) as number) : Number(tok);
                  })
                : [];
            if (args.some(a => Number.isNaN(a))) {
                errors.push({ t: 0, kind: "error", line: i + 1, text: `บรรทัด ${i + 1}: ค่าในวงเล็บต้องเป็นตัวเลข (หรือชื่อค่าคงที่ที่ประกาศไว้ข้างบน)` });
                continue;
            }
            const prefix = /^drone\s*\./.test(stmt) ? "drone" : /^pArduino/.test(stmt) ? "parduino" : null;
            const se = styleError(style, prefix, m[1]);
            if (se) { errors.push({ t: 0, kind: "error", line: i + 1, text: `บรรทัด ${i + 1}: ${se}` }); continue; }
            let name = m[1];
            const al = ALIAS[name] ?? ALIAS[name.toLowerCase()];
            if (al) { name = al.to; if (al.pick) args = al.pick(args); }
            calls.push({ name, args, line: i + 1 });
        }
    });
    return { calls, errors };
}

/** ชื่อคำสั่งแบบไม่สนตัวพิมพ์ใหญ่เล็กและขีดล่าง: auto_land = autoLand = AUTOLAND */
const canon = (n: string) => n.toLowerCase().replace(/_/g, "");

const rad = (d: number) => (d * Math.PI) / 180;
/** เวกเตอร์ทิศหน้า (x ขวา, y ลง) ของ yaw */
const dirOf = (yaw: number) => ({ x: Math.sin(rad(yaw)), y: -Math.cos(rad(yaw)) });


/** ตรวจจุดผ่านและห่วงอิสระจากเส้นทางบินทั้งหมด (หลังจำลองเสร็จ) */
function evalExtras(frames: Frame[], cfg: FlightConfig): { visits: Result["visits"]; breakdown: Breakdown[] } {
    const visits: Result["visits"] = [];
    const wps = cfg.waypoints ?? [];
    const hoops = cfg.hoops ?? [];
    if (!wps.length && !hoops.length) return { visits, breakdown: [] };
    const done = new Set<string>();
    const orders = [...new Set(wps.filter(w => w.order !== undefined).map(w => w.order as number))].sort((a, b) => a - b);
    let nextIdx = 0;

    for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1], b = frames[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const steps = Math.max(1, Math.ceil(len / 4));
        // จุดผ่าน: สุ่มตรวจตามเส้นทางทุก ~4 ซม.
        for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u, pz = a.z + (b.z - a.z) * u, pt = a.t + (b.t - a.t) * u;
            for (const w of wps) {
                if (done.has(w.id)) continue;
                if (w.order !== undefined && w.order !== orders[nextIdx]) continue;
                if (Math.hypot(px - w.x, py - w.y) <= w.r && pz >= w.zMin && pz <= w.zMax) {
                    done.add(w.id);
                    visits.push({ id: w.id, kind: "waypoint", t: pt, points: w.points });
                    if (w.order !== undefined && !wps.some(o => !done.has(o.id) && o.order === w.order)) nextIdx++;
                }
            }
        }
        // ห่วง: เส้นทางช่วงนี้ตัดระนาบของห่วงภายในช่องหรือไม่
        for (const h of hoops) {
            if (done.has(h.id)) continue;
            const nx = Math.sin(rad(h.yaw)), ny = -Math.cos(rad(h.yaw)); // ทิศตั้งฉากระนาบ (พิกัดเอนจิน y ลง)
            const s0 = (a.x - h.x) * nx + (a.y - h.y) * ny, s1 = (b.x - h.x) * nx + (b.y - h.y) * ny;
            if (s0 === s1 || s0 * s1 > 0) continue;
            const u = s0 / (s0 - s1);
            const qx = a.x + (b.x - a.x) * u, qy = a.y + (b.y - a.y) * u, qz = a.z + (b.z - a.z) * u;
            const lateral = (qx - h.x) * ny * -1 + (qy - h.y) * nx; // ระยะเยื้องข้างตามแนวระนาบ
            if (Math.abs(lateral) <= h.size / 2 && qz >= h.zMin && qz <= h.zMax) {
                done.add(h.id);
                visits.push({ id: h.id, kind: "hoop", t: a.t + (b.t - a.t) * u, points: h.points });
            }
        }
    }
    visits.sort((p, q) => p.t - q.t);
    const wDone = visits.filter(v => v.kind === "waypoint");
    const hDone = visits.filter(v => v.kind === "hoop");
    const breakdown: Breakdown[] = [];
    if (wps.length) breakdown.push({ label: `บินผ่านจุดผ่าน ${wDone.length}/${wps.length} จุด`, points: wDone.reduce((s, v) => s + v.points, 0) });
    if (hoops.length) breakdown.push({ label: `ลอดห่วง ${hDone.length}/${hoops.length} ใบ`, points: hDone.reduce((s, v) => s + v.points, 0) });
    return { visits, breakdown };
}

export function simulate(code: string, cfg: FlightConfig): Result {
    const { calls, errors } = parse(code, cfg.style ?? "any");
    const events: SimEvent[] = [...errors];
    const padC = cfg.padAt === undefined ? cfg.start : cfg.padAt; // null = ไม่มีฐาน
    const onPadAt = (px: number, py: number) => padC !== null && Math.abs(px - padC.x) <= cfg.pad.half && Math.abs(py - padC.y) <= cfg.pad.half;
    let x = cfg.start.x,
        y = cfg.start.y,
        z = onPadAt(cfg.start.x, cfg.start.y) ? REST_CM : LEG_CM, // เริ่มบนแท่น (สูง 20 ซม.) หรือบนพื้น
        yaw = cfg.startYaw ?? 0,
        t = 0;
    const mag = { L: 0, R: 0 }; // ชุดบอลซ้าย (ประตู 1&4) และขวา (ประตู 2&3)
    const frames: Frame[] = [{ t, x, y, z, yaw }];
    let flying = false,
        crashed = false,
        timedOut = false;
    let leftHoop = false,
        throughHoop = true;
    let stopTime: number | null = null,
        landedOnPad = false;
    const balls = new Map<string, number>(); // แท่น → จำนวนลูกที่ลง
    const popped = new Set<string>();
    const platformLanded = new Set<string>();
    const bestRing = new Map<string, number>(); // เป้า → วงที่น้อยที่สุดที่ยิงถูก (กติกา: นับลูกคะแนนน้อยสุด)
    let shotsMade = 0;

    /** ตั้งศูนย์/สตาร์ทมอเตอร์ในโค้ดจริงเป็นแค่ "ส่งคำสั่ง" ไม่รอให้เสร็จ: ผู้เขียนต้อง delay เอง */
    const CALIB_MS = 3000, SPINUP_MS = 3000;
    let calibStart: number | null = null; // เวลาที่สั่ง calibration ล่าสุด (null = ยังไม่เคยสั่ง)
    let armedAt: number | null = null; // เวลาที่สั่ง takeOff แต่ยังไม่ยกตัว
    const rpmNow = () => (flying ? 1 : armedAt !== null ? Math.min(1, Math.max(0, (t - armedAt) / SPINUP_MS)) : 0);
    const push = () => frames.push({ t, x, y, z, yaw, rpm: rpmNow() });
    /** ความเร็วเดินทางล่าสุด (ซม./มิลลิวินาที) ของคำสั่งเดินที่เพิ่งจบ ใช้คำนวณระยะเบรก */
    let cruise: { vx: number; vy: number } | null = null;
    /** เบรกหลังคำสั่งเดิน (poshold ท้ายคำสั่งในโค้ดจริง): ลดความเร็วเป็นศูนย์ ไหลต่อไปอีก v·T/2 */
    const brake = (line: number) => {
        if (!cruise) return;
        const firstFrame = frames.length - 1;
        const { vx, vy } = cruise;
        cruise = null;
        for (const u of [0.25, 0.5, 0.75, 1]) {
            const s = BRAKE_MS * (u - (u * u) / 2); // ระยะที่ไหลไป ณ ส่วน u ของช่วงเบรก (ความเร็วลดเป็นเส้นตรง)
            frames.push({ t: t + BRAKE_MS * u, x: x + vx * s, y: y + vy * s, z, yaw });
        }
        x += (vx * BRAKE_MS) / 2;
        y += (vy * BRAKE_MS) / 2;
        t += BRAKE_MS;
        scanNeedleContacts(firstFrame, line);
        hoopCrash(firstFrame, line);
    };
    /** หมุนด้วยมือได้บนแท่นเริ่มและแท่นวงกลมเมื่อโดรนลงจอดแล้ว */
    const onPadNow = () => (padC === null ? !flying : onPadAt(x, y));
    const onPlatformNow = () => cfg.platforms.some(p => Math.hypot(p.x - x, p.y - y) <= p.r);
    const handTurn = (deg: number, line: number) => {
        if (flying) {
            ev({ kind: "warn", line, text: `บรรทัด ${line}: หมุนโดรนด้วยมือได้เฉพาะตอนจอดอยู่บนแท่น` });
            return;
        }
        if (!onPadNow() && !onPlatformNow()) {
            ev({ kind: "warn", line, text: `บรรทัด ${line}: ต้องจอดบนแท่นก่อน คนแข่งจึงหมุนโดรนด้วยมือได้` });
            return;
        }
        ev({
            kind: "info",
            line,
            id: "turn",
            n: deg,
            dur: HAND_TURN_MS,
            text: `คนแข่งหมุนตัวโดรนด้วยมือ ${deg > 0 ? "ตามเข็ม" : "ทวนเข็ม"} ${Math.abs(deg)}°`,
        });
        t += 700; // คนแข่งเดินเข้ามาจับโดรนก่อนเริ่มหมุน
        push();
        yaw += deg;
        t += HAND_TURN_MS - 700;
        push();
    };
    const ev = (e: Omit<SimEvent, "t">) => events.push({ t, ...e });
    /** ตรวจปลายเข็มตัดผิวลูกโป่งตามเส้นทางทุกช่วงเฟรม รวมระยะไหลหลังเบรก */
    const scanNeedleContacts = (firstFrame: number, line: number) => {
        if (!flying || !cfg.balloons.length) return;
        for (let i = firstFrame; i < frames.length - 1; i++) {
            const a = frames[i], b = frames[i + 1];
            const da = dirOf(a.yaw), db = dirOf(b.yaw);
            const p0 = { x: a.x + da.x * NEEDLE_REACH_CM, y: a.y + da.y * NEEDLE_REACH_CM, z: a.z };
            const p1 = { x: b.x + db.x * NEEDLE_REACH_CM, y: b.y + db.y * NEEDLE_REACH_CM, z: b.z };
            const vx = p1.x - p0.x, vy = p1.y - p0.y, vz = p1.z - p0.z;
            const len2 = vx * vx + vy * vy + vz * vz;
            const hits: Array<{ balloon: Balloon; u: number }> = [];
            for (const balloon of cfg.balloons) {
                if (popped.has(balloon.id)) continue;
                const ox = p0.x - balloon.x, oy = p0.y - balloon.y, oz = p0.z - balloon.z;
                const c = ox * ox + oy * oy + oz * oz - NEEDLE_TOLERANCE_CM ** 2;
                let u = 0;
                if (c > 0 && len2 > 0) {
                    const dot = ox * vx + oy * vy + oz * vz;
                    const disc = dot * dot - len2 * c;
                    if (disc < 0) continue;
                    u = (-dot - Math.sqrt(disc)) / len2;
                    if (u < 0 || u > 1) continue;
                } else if (c > 0) continue;
                hits.push({ balloon, u });
            }
            hits.sort((left, right) => left.u - right.u);
            for (const { balloon, u } of hits) {
                if (popped.has(balloon.id)) continue;
                popped.add(balloon.id);
                events.push({ t: a.t + (b.t - a.t) * u, kind: 'pop', line, text: `เข็มแตะลูกโป่ง "${balloon.id}" แตก +${cfg.points.balloon} คะแนน`, at: { x: balloon.x, y: balloon.y, z: balloon.z }, id: balloon.id, points: cfg.points.balloon, ok: true });
            }
        }
    };
    /**
     * ชนโครงห่วง: ตรวจเส้นทางบินทุก ~2 ซม. เทียบโครงห่วง (เสา 2 ข้างตั้งจากพื้น + คานบน + คานล่าง)
     * ถ้าศูนย์กลางโดรนเข้าในระยะตัวเครื่อง (~11 ซม.) ของโครง → ตัดเส้นทาง ณ จุดชน แล้วโดรนตกลงพื้น (จบภารกิจ)
     * ช่องลอดคือ |ข้าง| ≤ ครึ่งความกว้าง และความสูงอยู่ใน zMin–zMax · ใต้คานล่างบินลอดได้ถ้าต่ำพอ
     */
    const hoopCrash = (firstFrame: number, line: number) => {
        const hoops = cfg.hoops ?? [];
        if (!flying || !hoops.length) return false;
        const BAR = 4.5, BODY = 11, DEPTH = BAR / 2 + 5;
        for (let i = firstFrame; i < frames.length - 1; i++) {
            const a = frames[i], b = frames[i + 1];
            const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
            const steps = Math.max(1, Math.ceil(len / 2));
            for (let st = 1; st <= steps; st++) {
                const u = st / steps;
                const px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u, pz = a.z + (b.z - a.z) * u;
                for (const h of hoops) {
                    const nx = Math.sin(rad(h.yaw)), ny = -Math.cos(rad(h.yaw));
                    const along = (px - h.x) * nx + (py - h.y) * ny;
                    if (Math.abs(along) > DEPTH) continue;
                    const lat = (px - h.x) * -ny + (py - h.y) * nx;
                    const half = h.size / 2;
                    const bottomEdge = Math.max(0, h.zMin - 12 - BAR), topEdge = h.zMax + 12 + BAR;
                    const inGap = Math.abs(lat) <= half && pz >= h.zMin && pz <= h.zMax;
                    const outer = Math.abs(lat) <= half + BAR + BODY;
                    const hit = !inGap && outer && pz <= topEdge + 7 && (Math.abs(lat) > half || pz >= bottomEdge - 5);
                    if (!hit) continue;
                    // ตัดเส้นทางที่จุดชน
                    const tHit = a.t + (b.t - a.t) * u;
                    frames.length = i + 1;
                    frames.push({ t: tHit, x: px, y: py, z: pz, yaw: a.yaw + (b.yaw - a.yaw) * u });
                    const vx = (b.x - a.x) / Math.max(1, b.t - a.t), vy = (b.y - a.y) / Math.max(1, b.t - a.t);
                    x = px; y = py; z = pz; t = tHit; yaw = frames[frames.length - 1].yaw;
                    ev({ kind: "error", line, text: `บรรทัด ${line}: โดรนชนโครงห่วง "${h.id}" ที่ความสูง ${Math.round(pz)} ซม. แล้วตกลงพื้น`, at: { x: px, y: py, z: pz }, id: h.id, ok: false });
                    // ตกอย่างอิสระ (g = 980 ซม./วินาที²) ไถลต่ออีกเล็กน้อยตามแรงเฉื่อย
                    const drop = Math.max(0, z - LEG_CM);
                    const fallMs = Math.sqrt((2 * drop) / 980) * 1000;
                    for (const f of [0.2, 0.4, 0.6, 0.8, 1]) {
                        const tau = fallMs * f;
                        frames.push({ t: t + tau, x: x + vx * tau * 0.25, y: y + vy * tau * 0.25, z: z - 0.5 * 980 * (tau / 1000) ** 2, yaw });
                    }
                    x += vx * fallMs * 0.25; y += vy * fallMs * 0.25; z = LEG_CM; t += fallMs;
                    flying = false; crashed = true; cruise = null;
                    return true;
                }
            }
        }
        return false;
    };
    const inHoopBox = () => Math.abs(x - cfg.start.x) <= cfg.hoop.half && Math.abs(y - cfg.start.y) <= cfg.hoop.half;

    /** เดินทางเป็นเส้นตรงต่อเนื่อง ตัดที่เวลาหมด และเช็กการลอดห่วงตอนออกจากกรอบ */
    const travel = (dx: number, dy: number, dz: number, dyaw: number, ms: number, line: number, shape = false) => {
        const firstFrame = frames.length - 1;
        const remain = TIME_LIMIT_MS - t;
        const k = ms > remain ? Math.max(0, remain / ms) : 1;
        const sx = x,
            sy = y;
        if (flying && !leftHoop && (dx !== 0 || dy !== 0)) {
            // หาจุดที่ออกจากกรอบห่วงบนเส้นทางนี้ (ตรวจแบบละเอียดทุก 1 ซม.)
            const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * k));
            for (let s = 1; s <= steps; s++) {
                const px = sx + (dx * k * s) / steps,
                    py = sy + (dy * k * s) / steps;
                if (Math.abs(px - cfg.start.x) > cfg.hoop.half || Math.abs(py - cfg.start.y) > cfg.hoop.half) {
                    leftHoop = true;
                    const okHoop = z >= cfg.hoop.zMin && z <= cfg.hoop.zMax;
                    throughHoop = throughHoop && okHoop; // ทุกครั้งที่ออกจากแท่นต้องลอดห่วง
                    if (!okHoop)
                        ev({
                            kind: "warn",
                            line,
                            text: `บรรทัด ${line}: ออกจากห่วงที่ความสูง ${Math.round(z)} ซม. ซึ่งอยู่นอกช่องห่วง (${cfg.hoop.zMin}–${cfg.hoop.zMax} ซม.) จะไม่นับว่าลอดห่วง`,
                        });
                    break;
                }
            }
        }
        // ค่า ms ต่อ ซม. ในโค้ดจริงวัดที่ "ตำแหน่งหยุดจริง" (รวมระยะไหลหลังเบรกแล้ว) จึงแบ่งระยะ = เร่ง + บินคงที่ + ไหลตอนเบรก
        // เมื่อจบเบรกโดรนอยู่ที่ระยะที่สั่งพอดี ผลคะแนนของโปรแกรมเดิมจึงไม่เปลี่ยน
        let fEnd = k; // ส่วนของระยะที่ถึง ณ เวลา ms (ก่อนเบรก)
        if (shape && k === 1 && ms > ACC_MS * 2) {
            const v = 1 / (ms - ACC_MS / 2 + BRAKE_MS / 2); // ส่วนของระยะต่อมิลลิวินาที ตอนบินคงที่
            for (const u of [0.25, 0.5, 0.75, 1]) {
                const tau = ACC_MS * u;
                const f = (0.5 * tau * tau * v) / ACC_MS;
                frames.push({ t: t + tau, x: sx + dx * f, y: sy + dy * f, z, yaw });
            }
            fEnd = v * (ms - ACC_MS / 2);
            cruise = { vx: dx * v, vy: dy * v };
        } else cruise = null;
        x += dx * fEnd;
        y += dy * fEnd;
        z += dz * k;
        yaw += dyaw * k;
        t += ms * k;
        push();
        scanNeedleContacts(firstFrame, line);
        if (hoopCrash(firstFrame, line)) return false;
        if (k < 1) {
            timedOut = true;
            ev({ kind: "warn", text: "หมดเวลา 2 นาที 30 วินาที โดรนหยุดทำงาน" });
        }
        return !timedOut;
    };

    for (let ci = 0; ci < calls.length; ci++) {
        const c = calls[ci];
        if (crashed || timedOut) break;
        const a = c.args[0];
        const name = canon(c.name);
        const info = (text: string) => ev({ kind: "info", line: c.line, text });
        const needFly = (what: string) => {
            if (flying) return true;
            if (armedAt !== null) {
                // takeOff สั่งแล้ว: ใบพัดต้องหมุนไต่ขึ้นครบ SPINUP_MS ถึงจะยกตัว (เวลา delay หลัง takeOff ยิ่งนาน ยิ่งยกตัวช้าลง)
                const waited = t - armedAt;
                if (waited >= SPINUP_MS - 1) {
                    armedAt = null;
                    flying = true;
                    leftHoop = !inHoopBox();
                    ev({ kind: "takeoff", line: c.line, text: `ใบพัดหมุนเต็มที่หลังรอ ${Math.round(waited)} ms · ยกตัวขึ้น (ลอยสูงจากแท่น ${TAKEOFF_CM} ซม.)`, at: { x, y, z } });
                    travel(0, 0, TAKEOFF_CM, 0, TAKEOFF_CM * MS_PER_CM_CLIMB * 2, c.line);
                    return true;
                }
                ev({ kind: "error", line: c.line, text: `บรรทัด ${c.line}: สั่ง ${what} หลัง takeOff แค่ ${Math.round(waited)} ms ใบพัดยังหมุนไม่เร็วพอ โดรนบินไม่ขึ้น (ต้อง delay(${SPINUP_MS}) ขึ้นไปหลัง takeOff())` });
                crashed = true;
                armedAt = null;
                t += 600; // ใบพัดค่อยๆ หยุด
                push();
                return false;
            }
            ev({ kind: "error", line: c.line, text: `บรรทัด ${c.line}: โดรนยังไม่ได้ขึ้นบิน สั่ง ${what} ไม่ได้` });
            crashed = true;
            return false;
        };

        switch (name) {
            case "calibration":
            case "calibrateanddelay":
            case "calibrate": {
                if (flying) {
                    ev({ kind: "warn", line: c.line, text: "ปรับเทียบไจโรขณะบิน ไม่ควรทำ ต้องทำก่อนขึ้นบิน" });
                    break;
                }
                calibStart = t;
                if (name !== "calibration") {
                    // calibrateAndDelay(ms) = calibration + delay(ms) ในคำสั่งเดียว
                    t += Math.max(0, a ?? 0);
                    push();
                    info(`ตั้งศูนย์ไจโรและรอ ${a ?? 0} ms`);
                } else info(`เริ่มตั้งศูนย์ไจโร (ต้อง delay อย่างน้อย ${CALIB_MS} ms ก่อนสั่ง takeOff)`);
                break;
            }
            case "takeoff":
                if (flying || armedAt !== null) {
                    ev({ kind: "warn", line: c.line, text: "โดรนบินอยู่แล้ว" });
                    break;
                }
                if (calibStart === null)
                    ev({
                        kind: "warn",
                        line: c.line,
                        text: "ยังไม่ได้ calibration ก่อนขึ้นบิน โดรนจริงอาจเอียงหรือลอยไม่นิ่ง",
                    });
                else if (t - calibStart < CALIB_MS - 1) {
                    ev({ kind: "error", line: c.line, text: `บรรทัด ${c.line}: สั่ง takeOff หลัง calibration แค่ ${Math.round(t - calibStart)} ms ไจโรยังตั้งศูนย์ไม่เสร็จ โดรนบินไม่ขึ้น (ต้อง delay(${CALIB_MS}) ขึ้นไปหลัง calibration())` });
                    crashed = true;
                    break;
                }
                armedAt = t;
                push();
                ev({ kind: "info", line: c.line, text: `สั่ง takeOff แล้ว ใบพัดเริ่มหมุน ต้องรอ delay(${SPINUP_MS}) ขึ้นไป โดรนถึงจะยกตัว` });
                break;
            case "sh":
            case "setheight": {
                if (!needFly(`${c.name}()`)) break;
                const target = Math.max(15, Math.min(250, a ?? z));
                if (inHoopBox() && !leftHoop && target > cfg.hoop.zMax)
                    ev({
                        kind: "warn",
                        line: c.line,
                        text: `บรรทัด ${c.line}: ยกสูงเกินกรอบห่วงขณะยังอยู่ในห่วง (ห่วงสูงสุด ${cfg.hoop.zMax} ซม.) อาจชนคานบน`,
                    });
                travel(0, 0, target - z, 0, Math.abs(target - z) * MS_PER_CM_CLIMB, c.line);
                break;
            }
            case "fw":
            case "bw":
            case "ml":
            case "mr": {
                if (!needFly(`${c.name}()`)) break;
                const cm = Math.abs(a ?? 0);
                if (cm > SPEED_LIMIT_CM)
                    ev({ kind: "warn", line: c.line, text: `ระยะ ${cm} ซม. ไกลมากในคำสั่งเดียว ลองแบ่งเป็นหลายช่วง` });
                const d = dirOf(yaw),
                    right = { x: Math.cos(rad(yaw)), y: Math.sin(rad(yaw)) };
                const v =
                    name === "fw"
                        ? d
                        : name === "bw"
                          ? { x: -d.x, y: -d.y }
                          : name === "mr"
                            ? right
                            : { x: -right.x, y: -right.y };
                if (!travel(v.x * cm, v.y * cm, 0, 0, cm * MS_PER_CM[name as "fw" | "bw" | "ml" | "mr"], c.line, true)) break;
                brake(c.line);
                if (x < 0 || x > FIELD_CM || y < 0 || y > FIELD_CM) {
                    ev({
                        kind: "error",
                        line: c.line,
                        text: `บรรทัด ${c.line}: โดรนบินออกนอกสนามที่ (${Math.round(x)}, ${Math.round(y)}) ซม.`,
                    });
                    crashed = true;
                }
                break;
            }
            case "yaw":
            case "turn": {
                if (cfg.balloons.length) {
                    ev({ kind: 'warn', line: c.line, text: `บรรทัด ${c.line}: ภารกิจลูกโป่งต้องลงจอดบนแท่นให้คนแข่งหมุนโดรนด้วยมือก่อนขึ้นบินอีกครั้ง` });
                    break;
                }
                if (!needFly("yaw()")) break;
                const deg = a ?? 0;
                travel(0, 0, 0, deg, Math.abs(deg) * MS_PER_DEG_YAW + YAW_SETTLE_MS, c.line);
                break;
            }
            case "settle":
            case "wait":
            case "delay": {
                const ms = Math.max(0, a ?? 0);
                const k = Math.min(1, (TIME_LIMIT_MS - t) / Math.max(1, ms));
                t += ms * k;
                push();
                if (k < 1) {
                    timedOut = true;
                    ev({ kind: "warn", text: "หมดเวลา 2 นาที 30 วินาที โดรนหยุดทำงาน" });
                }
                break;
            }
            case "poshold":
            case "hold": {
                if (!needFly(`${c.name}()`)) break;
                const ms = a !== undefined && a > 0 ? a : HOLD_MS;
                ev({ kind: "hold", line: c.line, text: "poshold: หยุดนิ่ง ล็อกตำแหน่ง", at: { x, y, z }, dur: ms });
                t += ms;
                push();
                cruise = null;
                break;
            }
            case "autoland": {
                if (!flying && armedAt !== null && !needFly("autoLand()")) break;
                if (!flying) {
                    ev({ kind: "warn", line: c.line, text: "โดรนอยู่บนพื้นแล้ว" });
                    break;
                }
                const onRealPad = onPadAt(x, y);
                const plat = cfg.platforms.find(p => Math.hypot(p.x - x, p.y - y) <= p.r);
                const onPad = padC === null ? !plat : onRealPad; // ไม่มีฐาน: ลงบนพื้นตรงไหนก็นับเป็นจุดลงจอดของภารกิจ
                const surface = (onRealPad || plat ? PAD_TOP_CM : 0) + LEG_CM; // ลงบนแท่นสูง 20 ซม. หรือพื้นสนาม (ขาอยู่ต่ำกว่ากึ่งกลาง 7 ซม.)
                if (!travel(0, 0, surface - z, 0, Math.max(0, z - surface) * 15 + 500, c.line)) break;
                flying = false;
                const finalLanding = !calls.slice(ci + 1).some(q => q.name === "takeOff");
                if (onPad && !finalLanding) {
                    // แวะลงที่แท่นเขียวระหว่างภารกิจ (เช่น บรรจุสัมภาระรอบใหม่) ยังไม่ใช่การจบภารกิจ
                    ev({
                        kind: "land",
                        line: c.line,
                        text: "แวะลงจอดบนแท่น Takeoff เพื่อบรรจุสัมภาระ (ยังไม่หยุดเวลา)",
                        at: { x, y, z: REST_CM },
                        ok: true,
                        id: "rest",
                    });
                } else if (onPad) {
                    landedOnPad = true;
                    stopTime = t;
                    const pts = throughHoop ? cfg.points.padThroughHoop : cfg.points.padNoHoop;
                    ev({
                        kind: "land",
                        line: c.line,
                        text: `${padC === null ? "ลงจอดสำเร็จ" : "ลงจอดบนแท่น Takeoff"}${cfg.free ? "" : throughHoop ? " หลังลอดห่วง" : " แต่ไม่ได้ลอดห่วง"} +${pts} คะแนน · หยุดเวลา`,
                        at: { x, y, z: surface },
                        points: pts,
                        ok: true,
                        id: "pad",
                    });
                } else if (plat && cfg.balloons.length && !platformLanded.has(plat.id)) {
                    platformLanded.add(plat.id);
                    ev({
                        kind: "land",
                        line: c.line,
                        text: `ลงจอดบนแท่นวงกลม "${plat.id}" +${cfg.points.platformLanding} คะแนน`,
                        at: { x, y, z: REST_CM },
                        points: cfg.points.platformLanding,
                        ok: true,
                        id: plat.id,
                    });
                } else {
                    ev({
                        kind: "land",
                        line: c.line,
                        text: `ลงจอดที่ (${Math.round(x)}, ${Math.round(y)}) ซึ่งไม่ใช่แท่น Check Point`,
                        at: { x, y, z: surface },
                        ok: false,
                    });
                }
                break;
            }
            case "reload":
            case "load": {
                if (flying) {
                    ev({
                        kind: "warn",
                        line: c.line,
                        text: `บรรทัด ${c.line}: บรรจุสัมภาระขณะบินไม่ได้ ต้องลงจอดบนแท่น Takeoff ก่อน`,
                    });
                    break;
                }
                const onPad = onPadAt(x, y);
                if (!onPad) {
                    ev({ kind: "warn", line: c.line, text: `บรรทัด ${c.line}: บรรจุได้เฉพาะตอนจอดบนแท่น Takeoff` });
                    break;
                }
                const add = MAGAZINE_CAPACITY * 2 - mag.L - mag.R;
                if (add <= 0) {
                    ev({ kind: "info", line: c.line, text: "สัมภาระเต็มแล้ว" });
                    if (a) handTurn(a, c.line);
                    break;
                }
                ev({
                    kind: "info",
                    line: c.line,
                    id: "load",
                    n: add,
                    dur: RELOAD_MS,
                    text: `บรรจุสัมภาระ ชุดซ้าย ${MAGAZINE_CAPACITY} + ชุดขวา ${MAGAZINE_CAPACITY} ลูก`,
                });
                mag.L = MAGAZINE_CAPACITY;
                mag.R = MAGAZINE_CAPACITY;
                t += RELOAD_MS;
                push();
                if (a) handTurn(a, c.line); // reload(180) = บรรจุแล้วหมุนโดรนด้วยมือ 180°
                break;
            }
            case "turnbyhand":
            case "rotatebyhand":
            case "handturn": {
                handTurn(a ?? 180, c.line);
                break;
            }
            case "pop":
            case "needle": {
                if (!needFly(`${c.name}()`)) break;
                const d = dirOf(yaw);
                const tip = { x: x + d.x * NEEDLE_REACH_CM, y: y + d.y * NEEDLE_REACH_CM, z };
                const alreadyBurst = cfg.balloons.find(b => popped.has(b.id) && Math.hypot(b.x - tip.x, b.y - tip.y, b.z - tip.z) <= NEEDLE_TOLERANCE_CM);
                if (alreadyBurst) { info(`เข็มแตะลูกโป่ง "${alreadyBurst.id}" ซึ่งแตกแล้ว`); break; }
                t += 300;
                push();
                let best: { b: Balloon; dist: number } | null = null;
                for (const b of cfg.balloons) {
                    if (popped.has(b.id)) continue;
                    const dist = Math.hypot(b.x - tip.x, b.y - tip.y, b.z - tip.z);
                    if (!best || dist < best.dist) best = { b, dist };
                }
                if (best && best.dist <= NEEDLE_TOLERANCE_CM) {
                    popped.add(best.b.id);
                    ev({
                        kind: "pop",
                        line: c.line,
                        text: `เข็มแตะลูกโป่ง "${best.b.id}" แตก +${cfg.points.balloon} คะแนน`,
                        at: { x: best.b.x, y: best.b.y, z: best.b.z },
                        id: best.b.id,
                        points: cfg.points.balloon,
                        ok: true,
                    });
                } else {
                    ev({
                        kind: "pop",
                        line: c.line,
                        text: best
                            ? `เข็มยังไม่ถึงลูกโป่ง (ใกล้สุดห่าง ${Math.round(best.dist)} ซม. ต้องไม่เกิน ${NEEDLE_TOLERANCE_CM} ซม.)`
                            : "ไม่เหลือลูกโป่งให้แตะแล้ว",
                        at: tip,
                        ok: false,
                    });
                }
                break;
            }
            case "shoot":
            case "shootb":
            case "shotb":
            case "shoots1":
            case "shoots2": {
                if (!needFly(`${c.name}()`)) break;
                t += 350;
                push();
                shotsMade++;
                const reverse = name === "shootb" || name === "shotb";
                const kind = reverse ? "shot_b" : "shot";
                const d = dirOf(yaw + (reverse ? 180 : 0));
                let hit: { b: Board; dist: number; ring: number | null; hx: number; hy: number } | null = null;
                for (const b of cfg.boards) {
                    if (Math.abs(d.y) < 1e-6) continue;
                    const s = (b.y - y) / d.y;
                    if (s <= 0) continue;
                    const hx = x + d.x * s;
                    const r = Math.hypot(hx - b.x, z - b.cz);
                    if (r > b.r) continue;
                    const ring =
                        cfg.boardRings[
                            Math.min(cfg.boardRings.length - 1, Math.floor(r / (b.r / cfg.boardRings.length)))
                        ];
                    if (!hit || s < hit.dist) hit = { b, dist: s, ring, hx, hy: b.y };
                }
                if (!hit) {
                    ev({
                        kind,
                        line: c.line,
                        text: "ลูกดอกไม่ถูกเป้า",
                        at: { x, y, z },
                        to: { x: x + d.x * 400, y: y + d.y * 400, z },
                        ok: false,
                    });
                } else if (hit.dist < SHOT_MIN_DIST_CM) {
                    ev({
                        kind,
                        line: c.line,
                        text: `ใกล้เป้าเกินไป (${Math.round(hit.dist)} ซม.) กติกากำหนดห่างอย่างน้อย ${SHOT_MIN_DIST_CM} ซม. ก่อนยิง คะแนนไม่นับ`,
                        at: { x, y, z },
                        to: { x: hit.hx, y: hit.hy, z },
                        ok: false,
                    });
                } else {
                    const prev = bestRing.get(hit.b.id);
                    bestRing.set(
                        hit.b.id,
                        prev === undefined ? (hit.ring as number) : Math.min(prev, hit.ring as number),
                    );
                    ev({
                        kind,
                        line: c.line,
                        text: `ลูกดอกถูก "${hit.b.id}" วง ${hit.ring} (ยิงจากระยะ ${Math.round(hit.dist)} ซม.)${prev !== undefined ? " · ยิงซ้ำเป้านี้ จะนับลูกที่ได้คะแนนน้อยที่สุด" : ""}`,
                        at: { x, y, z },
                        to: { x: hit.hx, y: hit.hy, z },
                        ok: true,
                        id: hit.b.id,
                        points: hit.ring as number,
                    });
                }
                break;
            }
            default: {
                const dropSides: Record<string, Array<"L" | "R">> = {
                    openpairch1ch4: ["L"],
                    dropleft: ["L"],
                    openpairch2ch3: ["R"],
                    dropright: ["R"],
                    openallballgate: ["L", "R"],
                    dropall: ["L", "R"],
                    droppayload: ["L", "R"],
                };
                if (name === "drop" || name in dropSides) {
                    if (!needFly(`${c.name}()`)) break;
                    // drop() = ปล่อยชุดถัดไป (ซ้ายก่อน แล้วขวา)
                    const sides = name === "drop" ? [mag.L > 0 ? "L" : ("R" as "L" | "R")] : dropSides[name];
                    const per = sides.map(sd => mag[sd]);
                    const n = per.reduce((s2, v) => s2 + v, 0);
                    if (n <= 0) {
                        ev({
                            kind: "warn",
                            line: c.line,
                            text: `บรรทัด ${c.line}: ไม่มีสัมภาระในชุดนี้ให้ปล่อย (ต้อง reload() บนแท่น Takeoff ก่อน)`,
                        });
                        break;
                    }
                    sides.forEach(sd => {
                        mag[sd] = 0;
                    });
                    const dur = Math.max(600, Math.max(...per) * MS_PER_BALL);
                    const near = cfg.platforms.find(p => Math.hypot(p.x - x, p.y - y) <= p.r);
                    const startT = t;
                    t += dur;
                    push();
                    const here = { x, y, z };
                    const mk = (e: Omit<SimEvent, "t">) => events.push({ t: startT, ...e });
                    if (!near)
                        mk({
                            kind: "drop",
                            line: c.line,
                            n,
                            dur,
                            from: {
                                L: sides.includes("L") ? per[sides.indexOf("L")] : 0,
                                R: sides.includes("R") ? per[sides.indexOf("R")] : 0,
                            },
                            text: `ปล่อยบอล ${n} ลูกที่ (${Math.round(x)}, ${Math.round(y)}) แต่ไม่ตกในแท่น`,
                            at: here,
                            ok: false,
                        });
                    else {
                        const total = (balls.get(near.id) ?? 0) + n;
                        balls.set(near.id, total);
                        mk({
                            kind: "drop",
                            line: c.line,
                            n,
                            dur,
                            from: {
                                L: sides.includes("L") ? per[sides.indexOf("L")] : 0,
                                R: sides.includes("R") ? per[sides.indexOf("R")] : 0,
                            },
                            text: `บอล ${n} ลูกลงแท่น "${near.id}" (รวม ${total} ลูก)${total > cfg.ballCap ? ` · เกิน ${cfg.ballCap} ลูก จะถูกหักคะแนน` : ""}`,
                            at: here,
                            id: near.id,
                            ok: true,
                            points:
                                Math.min(total, cfg.ballCap) * cfg.points.ball -
                                Math.min(total - n, cfg.ballCap) * cfg.points.ball,
                        });
                    }
                } else {
                    ev({ kind: "error", line: c.line, text: `บรรทัด ${c.line}: ไม่รู้จักคำสั่ง ${c.name}()` });
                }
            }
        }
    }

    if (!crashed && !timedOut && armedAt !== null) ev({ kind: "warn", text: "สั่ง takeOff แล้วแต่โปรแกรมจบก่อนโดรนจะยกตัว (ต้อง delay อย่างน้อย 3000 ms หลัง takeOff)" });
    if (!crashed && !timedOut && flying) ev({ kind: "warn", text: "จบโปรแกรมแล้วโดรนยังบินอยู่ อย่าลืม autoLand()" });
    if (!crashed && !timedOut && !landedOnPad && !flying && calls.length)
        ev({ kind: "warn", text: "ยังไม่ได้ลงจอดบนแท่น Takeoff จึงยังไม่หยุดเวลา" });

    // ---- สรุปคะแนนตามกติกา ----
    const breakdown: Breakdown[] = [];
    let ballPts = 0,
        over = 0,
        total = 0;
    balls.forEach(n => {
        total += n;
        ballPts += Math.min(n, cfg.ballCap) * cfg.points.ball;
        over += Math.max(0, n - cfg.ballCap);
    });
    if (total) breakdown.push({ label: `สัมภาระลงแท่น ${total - over} ลูก`, points: ballPts });
    if (over)
        breakdown.push({ label: `สัมภาระเกิน ${cfg.ballCap} ลูกต่อแท่น ${over} ลูก`, points: -over * cfg.points.ball });
    if (popped.size)
        breakdown.push({ label: `ทำลายลูกโป่ง ${popped.size} ลูก`, points: popped.size * cfg.points.balloon });
    if (platformLanded.size)
        breakdown.push({
            label: `ลงจอดแท่นวงกลม ${platformLanded.size} แท่น`,
            points: platformLanded.size * cfg.points.platformLanding,
        });
    if (bestRing.size)
        breakdown.push({
            label: `ลูกดอกถูกเป้า ${bestRing.size} เป้า (วง ${[...bestRing.values()].join(", ")})`,
            points: [...bestRing.values()].reduce((s, v) => s + v, 0),
        });
    if (landedOnPad)
        breakdown.push({
            label: cfg.free ? (padC === null ? "ลงจอดสำเร็จ" : "ลงจอดบนแท่นฐาน") : throughHoop ? "ลอดห่วงและลงจอดบนแท่น Takeoff" : "ลงจอดบนแท่น Takeoff (ไม่ได้ลอดห่วง)",
            points: throughHoop ? cfg.points.padThroughHoop : cfg.points.padNoHoop,
        });
    void shotsMade;
    const extra = evalExtras(frames, cfg);
    breakdown.push(...extra.breakdown);
    const score = breakdown.reduce((s, b) => s + b.points, 0);

    return {
        frames,
        events,
        duration: t,
        score,
        breakdown,
        stopTime,
        landedOnPad,
        throughHoop,
        timedOut,
        ok: !crashed && !errors.length,
        visits: extra.visits,
    };
}

/** ตำแหน่งโดรน ณ เวลา t (เฟรมต่อกัน ใช้ interpolation เชิงเส้น) */
export function frameAt(frames: Frame[], t: number): Frame {
    if (t <= 0) return frames[0];
    for (let i = 1; i < frames.length; i++) {
        const b = frames[i];
        if (t <= b.t) {
            const a = frames[i - 1];
            const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
            return {
                t,
                x: a.x + (b.x - a.x) * k,
                y: a.y + (b.y - a.y) * k,
                z: a.z + (b.z - a.z) * k,
                yaw: a.yaw + (b.yaw - a.yaw) * k,
                rpm: (a.rpm ?? 0) + ((b.rpm ?? 0) - (a.rpm ?? 0)) * k,
            };
        }
    }
    return frames[frames.length - 1];
}
