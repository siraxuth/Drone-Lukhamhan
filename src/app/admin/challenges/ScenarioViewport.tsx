'use client';

import { Suspense, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Canvas, useThree, type RootState } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { Plane, Raycaster, Vector2, Vector3, type Group } from 'three';
import { Button } from '@/components/ui/button';
import { Balloons, DroneModel, Mat, Platforms, Takeoff, Targets } from '@/field/Field3D';
import { PlainMat, SceneLayer3D } from '@/field/SceneObjects';
import { baseAt, startOf, type ScenarioConfig, type SceneObject } from '@/lib/scenarios';
import { currentSeason } from '@/rules';

import { SCENE_OBJECT_DRAG } from './scene-drag';

type Point = { x: number; y: number };

function CameraView({ top }: { top: boolean }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    if (top) camera.position.set(0, 14, 0.001);
    else camera.position.set(8, 8, 10);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, invalidate, top]);
  return <OrbitControls makeDefault enableDamping minDistance={2} maxDistance={28} maxPolarAngle={Math.PI / 2 - 0.03} />;
}

function SceneItem({ id, position, selected, snap, yaw = 0, rotate = false, onRotate, onSelect, onMove, children }: {
  id: string;
  position: Point;
  selected: boolean;
  snap: number;
  yaw?: number;
  rotate?: boolean;
  onRotate?: (id: string, yaw: number) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, point: Point) => Point;
  children: ReactNode;
}) {
  const [group, setGroup] = useState<Group | null>(null);

  return (
    <>
      <group ref={setGroup} position={[position.x, 0, -position.y]} rotation={[0, -yaw * Math.PI / 180, 0]} onClick={(event) => {
        event.stopPropagation();
        if (event.delta < 4) onSelect(id);
      }}>
        {children}
        {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.58, 0.63, 40]} />
          <meshBasicMaterial color="#60a5fa" />
        </mesh>}
      </group>
      {selected && group && (
        <TransformControls
          object={group} mode={rotate ? 'rotate' : 'translate'}
          showX={!rotate} showY={rotate} showZ={!rotate} size={0.85}
          translationSnap={snap || null} rotationSnap={Math.PI / 12}
          onMouseUp={() => {
            if (rotate) {
              const forward = new Vector3(0, 0, -1).applyQuaternion(group.quaternion);
              const degrees = (Math.round(Math.atan2(forward.x, -forward.z) * 180 / Math.PI) + 360) % 360;
              group.rotation.set(0, -degrees * Math.PI / 180, 0);
              onRotate?.(id, degrees);
              return;
            }
            const { x, z } = group.position;
            const point = onMove(id, { x, y: -z });
            group.position.set(point.x, 0, -point.y);
          }}
        />
      )}
    </>
  );
}

export default function ScenarioViewport({ cfg, selected, snap, onSelect, onMove, onRotate, onAdd, onFallback }: {
  cfg: ScenarioConfig;
  selected: string | null;
  snap: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, point: Point) => Point;
  onRotate: (id: string, yaw: number) => void;
  onAdd: (type: SceneObject['type'], point: Point) => void;
  onFallback: () => void;
}) {
  const [rotateId, setRotateId] = useState<string | null>(null);
  const [top, setTop] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const state = useRef<RootState | null>(null);
  const standard = cfg.pattern === 'standard';
  const event = currentSeason.events.find((entry) => entry.id === cfg.event);
  const selectedHoop = cfg.objects.some((object) => object.id === selected && object.type === 'hoop');
  const rotating = selectedHoop && rotateId === selected;
  const start = startOf(cfg);
  const base = baseAt(cfg);

  useEffect(() => {
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      setAvailable(Boolean(context));
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setAvailable(false);
    }
  }, []);

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData(SCENE_OBJECT_DRAG);
    if (!['waypoint', 'hoop', 'platform', 'balloon', 'target'].includes(type) || !state.current) return;
    const { gl, camera } = state.current;
    const rect = gl.domElement.getBoundingClientRect();
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2,
    ), camera);
    const point = raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
    if (point && Math.abs(point.x) <= 5 && Math.abs(point.z) <= 5) onAdd(type as SceneObject['type'], { x: point.x, y: -point.z });
  }

  if (!available) return (
    <div className="grid min-h-64 place-content-center gap-3 squircle-2xl border border-line bg-surface-2 p-4 text-center">
      <p>{available === null ? 'กำลังเตรียมสนาม 3D…' : 'เครื่องนี้เปิดสนาม 3D ไม่ได้'}</p>
      <Button type="button" variant="outline" onClick={onFallback}>ใช้แผนผัง 2D</Button>
    </div>
  );

  return (
    <div className="relative overflow-hidden squircle-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div><p className="text-sm font-semibold">ฉากสนาม 3D</p><p className="text-xs text-muted-foreground">{rotating ? 'ลากวงหมุนเพื่อปรับทิศลอดห่วง ทีละ 15°' : 'เลือกวัตถุแล้วลากลูกศรสีเพื่อย้าย · ลากพื้นว่างเพื่อหมุนกล้อง'}</p></div>
        {selectedHoop && (
          <div className="flex gap-2" role="group" aria-label="เครื่องมือจัดห่วง">
            <Button type="button" size="sm" variant={rotating ? 'outline' : 'default'} aria-pressed={!rotating} onClick={() => setRotateId(null)}>ย้ายห่วง</Button>
            <Button type="button" size="sm" variant={rotating ? 'default' : 'outline'} aria-pressed={rotating} onClick={() => setRotateId(selected)}>หมุนห่วง</Button>
          </div>
        )}
        <div className="flex gap-2" role="group" aria-label="มุมกล้องสนาม">
          <Button type="button" size="sm" variant={top ? 'outline' : 'default'} aria-pressed={!top} onClick={() => setTop(false)}>มุมเอียง</Button>
          <Button type="button" size="sm" variant={top ? 'default' : 'outline'} aria-pressed={top} onClick={() => setTop(true)}>มองจากบน</Button>
        </div>
      </div>
      <div className="relative h-[clamp(22rem,55svh,40rem)]" onDragOver={(event) => {
        if (event.dataTransfer.types.includes(SCENE_OBJECT_DRAG)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }
      }} onDrop={drop}>
        <div className="pointer-events-none absolute left-3 top-3 z-10 squircle-xl border border-line bg-surface/90 px-3 py-2 text-xs shadow-sm">
          <strong className="block">พื้นที่สนาม 10 × 10 ม.</strong>
          <span>{standard ? 'สนามแข่งจริง · มีฐานและอุปกรณ์ประจำสนาม' : cfg.pattern === 'grid5' ? 'กริด 5 × 5 ม. กลางพื้นที่ · ช่องละ 1 ม.' : 'พื้นว่าง · ยังไม่มีอุปกรณ์ ลากจากแถบด้านบนมาวางได้'}</span>
        </div>
        <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [8, 8, 10], fov: 48 }} onCreated={(root) => { state.current = root; }}
          onPointerMissed={() => onSelect(null)} aria-label="สนาม 3D สำหรับจัดวางวัตถุ">
          <color attach="background" args={['#121820']} />
          <ambientLight intensity={1.1} />
          <hemisphereLight args={['#dbe7ff', '#202530', 1]} />
          <directionalLight position={[5, 9, 6]} intensity={2} />
          {standard ? <Mat low /> : <PlainMat pattern={cfg.pattern} low />}
          {base && (!standard && cfg.base?.mode === 'custom' ? (
            <SceneItem id="__base" position={base} selected={selected === '__base'} snap={snap} onSelect={onSelect} onMove={onMove}>
              <Takeoff color={event?.field.takeoffColor ?? 'green'} hoop={false} />
            </SceneItem>
          ) : <group position={[base.x, 0, -base.y]}><Takeoff color={event?.field.takeoffColor ?? 'green'} hoop={standard} /></group>)}
          {standard && event?.field.platforms && <Platforms />}
          {standard && event?.field.balloons && <Balloons popped={[]} />}
          {standard && event?.field.targets && <Targets />}
          {standard ? (
            <group position={[0, 0.2702, 0]} rotation={[0, Math.PI, 0]}>
              <Suspense fallback={null}><DroneModel low={false} admin /></Suspense>
            </group>
          ) : (
            <SceneItem id="__start" position={start} selected={selected === '__start'} snap={snap} onSelect={onSelect} onMove={onMove}>
              <group position={[0, base && Math.abs(base.x - start.x) <= 0.75 && Math.abs(base.y - start.y) <= 0.75 ? 0.2702 : 0.0702, 0]} rotation={[0, Math.PI - start.yaw * Math.PI / 180, 0]}>
                <mesh visible={false}><sphereGeometry args={[0.35, 8, 8]} /></mesh>
                <Suspense fallback={null}><DroneModel low={false} admin /></Suspense>
              </group>
            </SceneItem>
          )}
          {cfg.objects.filter((object) => !standard || object.type === 'waypoint' || object.type === 'hoop').map((object) => (
            <SceneItem key={object.id} id={object.id} position={object} selected={selected === object.id} snap={snap}
              yaw={object.type === 'hoop' ? object.yaw : undefined}
              rotate={rotating && object.id === selected} onRotate={onRotate} onSelect={onSelect} onMove={onMove}>
              <SceneLayer3D spec={{ pattern: cfg.pattern, objects: [{ ...object, x: 0, y: 0, ...(object.type === 'hoop' ? { yaw: 0 } : {}) }], visits: {} }} popped={[]} />
            </SceneItem>
          ))}
          <CameraView top={top} />
        </Canvas>
      </div>
      <p className="border-t border-line px-3 py-2 text-xs text-muted-foreground">ลากชนิดวัตถุจากแถบด้านบนมาปล่อยในสนาม หรือกดปุ่มเพื่อเพิ่มที่ตำแหน่งตั้งต้น · เลื่อนล้อเพื่อซูม</p>
    </div>
  );
}
