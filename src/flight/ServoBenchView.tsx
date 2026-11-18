'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PayloadChute } from '@/field/PayloadRig';

export default function ServoBenchView({ count, opening }: { count: number; opening: number }) {
  return <div className="h-52 overflow-hidden squircle-2xl border border-line bg-surface-2" aria-label="โมเดลแผ่นปล่อยบอลสามมิติ ลากเพื่อหมุนดู">
    <Canvas frameloop="demand" camera={{ position: [0.15, 0.014, 0.15], fov: 39, near: 0.005, far: 2 }} dpr={[1, 1.5]} fallback={
      <p className="grid h-full place-items-center px-3 text-center text-sm text-muted-foreground">ภาพสามมิติต้องใช้ WebGL ดูสถานะช่องจากบันทึกการทดสอบด้านล่างได้</p>
    }>
      <hemisphereLight args={['#eef8ff', '#888d96', 2.6]} />
      <directionalLight position={[0.1, 0.16, 0.1]} intensity={2.5} />
      <directionalLight position={[-0.2, -0.15, 0.05]} intensity={1.2} />
      <OrbitControls target={[0, -0.008, 0]} enablePan={false} minDistance={0.11} maxDistance={0.38} />
      <PayloadChute count={count} opening={opening} />
    </Canvas>
  </div>;
}
