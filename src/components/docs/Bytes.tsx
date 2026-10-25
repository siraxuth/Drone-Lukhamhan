type Cell = { v: string; note?: string; tone?: 'blue' | 'red' | 'muted' };

/**
 * แสดงไบต์ในแพ็กเก็ตเป็นกล่องเรียงแถว (ใช้อธิบาย I2C / serial frame)
 * <Bytes rows={[{ label: 'takeOff', cells: [{v:'AB'},{v:'CD'},{v:'01'},{v:'10', tone:'blue', note:'คำสั่ง'}] }]} />
 */
export function Bytes({ rows }: { rows: { label: string; cells: Cell[] }[] }) {
  const tone = (t?: Cell['tone']) => (t === 'blue' ? 'border-brand-blue bg-brand-blue/10' : t === 'red' ? 'border-brand-red bg-brand-red/10' : 'border-line bg-surface-2');
  return (
    <div className="not-prose my-6 grid gap-5 squircle-3xl border border-line bg-surface p-4 sm:p-5">
      {rows.map((r) => (
        <div key={r.label}>
          <p className="mb-2 text-base font-semibold">{r.label}</p>
          <ol className="flex flex-wrap gap-2">
            {r.cells.map((c, i) => (
              <li key={i} className="grid justify-items-center gap-1">
                <span className={`grid min-w-12 place-items-center squircle-xl border px-2.5 py-2 font-mono text-base font-semibold ${tone(c.tone)}`}>{c.v}</span>
                <span className="max-w-20 text-center text-sm leading-4 text-muted-foreground">{c.note ?? `[${i}]`}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
