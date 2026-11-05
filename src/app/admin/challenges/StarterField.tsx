'use client';

import { useState } from 'react';
import { DEFAULT_CHALLENGE_STARTER } from '@/lib/challenge-starter';
import { CodeEditor } from '@/components/CodeEditor';
import { useEffect } from 'react';
import { useChallengeDraft } from './ChallengeDraftContext';

/** ช่องโค้ดเริ่มต้นของโจทย์ (มีไฮไลต์และ suggestion เหมือนในตัวจำลอง) ส่งค่าไปกับฟอร์มชื่อ starter */
export function StarterField({ defaultValue }: { defaultValue: string }) {
  const [v, setV] = useState(defaultValue || DEFAULT_CHALLENGE_STARTER);
  const draft = useChallengeDraft();
  useEffect(() => { if (draft.restoreNonce && draft.fields.starter !== undefined) setV(draft.fields.starter); }, [draft.restoreNonce, draft.fields.starter]);
  return <CodeEditor name="starter" value={v} onChange={setV} rows={12} label="โค้ดเริ่มต้น" />;
}
