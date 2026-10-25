'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

const box = 'not-prose my-6 grid gap-4 squircle-3xl border border-line bg-surface p-4 sm:p-5';
const row = 'grid gap-1.5 text-base';
const out = 'squircle-xl bg-surface-2 px-4 py-3 font-mono text-lg';

function Num({ label, value, set, step = 1, unit }: { label: string; value: number; set: (n: number) => void; step?: number; unit: string }) {
  return (
    <label className={row}>
      <span>{label}</span>
      <span className="flex items-center gap-2"><Input type="number" inputMode="decimal" step={step} value={Number.isFinite(value) ? value : ''} onChange={(e) => set(Number(e.target.value))} className="h-11 max-w-40 text-base" /> <span className="text-muted-foreground">{unit}</span></span>
    </label>
  );
}

/** น้ำหนัก → แรงที่ต้องยก */
export function ThrustCalc() {
  const [g, setG] = useState(310);
  const n = (g / 1000) * 9.81;
  return (
    <div className={box} role="group" aria-label="เครื่องคิดเลขแรงยก">
      <Num label="น้ำหนักโดรน (รวมแบตและของที่แบก)" value={g} set={setG} step={10} unit="กรัม" />
      <p className={out}>น้ำหนัก ≈ {n.toFixed(2)} N · ลอยนิ่งต้องมีแรงยกรวมเท่านี้ · ต่อมอเตอร์ 1 ตัว ≈ {(n / 4).toFixed(2)} N ({(g / 4).toFixed(0)} กรัมแรง)</p>
    </div>
  );
}

/** ระยะ ↔ เวลา สำหรับคำสั่ง fw/bw/ml/mr */
export function MsPerCmCalc() {
  const [cm, setCm] = useState(250);
  const [rate, setRate] = useState(15.46);
  return (
    <div className={box} role="group" aria-label="เครื่องคิดเลขระยะกับเวลา">
      <Num label="ระยะที่ต้องการ" value={cm} set={setCm} step={10} unit="ซม." />
      <Num label="ค่า ms/cm ของทิศนั้น (ไปหน้า 15.46 · ถอย 15.16 · ซ้ายขวา 15.65)" value={rate} set={setRate} step={0.01} unit="ms/ซม." />
      <p className={out}>delay ≈ {Math.round(cm * rate)} ms ≈ {((cm * rate) / 1000).toFixed(2)} วินาที · ความเร็วเฉลี่ย ≈ {(100 / rate * 10).toFixed(0)} ซม./วินาที</p>
    </div>
  );
}

/** องศา ↔ pulse ของเซอร์โว */
export function ServoCalc() {
  const [deg, setDeg] = useState(90);
  const [min, setMin] = useState(500);
  const [max, setMax] = useState(2500);
  const us = Math.round(min + (Math.min(180, Math.max(0, deg)) / 180) * (max - min));
  return (
    <div className={box} role="group" aria-label="เครื่องคิดเลของศากับพัลส์เซอร์โว">
      <Num label="องศาที่ต้องการ (0–180)" value={deg} set={setDeg} step={5} unit="°" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="pulse ที่ 0°" value={min} set={setMin} step={10} unit="µs" />
        <Num label="pulse ที่ 180°" value={max} set={setMax} step={10} unit="µs" />
      </div>
      <p className={out}>{deg}° → พัลส์ {us} µs ({(us / 1000).toFixed(2)} ms)</p>
    </div>
  );
}
