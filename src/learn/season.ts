import { currentSeason } from '@/rules';

/** กติกาฤดูกาลปัจจุบัน (ใช้กับตัวจำลองในแบบฝึก) */
export const season = currentSeason;
export const eventOf = (id: string) => season.events.find((e) => e.id === id) ?? season.events[0];
