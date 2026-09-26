// ALG-9 similar seats.
import type { Seat } from './types.js';

const feat = (x: Seat): number[] => [x.Mp, x.Vp, x.owned / 100, Math.min(1, x.marginPct / 40), x.bpkP];

export function similarSeats(s: Seat, seats: Seat[], n = 3): Seat[] {
  const a = feat(s);
  return seats
    .filter(x => x.code !== s.code)
    .map(x => ({ x, d: feat(x).reduce((acc, v, i) => acc + (v - (a[i] ?? 0)) ** 2, 0) }))
    .sort((p, q) => p.d - q.d)
    .slice(0, n)
    .map(o => o.x);
}
