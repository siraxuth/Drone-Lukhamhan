import { season2569 } from './season-2569';
import type { Season } from './types';

/** เพิ่มปีใหม่ที่นี่ (เรียงใหม่สุดก่อน) */
export const seasons: Season[] = [season2569];
export const currentSeason = seasons[0];
export type { EventId, RuleEvent, Season } from './types';
