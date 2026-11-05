import { OBJECT_LABEL, startOf, type SceneObject, type StartBase } from '@/lib/scenarios';

export type DimensionTarget = { id: string; label: string; x: number; y: number };

/** ระยะอ้างอิงจากพิกัดในโจทย์ ไม่เดาลำดับการบินจากหมายเลขจุดผ่าน */
export function dimensionTargets(scene?: StartBase & { objects: SceneObject[] }): DimensionTarget[] {
  if (!scene) return [{ id: 'start', label: 'จุดเริ่ม', x: 0, y: 0 }];
  const start = startOf(scene);
  return [
    { id: 'start', label: 'จุดเริ่ม', x: start.x, y: start.y },
    ...scene.objects.map((object) => {
      const kind = OBJECT_LABEL[object.type];
      return {
        id: object.id,
        label: object.type === 'waypoint'
          ? `จุด ${object.order ?? object.id}`
          : object.id.startsWith(kind) ? object.id : `${kind} ${object.id}`,
        x: object.x,
        y: object.y,
      };
    }),
  ];
}
