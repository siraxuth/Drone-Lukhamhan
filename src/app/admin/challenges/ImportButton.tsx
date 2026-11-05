'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function ImportButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="min-h-11">{pending ? 'กำลังนำเข้าด่าน…' : `นำเข้า ${count} ด่านเพื่อแก้ไข`}</Button>;
}
