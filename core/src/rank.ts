import type { Tier } from './types.js';

/** ALG-1 mid-rank percentile: returns a function mapping a value to its percentile among `values`. */
export function pctRank(values: number[]): (v: number) => number {
  const vals = values.slice().sort((a, b) => a - b);
  const n = vals.length;
  return (v: number) => {
    let lo = 0, hi = 0;
    for (const x of vals) { if (x < v) lo++; if (x <= v) hi++; }
    return n ? ((lo + hi) / 2) / n : 0;
  };
}

/** ALG-2 tier. */
export const tier = (p: number): Tier => (p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2);
