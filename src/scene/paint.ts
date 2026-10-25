import { useEffect, useState } from 'react';
import * as THREE from 'three';

/** โหมดสว่างใช้โดรนสีขาว โหมดมืดใช้สีดำเดิมของโมเดล · เลนส์ ไฟฟ้า ไฟแดง ไม่เปลี่ยน */
const WHITE_PAINT: Record<string, { color: string; metalness: number; roughness: number }> = {
  Black: { color: '#f2f2f4', metalness: 0.05, roughness: 0.42 },
  Graphite: { color: '#dcdce0', metalness: 0.2, roughness: 0.35 },
  Axle: { color: '#b4b4ba', metalness: 0.3, roughness: 0.4 },
  Prop: { color: '#f7f7f9', metalness: 0.05, roughness: 0.4 },
};

/** ทาสีตามธีม เรียกซ้ำได้ (จำสีเดิมของโมเดลไว้ใน userData ครั้งแรก) */
export function paintForTheme(model: THREE.Object3D, dark: boolean) {
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    let mat = m.material as THREE.MeshStandardMaterial;
    if (!mat.userData.base) {
      mat = mat.clone();
      mat.userData.base = { c: mat.color.getHex(), m: mat.metalness, r: mat.roughness };
      m.material = mat;
    }
    const base = mat.userData.base as { c: number; m: number; r: number };
    const paint = WHITE_PAINT[mat.name];
    if (!dark && paint) { mat.color.set(paint.color); mat.metalness = paint.metalness; mat.roughness = paint.roughness; }
    else { mat.color.setHex(base.c); mat.metalness = base.m; mat.roughness = base.r; }
  });
}

/** อ่านธีมปัจจุบันจากคลาส dark บน <html> และติดตามเมื่อสลับ */
export function useDarkTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains('dark'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}
