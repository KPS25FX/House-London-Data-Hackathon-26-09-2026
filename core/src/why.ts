// "Why the gap" panel (v2 prototype drawWhy). Pure: returns the numbers, text is in WHY_TEXT.
import type { Seat } from './types.js';

type S = Pick<Seat, 'homes' | 'dwellings' | 'wtbPer1k' | 'owned' | 'privRent' | 'regPer100' | 'V' | 'vEst'>;

/** Bottom and top thirds (floor(n/3) each) by key, ascending. */
function thirds<T>(arr: T[], key: (x: T) => number): [T[], T[]] {
  const s = arr.slice().sort((a, b) => key(a) - key(b)), n = Math.floor(s.length / 3);
  return [s.slice(0, n), n ? s.slice(-n) : []];
}
const avg = <T>(a: T[], f: (x: T) => number): number => (a.length ? a.reduce((x, r) => x + f(r), 0) / a.length : NaN);
/** drawWhy uses homes / dwellings * 1000 with no floor on dwellings. */
const bd = (r: S): number => (r.homes / r.dwellings) * 1000;

export interface WhyGap {
  /** 1. New homes/yr per 1,000 existing: highest- vs lowest-demand third (by wtbPer1k). */
  buildRateHighDemand: number; buildRateLowDemand: number;
  /** 2. Build rate, most- vs least-owned third, and the % shortfall: round((1 - most/least) * 100). */
  buildRateMostOwned: number; buildRateLeastOwned: number; ownerBuildGapPct: number;
  /** 3. Registered per 100 adults, most vs fewest private renters third. */
  regMostRenters: number; regFewestRenters: number;
  /** 4. Share concerned (0-1), most- vs least-owned third, measured seats only (vEst false). */
  concernMostOwned: number; concernLeastOwned: number; measuredSeats: number;
}

export function whyGap(seats: S[]): WhyGap {
  const [dL, dH] = thirds(seats, r => r.wtbPer1k), [oL, oH] = thirds(seats, r => r.owned), [pL, pH] = thirds(seats, r => r.privRent);
  const M = seats.filter(r => !r.vEst), [mL, mH] = thirds(M, r => r.owned);
  const most = avg(oH, bd), least = avg(oL, bd);
  return {
    buildRateHighDemand: avg(dH, bd), buildRateLowDemand: avg(dL, bd),
    buildRateMostOwned: most, buildRateLeastOwned: least, ownerBuildGapPct: Math.round((1 - most / least) * 100),
    regMostRenters: avg(pH, r => r.regPer100), regFewestRenters: avg(pL, r => r.regPer100),
    concernMostOwned: avg(mH, r => r.V), concernLeastOwned: avg(mL, r => r.V), measuredSeats: M.length,
  };
}

/** Verbatim prototype text for the four panels: [headline, measure, so]. */
export const WHY_TEXT: [string, string, string][] = [
  ["Building doesn't follow demand", 'New homes per 1,000 existing, highest- vs lowest-demand third.', 'Tie targets and funding to demand, not past delivery.'],
  ['Owner-dominated seats build less', 'Most- vs least-owned third of seats.', 'Pressure must come from above the borough or organised local supporters.'],
  ['Renters are under-registered', 'Registered per 100 adults, most vs fewest private renters.', 'Registration drives change who MPs answer to.'],
  ['Owners worry less about housing', 'Residents concerned, most- vs least-owned third.', 'MPs in owner seats need the case made directly.'],
];

/** The four value strings exactly as the prototype renders them. */
export function whyGapValues(w: WhyGap): [string, string, string, string] {
  return [
    `${w.buildRateHighDemand.toFixed(1)} vs ${w.buildRateLowDemand.toFixed(1)}`,
    `−${w.ownerBuildGapPct}%`,
    `${w.regMostRenters.toFixed(0)} vs ${w.regFewestRenters.toFixed(0)}`,
    `${Math.round(w.concernMostOwned * 100)}% vs ${Math.round(w.concernLeastOwned * 100)}%`,
  ];
}
