// Bump whenever the GLBs change: /models assets are cached for seven days.
const revision = 'rcsa-20261105-8';
export const DRONE_MODEL = {
  high: `/models/drone.glb?v=${revision}`,
  low: `/models/drone-lite.glb?v=${revision}`,
} as const;
// Landing's exploded view needs separate named components, unlike the batched simulator.
export const LANDING_DRONE_MODEL = {
  high: `/models/drone-landing.glb?v=${revision}`,
  low: `/models/drone-landing-lite.glb?v=${revision}`,
} as const;
