import { useEffect, useState } from 'react';
import * as THREE from 'three';

/** โทนของโดรนหน้า landing เท่านั้น: สว่าง = ขาวผสมเทาเข้ม, มืด = ดำ */
export function paintForTheme(model: THREE.Object3D, dark: boolean) {
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const paint = (source: THREE.Material): THREE.Material => {
      const material = source.clone() as THREE.MeshStandardMaterial;
      if (!material.color) return material;
      const name = material.name;
      if (dark) {
        material.color.set(name === 'White motor index' ? '#e6e8eb' : '#000000');
        material.metalness = 0;
        material.roughness = name === 'Dark grey optical glass' ? 0.3 : 0.68;
      } else {
        const lightColors: Record<string, string> = {
          Black: '#ffffff',
          'White battery wrap': '#858a92',
          'White motor index': '#ffffff',
          'Dark grey optical glass': '#454a52',
          'Graphite recesses': '#555b64',
          'Graphite hardware': '#777d86',
          'Soft graphite polymer': '#666c75',
          'Graphite connectors': '#5e646d',
        };
        material.color.set(lightColors[name] ?? '#666c75');
        material.metalness = 0.04;
        material.roughness = 0.52;
      }
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(paint) : paint(mesh.material);
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
