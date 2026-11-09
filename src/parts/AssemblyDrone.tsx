'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { LANDING_DRONE_MODEL } from '@/lib/drone-assets';
import { kindOf, labels, prerequisites, whiteArm, type Kind } from './mounts';
import { partById, partFromNode, type PartId } from './data';
import { GLBoundary, WebGLNotice, useWebGL } from './webgl';

/** inner = มุมสูงเฉียงลงกลางลำ ใช้ตอนเปิดฝาดูบอร์ดข้างใน */
export type View = 'free' | 'top' | 'front' | 'bottom' | 'rear' | 'inner';
export type Point3 = [number, number, number];

/** ชื่อพอร์ตที่โชว์ตอนชี้ที่กล่องจับเมาส์ของพอร์ต (ชื่อบนโมเดล → ชื่อที่คนอ่านรู้เรื่อง) */
const PORT_NAMES: Record<string, string> = {
  'UART 7': 'พอร์ต UART 7', 'USB-C Arduino': 'USB-C ของ Arduino', D5: 'พอร์ตดิจิทัล/อะนาล็อก 5', D6: 'พอร์ตดิจิทัล/อะนาล็อก 6',
  'UWM 1': 'พอร์ต UWM 1', 'UWM 2': 'พอร์ต UWM 2', 'UWM 3': 'พอร์ต UWM 3', 'UWM 4': 'พอร์ต UWM 4', 'USB-C FC': 'USB-C ของบอร์ดควบคุมการบิน',
  'TF card': 'ช่องการ์ด TF', battery: 'พอร์ตแบตเตอรี่', motor: 'ช่องเสียบมอเตอร์',
};

/**
 * แผ่นโหลดโมเดล: เป็น DOM ธรรมดาที่วางทับ Canvas ไม่ใช่ <Html> ของ drei ใน Suspense fallback
 * เพราะ <Html> ถอดตัวเองไม่ได้ตอนโมเดลโหลดเสร็จ (removeChild error) แล้วทั้งฉากว่าง
 */
function ModelLoading({ label = 'กำลังโหลดโมเดลโดรน' }: { label?: string }) {
  const { active, progress } = useProgress();
  const percentage = Math.round(progress);
  if (!active) return null;

  return <>
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-canvas/80 px-5 text-foreground backdrop-blur-sm">
      <div className="w-full max-w-sm squircle-2xl border border-line bg-surface p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center squircle-xl border border-line bg-surface-2 text-brand-blue"><span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" /></span>
          <div className="min-w-0"><p className="text-sm font-bold">{label}</p><p className="mt-1 text-xs text-muted-foreground">กำลังเตรียมชิ้นส่วนและแสงในฉาก</p></div>
          <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-muted-foreground">{percentage}%</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand-blue transition-[width] duration-200" style={{ width: `${percentage}%` }} /></div>
      </div>
    </div>
  </>;
}

function paintPart(mesh: THREE.Mesh) {
  // Nano ใช้สีจากไฟล์เดิม (ชิ้นย่อยชื่อ GPIO_insulator_* ไม่ใช่ Nano reference board)
  if (partFromNode(String(mesh.userData.name ?? mesh.name)) === 'nano') return;
  const name = String(mesh.userData.name ?? mesh.name).replace(
    /_(?=[A-Za-z])/g,
    ' ',
  );
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  for (const raw of materials) {
    if (!(raw instanceof THREE.MeshStandardMaterial)) continue;
    const material = raw;
    let color = '#272b31';
    if (name === 'Battery') color = '#c92732';
    else if (name === 'BatteryLabel') color = '#e6e8ec';
    else if (name === 'Battery cable') color = '#a21e2b';
    else if (name === 'Battery cable.001') color = '#1b1d21';
    else if (
      material.name === 'White motor index' ||
      /^White motor alignment dot/.test(name)
    )
      color = '#e8eaed';
    else if (material.name === 'Dark grey optical glass') color = '#304552';
    else if (/^Body/.test(name)) color = '#191b20';
    else if (/^Prop_/.test(name)) color = '#50545b';
    else if (/^Guard|^Cage/.test(name)) color = '#262a30';
    else if (/^Motor_/.test(name)) color = '#343940';
    else if (/^Arm|^3-hole-beam|^Leg/.test(name)) color = '#292d33';
    else if (/bolt|screw|contact|pin/i.test(name)) color = '#727780';
    else if (material.name === 'Graphite recesses') color = '#111317';
    if (/^PCB |Copper winding/.test(material.name)) continue;
    material.color.set(color);
    material.metalness = /bolt|screw|contact|pin|Motor_/i.test(name)
      ? 0.42
      : 0.08;
    material.roughness = name === 'Battery' ? 0.48 : 0.62;
  }
}

function CameraPreset({
  view,
  fit = 'scene',
  assembly = false,
}: {
  view: View;
  fit?: 'scene' | 'part';
  assembly?: boolean;
}) {
  const { camera, size } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const distance = fit === 'part'
      ? 2.4
      : aspect > 1 ? 2.45 : Math.max(2.8, 3.45 / Math.max(aspect, 0.4));
    const targetX = 0;
    const targetY = assembly && size.width <= 430 ? 0.3 : 0;
    const positions: Record<View, Point3> = {
      free: [distance * 0.61, distance * 0.4, distance * 0.69],
      top: [0.001, distance, 0],
      front: [0, distance * 0.12, distance],
      rear: [0, distance * .12, -distance],
      bottom: [0.001, -distance, 0],
      inner: [distance * 0.2, distance * 1.0, distance * 0.64],
    };
    const [x, y, z] = positions[view];
    camera.position.set(x + targetX, y + targetY, z);
    camera.lookAt(targetX, targetY, 0);
    controls.current?.target.set(targetX, targetY, 0);
    controls.current?.update();
  }, [view, camera, size.width, size.height, fit, assembly]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={fit === 'part' ? 0.7 : 1.15}
      maxDistance={fit === 'part' ? 4 : 10}
      autoRotate={false}
    />
  );
}

function IsolatedPart({ part }: { part: PartId }) {
  const { scene } = useGLTF(LANDING_DRONE_MODEL.high);
  const isolated = useMemo(() => {
    const selected = new THREE.Group();

    for (const node of scene.children) {
      if (partFromNode(node.name) !== part) continue;
      if (
        (part==='esc' && selected.children.length>0) ||
        (part === 'motor' && /^Motor socket_/.test(node.name) && node.name !== 'Motor socket_1') ||
        node.userData.mount &&
        ['motor', 'propeller', 'frame', 'guard'].includes(part) &&
        !/^(beam|motor|mplug|bracket|pin|leg|prop)-1$|^(bolt|mscrew)-1-[01]$/.test(node.userData.mount)
      )
        continue;
      const copy = node.clone(true);
      copy.traverse((mesh) => {
        if (!(mesh instanceof THREE.Mesh)) return;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
        paintPart(mesh);
      });
      selected.add(copy);
    }
    if (!selected.children.length) return null;
    const box = new THREE.Box3().setFromObject(selected);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const inner = new THREE.Group();
    inner.position.copy(center).multiplyScalar(-1);
    for (const child of [...selected.children]) inner.add(child);
    const outer = new THREE.Group();
    outer.add(inner);
    outer.scale.setScalar(1.35 / Math.max(size.x, size.y, size.z, 0.001));
    return outer;
  }, [scene, part]);

  if (!isolated)
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.62, 0.14, 0.62]} />
          <meshStandardMaterial
            color="#252a30"
            metalness={0.35}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.38, 0.06, 0.38]} />
          <meshStandardMaterial color="#4a5058" metalness={0.45} />
        </mesh>
      </group>
    );
  return <primitive object={isolated} />;
}

function ReferenceBoard({sensor}: {sensor: 'imu'|'range'}) {
  const {scene}=useGLTF('/models/reference-'+sensor+'.glb');
  const model=useMemo(()=>{
    const copy=scene.clone(true);
    const bounds=new THREE.Box3().setFromObject(copy);
    copy.position.sub(bounds.getCenter(new THREE.Vector3()));
    return copy;
  },[scene]);
  return <primitive object={model}/>;
}

export function PartDetailModel({ part, reference }: { part: PartId; reference?: boolean }) {
  const gl = useWebGL();
  if (gl === 'pending') return <div className="size-full" aria-hidden />;
  if (gl === 'none') return <WebGLNotice compact />;
  return (
    <GLBoundary fallback={<WebGLNotice compact />}>
    <div
      className="relative h-full w-full"
      aria-label={`โมเดลเฉพาะชิ้นส่วน ${partById[part].name} หมุนดูได้`}
    >
      <Canvas
        camera={{ position: [1.55, 1.05, 1.9], fov: 40 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={2.2} />
        <directionalLight position={[2, 4, 3]} intensity={3.1} />
        <directionalLight position={[-3, 1, -2]} intensity={1.5} />
        <Suspense fallback={null}>
           {reference && (part==='gyro'||part==='accel'||part==='lidar') ? <ReferenceBoard sensor={part==='lidar'?'range':'imu'}/> : <IsolatedPart part={part==='accel'?'gyro':part} />}
        </Suspense>
        <CameraPreset view="free" fit="part" />
      </Canvas>
      <ModelLoading label="กำลังโหลดชิ้นส่วน" />
    </div>
    </GLBoundary>
  );
}

function useWorkshopModel() {
  const { scene } = useGLTF(LANDING_DRONE_MODEL.high);
  return useMemo(() => {
    const root = new THREE.Group();
    const groups = new Map<string, THREE.Group>();
    const shell: THREE.Object3D[] = [];
    for (const original of scene.children) {
      const node = original.clone(true);
      // The imported Nano asset was enlarged 6.25× in the Blender scene. In the
      // workbench it must fit the 90 mm enclosure and leave the side ports exposed.
      if (original.name.startsWith('Nano reference board')) node.scale.multiplyScalar(1 / 6.25);
      node.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material.clone();
        paintPart(child);
      });
      const sourceId = original.userData.mount as string | undefined;
      // The motor, lead, connector, propeller, and cage are one workshop kit.
      // Keep them under the motor anchor so a single placement animates the full assembly.
      const id = sourceId?.startsWith('prop-') || sourceId?.startsWith('mplug-')
        ? sourceId.replace(/^(prop|mplug)-/, 'motor-')
        : sourceId;
      if (!id) {
        root.add(node);
        shell.push(node);
        node.userData.home = node.position.clone();
        continue;
      }
      node.traverse((child) => {
        if (child.userData.mount) child.userData.mount = id;
      });
      let group = groups.get(id);
      if (!group) {
        group = new THREE.Group();
        const anchorId = id !== sourceId ? scene.children.find((item) => item.userData.mount === id) : original;
        group.position.fromArray(anchorId?.userData.anchor ?? original.userData.anchor);
        group.userData.home = group.position.clone();
        groups.set(id, group);
        root.add(group);
      }
      node.position.sub(group.position);
      group.add(node);
    }
    const portHitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      colorWrite: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const addPortHit = (name: string, center: THREE.Vector3, size: THREE.Vector3) => {
      const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), portHitMaterial);
      hit.name = `Port hotspot ${name}`;
      hit.userData.name = hit.name;
      hit.userData.partOnly = true;
      hit.position.copy(center);
      root.add(hit);
    };
    // The molded openings are narrow and sit flush with the shell. Give each real port
    // a small invisible pick area so the casing doesn't steal the hover/click.
    for (const [name, side, y, z] of [
      ['UART 7', -1, 5.6, 7], ['USB-C Arduino', -1, -5.5, 7],
      ['D5', -1, 5.5, 0], ['D6', -1, -5.5, 0],
      ['UWM 1', 1, -5, 8.6], ['UWM 2', 1, 5, 8.6],
      ['UWM 3', 1, -5, 2], ['UWM 4', 1, 5, 2], ['USB-C FC', 1, 0, -3.4],
    ] as const) {
      addPortHit(name, new THREE.Vector3(side * 0.028, z * 0.001, -y * 0.001), new THREE.Vector3(0.009, 0.012, 0.015));
    }
    addPortHit('TF card', new THREE.Vector3(-0.0266, -0.0046, 0), new THREE.Vector3(0.012, 0.004, 0.015));
    addPortHit('battery', new THREE.Vector3(0, -0.002, -0.0457), new THREE.Vector3(0.016, 0.012, 0.008));
    for (const [sx, sy] of [[1, -1], [-1, -1], [-1, 1], [1, 1]]) {
      const d = new THREE.Vector2(sx, sy).normalize();
      addPortHit('motor', new THREE.Vector3(d.x * 0.047, -0.0107, -d.y * 0.047), new THREE.Vector3(0.012, 0.012, 0.012));
    }
    return { root, groups, shell };
  }, [scene]);
}

type WorkshopProps = {
  powered:boolean; onLead:()=>void;
  assemble: boolean;
  lid: number;
  installed: string[];
  held: Kind | null;
  motorType: 'white' | 'black';
  turn: number;
  onPart: (id: PartId) => void;
  onMount: (id: string) => void;
  remove: boolean;
  dragPoint: React.RefObject<{ x: number; y: number } | null>;
  /** ชิ้นที่ไฮไลต์จากรายการข้าง ๆ (ชี้รายการแล้วชิ้นบนโมเดลสว่างตาม) */
  focusPart?: PartId | null;
};

function Workbench(props: WorkshopProps) {
  const { root, groups, shell } = useWorkshopModel();
  const { assemble, installed, held, lid, remove, dragPoint, turn } = props;
  const [hovered, setHovered] = useState<{ part: PartId; point: Point3; title: string; hint: string } | null>(null);
  const highlight = useRef<{ material: THREE.MeshStandardMaterial; emissive: THREE.Color; intensity: number }[]>([]);
  function clearHighlight() {
    for (const item of highlight.current) {
      item.material.emissive.copy(item.emissive);
      item.material.emissiveIntensity = item.intensity;
    }
    highlight.current = [];
  }
  function highlightPart(part: PartId) {
    clearHighlight();
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const partId = partFromNode(String(node.userData.name ?? node.name));
      const belongsToFlightBoard = part === 'fc' && (partId === 'gyro' || partId === 'barometer');
      if (partId !== part && !belongsToFlightBoard) return;
      const materials = (Array.isArray(node.material) ? node.material : [node.material])
        .filter((material): material is THREE.MeshStandardMaterial => material instanceof THREE.MeshStandardMaterial);
      for (const material of materials) {
        highlight.current.push({ material, emissive: material.emissive.clone(), intensity: material.emissiveIntensity });
        material.emissive.set('#276f9a');
        material.emissiveIntensity = 0.45;
      }
    });
  }
  useEffect(() => {
    if (assemble) {
      clearHighlight();
      setHovered(null);
    }
  }, [assemble]);
  useEffect(() => {
    if (assemble) return;
    if (props.focusPart) highlightPart(props.focusPart);
    else clearHighlight();
  }, [props.focusPart, assemble]);
  // เปิดฝาแล้วกรงกับใบพัดบังบอร์ด: ทำให้โปร่งและไม่รับเมาส์ ปิดฝาแล้วคืนเดิม
  const fade = useRef(0);
  const fadeable = useMemo(() => {
    const list: { mesh: THREE.Mesh; materials: THREE.Material[]; raycast: THREE.Mesh['raycast'] }[] = [];
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const id = partFromNode(String(node.userData.name ?? node.name));
      if (id !== 'guard' && id !== 'propeller') return;
      list.push({ mesh: node, materials: Array.isArray(node.material) ? node.material : [node.material], raycast: node.raycast });
    });
    return list;
  }, [root]);
  const previous = useRef(new Set(installed));
  const animation = useRef(new Map<string, number>());
  const ghosts = useMemo(
    () =>
      [...groups]
        .filter(([id]) => kindOf(id) === held)
        .map(([id, group]) => {
          const mesh = group.clone(true);
          if (id === 'battery') {
            const lead = groups.get('plug')!.clone(true);
            lead.position.copy(groups.get('plug')!.userData.home).sub(group.userData.home);
            lead.visible = true;
            mesh.add(lead);
          }
          return {id, mesh};
        }),
    [groups, held, props.motorType],
  );
  const opening=useRef(0);
  const looseEnd=useRef(new THREE.Vector3());
  const leadButton=useRef<HTMLButtonElement>(null);
  const [leadActive,setLeadActive]=useState(false);
  const leadStart=useRef<{x:number;y:number}|null>(null);
  const leadGroup=groups.get('plug')!;
  const socket=leadGroup.userData.home as THREE.Vector3;
  const wireMeshes=useMemo(()=>{
    const wires: {mesh:THREE.Mesh; rest:Float32Array; weights:number[]}[]=[];
    leadGroup.traverse(node=>{
      if(!(node instanceof THREE.Mesh) || !/^Battery[ _]cable/.test(node.name))return;
      node.geometry=node.geometry.clone();
      const pos=node.geometry.getAttribute('position');
      const weights=Array.from({length:pos.count},(_,i)=>THREE.MathUtils.smoothstep((34/160-pos.getY(i))/(36/160),0,1));
      wires.push({mesh:node,rest:new Float32Array(pos.array),weights});
    });
    return wires;
  },[leadGroup]);
  const marker = useRef(new Map<string, HTMLButtonElement>());
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const lastCheck = useRef({
    at: -1,
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    state: '',
  });
  useFrame(({ camera, gl, clock }, dt) => {
    const blend = 1 - Math.exp(-9 * dt);
    // กล่องจับเมาส์ของพอร์ตอยู่ที่ผิวฝา ใช้ได้เฉพาะตอนปิดฝา ไม่งั้นมันบังบอร์ดที่เห็นอยู่
    const hotspotsOn = !assemble && lid === 0;
    for (const child of root.children) {
      if (!child.userData.partOnly) continue;
      child.visible = hotspotsOn;
      if (child instanceof THREE.Mesh) child.raycast = hotspotsOn ? THREE.Mesh.prototype.raycast : () => {};
    }
    const fadeTarget = !assemble && lid > 0 ? 1 : 0;
    if (Math.abs(fade.current - fadeTarget) > 0.002) {
      fade.current += (fadeTarget - fade.current) * blend;
      if (Math.abs(fade.current - fadeTarget) <= 0.002) fade.current = fadeTarget;
      for (const item of fadeable) {
        for (const material of item.materials) {
          const wasTransparent = material.transparent;
          material.transparent = fade.current > 0.001;
          material.opacity = 1 - 0.9 * fade.current;
          material.depthWrite = fade.current < 0.05;
          if (wasTransparent !== material.transparent) material.needsUpdate = true;
        }
        item.mesh.raycast = fade.current > 0.5 ? () => {} : item.raycast;
      }
    }
    opening.current=THREE.MathUtils.clamp(opening.current+((lid&&!assemble)?1:-1)*dt*.8,0,1);
    const phase=(from:number,to:number)=>THREE.MathUtils.smoothstep(opening.current,from,to);
    for(const node of shell){
      const home=node.userData.home as THREE.Vector3;
      if(node.name==='Body'){
        node.position.copy(home);
        node.position.y+=.35*phase(.45,.78);
        node.position.x-=.55*phase(.75,1);
      }else if(node.name.startsWith('Nano')){
        const lifted=lid===2&&!assemble;
        node.position.x+=(home.x+(lifted?.34:0)-node.position.x)*blend;
        node.position.y+=(home.y+(lifted?.38:0)-node.position.y)*blend;
      }else if(/^LED/.test(node.name)&&node instanceof THREE.Mesh){
        const mat=node.material as THREE.MeshStandardMaterial;
        mat.emissive?.setHex(props.powered&&assemble?0x25db70:0);
      }
    }
    for (const [id, group] of groups) {
      const home = group.userData.home as THREE.Vector3;
      const fitted = installed.includes(id);
      if (assemble && fitted && !previous.current.has(id))
        animation.current.set(id, 1);
      const progress = Math.max(0, (animation.current.get(id) ?? 0) - dt * 1.8);
      animation.current.set(id, progress);
      group.visible = !assemble || fitted;
      group.position.copy(home);
      group.rotation.y = ['bolt','mscrew'].includes(kindOf(id)) ? progress * Math.PI * 4 : 0;
      if (!assemble) {
        if(id==='battery'||id==='plug'){
          group.position.y+=.62*phase(.05,.48);
          group.position.x+=.40*phase(.12,.48);
        }else{
          group.position.x+=Math.sign(home.x)*.19*phase(0,.43);
          group.position.z+=Math.sign(home.z)*.19*phase(0,.43);
        }
      } else if(id==='plug'){
        group.visible=installed.includes('battery');
      } else if (['beam'].includes(kindOf(id))) {
        group.position.x += Math.sign(home.x) * progress * 0.22;
        group.position.z += Math.sign(home.z) * progress * 0.22;
      }
      else
        // Body screws drop in from above (p.05); motor screws and Section1 parts rise from below (p.04).
        group.position.y += (['mscrew','bracket','pin','leglock','leg'].includes(kindOf(id)) ? -1 : 1) * progress * 0.14;
    }
    if(assemble && installed.includes('battery')){
      const pack=groups.get('battery')!;
      leadGroup.position.y+=pack.position.y-pack.userData.home.y;
    }
    // Route the free end with the cursor while the soldered end stays on the pack.
    const unplugged=assemble && installed.includes('battery') && !installed.includes('plug');
    const end=aim.set(0,0,0);
    if(unplugged) end.set(.09,.09,-.16);
    if(unplugged && leadActive && dragPoint.current){
      const rect=gl.domElement.getBoundingClientRect();
      pointer.set((dragPoint.current.x-rect.left)/rect.width*2-1,1-(dragPoint.current.y-rect.top)/rect.height*2);
      ray.setFromCamera(pointer,camera);
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(aim),socket);
      ray.ray.intersectPlane(plane,end);
      end.sub(socket).clampLength(0,.26);
    }
    looseEnd.current.lerp(end,blend);
    for(const wire of wireMeshes){
      const pos=wire.mesh.geometry.getAttribute('position');
      for(let i=0;i<pos.count;i++){
        const w=wire.weights[i],j=i*3;
        pos.setXYZ(i,wire.rest[j]+looseEnd.current.x*w,wire.rest[j+1]+looseEnd.current.y*w,wire.rest[j+2]+looseEnd.current.z*w);
      }
      pos.needsUpdate=true;
    }
    for(const node of leadGroup.children){
      if(!/^Battery[ _]plug/.test(node.name))continue;
      node.userData.connected ??=node.position.clone();
      node.position.copy(node.userData.connected).add(looseEnd.current);
    }
    previous.current = new Set(installed);
    root.updateMatrixWorld();
    const last = lastCheck.current;
    const state = [held, remove, assemble, ...installed].join('/');
    const moved =
      !last.position.equals(camera.position) ||
      !last.quaternion.equals(camera.quaternion);
    const animating = [...animation.current.values()].some(
      (value) => value > 0,
    );
    if (
      marker.current.size &&
      (state !== last.state ||
        ((moved || animating) && clock.elapsedTime - last.at > 0.08))
    ) {
      last.state = state;
      last.at = clock.elapsedTime;
      last.position.copy(camera.position);
      last.quaternion.copy(camera.quaternion);
      for (const [id, button] of marker.current) {
        if (['mscrew', 'pin', 'leglock'].includes(kindOf(id))) {
          button.hidden = false;
          continue;
        }
        const pos = groups.get(id)!.userData.home as THREE.Vector3;
        aim.copy(pos);
        if (kindOf(id)==='bolt') aim.y += .024;
        else if (['mscrew','bracket','pin','leg'].includes(kindOf(id))) aim.y -= .024;
        else if (id==='plug') aim.z -= .018;
        else aim.y += .018;
        const distance = camera.position.distanceTo(aim);
        ray.set(camera.position, aim.sub(camera.position).normalize());
        const hit = ray.intersectObjects(root.children, true).find((h) => {
          let n: THREE.Object3D | null = h.object;
          while (n && n !== root) {
            if (!n.visible) return false;
            n = n.parent;
          }
          return true;
        });
        const own = hit && groups.get(id)?.getObjectById(hit.object.id);
        button.hidden = !!hit && !own && hit.distance < distance - 0.025;
      }
    }
    for (const ghost of ghosts) ghost.mesh.visible = false;
    const point = dragPoint.current;
    if (point && held!=='plug' && ghosts.length) {
      const rect = gl.domElement.getBoundingClientRect();
      const hovered = document
        .elementFromPoint(point.x, point.y)
        ?.closest<HTMLElement>('[data-mount]')?.dataset.mount;
      const ghost = ghosts.find((piece) => piece.id === hovered) ?? ghosts[0];
      ghost.mesh.visible = true;
      if (hovered === ghost.id) {
        ghost.mesh.position.copy(groups.get(ghost.id)!.userData.home);
        ghost.mesh.position.y += ['mscrew','bracket','pin','leglock','leg'].includes(kindOf(ghost.id)) ? -0.025 : 0.025;
      } else {
        pointer.set(
          ((point.x - rect.left) / rect.width) * 2 - 1,
          1 - ((point.y - rect.top) / rect.height) * 2,
        );
        ray.setFromCamera(pointer, camera);
        plane.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(aim),
          root.position,
        );
        ray.ray.intersectPlane(plane, ghost.mesh.position);
      }
      ghost.mesh.rotation.y = (turn * Math.PI) / 2;
    }
  });
  return (
    <>
      <primitive
        object={root}
        onPointerOver={(e: import('@react-three/fiber').ThreeEvent<PointerEvent>) => {
          if (assemble || !(e.object instanceof THREE.Mesh)) return;
          let node: THREE.Object3D | null = e.object;
          let id: PartId | null = null;
          const hitName = String(e.object.userData.name ?? e.object.name);
          while (node && !id) {
            id = partFromNode(node.userData.name ?? node.name);
            node = node.parent;
          }
          if (!id) return;
          e.stopPropagation();
          highlightPart(id);
          const port = PORT_NAMES[hitName.replace(/^Port hotspot /, '')];
          const item = partById[id];
          setHovered({ part: id, point: [e.point.x, e.point.y + 0.045, e.point.z], title: port ?? item.name, hint: port ? 'พอร์ตบนตัวลำ' : item.label });
        }}
        onPointerOut={() => { clearHighlight(); setHovered(null); }}
        onClick={(e: import('@react-three/fiber').ThreeEvent<MouseEvent>) => {
          if (e.delta > 4) return;
          if (assemble) {
            if (!remove) return;
            let node: THREE.Object3D | null=e.object;
            let mount: string | undefined;
            while(node && node!==root){
              if(!node.visible) return;
              mount ??= node.userData.mount;
              node=node.parent;
            }
            e.stopPropagation();
            if(mount && installed.includes(mount)) props.onMount(mount);
            return;
          }
          let hit: THREE.Object3D | null = e.object;
          let id: PartId | null = null;
          while (hit && !id) {
            id = partFromNode(hit.name.startsWith('Nano reference board') ? hit.name : (hit.userData.name ?? hit.name));
            hit = hit.parent;
          }
          if (id) {
            e.stopPropagation();
            clearHighlight();
            setHovered(null);
            props.onPart(id);
          } else if (lid === 1 && Math.abs(e.point.x) < 0.08 && Math.abs(e.point.z) < 0.17) {
            e.stopPropagation();
            props.onPart('nano');
          }
        }}
      />
      {!assemble && hovered && <Html position={hovered.point} center zIndexRange={[20, 20]} className="pointer-events-none"><span className="block whitespace-nowrap squircle-xl border border-line bg-surface px-3 py-1.5 text-center text-foreground shadow-lg"><span className="block text-sm font-bold leading-5">{hovered.title}</span><span className="block text-xs leading-4 text-muted-foreground">{hovered.hint} · คลิกเพื่ออ่านต่อ</span></span></Html>}
      {ghosts.map((ghost) => (
        <primitive key={ghost.id} object={ghost.mesh} />
      ))}
      {assemble && installed.includes('battery') && !installed.includes('plug') && !remove &&
        <Html center position={[socket.x+.09,socket.y+.09,socket.z-.16]} zIndexRange={[16,16]}>
          <button ref={leadButton} className="touch-none whitespace-nowrap rounded-lg bg-surface px-2 py-1 text-xs text-foreground" onClick={e=>{if(e.detail===0)props.onLead();}}
            onPointerDown={e=>{leadStart.current={x:e.clientX,y:e.clientY};props.onLead();setLeadActive(true);e.currentTarget.setPointerCapture(e.pointerId);}}
            onPointerMove={e=>{if(leadStart.current)dragPoint.current={x:e.clientX,y:e.clientY};}}
            onPointerCancel={()=>{leadStart.current=null;dragPoint.current=null;setLeadActive(false);}}
            onPointerUp={e=>{const dest=document.querySelector<HTMLElement>('[data-mount="plug"]');const rect=dest?.getBoundingClientRect();
              if(rect&&!dest?.hidden&&e.clientX>=rect.left-7&&e.clientX<=rect.right+7&&e.clientY>=rect.top-7&&e.clientY<=rect.bottom+7)props.onMount('plug');
              leadStart.current=null;dragPoint.current=null;setLeadActive(false);
            }}>จับหัวปลั๊ก</button>
        </Html>}
      {assemble &&
        [...groups].map(([id, group]) => {
          const kind = kindOf(id);
          if (
            remove
              ? !installed.includes(id)
              : kind !== held ||
                installed.includes(id) ||
                (kind === 'motor' && whiteArm(id) !== (props.motorType === 'white')) ||
                !prerequisites(id).every((x) => installed.includes(x))
          )
            return null;
          const anchor = group.userData.home as THREE.Vector3;
          return (
            <Html
              key={id}
              center
              position={[anchor.x, anchor.y + (kind==='bolt' ? .024 : ['mscrew','bracket','pin','leglock','leg'].includes(kind) ? -.024 : id==='plug' ? 0 : .018), anchor.z - (id==='plug' ? .018 : 0)]}
              zIndexRange={[15, 1]}
            >
              <button
                ref={(el) => {
                  if (el) marker.current.set(id, el);
                  else marker.current.delete(id);
                }}
                type="button"
                data-mount={id}
                aria-description={labels[kind]}
                title={labels[kind]}
                aria-label={`${remove ? 'ถอด' : 'ติดตั้ง'} ${labels[kind]} ${id}`}
                onClick={() => props.onMount(id)}
                className={`group relative ${kind === 'mscrew' ? 'size-11 ring-4 ring-brand-blue/20' : 'size-6'} rounded-full border-2 border-white bg-brand-blue text-sm font-bold text-white shadow-md`}
              >
                {remove ? '−' : '+'}
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden w-max -translate-x-1/2 squircle-xl bg-surface px-2 py-1 text-foreground group-hover:block group-focus-visible:block">
                  {labels[kind]}
                </span>
              </button>
            </Html>
          );
        })}
    </>
  );
}

export function Workshop({ view, onCrash, ...props }: WorkshopProps & { view: View; onCrash?: () => void }) {
  return (
    <GLBoundary fallback={null} onFail={onCrash}>
      <div className="relative size-full">
      <Canvas camera={{ position: [1.6, 1, 1.8], fov: 39 }} dpr={[1, 1.5]}>
        <ambientLight intensity={2.2} />
        <directionalLight position={[2, 4, 3]} intensity={3} />
        <directionalLight position={[-3, 1, -2]} intensity={1.4} />
        <directionalLight position={[0, 2.5, -3]} intensity={1.1} />
        <Suspense fallback={null}>
          <Workbench {...props} />
        </Suspense>
        <CameraPreset view={view} />
      </Canvas>
      <ModelLoading />
      </div>
    </GLBoundary>
  );
}
