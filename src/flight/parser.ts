import type { SimEvent } from './engine';
import { styleError, type Style } from './style';

/** คำสั่งหนึ่งครั้งที่เอนจินต้องทำ (หลังคลี่ฟังก์ชัน/ลูปแล้ว) · line = บรรทัดในโค้ดของผู้ใช้ */
export type Call = { name: string; args: number[]; line: number };

/**
 * ชื่อเมธอดของโค้ดจริง (pArduino-> และ drone.) และชื่อเต็ม → คำสั่งของเอนจิน
 * to = ชื่อคำสั่งในเอนจิน · pick = เลือกอาร์กิวเมนต์ที่ใช้ (เช่น set_yaw(ทิศ, องศา) → ±องศา) · ไม่มีใน map = ใช้ชื่อเดิม
 */
const ALIAS: Record<string, { to: string; pick?: (a: number[]) => number[] }> = {
    take_off: { to: "takeOff" },
    auto_land: { to: "autoLand" },
    stopmotor: { to: "settle", pick: () => [0] },
    stop_motor: { to: "settle", pick: () => [0] },
    set_height: { to: "sh" }, set_heights: { to: "sh" }, smooth_set_height: { to: "sh" }, sethight: { to: "sh" },
    smoothsetheight: { to: "sh" }, holdheight: { to: "sh" }, poshold_heights: { to: "sh" },
    move_forward: { to: "fw" }, move_backward: { to: "bw" }, move_left: { to: "ml" }, move_right: { to: "mr" },
    move_forward_cm: { to: "fw" }, move_backward_cm: { to: "bw" }, move_left_cm: { to: "ml" }, move_right_cm: { to: "mr" },
    move_forward_fast: { to: "fw" }, move_backward_fast: { to: "bw" }, move_left_fast: { to: "ml" }, move_right_fast: { to: "mr" },
    moveforward: { to: "fw" }, movebackward: { to: "bw" }, moveleft: { to: "ml" }, moveright: { to: "mr" },
    movefastforward: { to: "fw" }, movefastbackward: { to: "bw" }, movefastleft: { to: "ml" }, movefastright: { to: "mr" },
    // set_yaw(1, 90) = ขวา 90° · set_yaw(2, 90) = ซ้าย 90°
    set_yaw: { to: "yaw", pick: (a) => [(a[0] === 2 ? -1 : 1) * (a[1] ?? 0)] },
    setyaw: { to: "yaw", pick: (a) => [(a[0] === 2 ? -1 : 1) * (a[1] ?? 0)] },
    calibrate_and_delay: { to: "calibration" },
};

/** ข้ามเงียบๆ: ของโครงสเก็ตช์ Arduino ที่ตัวจำลองไม่ต้องใช้ (ไม่กระทบการบิน) */
const IGNORE = [
    /^(?:Serial|Wire|SPI)\s*\.\s*\w+\s*\(.*\)$/, /^(?:pinMode|digitalWrite|digitalRead|analogWrite)\s*\(.*\)$/,
    /^(?:drone\s*\.\s*|pArduino\s*->\s*)(?:beginDefault|begin|poll|keyDo|raw)\s*\(.*\)$/,
];
const TYPES = "(?:static\\s+)?(?:const\\s+)?(?:u?int(?:8|16|32|64)?_t|int|long|unsigned\\s+long|unsigned\\s+int|short|float|double|byte|bool|uint16_t)";
const DECL = new RegExp(`^${TYPES}\\s+(\\w+)\\s*(?:=\\s*([\\s\\S]+))?$`);
const FUNC = /^void\s+(\w+)\s*\(([^)]*)\)$/;
const MAX_CALLS = 4000;
const MAX_DEPTH = 24;
/** loop() วนซ้ำสูงสุดกี่รอบในตัวจำลอง (โดรนจริงวนไม่รู้จบ) */
export const LOOP_REPEATS = 8;

type Tok = { kind: "stmt" | "open" | "close"; text: string; line: number };

/** คำนวณนิพจน์ตัวเลข (+ - * / % วงเล็บ ตัวแปร) แบบไม่ใช้ eval · คืน NaN ถ้าอ่านไม่ได้ */
function evalExpr(src: string, env: Map<string, number>): number {
    const s = src.replace(/\s+/g, "");
    if (s === "true") return 1;
    if (s === "false") return 0;
    let i = 0;
    const num = (): number => {
        if (s[i] === "(") { i++; const v = add(); if (s[i] !== ")") return NaN; i++; return v; }
        if (s[i] === "-") { i++; return -num(); }
        if (s[i] === "+") { i++; return num(); }
        const m = /^(?:\d+\.?\d*|\.\d+)/.exec(s.slice(i)) ?? /^[A-Za-z_]\w*/.exec(s.slice(i));
        if (!m) return NaN;
        i += m[0].length;
        if (/^[A-Za-z_]/.test(m[0])) return env.has(m[0]) ? (env.get(m[0]) as number) : NaN;
        return Number(m[0]);
    };
    const mul = (): number => {
        let v = num();
        while (s[i] === "*" || s[i] === "/" || s[i] === "%") {
            const op = s[i++]; const r = num();
            if (op === "*") v *= r;
            else if (r === 0) return NaN;
            else if (op === "/") v = Number.isInteger(v) && Number.isInteger(r) ? Math.trunc(v / r) : v / r;
            else v %= r;
        }
        return v;
    };
    const add = (): number => {
        let v = mul();
        while (s[i] === "+" || s[i] === "-") { const op = s[i++]; const r = mul(); v = op === "+" ? v + r : v - r; }
        return v;
    };
    const v = add();
    return i === s.length ? v : NaN;
}

/** แยกสตริงด้วยจุลภาคระดับนอกสุด (ไม่ตัดในวงเล็บ) */
function splitArgs(s: string): string[] {
    const out: string[] = []; let d = 0, cur = "";
    for (const ch of s) {
        if (ch === "(") d++; else if (ch === ")") d--;
        if (ch === "," && d === 0) { out.push(cur); cur = ""; } else cur += ch;
    }
    if (cur.trim() !== "" || out.length) out.push(cur);
    return out;
}

/** ตัดคอมเมนต์ แล้วตัดเป็นโทเคน: คำสั่งที่จบด้วย ; · หัวบล็อกที่ตามด้วย { · ปีกกาปิด } — เก็บเลขบรรทัดเดิมไว้ */
function tokenize(code: string, errors: SimEvent[]): Tok[] {
    const toks: Tok[] = [];
    let cur = "", curLine = 0, depth = 0, inBlock = false;
    const lines = code.split("\n");
    const err = (line: number, text: string) => errors.push({ t: 0, kind: "error", line, text: `บรรทัด ${line}: ${text}` });
    const flushMissing = (line: number) => {
        const t = cur.trim();
        if (t) err(curLine || line, `ลืมเครื่องหมาย ; ท้ายคำสั่ง "${t.replace(/\s+/g, " ")}"`);
        cur = ""; curLine = 0;
    };
    lines.forEach((raw, li) => {
        const line = li + 1;
        if (/^\s*#/.test(raw) && !cur.trim()) return; // #include / #define
        let text = "";
        for (let k = 0; k < raw.length; k++) {
            if (inBlock) { if (raw[k] === "*" && raw[k + 1] === "/") { inBlock = false; k++; } continue; }
            if (raw[k] === "/" && raw[k + 1] === "*") { inBlock = true; k++; continue; }
            if (raw[k] === "/" && raw[k + 1] === "/") break;
            text += raw[k];
        }
        for (const ch of text) {
            if (ch === "(") depth++;
            if (ch === ")") depth = Math.max(0, depth - 1);
            if (depth > 0 && ch === ";" && !/^\s*for\b/.test(cur)) {
                err(curLine || line, `วงเล็บ ( ไม่มีวงเล็บปิด ) คู่กัน ก่อนเครื่องหมาย ; "${cur.trim().replace(/\s+/g, " ")}"`);
                cur = ""; curLine = 0; depth = 0; continue;
            }
            if (depth === 0 && ch === ";") { if (cur.trim()) toks.push({ kind: "stmt", text: cur.trim(), line: curLine || line }); cur = ""; curLine = 0; continue; }
            if (depth === 0 && ch === "{") { toks.push({ kind: "open", text: cur.trim(), line: curLine || line }); cur = ""; curLine = 0; continue; }
            if (depth === 0 && ch === "}") { if (cur.trim()) flushMissing(line); toks.push({ kind: "close", text: "", line }); continue; }
            if (!curLine && ch.trim()) curLine = line;
            cur += ch;
        }
        // ขึ้นบรรทัดใหม่โดยยังไม่จบด้วย ; : ถ้าบรรทัดถัดไปขึ้นต้นด้วย { หรือเป็นหัวฟังก์ชัน/for ที่ยังไม่ปิดวงเล็บ ถือว่ายังต่อกัน
        const t = cur.trim();
        if (t && depth === 0) {
            const rest = lines.slice(li + 1).join("\n").replace(/\/\/.*$/gm, "").trimStart();
            const headerLike = /^(?:void\s+\w+\s*\([^)]*\)|for\s*\(.*\)|else|do)$/s.test(t);
            if (!(headerLike && rest.startsWith("{"))) flushMissing(line);
        }
    });
    if (cur.trim()) flushMissing(lines.length);
    return toks;
}

type Node =
    | { kind: "stmt"; text: string; line: number }
    | { kind: "block"; header: string; body: Node[]; line: number };

/** สร้างต้นไม้จากโทเคน */
function buildTree(toks: Tok[], errors: SimEvent[]): Node[] {
    let i = 0;
    const block = (top: boolean): Node[] => {
        const out: Node[] = [];
        while (i < toks.length) {
            const t = toks[i++];
            if (t.kind === "stmt") out.push({ kind: "stmt", text: t.text, line: t.line });
            else if (t.kind === "open") out.push({ kind: "block", header: t.text, body: block(false), line: t.line });
            else {
                if (top) errors.push({ t: 0, kind: "error", line: t.line, text: `บรรทัด ${t.line}: มีปีกกาปิด } เกินมา` });
                else return out;
            }
        }
        if (!top) errors.push({ t: 0, kind: "error", line: toks[toks.length - 1]?.line, text: "ปีกกาเปิด { ไม่มีปีกกาปิด } คู่กัน" });
        return out;
    };
    return block(true);
}

/**
 * แยกโค้ดเป็นรายการคำสั่งที่เอนจินต้องทำ ไม่ใช้ eval จึงปลอดภัยแม้ผู้ใช้พิมพ์อะไรก็ได้
 * รองรับโครง C++ ของสเก็ตช์จริง: void setup() (รันครั้งเดียว) · void loop() (วนซ้ำ ตัวจำลองวนสูงสุด LOOP_REPEATS รอบ
 * หรือหยุดเมื่อเจอ while (true) {}) · ฟังก์ชันของผู้ใช้ (มีพารามิเตอร์ตัวเลขได้) · int x = 5; (นิพจน์ + - * / ได้) ·
 * for (int i = 0; i < n; i++) ที่ขอบเขตคำนวณได้ (คลี่ให้) · คอมเมนต์ // และ /* *​/
 * ยังไม่รองรับ if / while ที่มีเงื่อนไข
 * โหมด 'any' ยอมให้เขียนคำสั่งนอกฟังก์ชันได้ (โค้ดแบบเก่า) โหมดอื่นต้องอยู่ใน setup()/loop()/ฟังก์ชัน
 */
export function parse(code: string, style: Style = "any"): { calls: Call[]; errors: SimEvent[] } {
    const errors: SimEvent[] = [];
    const calls: Call[] = [];
    const err = (line: number, text: string) => errors.push({ t: 0, kind: "error", line, text: `บรรทัด ${line}: ${text}` });
    const tree = buildTree(tokenize(code, errors), errors);
    const strict = style !== "any";

    const globals = new Map<string, number>();
    const funcs = new Map<string, { params: string[]; body: Node[]; line: number }>();
    const topCalls: Node[] = [];

    // ---- ชั้นนอกสุด: ค่าคงที่ ฟังก์ชัน (และคำสั่งลอยในโหมดผ่อนปรน) ----
    for (const n of tree) {
        if (n.kind === "block") {
            const f = FUNC.exec(n.header);
            if (!f) {
                if (/^(?:int|long|float|double|bool|byte|char|unsigned)\b.*\(/.test(n.header)) err(n.line, `ฟังก์ชันในตัวจำลองต้องเป็น void ... () เท่านั้น "${n.header}"`);
                else err(n.line, `อ่านหัวบล็อกไม่ออก "${n.header}" (ชั้นนอกสุดเขียนได้เฉพาะ void ชื่อ() { ... })`);
                continue;
            }
            if (funcs.has(f[1])) { err(n.line, `ฟังก์ชัน ${f[1]} ซ้ำกัน`); continue; }
            const params = f[2].trim() === "" || f[2].trim() === "void" ? [] : splitArgs(f[2]).map((p) => p.trim().split(/\s+/).pop() as string);
            funcs.set(f[1], { params, body: n.body, line: n.line });
            continue;
        }
        const d = DECL.exec(n.text);
        if (d) {
            const v = d[2] === undefined ? 0 : evalExpr(d[2], globals);
            if (Number.isNaN(v)) err(n.line, `ค่าของ ${d[1]} ต้องเป็นตัวเลข หรือนิพจน์ตัวเลข`);
            else globals.set(d[1], v);
            continue;
        }
        if (strict) err(n.line, `คำสั่งต้องเขียนอยู่ในฟังก์ชัน เช่น void setup() { ... } ไม่ใช่ลอยอยู่ข้างนอก "${n.text}"`);
        else topCalls.push(n);
    }

    let halted = false;
    let budget = MAX_CALLS;
    const reported = new Set<string>();
    const once = (line: number, text: string) => { const k = `${line}|${text}`; if (!reported.has(k)) { reported.add(k); err(line, text); } };

    /** รันบล็อกคำสั่ง (คลี่เป็น calls) ด้วยตัวแปรเฉพาะที่ env */
    const run = (body: Node[], env: Map<string, number>, depth: number): void => {
        for (const n of body) {
            if (halted || budget <= 0) return;
            if (n.kind === "block") {
                const h = n.header;
                const f = /^for\s*\(([\s\S]*)\)$/.exec(h);
                if (f) { forLoop(f[1], n, env, depth); continue; }
                if (/^while\s*\(\s*(?:true|1)\s*\)$/.test(h) && n.body.length === 0) { halted = true; return; }
                if (/^(?:if|else|while|do|switch)\b/.test(h)) { once(n.line, `ตัวจำลองยังไม่รองรับ ${h.split(/\s|\(/)[0]} (เขียนเป็นลำดับคำสั่งตรงๆ ได้)`); continue; }
                once(n.line, `อ่านบล็อกนี้ไม่ออก "${h}"`);
                continue;
            }
            statement(n.text, n.line, env, depth);
            if (env.get("__return") === 1) return;
        }
    };

    const forLoop = (head: string, n: Extract<Node, { kind: "block" }>, env: Map<string, number>, depth: number) => {
        const parts = head.split(";").map((x) => x.trim());
        if (parts.length === 3 && parts.every((x) => x === "")) { if (n.body.length === 0) halted = true; else once(n.line, "for (;;) ที่ไม่รู้จบ ตัวจำลองไม่รองรับ"); return; }
        const init = new RegExp(`^(?:${TYPES}\\s+)?(\\w+)\\s*=\\s*(.+)$`).exec(parts[0] ?? "");
        const cond = /^(\w+)\s*(<=|>=|<|>|!=)\s*(.+)$/.exec(parts[1] ?? "");
        const step = /^(?:(\w+)\s*(\+\+|--|\+=|-=)\s*(.*)|(\+\+|--)\s*(\w+))$/.exec(parts[2] ?? "");
        if (parts.length !== 3 || !init || !cond || !step) { once(n.line, `อ่านหัว for ไม่ออก "for (${head})" ต้องเป็นแบบ for (int i = 0; i < 4; i++)`); return; }
        const v = init[1];
        const local = new Map(env);
        let cur = evalExpr(init[2], local);
        const stepVar = step[1] ?? step[5];
        const op = step[2] ?? step[4];
        const amount = step[3] ? evalExpr(step[3], local) : 1;
        if (Number.isNaN(cur) || stepVar !== v || cond[1] !== v || Number.isNaN(amount) || amount === 0) { once(n.line, `ขอบเขตของ for ต้องเป็นตัวเลขหรือค่าคงที่ที่ประกาศไว้ และเพิ่ม/ลดตัวนับตัวเดียวกัน`); return; }
        const delta = op === "++" ? 1 : op === "--" ? -1 : op === "+=" ? amount : -amount;
        for (let k = 0; k < 500; k++) {
            local.set(v, cur);
            const bound = evalExpr(cond[3], local);
            if (Number.isNaN(bound)) { once(n.line, `ค่าขอบเขต "${cond[3]}" ใน for อ่านไม่ได้`); return; }
            const ok = cond[2] === "<" ? cur < bound : cond[2] === "<=" ? cur <= bound : cond[2] === ">" ? cur > bound : cond[2] === ">=" ? cur >= bound : cur !== bound;
            if (!ok) return;
            run(n.body, local, depth);
            if (halted || budget <= 0 || local.get("__return") === 1) { if (local.get("__return") === 1) env.set("__return", 1); return; }
            cur += delta;
            if (k === 499) once(n.line, "for วนเกิน 500 รอบ ตัวจำลองหยุดคลี่");
        }
    };

    const statement = (text: string, line: number, env: Map<string, number>, depth: number) => {
        if (IGNORE.some((r) => r.test(text))) return;
        if (/^return\b/.test(text)) { env.set("__return", 1); return; }
        const d = DECL.exec(text);
        if (d) { const v = d[2] === undefined ? 0 : evalExpr(d[2], env); if (Number.isNaN(v)) once(line, `ค่าของ ${d[1]} ต้องเป็นตัวเลข หรือนิพจน์ตัวเลข`); else env.set(d[1], v); return; }
        const asg = /^(\w+)\s*(=|\+=|-=|\*=|\/=)\s*([\s\S]+)$/.exec(text);
        if (asg) {
            const rhs = evalExpr(asg[3], env), old = env.get(asg[1]) ?? globals.get(asg[1]);
            if (old === undefined || Number.isNaN(rhs)) { once(line, `ไม่รู้จักตัวแปร ${asg[1]} (ต้องประกาศก่อน เช่น int ${asg[1]} = 0;)`); return; }
            env.set(asg[1], asg[2] === "=" ? rhs : asg[2] === "+=" ? old + rhs : asg[2] === "-=" ? old - rhs : asg[2] === "*=" ? old * rhs : old / rhs);
            return;
        }
        const inc = /^(\w+)(\+\+|--)$/.exec(text);
        if (inc && (env.has(inc[1]))) { env.set(inc[1], (env.get(inc[1]) as number) + (inc[2] === "++" ? 1 : -1)); return; }
        const m = /^(?:(drone)\s*\.\s*|(pArduino)\s*(?:->|\.)\s*)?([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/.exec(text);
        if (!m) {
            if (/^(?:drone\s*\.\s*|pArduino\s*->\s*)?[A-Za-z_]\w*$/.test(text)) once(line, `"${text}" ลืมวงเล็บ () (ถ้าเป็นคำสั่งต้องเขียน ${text}();)`);
            else once(line, `อ่านคำสั่งไม่ออก "${text}" (ลืมวงเล็บหรือเปล่า?) · ตัวจำลองยังไม่รองรับ if / while ที่มีเงื่อนไข`);
            return;
        }
        const rawName = m[3];
        const prefix = m[1] ? "drone" : m[2] ? "parduino" : null;
        const argv = m[4].trim() === "" ? [] : splitArgs(m[4]);
        const args = argv.map((a) => evalExpr(a, env));
        // ฟังก์ชันของผู้ใช้
        const fn = prefix === null ? funcs.get(rawName) : undefined;
        if (fn) {
            if (depth >= MAX_DEPTH) { once(line, `เรียกฟังก์ชันซ้อนลึกเกินไป (${rawName}) อาจเรียกตัวเองวนไม่จบ`); return; }
            if (args.length !== fn.params.length) { once(line, `${rawName}() ต้องส่งค่า ${fn.params.length} ตัว แต่ส่งมา ${args.length} ตัว`); return; }
            if (args.some((a) => Number.isNaN(a))) { once(line, `ค่าที่ส่งให้ ${rawName}() ต้องเป็นตัวเลข`); return; }
            const local = new Map(globals);
            fn.params.forEach((p, k) => local.set(p, args[k]));
            run(fn.body, local, depth + 1);
            return;
        }
        if (args.some((a) => Number.isNaN(a))) { once(line, `ค่าในวงเล็บของ ${rawName}() ต้องเป็นตัวเลข (หรือชื่อค่าคงที่ที่ประกาศไว้ข้างบน)`); return; }
        const se = styleError(style, prefix, rawName);
        if (se) { once(line, se); return; }
        let name = rawName; let a = args;
        const al = ALIAS[rawName] ?? ALIAS[rawName.toLowerCase()];
        if (al) { name = al.to; if (al.pick) a = al.pick(a); }
        if (--budget <= 0) { once(line, `คำสั่งมากเกินไป (เกิน ${MAX_CALLS} คำสั่ง) อาจมีฟังก์ชันที่เรียกซ้ำไม่จบ`); return; }
        calls.push({ name, args: a, line });
    };

    // ---- เริ่มรัน: คำสั่งลอย (โหมดผ่อนปรน) → setup() → loop() วนซ้ำ ----
    const root = new Map(globals);
    run(topCalls, root, 0);
    const setup = funcs.get("setup"), loop = funcs.get("loop");
    if (setup) run(setup.body, new Map(globals), 0);
    if (loop && !halted) {
        for (let r = 0; r < LOOP_REPEATS && !halted && budget > 0; r++) {
            const before = calls.length;
            run(loop.body, new Map(globals), 0);
            if (calls.length === before) break; // loop ว่าง/ไม่มีคำสั่ง ไม่ต้องวน
        }
    }
    if (strict && tree.length > 0 && !setup && !loop && errors.length === 0) err(1, "ไม่พบ void setup() ใส่คำสั่งไว้ในฟังก์ชันนี้ เช่น void setup() { ... }");
    return { calls, errors };
}
