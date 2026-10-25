'use client';

import { useState } from 'react';
import { CodeEditor } from '@/components/CodeEditor';

/** ช่องโค้ดเริ่มต้นของโจทย์ (มีไฮไลต์และ suggestion เหมือนในตัวจำลอง) ส่งค่าไปกับฟอร์มชื่อ starter */
export function StarterField({ defaultValue }: { defaultValue: string }) {
  const [v, setV] = useState(defaultValue);
  return <CodeEditor name="starter" value={v} onChange={setV} rows={12} label="โค้ดเริ่มต้น" />;
}
