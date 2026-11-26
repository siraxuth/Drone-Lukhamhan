import { launchFrameBars, DRONE_SIZE } from '../field/layout';
import { countsFor, DEFAULT_GATE, DROP_PAIRS, EMPTY_PAYLOAD, isPayloadChannel, PAYLOAD_CHANNELS, payloadWithCounts, SIDE_CHANNELS, type ChannelCounts, type GatePositions, type Payload, type PayloadChannel } from "./payload";
import { parse, type Call } from "./parser";
import type { Style } from "./style";
import { LIGHTS_OFF, opticalFlowQuality, type FlightAction, type FlightEnvironment, type ManualStick, type PlayerPosition } from './environment';
import { NEUTRAL_STICK, RADIO_READY_MS, radioDynamics, stepRadio } from './radio-physics';
export { parse };
/**
 * เอนจินจำลองการบินบนสนามจริง 10×10 ม. (ไม่ผูกกับ UI)
 * - คำสั่งสะท้อน DroneEasy ของโค้ดชมรม (drone_sanam5) และค่า ms/ซม. จาก config.hpp
 * - คิดคะแนนตามกติกาในไฟล์ rules/season-*.ts
 * หน่วย: ระยะ = ซม., เวลา = มิลลิวินาที · พิกัด x ขวา, y ลง (เหนืออยู่ด้านบน), กลางสนาม = (500, 500)
 * ทิศหัวโดรน yaw: 0° = เหนือ, + = หมุนขวา (ตามเข็ม)
 */

export const FIELD_CM = 1000;
const SIM_MARGIN_CM = 80;
export const TIME_LIMIT_MS = 150_000;

/** ms ต่อ 1 ซม. จาก config.hpp — โดรนจริงใช้ dead-reckoning (เวลา × ความเร็ว) แบบเดียวกัน */
export const MS_PER_CM = { fw: 15.46, bw: 15.16, ml: 15.65, mr: 15.65 } as const;
const MS_PER_CM_CLIMB = 12;
const MS_PER_DEG_YAW = 42; // yaw_block ใน config.hpp
const YAW_SETTLE_MS = 220;
const TAKEOFF_CM = 80;
const SHOT_MIN_DIST_CM = 100;
// ลูกดอกถึงเป้า ~220 ms, เอฟเฟกต์กระทบ ~550 ms, ป้ายคะแนน ~1350 ms และกล้องคืนมุม ~1550 ms
// ค้างภาพเป้าแรกอีก 1 วินาทีหลังป้ายคะแนนและกล้องแสดงผลจบ ก่อนทำคำสั่งถัดไป
const SHOT_PRESENT_MS = 2550;
const NEEDLE_REACH_CM = 12;
// ลูกโป่งรัศมีประมาณ 15 ซม. เผื่อปลายเข็มเฉี่ยวขอบอีก 10 ซม. เพื่อให้ด่านฝึกเล่นง่ายขึ้น
const NEEDLE_TOLERANCE_CM = 25;
const SPEED_LIMIT_CM = 600;
export const MAGAZINE_CAPACITY = 20; // บรรจุได้ทีละ 20 ลูกต่อชุด (ชุดซ้าย = ประตู 1&4, ชุดขวา = ประตู 2&3)
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
export type Platform = { id: string; x: number; y: number; r: number; gates: Gate; requiredBalls?: number };
export type Balloon = { id: string; x: number; y: number; z: number };
export type Board = { id: string; x: number; y: number; cz: number; r: number };
/** ห่วงอิสระ: ระนาบตั้งฉากกับทิศ yaw (0° = หันไปเหนือ) โดรนต้องผ่านช่องกว้าง size ซม. ที่ความสูงกึ่งกลางโดรน zMin–zMax */
export type FreeHoop = { id: string; x: number; y: number; size: number; yaw: number; zMin: number; zMax: number; points: number };
/** จุดผ่าน: โดรนต้องบินผ่านวงรัศมี r ซม. ที่ความสูง zMin–zMax · order ใช้แสดงหมายเลขเท่านั้น */
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
    /** Payload prepared at the launch pad by the side-panel service control. */
    initialPayload?: Payload;
    servoBench?: boolean;
    stopAtFinish?: boolean;
};

/** rpm = รอบใบพัด 0–1 (ช่วงสตาร์ทหมุนจากช้าไปเร็วตาม delay หลัง takeOff) */
export type Frame = { t: number; x: number; y: number; z: number; yaw: number; rpm?: number; pitch?: number; roll?: number };
export type EventKind = "info" | "warn" | "error" | "drop" | "pop" | "shot" | "shot_b" | "land" | "takeoff" | "hold" | "servo";
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
    payload?: Payload;
    gatePositions?: GatePositions;
    gateDegrees?: GatePositions;
    /** ปลายทางของลูกดอก (สำหรับวาด) */ to?: { x: number; y: number; z: number };
};
export type Breakdown = { label: string; points: number };
export type Result = {
    frames: Frame[];
    events: SimEvent[];
    /** Time span and source line for highlighting the command currently running. */
    commandTimeline: Array<{ start: number; end: number; line: number; key?: number }>;
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
    conditions: FlightConditions;
    payloadRemaining: Payload;
    finalPosition: { x: number; y: number; z: number; yaw: number };
};

export type FlightConditions = {
    seed: number;
    /** ระยะคลาดสะสมของเที่ยวบิน แยกตามแกนสนาม (ซม.) */
    driftX: number;
    driftY: number;
    batteryPercent: number;
};

/** Repeatable conditions for debriefs. Omitting a seed always uses the nominal run. */
export function conditionsFor(seed = 0): FlightConditions {
    let state = seed >>> 0;
    const rand = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const batteryPercent = seed === 0 ? 100 : Math.round(85 + rand() * 15);
    const angle = rand() * Math.PI * 2;
    const driftCm = seed === 0 ? 0 : Math.min(3, 1 + (100 - batteryPercent) / 15 + rand());
    return {
        seed: seed >>> 0,
        driftX: Math.cos(angle) * driftCm,
        driftY: Math.sin(angle) * driftCm,
        batteryPercent,
    };
}

/** ชื่อคำสั่งแบบไม่สนตัวพิมพ์ใหญ่เล็กและขีดล่าง: auto_land = autoLand = AUTOLAND */
const canon = (n: string) => n.toLowerCase().replace(/_/g, "");

const rad = (d: number) => (d * Math.PI) / 180;
/** เวกเตอร์ทิศหน้า (x ขวา, y ลง) ของ yaw */
const dirOf = (yaw: number) => ({ x: Math.sin(rad(yaw)), y: -Math.cos(rad(yaw)) });


/** ตรวจจุดผ่านและห่วงอิสระจากเส้นทางบินทั้งหมด (หลังจำลองเสร็จ) */
function evalExtras(frames: Frame[], cfg: FlightConfig, completed: string[] = []): { visits: Result["visits"]; breakdown: Breakdown[] } {
    const visits: Result["visits"] = [];
    const wps = cfg.waypoints ?? [];
    const hoops = cfg.hoops ?? [];
    if (!wps.length && !hoops.length) return { visits, breakdown: [] };
    for (const id of completed) {
        const waypoint = wps.find(item => item.id === id);
        const hoop = hoops.find(item => item.id === id);
        if (waypoint) visits.push({ id, kind: 'waypoint', t: 0, points: waypoint.points });
        else if (hoop) visits.push({ id, kind: 'hoop', t: 0, points: hoop.points });
    }
    const done = new Set<string>(completed);

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
                if (Math.hypot(px - w.x, py - w.y) <= w.r && pz >= w.zMin && pz <= w.zMax) {
                    done.add(w.id);
                    visits.push({ id: w.id, kind: "waypoint", t: pt, points: w.points });
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

function radioCalls(actions: FlightAction[], timeLimit: number, horizon: number): Call[] {
    const calls = [
        { name: 'takeOff', args: [], line: 0 },
        { name: 'delay', args: [3000], line: 0 },
    ];
    let from = RADIO_READY_MS;
    const interrupts = actions.filter(action => action.type === 'radio-cancel-code' || action.type === 'radio-land' || action.type === 'land');
    for (const action of actions) {
        if (action.type !== 'radio-land' && action.type !== 'radio-drop' && action.type !== 'radio-key') continue;
        const at = Math.max(from, action.t);
        if (at >= timeLimit) break;
        calls.push({ name: 'radioHold', args: [at], line: 0 });
        if (action.type === 'radio-land') {
            calls.push({ name: 'autoLand', args: [], line: 0 });
            return calls;
        }
        if (action.type === 'radio-key') {
            const until = interrupts.find(interrupt => interrupt.t >= at)?.t ?? timeLimit;
            calls.push({ name: 'radioCodeStart', args: [action.key, until], line: 0 }, ...action.calls, { name: 'radioCodeEnd', args: [], line: 0 });
        } else calls.push({ name: 'radioDrop', args: [], line: 0 });
        from = at;
    }
    calls.push({ name: 'radioHold', args: [Math.min(timeLimit + 20, horizon)], line: 0 });
    return calls;
}

export function simulate(code: string, cfg: FlightConfig, seed = 0, selectedKey?: number, environment?: FlightEnvironment): Result {
    const conditions = conditionsFor(seed);
    const difficulty = environment?.difficulty ?? 'medium';
    const timeLimit = Math.min(TIME_LIMIT_MS, Math.max(0, environment?.timeLimitMs ?? TIME_LIMIT_MS));
    const radio = !!environment?.radio;
    const dynamic = radio || difficulty === 'hard' || !!environment?.actions?.some(action => action.type !== 'walk');
    const actions = [...(environment?.actions ?? [])].sort((a, b) => a.t - b.t);
    let actionIndex = 0;
    let player: PlayerPosition = { x: 0, y: -4.5 };
    let manual = false;
    let emergency = false;
    let powerOff = false;
    let stick: ManualStick = NEUTRAL_STICK;
    const consumeActions = (at: number) => {
        while (actionIndex < actions.length && actions[actionIndex].t <= at) {
            const action = actions[actionIndex++];
            if (action.type === 'walk') player = action.position;
            else if (action.type === 'manual') manual = action.enabled;
            else if (action.type === 'stick') stick = action.value;
            else if (action.type === 'land') { emergency = true; events.push({ t: action.t, kind: 'warn', text: radio ? 'ระบบพาโดรนจำลองลงฉุกเฉิน' : 'สั่งลงฉุกเฉิน · คำสั่งเดิมยังรันอยู่' }); }
            else if (action.type === 'pickup' || action.type === 'flip') { powerOff = true; events.push({ t: action.t, kind: 'warn', text: 'จับแบตเตอรี่แล้วพลิกโดรนกลางอากาศ · ใบพัดหยุดแล้ว วางใหม่ก่อนบินต่อ' }); }
            else if (action.type === 'power') { powerOff = false; emergency = false; manual = false; }
        }
    };
    const { calls, errors }: { calls: Call[]; errors: SimEvent[] } = radio ? { calls: radioCalls(actions, timeLimit, environment?.radioUntilMs ?? Infinity), errors: [] } : parse(code, cfg.style ?? "any", selectedKey);
    const events: SimEvent[] = [...errors];
    const commandTimeline: Result["commandTimeline"] = [];
    const padC = cfg.padAt === undefined ? cfg.start : cfg.padAt; // null = ไม่มีฐาน
    const hoopCenter = padC ?? cfg.start;
    const onPadAt = (px: number, py: number) => padC !== null && Math.abs(px - padC.x) <= cfg.pad.half && Math.abs(py - padC.y) <= cfg.pad.half;
    let x = environment?.launch?.x ?? cfg.start.x,
        y = environment?.launch?.y ?? cfg.start.y,
        z = onPadAt(environment?.launch?.x ?? cfg.start.x, environment?.launch?.y ?? cfg.start.y)
            || cfg.platforms.some(platform => Math.hypot(platform.x - (environment?.launch?.x ?? cfg.start.x), platform.y - (environment?.launch?.y ?? cfg.start.y)) <= platform.r)
            ? REST_CM : LEG_CM, // เริ่มบนแท่น (สูง 20 ซม.) หรือบนพื้น
        yaw = environment?.launch?.yaw ?? cfg.startYaw ?? 0,
        t = 0;
    const mag = countsFor(cfg.initialPayload ?? EMPTY_PAYLOAD);
    const installed = cfg.initialPayload?.installed ?? { ...mag };
    const gateCalibration: Partial<Record<PayloadChannel, typeof DEFAULT_GATE>> = {};
    const gatePositions: GatePositions = {};
    const gateDegrees: GatePositions = {};
    const nextBall: GatePositions = {};
    let ballInterval = MS_PER_BALL;
    let distanceScale = 1, heightScale = 1, holdMs = HOLD_MS;
    const frames: Frame[] = [{ t, x, y, z, yaw }];
    let flying = false,
        crashed = false,
        timedOut = false;
    let leftHoop = Math.abs(x - hoopCenter.x) > cfg.hoop.half || Math.abs(y - hoopCenter.y) > cfg.hoop.half,
        throughHoop = !leftHoop;
    let stopTime: number | null = null,
        landedOnPad = false;
    const balls = new Map<string, number>(environment?.completed?.balls.map(item => [item.id, item.count])); // แท่น → จำนวนลูกที่ลง
    const popped = new Set<string>(environment?.completed?.balloons);
    const platformLanded = new Set<string>(environment?.completed?.platforms);
    const bestRing = new Map<string, number>(environment?.completed?.boards.map(item => [item.id, item.points])); // เป้า → วงที่น้อยที่สุดที่ยิงถูก
    let shotsMade = 0;
    // ความคลาดค่อย ๆ เพิ่มใน 1 เมตรแรก แล้วคงที่ ไม่ทบเพิ่มทุกคำสั่งหรือทุกวินาที
    let driftProgressCm = 0;
    let velocityX = 0, velocityY = 0, velocityZ = 0;
    const radioBody = radioDynamics();
    let radioCode: { key: number; until: number } | null = null;
    const mediumGain = conditions.seed ? 1.045 + (100 - conditions.batteryPercent) * 0.0012 : 1;
    const mediumHeightGain = conditions.seed ? 1.025 + (100 - conditions.batteryPercent) * 0.0015 : 1;

    /** ตั้งศูนย์/สตาร์ทมอเตอร์ในโค้ดจริงเป็นแค่ "ส่งคำสั่ง" ไม่รอให้เสร็จ: ผู้เขียนต้อง delay เอง */
    const CALIB_MS = 3000, SPINUP_MS = 3000;
    let calibStart: number | null = radio ? -CALIB_MS : null; // เวลาที่สั่ง calibration ล่าสุด (null = ยังไม่เคยสั่ง)
    let armedAt: number | null = null; // เวลาที่สั่ง takeOff แต่ยังไม่ยกตัว
    const rpmNow = () => powerOff || (emergency && z <= ((onPadAt(x, y) || cfg.platforms.some(platform => Math.hypot(platform.x - x, platform.y - y) <= platform.r) ? PAD_TOP_CM : 0) + LEG_CM + 0.5)) ? 0 : (flying ? 1 : armedAt !== null ? Math.min(1, Math.max(0, (t - armedAt) / SPINUP_MS)) : 0);
    const push = () => frames.push({
        t, x, y, z, yaw, rpm: rpmNow(),
        ...(radio && { pitch: radioBody.pitch * 180 / Math.PI, roll: radioBody.roll * 180 / Math.PI }),
    });
    /** ความเร็วเดินทางล่าสุด (ซม./มิลลิวินาที) ของคำสั่งเดินที่เพิ่งจบ ใช้คำนวณระยะเบรก */
    let cruise: { vx: number; vy: number } | null = null;
    /** เบรกหลังคำสั่งเดิน (poshold ท้ายคำสั่งในโค้ดจริง): ลดความเร็วเป็นศูนย์ ไหลต่อไปอีก v·T/2 */
    const brake = (line: number) => {
        if (dynamic) { advanceMotion(0, 0, 0, 0, difficulty === 'easy' ? 0 : BRAKE_MS, line); return; }
        if (difficulty === 'easy') { cruise = null; return; }
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
        obstacleCrash(firstFrame, line);
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
    /** Fixed-time flight step; past player/light actions are replayed when the scene changes live. */
    function advanceMotion(dx: number, dy: number, dz: number, dyaw: number, ms: number, line: number): boolean {
        if (ms <= 0) return true;
        const firstFrame = frames.length - 1;
        const end = Math.min(timeLimit, t + ms, radioCode?.until ?? Infinity);
        const duration = Math.max(1, ms);
        const floorAt = (px: number, py: number) => (onPadAt(px, py) || cfg.platforms.some(platform => Math.hypot(platform.x - px, platform.y - py) <= platform.r) ? PAD_TOP_CM : 0) + LEG_CM;
        while (t < end - 0.001) {
            const dt = Math.min(20, end - t);
            consumeActions(t);
            const oldX = x, oldY = y, oldZ = z;
            const d = dirOf(yaw), right = { x: -d.y, y: d.x };
            const floorBefore = floorAt(x, y);
            const grounded = !flying || (powerOff || emergency) && z <= floorBefore + 0.5;
            const cmdX = dx / duration, cmdY = dy / duration;
            const q = difficulty === 'hard' ? opticalFlowQuality(x, y, z, environment?.lights ?? LIGHTS_OFF, player, environment?.ceilingLights) : 1;
            const hardGain = 1.25 + (1 - q) * 0.12 + Math.sin(seed * 0.000017 + t / 2200) * 0.035;
            const commandGain = difficulty === 'hard' ? hardGain : mediumGain;
            const desiredX = grounded || powerOff || emergency ? 0 : manual ? (d.x * stick.forward + right.x * stick.right) * 0.09 : cmdX * commandGain;
            const desiredY = grounded || powerOff || emergency ? 0 : manual ? (d.y * stick.forward + right.y * stick.right) * 0.09 : cmdY * commandGain;
            if (radio && manual && flying && !powerOff) {
                const demand = emergency ? { ...NEUTRAL_STICK, up: -1 } : stick;
                const velocity = stepRadio(radioBody, demand, yaw, { x: velocityX * 10, y: velocityY * 10, z: velocityZ * 10 },
                    dt / 1000, q, difficulty, conditions.batteryPercent, z - floorBefore, t, seed);
                velocityX = velocity.x / 10;
                velocityY = velocity.y / 10;
                velocityZ = velocity.z / 10;
                yaw = velocity.yaw;
                x += velocityX * dt;
                y += velocityY * dt;
                const floor = floorAt(x, y);
                z = Math.max(floor, Math.min(250, z + velocityZ * dt));
                if ((z === floor && velocityZ < 0) || (z === 250 && velocityZ > 0)) velocityZ = 0;
                if (z === floor && emergency) {
                    flying = false;
                    Object.assign(radioBody, radioDynamics());
                    t += dt;
                    push();
                    break;
                }
            } else {
                if (grounded) { velocityX = 0; velocityY = 0; }
                else if (difficulty === 'hard') {
                    const response = 1 - Math.exp(-dt / (175 + (1 - q) * 680));
                    const disturbance = (0.3 + 1 - q) * 0.00004 * dt;
                    velocityX += (desiredX - velocityX) * response + Math.sin(seed * 0.000019 + t / 3400) * disturbance;
                    velocityY += (desiredY - velocityY) * response + Math.cos(seed * 0.000023 + t / 2700) * disturbance;
                } else {
                    velocityX = desiredX;
                    velocityY = desiredY;
                }
                if (powerOff) { velocityX *= 0.76; velocityY *= 0.76; }
                x += velocityX * dt;
                y += velocityY * dt;
                const intendedZ = powerOff || emergency ? -0.11 : !flying ? 0 : manual ? stick.up * 0.06 : dz / duration;
                const floor = floorAt(x, y);
                if (grounded || powerOff || emergency) velocityZ = intendedZ;
                else if (difficulty === 'hard') {
                    const responseZ = 1 - Math.exp(-dt / (150 + (1 - q) * 500));
                    const wobble = Math.sin(seed * 0.000029 + t / 410) * (0.25 + 1 - q) * 0.0035;
                    velocityZ += (intendedZ * (1.22 + (1 - q) * 0.15) + wobble - velocityZ) * responseZ;
                } else velocityZ = intendedZ * mediumHeightGain;
                z = Math.max(floor, z + velocityZ * dt);
                if (z === floor && velocityZ < 0) velocityZ = 0;
                yaw += (powerOff || emergency ? 0 : manual ? stick.yaw * 0.06 : dyaw / duration) * dt;
            }
            t += dt;
            push();
            if (flying && !leftHoop && (Math.abs(x - hoopCenter.x) > cfg.hoop.half || Math.abs(y - hoopCenter.y) > cfg.hoop.half)) {
                leftHoop = true;
                throughHoop = throughHoop && z >= cfg.hoop.zMin && z <= cfg.hoop.zMax;
            }
            if (x < -SIM_MARGIN_CM || x > FIELD_CM + SIM_MARGIN_CM || y < -SIM_MARGIN_CM || y > FIELD_CM + SIM_MARGIN_CM) {
                x = Math.max(-SIM_MARGIN_CM, Math.min(FIELD_CM + SIM_MARGIN_CM, x)); y = Math.max(-SIM_MARGIN_CM, Math.min(FIELD_CM + SIM_MARGIN_CM, y));
                frames[frames.length - 1] = { ...frames[frames.length - 1], x, y };
                ev({ kind: 'error', line, text: `บรรทัด ${line}: โดรนชนขอบสนาม` });
                crashed = true;
                break;
            }
            if ((x !== oldX || y !== oldY || z !== oldZ) && obstacleCrash(frames.length - 2, line)) break;
        }
        scanNeedleContacts(firstFrame, line);
        if (t >= timeLimit && (radio || end < t + ms)) {
            timedOut = true;
            ev({ kind: 'warn', text: 'หมดเวลา 2 นาที 30 วินาที โดรนหยุดทำงาน' });
        }
        return !crashed && !timedOut && (!radioCode || t < radioCode.until);
    }
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
    const frameBars = cfg.free || !padC ? [] : launchFrameBars();
    const radius = DRONE_SIZE.w * 50;
    const intersectsBox = (dx:number, dy:number, dz:number, halfX:number, halfY:number, halfZ:number) =>
        dz <= halfZ + LEG_CM && dz >= -halfZ - (DRONE_SIZE.h * 100 - LEG_CM) &&
        Math.hypot(Math.max(0, Math.abs(dx)-halfX), Math.max(0, Math.abs(dy)-halfY)) <= radius;
    function fixedObstacle(px:number, py:number, pz:number) {
        if(padC) for(const {position:[x,h,y],size:[w,t,d]} of frameBars){
            if(intersectsBox(px-padC.x-x*100,py-padC.y-y*100,pz-h*100,w*50,d*50,t*50)) return 'โครงเหล็กบนฐาน';
        }
        for(const board of cfg.boards){
            const dx=px-board.x, dz=pz-board.cz;
            const facing=board.y<500?1:-1;
            const dy=py-board.y;
            const faceOffset=Math.abs(dy-facing);
            const reach=Math.sqrt(Math.max(0,radius*radius-faceOffset*faceOffset));
            const gapZ=Math.max(0,dz-LEG_CM,-dz-(DRONE_SIZE.h*100-LEG_CM));
            if(faceOffset<=radius && Math.hypot(Math.max(0,Math.abs(dx)-reach),gapZ)<=board.r) return board.id;
            if(cfg.free){
                if(intersectsBox(dx,dy+3*facing,pz-board.cz/2,2.5,2.5,board.cz/2)) return board.id;
            } else {
                for(const side of [-1,1]){
                    const postX=dx-side*(board.r+3);
                    if(intersectsBox(postX,dy+2*facing,pz-board.cz/2,2.5,2.5,board.cz/2+25) ||
                       intersectsBox(postX,dy+2*facing,pz-2.5,3.5,25,2.5)) return board.id;
                }
                if(intersectsBox(dx,dy+2*facing,dz+20,board.r+5,2,2)) return board.id;
            }
        }
        return null;
    }
    const obstacleCrash = (firstFrame: number, line: number) => {
        const hoops = cfg.hoops ?? [];
        if (!flying || (!hoops.length && !frameBars.length && !cfg.boards.length)) return false;
        // The frame is 4.5 cm thick. Approximate the drone's swept body by a 14 cm sphere.
        const BAR = 4.5, BODY = 14;
        for (let i = firstFrame; i < frames.length - 1; i++) {
            const a = frames[i], b = frames[i + 1];
            const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
            const steps = Math.max(1, Math.ceil(len / 2));
            for (let st = 1; st <= steps; st++) {
                const u = st / steps;
                const px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u, pz = a.z + (b.z - a.z) * u;
                let obstacle = fixedObstacle(px, py, pz);
                for (const h of hoops) {
                    const nx = Math.sin(rad(h.yaw)), ny = -Math.cos(rad(h.yaw));
                    const along = (px - h.x) * nx + (py - h.y) * ny;
                    if (Math.abs(along) > BODY + BAR / 2) continue;
                    const lat = (px - h.x) * -ny + (py - h.y) * nx;
                    const half = h.size / 2;
                    const bottomBar = Math.max(0, h.zMin - 12 - BAR / 2);
                    const topBar = h.zMax + 12 + BAR / 2;
                    const boxDistance = (side: number, zCenter: number, halfWidth: number, halfHeight: number) => Math.hypot(
                        Math.max(0, Math.abs(along) - BAR / 2),
                        Math.max(0, Math.abs(lat - side) - halfWidth),
                        Math.max(0, Math.abs(pz - zCenter) - halfHeight),
                    );
                    const sideHeight = topBar + BAR / 2;
                    const hit = [-1, 1].some(side => boxDistance(side * (half + BAR / 2), sideHeight / 2, BAR / 2, sideHeight / 2) <= BODY)
                        || boxDistance(0, bottomBar, half + BAR, BAR / 2) <= BODY
                        || boxDistance(0, topBar, half + BAR, BAR / 2) <= BODY;
                    if (hit) { obstacle = `โครงห่วง "${h.id}"`; break; }
                }
                if (obstacle) {
                    // ตัดเส้นทางที่จุดชน
                    const tHit = a.t + (b.t - a.t) * u;
                    frames.length = i + 1;
                    frames.push({ t: tHit, x: px, y: py, z: pz, yaw: a.yaw + (b.yaw - a.yaw) * u });
                    const vx = (b.x - a.x) / Math.max(1, b.t - a.t), vy = (b.y - a.y) / Math.max(1, b.t - a.t);
                    x = px; y = py; z = pz; t = tHit; yaw = frames[frames.length - 1].yaw;
                    ev({ kind: "error", line, text: `บรรทัด ${line}: โดรนชน${obstacle} ที่ความสูง ${Math.round(pz)} ซม. แล้วตกลงพื้น`, at: { x: px, y: py, z: pz }, id: obstacle, ok: false });
                    // ตกอย่างอิสระ (g = 980 ซม./วินาที²) ไถลต่ออีกเล็กน้อยตามแรงเฉื่อย
                    const surface = (onPadAt(px,py) || cfg.platforms.some(p=>Math.hypot(px-p.x,py-p.y)<=p.r) ? PAD_TOP_CM : 0) + LEG_CM;
                    const drop = Math.max(0, z - surface);
                    const fallMs = Math.sqrt((2 * drop) / 980) * 1000;
                    for (const f of [0.2, 0.4, 0.6, 0.8, 1]) {
                        const tau = fallMs * f;
                        frames.push({ t: t + tau, x: x + vx * tau * 0.25, y: y + vy * tau * 0.25, z: z - 0.5 * 980 * (tau / 1000) ** 2, yaw });
                    }
                    x += vx * fallMs * 0.25; y += vy * fallMs * 0.25; z = surface; t += fallMs;
                    flying = false; crashed = true; cruise = null;
                    return true;
                }
            }
        }
        return false;
    };
    const inHoopBox = () => Math.abs(x - hoopCenter.x) <= cfg.hoop.half && Math.abs(y - hoopCenter.y) <= cfg.hoop.half;

    /** เดินทางเป็นเส้นตรงต่อเนื่อง ตัดที่เวลาหมด และเช็กการลอดห่วงตอนออกจากกรอบ */
    const travel = (dx: number, dy: number, dz: number, dyaw: number, ms: number, line: number, { shape = false, holdPosition = false } = {}) => {
        if (dynamic) return advanceMotion(dx, dy, dz, dyaw, ms, line);
        const firstFrame = frames.length - 1;
        const remain = timeLimit - t;
        const k = ms > remain ? Math.max(0, remain / ms) : 1;
        const sx = x,
            sy = y;
        const horizontalCm = flying && !holdPosition ? Math.hypot(dx, dy) * k : 0;
        const before = Math.min(1, driftProgressCm / 100);
        driftProgressCm += horizontalCm;
        const after = Math.min(1, driftProgressCm / 100);
        const driftShare = k > 0 ? (after - before) / k : 0;
        const actualDx = dx * (difficulty === 'medium' ? mediumGain : 1) + (difficulty === 'easy' ? 0 : conditions.driftX * driftShare);
        const actualDy = dy * (difficulty === 'medium' ? mediumGain : 1) + (difficulty === 'easy' ? 0 : conditions.driftY * driftShare);
        const actualDz = dz * (difficulty === 'medium' ? mediumHeightGain : 1);
        const actualDyaw = dyaw;
        if (flying && !leftHoop && (dx !== 0 || dy !== 0)) {
            // หาจุดที่ออกจากกรอบห่วงบนเส้นทางนี้ (ตรวจแบบละเอียดทุก 1 ซม.)
            const steps = Math.max(1, Math.ceil(Math.hypot(actualDx, actualDy) * k));
            for (let s = 1; s <= steps; s++) {
                const px = sx + (actualDx * k * s) / steps,
                    py = sy + (actualDy * k * s) / steps;
                if (Math.abs(px - hoopCenter.x) > cfg.hoop.half || Math.abs(py - hoopCenter.y) > cfg.hoop.half) {
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
        if (shape && difficulty !== 'easy' && k === 1 && ms > ACC_MS * 2) {
            const v = 1 / (ms - ACC_MS / 2 + BRAKE_MS / 2); // ส่วนของระยะต่อมิลลิวินาที ตอนบินคงที่
            for (const u of [0.25, 0.5, 0.75, 1]) {
                const tau = ACC_MS * u;
                const f = (0.5 * tau * tau * v) / ACC_MS;
                frames.push({ t: t + tau, x: sx + actualDx * f, y: sy + actualDy * f, z, yaw });
            }
            fEnd = v * (ms - ACC_MS / 2);
            cruise = { vx: actualDx * v, vy: actualDy * v };
        } else cruise = null;
        x += actualDx * fEnd;
        y += actualDy * fEnd;
        const floor = (onPadAt(x, y) || cfg.platforms.some(platform => Math.hypot(platform.x - x, platform.y - y) <= platform.r) ? PAD_TOP_CM : 0) + LEG_CM;
        z = Math.max(floor, z + actualDz * k);
        yaw += actualDyaw * k;
        t += ms * k;
        push();
        scanNeedleContacts(firstFrame, line);
        if (obstacleCrash(firstFrame, line)) return false;
        if (k < 1) {
            timedOut = true;
            ev({ kind: "warn", text: "หมดเวลา 2 นาที 30 วินาที โดรนหยุดทำงาน" });
        }
        return !timedOut;
    };

    const release = (amounts: ChannelCounts, time: number, duration: number, line: number) => {
        const from = { L: amounts[1] + amounts[3], R: amounts[4] + amounts[6] };
        const n = from.L + from.R;
        if (!n) return;
        for (const channel of PAYLOAD_CHANNELS) mag[channel] -= amounts[channel];

        const at = time === t ? { x, y, z } : frameAt(frames, time);
        const platform = cfg.platforms.find(p => Math.hypot(p.x - at.x, p.y - at.y) <= p.r && at.z > PAD_TOP_CM);
        const event = { t: time, kind: "drop" as const, line, n, dur: duration, from, at, payload: payloadWithCounts(mag, installed) };
        if (cfg.servoBench) {
            events.push({ ...event, text: `ชุดทดสอบปล่อยบอล ${n} ลูก` });
            return;
        }
        if (!platform) {
            events.push({ ...event, ok: false, text: `ปล่อยบอล ${n} ลูก แต่ไม่ตกในแท่น` });
            return;
        }
        const cap = platform.requiredBalls ?? cfg.ballCap;
        const before = balls.get(platform.id) ?? 0;
        const total = before + n;
        balls.set(platform.id, total);
        events.push({
            ...event, id: platform.id, ok: true,
            text: `บอล ${n} ลูกลงแท่น "${platform.id}" (รวม ${total}/${cap} ลูก)${total > cap ? " · เกินจำนวน" : ""}`,
            points: (Math.min(total, cap) - Math.min(before, cap)) * cfg.points.ball,
        });
    };

    const setGate = (channel: PayloadChannel, angle: number, time: number) => {
        const { closed, open } = gateCalibration[channel] ?? DEFAULT_GATE;
        const wasOpen = (gatePositions[channel] ?? 0) >= 1;
        const ratio = (angle - closed) / (open - closed);
        const position = Math.abs(angle - open) < 0.1 ? 1 : Math.max(0, Math.min(1, ratio));
        gateDegrees[channel] = angle;
        gatePositions[channel] = position;
        if (position < 1) delete nextBall[channel];
        else if (!wasOpen) nextBall[channel] = time + ballInterval;
    };
    const gateEvent = (line: number, time: number, text: string) =>
        events.push({ t: time, kind: "servo", line, text, gatePositions: { ...gatePositions }, gateDegrees: { ...gateDegrees } });

    const drainOpenGates = (elapsedAt: number, line: number) => {
        if ((!flying && !cfg.servoBench) || powerOff || emergency) return;
        while (true) {
            const due = Math.min(...PAYLOAD_CHANNELS.map(channel => mag[channel] ? nextBall[channel] ?? Infinity : Infinity));
            if (due > elapsedAt) return;
            const amounts = countsFor(EMPTY_PAYLOAD);
            for (const channel of PAYLOAD_CHANNELS) {
                if (nextBall[channel] !== due || !mag[channel]) continue;
                amounts[channel] = Math.min(mag[channel], Math.ceil(installed[channel] / 5));
                nextBall[channel] = due + ballInterval;
            }
            release(amounts, due, ballInterval, line);
        }
    };

    const dropChannels = (name: string, arg: number | undefined): readonly PayloadChannel[] | null => {
        switch (name) {
            case "drop": {
                const bothSides = mag[1] + mag[3] > 0 && mag[4] + mag[6] > 0;
                return DROP_PAIRS.find(pair => bothSides
                    ? pair.every(channel => mag[channel] > 0)
                    : pair.some(channel => mag[channel] > 0)) ?? [];
            }
            case "droppair": return arg === 1 || arg === 2 ? DROP_PAIRS[arg - 1] : null;
            case "openpairch1ch4": return DROP_PAIRS[0];
            case "openpairch2ch3": return DROP_PAIRS[1]; // compatibility with older sketches
            case "dropall":
            case "droppayload":
            case "openallballgate": return PAYLOAD_CHANNELS;
            default: {
                const side = name === "dropl" || name === "dropleft" ? "L" : "R";
                const channels: readonly PayloadChannel[] = SIDE_CHANNELS[side];
                if (arg !== undefined) return channels.some(channel => channel === arg) ? [arg as PayloadChannel] : null;
                const next = channels.find(channel => mag[channel] > 0);
                return next === undefined ? [] : [next];
            }
        }
    };

    for (let ci = 0; ci < calls.length; ci++) {
        const c = calls[ci];
        if (crashed || timedOut) break;
        const name = canon(c.name);
        if (radioCode && t >= radioCode.until && name !== 'radiocodeend') continue;
        const commandStart = t;
        const wasFlying = flying;
        consumeActions(t);
        const a = c.args[0];
        if ((powerOff || emergency) && ['autoland', 'drop', 'pop', 'needle', 'shoot', 'shootb', 'shotb', 'shoots1', 'shoots2'].includes(name)) {
            ev({ kind: 'warn', line: c.line, text: `บรรทัด ${c.line}: ${powerOff ? 'มอเตอร์ดับแล้ว' : 'กำลังลงฉุกเฉิน'} คำสั่ง ${c.name} ไม่มีผล` });
            commandTimeline.push({ start: commandStart, end: t, line: c.line });
            continue;
        }
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
                    travel(0, 0, 0, 0, Math.max(0, a ?? 0), c.line);
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
                const target = Math.max(15, Math.min(250, a === undefined ? z : a * heightScale));
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
            case "mr":
            case "fwt":
            case "bwt":
            case "mlt":
            case "mrt": {
                if (!needFly(`${c.name}()`)) break;
                // fwt/bwt/mlt/mrt: ระบุเป็นเวลา (ms) บินด้วยความเร็วเดียวกับแบบซม. ระยะ = เวลา ÷ มิลลิวินาทีต่อซม.
                const base = name.slice(0, 2) as "fw" | "bw" | "ml" | "mr";
                const requestedCm = name.length === 3 ? Math.abs(a ?? 0) / MS_PER_CM[base] : Math.abs(a ?? 0);
                const cm = requestedCm * distanceScale;
                if (cm > SPEED_LIMIT_CM)
                    ev({ kind: "warn", line: c.line, text: `ระยะ ${cm} ซม. ไกลมากในคำสั่งเดียว ลองแบ่งเป็นหลายช่วง` });
                const d = dirOf(yaw),
                    right = { x: Math.cos(rad(yaw)), y: Math.sin(rad(yaw)) };
                const v =
                    base === "fw"
                        ? d
                        : base === "bw"
                          ? { x: -d.x, y: -d.y }
                          : base === "mr"
                            ? right
                            : { x: -right.x, y: -right.y };
                if (!travel(v.x * cm, v.y * cm, 0, 0, cm * MS_PER_CM[base], c.line, { shape: true })) break;
                brake(c.line);
                if (x < -SIM_MARGIN_CM || x > FIELD_CM + SIM_MARGIN_CM || y < -SIM_MARGIN_CM || y > FIELD_CM + SIM_MARGIN_CM) {
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
                travel(0, 0, 0, deg, Math.abs(deg) * MS_PER_DEG_YAW + YAW_SETTLE_MS, c.line, { holdPosition: true });
                break;
            }
            case "settle":
            case "wait":
            case "delay": {
                const ms = Math.max(0, a ?? 0);
                const k = Math.min(1, (timeLimit - t) / Math.max(1, ms));
                if (dynamic) travel(0, 0, 0, 0, ms * k, c.line);
                else { t += ms * k; push(); }
                if (k < 1) {
                    timedOut = true;
                    ev({ kind: "warn", text: "หมดเวลา 2 นาที 30 วินาที โดรนหยุดทำงาน" });
                }
                break;
            }
            case "radiocodestart": {
                if (!radio || !flying || emergency || powerOff) break;
                manual = false;
                stick = NEUTRAL_STICK;
                radioCode = { key: c.args[0], until: c.args[1] };
                Object.assign(radioBody, radioDynamics());
                break;
            }
            case "radiocodeend": {
                radioCode = null;
                break;
            }
            case "radiohold": {
                if (!radio || !needFly("รีโมท")) break;
                manual = true;
                if (!advanceMotion(0, 0, 0, 0, Math.max(0, (a ?? t) - t), c.line) || !flying) ci = calls.length;
                break;
            }
            case "radiodrop": {
                if (!radio || !flying || emergency || powerOff) break;
                const amounts = { ...mag };
                release(amounts, t, MS_PER_BALL * PAYLOAD_CHANNELS.reduce((sum, channel) => sum + amounts[channel], 0), c.line);
                break;
            }
            case "poshold":
            case "hold": {
                if (!needFly(`${c.name}()`)) break;
                const ms = a !== undefined && a > 0 ? a : holdMs;
                ev({ kind: "hold", line: c.line, text: "poshold: หยุดนิ่ง ล็อกตำแหน่ง", at: { x, y, z }, dur: ms });
                if (dynamic) travel(0, 0, 0, 0, ms, c.line);
                else { t += ms; push(); }
                cruise = null;
                break;
            }
            case "autoland": {
                if (radio && !radioCode) {
                    if (emergency || powerOff) break;
                    const brakeUntil = t + 450;
                    stick = NEUTRAL_STICK;
                    if (!advanceMotion(0, 0, 0, 0, brakeUntil - t, c.line) || !flying) break;
                    manual = false;
                    Object.assign(radioBody, radioDynamics());
                }
                if (!flying && armedAt !== null && !needFly("autoLand()")) break;
                if (!flying) {
                    ev({ kind: "warn", line: c.line, text: "โดรนอยู่บนพื้นแล้ว" });
                    break;
                }
                let onRealPad = onPadAt(x, y);
                let plat = cfg.platforms.find(p => Math.hypot(p.x - x, p.y - y) <= p.r);
                let onPad = padC === null ? !plat : onRealPad; // ไม่มีฐาน: ลงบนพื้นตรงไหนก็นับเป็นจุดลงจอดของภารกิจ
                let surface = (onRealPad || plat ? PAD_TOP_CM : 0) + LEG_CM; // ลงบนแท่นสูง 20 ซม. หรือพื้นสนาม (ขาอยู่ต่ำกว่ากึ่งกลาง 7 ซม.)
                if (!travel(0, 0, surface - z, 0, Math.max(0, z - surface) * 15 + 500, c.line)) break;
                if (difficulty === 'hard') {
                    // The aircraft can leave a platform during descent. Finish falling to the floor beneath its actual position.
                    const underNow = (onPadAt(x, y) || cfg.platforms.some(p => Math.hypot(p.x - x, p.y - y) <= p.r) ? PAD_TOP_CM : 0) + LEG_CM;
                    if (z > underNow + 0.5 && !travel(0, 0, underNow - z, 0, Math.max(500, (z - underNow) * 15), c.line)) break;
                    onRealPad = onPadAt(x, y);
                    plat = cfg.platforms.find(p => Math.hypot(p.x - x, p.y - y) <= p.r);
                    onPad = padC === null ? !plat : onRealPad;
                    surface = (onRealPad || plat ? PAD_TOP_CM : 0) + LEG_CM;
                    if (z !== surface) { z = surface; push(); }
                }
                flying = false;
                if (radio) frames[frames.length - 1] = { ...frames[frames.length - 1], z, rpm: 0, pitch: 0, roll: 0 };
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
                    const alreadyBurst = cfg.balloons.find(b => popped.has(b.id) && Math.hypot(b.x - tip.x, b.y - tip.y, b.z - tip.z) <= NEEDLE_TOLERANCE_CM);
                    if (alreadyBurst) { info(`ลูกโป่ง "${alreadyBurst.id}" แตกไปแล้ว`); break; }
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
                t += SHOT_PRESENT_MS;
                push();
                break;
            }
            case "flightconfig": {
                const [distance, height, hold] = c.args;
                if (c.args.length !== 3 || ![distance, height].every(value => value >= 0.5 && value <= 1.5) || !(hold >= 100 && hold <= 5000)) {
                    ev({ kind: "error", line: c.line, text: "flight_config(ระยะ, ความสูง, เวลาล็อก) ใช้ตัวคูณ 0.5–1.5 และเวลาล็อก 100–5000 ms" });
                } else {
                    distanceScale = distance;
                    heightScale = height;
                    holdMs = hold;
                }
                break;
            }
            case "servoconfig": {
                const [channel, closed, open] = c.args;
                if (c.args.length !== 3 || !isPayloadChannel(channel) || ![closed, open].every(v => v >= 0 && v <= 180) || closed === open) {
                    ev({ kind: "error", line: c.line, text: "servo_config(ช่อง, มุมปิด, มุมเปิด) ใช้ช่อง 1, 3, 4, 6 และมุมที่ต่างกันในช่วง 0–180°" });
                    break;
                }
                gateCalibration[channel] = { closed, open };
                setGate(channel, closed, t);
                gateEvent(c.line, t, `ช่อง ${channel} ตั้งมุมปิด ${closed}° / เปิด ${open}°`);
                break;
            }
            case "servorate":
                if (c.args.length !== 1 || !(a >= 20 && a <= 1000)) {
                    ev({ kind: "error", line: c.line, text: "servo_rate() ต้องอยู่ในช่วง 20–1000 ms ต่อลูก" });
                } else ballInterval = a;
                break;
            case "servowrite":
            case "servowritepair":
            case "servopulse":
            case "releaseservoangle":
            case "releaseservodegree":
            case "releasedualservodegree": {
                if (powerOff || emergency) break;
                const pulse = name === "servopulse" || name === "releaseservoangle";
                const pair = name === "servowritepair" || name === "releasedualservodegree";
                const [channel, value, extraA, extraB] = c.args;
                const pulseMin = extraA ?? 490, pulseMax = extraB ?? 2550;
                const angle = pulse ? (value - pulseMin) * 180 / (pulseMax - pulseMin) : value;
                const countValid = pulse ? c.args.length === 2 || c.args.length === 4 : c.args.length === (pair ? 4 : 2);
                if (!countValid || !isPayloadChannel(channel) || !(angle >= 0 && angle <= 180)
                    || (pair && (!isPayloadChannel(extraA) || extraA === channel || !(extraB >= 0 && extraB <= 180)))) {
                    ev({ kind: "error", line: c.line, text: `${c.name}() ใช้ช่อง 1, 3, 4, 6 และมุม 0–180° หรือพัลส์ในช่วงที่ตั้งไว้` });
                    break;
                }
                setGate(channel, angle, t);
                if (pair && isPayloadChannel(extraA)) setGate(extraA, extraB, t);
                gateEvent(c.line, t, `เซอร์โวช่อง ${channel} → ${Number(angle.toFixed(1))}°${pair ? ` · ช่อง ${extraA} → ${extraB}°` : ""}`);
                break;
            }
            case "drop":
            case "dropl":
            case "dropr":
            case "dropleft":
            case "dropright":
            case "droppair":
            case "dropall":
            case "droppayload":
            case "openallballgate":
            case "openpairch1ch4":
            case "openpairch2ch3": {
                if (powerOff || emergency || (!cfg.servoBench && !needFly(`${c.name}()`))) break;
                const channels = dropChannels(name, a);
                const canChooseChannel = ["dropl", "dropr", "dropleft", "dropright", "droppair"].includes(name);
                if (!channels || c.args.length > (canChooseChannel ? 1 : 0)) {
                    ev({ kind: "error", line: c.line, text: "ใช้ drop_l(1 หรือ 3), drop_r(4 หรือ 6) หรือ drop_pair(1 หรือ 2)" });
                    break;
                }
                const amounts = countsFor(EMPTY_PAYLOAD);
                for (const channel of channels) amounts[channel] = mag[channel];
                const balanced = ["droppair", "openpairch1ch4", "openpairch2ch3"].includes(name)
                    || (name === "drop" && mag[1] + mag[3] > 0 && mag[4] + mag[6] > 0);
                if (balanced && channels.length === 2) {
                    const common = Math.min(...channels.map(channel => amounts[channel]));
                    for (const channel of channels) amounts[channel] = common;
                }
                const perChute = Math.max(...PAYLOAD_CHANNELS.map(channel =>
                    installed[channel] > 0 ? Math.ceil(amounts[channel] / Math.ceil(installed[channel] / 5)) : 0));
                if (!perChute) {
                    ev({ kind: "warn", line: c.line, text: balanced
                        ? "ไม่มีบอลครบทั้งคู่ในช่องที่เลือก ใช้ drop_l() หรือ drop_r() เพื่อปล่อยแยกฝั่ง"
                        : "ช่องที่เลือกไม่มีบอลเหลือ เติมได้ที่แผงเตรียมโดรนบนฐาน" });
                    break;
                }
                const start = t;
                const duration = Math.max(600, perChute * ballInterval);
                for (const channel of channels) {
                    setGate(channel, (gateCalibration[channel] ?? DEFAULT_GATE).open, start);
                    delete nextBall[channel]; // preset handles this batch as one event
                }
                gateEvent(c.line, start, `เปิดชุดปล่อยช่อง ${channels.join(" + ")}`);
                release(amounts, start, duration, c.line);
                travel(0, 0, 0, 0, duration, c.line);
                for (const channel of channels) setGate(channel, (gateCalibration[channel] ?? DEFAULT_GATE).closed, t);
                gateEvent(c.line, t, `ปิดชุดปล่อยช่อง ${channels.join(" + ")}`);
                break;
            }
            default:
                ev({ kind: "error", line: c.line, text: `บรรทัด ${c.line}: ไม่รู้จักคำสั่ง ${c.name}()` });
        }
        if (!wasFlying && flying) {
            for (const channel of PAYLOAD_CHANNELS) {
                if (nextBall[channel] !== undefined) nextBall[channel] = t + ballInterval;
            }
        }
        drainOpenGates(t, c.line);
        if (!radio || (radioCode && c.line > 0)) commandTimeline.push({ start: commandStart, end: t, line: c.line, ...(radioCode && { key: radioCode.key }) });
        if (radio && name === 'autoland' && !flying) break;
        if (cfg.stopAtFinish && stopTime !== null) break;
    }

    if (!crashed && !timedOut && armedAt !== null) ev({ kind: "warn", text: "สั่ง takeOff แล้วแต่โปรแกรมจบก่อนโดรนจะยกตัว (ต้อง delay อย่างน้อย 3000 ms หลัง takeOff)" });
    if (!radio && !crashed && !timedOut && flying && !emergency && !powerOff) ev({ kind: "warn", text: "จบโปรแกรมแล้วโดรนยังบินอยู่ อย่าลืม autoLand()" });
    if (!crashed && !timedOut && !landedOnPad && !flying && calls.length)
        ev({ kind: "warn", text: "ยังไม่ได้ลงจอดบนแท่น Takeoff จึงยังไม่หยุดเวลา" });

    // ---- สรุปคะแนนตามกติกา ----
    const breakdown: Breakdown[] = [];
    let ballPts = 0,
        over = 0,
        total = 0;
    balls.forEach((n, id) => {
        const cap = cfg.platforms.find(p => p.id === id)?.requiredBalls ?? cfg.ballCap;
        total += n;
        ballPts += Math.min(n, cap) * cfg.points.ball;
        over += Math.max(0, n - cap);
    });
    if (total) breakdown.push({ label: `สัมภาระลงแท่น ${total - over} ลูก`, points: ballPts });
    if (over)
        breakdown.push({ label: `สัมภาระเกินจำนวนที่กำหนด ${over} ลูก`, points: -over * cfg.points.ball });
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
    const extra = evalExtras(frames, cfg, environment?.completed?.visits);
    breakdown.push(...extra.breakdown);
    const score = breakdown.reduce((s, b) => s + b.points, 0);

    // ข้อความแจ้งเตือนใช้ชื่อคำสั่งตามโหมดที่ผู้ใช้เขียน (ชื่อเต็ม/pArduino-> ไม่ให้เห็นตัวย่อ sh, fw)
    const full = cfg.style === "full" || cfg.style === "parduino";
    const FULL_OF: Record<string, string> = { takeOff: "take_off", autoLand: "auto_land", sh: "set_height", fw: "move_forward", bw: "move_backward", ml: "move_left", mr: "move_right", yaw: "set_yaw" };
    const say = (text: string) => (full ? text.replace(/\b(takeOff|autoLand|sh|fw|bw|ml|mr|yaw)\b(?=\(|\s|$|\))/g, (m) => FULL_OF[m] ?? m) : text);
    events.sort((a, b) => a.t - b.t);
    return {
        frames,
        events: full ? events.map((e) => (errors.includes(e) ? e : { ...e, text: say(e.text) })) : events,
        commandTimeline,
        duration: t,
        score,
        breakdown,
        stopTime,
        landedOnPad,
        throughHoop,
        timedOut,
        ok: !crashed && !events.some(event => event.kind === "error"),
        visits: extra.visits,
        conditions,
        payloadRemaining: payloadWithCounts(mag, installed),
        finalPosition: { x, y, z, yaw },
    };
}

/** ตำแหน่งโดรน ณ เวลา t (เฟรมต่อกัน ใช้ interpolation เชิงเส้น) */
export function frameAt(frames: Frame[], t: number): Frame {
    if (t <= 0) return frames[0];
    const last = frames.length - 1;
    if (t > frames[last].t || last === 0) return frames[last];
    let lo = 1, hi = last;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (frames[mid].t < t) lo = mid + 1;
        else hi = mid;
    }
    const a = frames[lo - 1], b = frames[lo];
    const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
    const mix = (left: number, right: number) => left + (right - left) * k;
    return {
        t, x: mix(a.x, b.x), y: mix(a.y, b.y), z: mix(a.z, b.z), yaw: mix(a.yaw, b.yaw),
        rpm: mix(a.rpm ?? 0, b.rpm ?? 0),
        ...(b.pitch !== undefined && { pitch: mix(a.pitch ?? 0, b.pitch) }),
        ...(b.roll !== undefined && { roll: mix(a.roll ?? 0, b.roll) }),
    };
}
