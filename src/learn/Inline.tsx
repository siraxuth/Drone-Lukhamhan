import type { ReactNode } from 'react';

/** ข้อความในการ์ดเรียน: `โค้ด` ในเครื่องหมายคำพูดกลับ และ **ตัวหนา** */
export function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).forEach((part, i) => {
    if (part.startsWith('`')) out.push(<code key={i} className="squircle-xl bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-brand-blue">{part.slice(1, -1)}</code>);
    else if (part.startsWith('**')) out.push(<b key={i} className="text-foreground">{part.slice(2, -2)}</b>);
    else out.push(part);
  });
  return <>{out}</>;
}
