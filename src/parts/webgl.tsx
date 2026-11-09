'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import { MonitorOff } from 'lucide-react';

export type GLState = 'pending' | 'ok' | 'none';

let cached: boolean | undefined;

/** ลองสร้าง WebGL context ทิ้งไว้ชั่วคราว แล้วคืนทันที ไม่ให้กินโควตา context ของเบราว์เซอร์ */
function probe() {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** เบราว์เซอร์นี้เปิดฉาก 3 มิติได้ไหม · ตรวจก่อนสร้าง Canvas เพื่อไม่ให้ Three.js โยน error ทั้งหน้า */
export function useWebGL(): GLState {
  const [state, setState] = useState<GLState>('pending');
  useEffect(() => {
    cached ??= probe();
    setState(cached ? 'ok' : 'none');
  }, []);
  return state;
}

/** กันกรณี context หลุดหรือสร้างไม่ได้กลางทาง (การ์ดจอรีเซ็ต โหมดประหยัดพลังงาน) */
export class GLBoundary extends Component<{ fallback: ReactNode; onFail?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function WebGLNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" className={'text-foreground ' + (compact ? 'grid size-full place-items-center p-4' : '')}>
      <div className="max-w-md squircle-2xl border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center squircle-xl border border-line bg-surface-2 text-brand-red"><MonitorOff className="size-5" aria-hidden /></span>
          <div>
            <h2 className="text-base font-extrabold">เบราว์เซอร์นี้เปิดโมเดล 3 มิติไม่ได้</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">การ์ดจอหรือการเร่งด้วยกราฟิกถูกปิดอยู่ หน้านี้เลยแสดงฉาก 3D ไม่ได้ พบบ่อยเมื่อเปิดในหน้าต่างพรีวิวของโปรแกรมอื่น</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 pl-5 text-sm leading-6 [list-style:disc]">
          <li>เปิดหน้านี้ด้วย Chrome, Edge, Firefox หรือ Safari ตัวปกติ</li>
          <li>Chrome / Edge: ตั้งค่า → ระบบ → เปิด “ใช้การเร่งด้วยกราฟิกเมื่อพร้อมใช้งาน” แล้วเปิดเบราว์เซอร์ใหม่</li>
        </ul>
      </div>
    </div>
  );
}
