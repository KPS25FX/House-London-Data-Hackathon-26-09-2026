import type { Msoa, Seat, SeatRow, Settings } from './types.js';
import { pctRank, tier } from './rank.js';
import { areaType } from './classify.js';
import { missingHomes } from './missing.js';
import { bpkOf, closeness, dPOf, swingOf } from './leverage.js';
import type { Series } from './trends.js';
import { latest, metricById } from './trends.js';

/** ALG-1..5. Pure: returns new seat objects; inputs are not mutated. */
export function compute(rows: SeatRow[], msoa: Msoa[], settings: Settings, series?: Series): Seat[] {
  const roughM = metricById(series, 'rough');
  const mP = pctRank(rows.map(r => r.wtbPer1k));
  const vP = pctRank(rows.map(r => r.V));
  const { bySeat } = missingHomes(rows, msoa, settings.total, settings.missingMode);
  const bpks = rows.map(r => bpkOf(r.homes, r.wtbGap));
  const bP = pctRank(bpks);

  const seats: Seat[] = rows.map((r, i) => {
    const Mp = mP(r.wtbPer1k), Vp = vP(r.V);
    const Mt = tier(Mp), Vt = tier(Vp);
    const m = bySeat.get(r.code) ?? { target: 0, gap: 0 };
    const swing = swingOf(Vp), close = closeness(r.marginPct);
    const bpk = bpks[i] ?? 0;
    return {
      ...r, tops: r.tops ? r.tops.map(t => ({ ...t })) : [],
      Mp, Vp, Mt, Vt, type: areaType(Mt, Vt),
      target: m.target, gap: m.gap,
      bpd: (r.homes / Math.max(r.dwellings || 1, 1)) * 1000,
      swing, close, dP: dPOf(close, swing, settings.wClose),
      prioRaw: 0, prio: 0, rank: 0, bpk, bpkP: bP(bpk),
      rough: latest(roughM, r.borough)?.v ?? null,
    };
  });
  const gmax = Math.max(...seats.map(s => s.gap));
  for (const s of seats) s.prioRaw = gmax > 0 ? (s.gap / gmax) * s.dP : 0;
  const pmax = Math.max(...seats.map(s => s.prioRaw));
  for (const s of seats) s.prio = pmax > 0 ? (100 * s.prioRaw) / pmax : 0;
  seats.slice().sort((a, b) => b.prio - a.prio).forEach((s, i) => { s.rank = i + 1; });
  return seats;
}
