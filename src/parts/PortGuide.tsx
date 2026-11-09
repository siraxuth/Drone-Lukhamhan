const groups = [
  { name: 'UART 7', pins: ['GND', '5V', 'TX', 'RX'] },
  { name: 'Digital / analog 5–6', pins: ['GPIO', '5V', 'GND'] },
  { name: 'UWM 1–2', pins: ['GND', '5V', 'GPIO'] },
  { name: 'UWM 3–4', pins: ['GPIO', '5V', 'GND'] },
];

export function PortGuide() {
  return <section className="mt-7 squircle-2xl border border-line bg-surface-2 p-4">
    <h3 className="text-base font-bold">ตารางขาพอร์ต · คู่มือหน้า 07</h3>
    <p className="mt-1 text-sm leading-6 text-muted-foreground">หันลำให้ตรงด้านก่อนอ่านลำดับขา พอร์ตหน้าตาคล้ายกัน แต่ขา 1 อยู่คนละตำแหน่งตามภาพคู่มือ</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-line text-muted-foreground"><th className="py-2 pr-3">พอร์ต</th><th className="py-2">ขา 1 → ขาสุดท้าย</th></tr></thead><tbody>{groups.map(group => <tr key={group.name} className="border-b border-line/70"><th scope="row" className="py-2 pr-3 font-semibold">{group.name}</th><td className="py-2 font-mono text-xs">{group.pins.join(' · ')}</td></tr>)}</tbody></table></div>
    <p className="mt-4 text-sm leading-6">USB-C ฝั่ง Arduino ใช้อัปโหลดโค้ดผู้เรียน ส่วน USB-C ฝั่ง FC ใช้อัปโหลดให้บอร์ดควบคุมการบิน ช่อง TF เป็นช่องการ์ดความจำ</p>
    <p className="mt-2 text-xs leading-5 text-muted-foreground">ผังถอดจากภาพหน้า 07 ของคู่มือ RCSA EDU ตรวจขั้วบนอุปกรณ์จริงก่อนเสียบสายและจ่ายไฟ</p>
  </section>;
}
