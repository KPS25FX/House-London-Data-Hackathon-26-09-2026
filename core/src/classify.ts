import type { AreaType, Tier } from './types.js';

/** ALG-2 area type from market tier (Mt) and voter tier (Vt). */
export function areaType(Mt: Tier, Vt: Tier): AreaType {
  if (Mt === 2 && Vt === 2) return 'ready';
  if (Mt === 2 && Vt === 0) return 'locked';
  if (Mt === 0 && Vt === 2) return 'worried';
  if (Mt === 0 && Vt === 0) return 'settled';
  return 'middle';
}
