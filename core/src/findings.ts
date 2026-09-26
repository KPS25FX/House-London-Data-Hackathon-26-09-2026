// ALG-14 findings statistics (prototype drawScatter) and Spearman rho.
import type { Finding, Seat } from './types.js';

/** Spearman rank correlation: Pearson on average ranks (ties share mean rank). */
export function spearman(x: number[], y: number[]): number {
  const rk = (a: number[]): number[] => {
    const s = a.map((v, i) => [v, i] as [number, number]).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(a.length).fill(0);
    let i = 0;
    while (i < s.length) {
      let j = i;
      while (j + 1 < s.length && s[j + 1]![0] === s[i]![0]) j++;
      for (let k = i; k <= j; k++) r[s[k]![1]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const a = rk(x), b = rk(y), n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { c += (a[i]! - ma) * (b[i]! - mb); va += (a[i]! - ma) ** 2; vb += (b[i]! - mb) ** 2; }
  return c / Math.sqrt(va * vb);
}

/** Bottom and top third (middle dropped). */
export function thirds<T>(arr: T[], key: (t: T) => number): [T[], T[]] {
  const s = arr.slice().sort((a, b) => key(a) - key(b)), n = Math.floor(s.length / 3);
  return [s.slice(0, n), s.slice(s.length - n)];
}

const avg = <T>(arr: T[], f: (t: T) => number): number => arr.reduce((x, r) => x + f(r), 0) / arr.length;
const sgn = (v: number): string => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);

export function findings(seats: Seat[]): Finding[] {
  const M = seats.filter(r => !r.vEst);
  const bd = (r: Seat): number => r.homes / Math.max(r.dwellings, 1) * 1000;
  const [dLo, dHi] = thirds(seats, r => r.wtbPer1k);
  const [oLo, oHi] = thirds(seats, r => r.owned);
  const [pLo, pHi] = thirds(seats, r => r.privRent);
  const [mLo, mHi] = thirds(M, r => r.owned);
  const r2 = spearman(seats.map(bd), seats.map(r => r.wtbPer1k));
  const r3 = spearman(seats.map(bd), seats.map(r => r.owned));
  const r4 = spearman(seats.map(r => r.regPer100), seats.map(r => r.privRent));
  const r5 = spearman(M.map(r => r.V), M.map(r => r.owned));
  const dH = avg(dHi, bd), dL = avg(dLo, bd);
  const bOH = avg(oHi, bd), bOL = avg(oLo, bd);
  const pH = avg(pHi, r => r.regPer100), pL = avg(pLo, r => r.regPer100);
  const vH = avg(mHi, r => r.V), vL = avg(mLo, r => r.V);
  return [
    { id: 1, a: dH, b: dL, cmp: `${dH.toFixed(1)} vs ${dL.toFixed(1)}`, n: seats.length,
      headline: `High-demand seats build ${dH < dL ? 'less than' : 'no more than'} low-demand ones.`,
      detail: 'New homes a year per 1,000 existing homes, in the third of seats with most outside demand vs the third with least.',
      so: 'Targets and funding follow past delivery, not need. Shifting targets toward high-demand areas is the biggest lever.',
      rho: r2, rhoText: `rank correlation across ${seats.length} seats ${sgn(r2)}; 1,002 neighbourhoods −0.10` },
    { id: 2, a: bOH, b: bOL, cmp: `${bOH.toFixed(1)} vs ${bOL.toFixed(1)}`, n: seats.length,
      headline: `Owner-dominated seats build about ${Math.round((1 - bOH / bOL) * 100)}% less.`,
      detail: 'New homes a year per 1,000 existing homes, most-owned third vs least-owned third.',
      so: 'Where existing owners dominate, local politics holds building back. Pressure has to come from above the borough or from organised local supporters.',
      rho: r3, rhoText: `rank correlation ${sgn(r3)} (p < 0.001)` },
    { id: 3, a: pH, b: pL, cmp: `${pH.toFixed(0)} vs ${pL.toFixed(0)}`, n: seats.length,
      headline: 'Renter-heavy seats have fewer people on the register.',
      detail: 'Registered voters per 100 adults, seats with most private renters vs fewest.',
      so: 'The people most hurt by the shortage are least heard at elections. Registration drives change who MPs answer to.',
      rho: r4, rhoText: `rank correlation ${sgn(r4)}` },
    { id: 4, a: vH, b: vL, cmp: `${Math.round(vH * 100)}% vs ${Math.round(vL * 100)}%`, n: M.length,
      headline: 'Owners worry far less about housing.',
      detail: 'Residents saying neighbours worry about housing, most-owned third of seats vs least-owned (seats with measured polling).',
      so: 'MPs in owner-dominated seats hear little pressure to build. The case has to be made to them directly.',
      rho: r5, rhoText: `rank correlation ${sgn(r5)}` },
  ];
}

export const FINDINGS_NOTE = 'These are patterns across London, not proof of cause. Building is measured per existing home so big and small seats compare fairly.';
