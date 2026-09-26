import type { MissingMode, Msoa, SeatRow } from './types.js';

export interface MissingResult { target: number; gap: number }

/** Effective mode actually used ('msoa' falls back to 'seat' when there is no MSOA data). */
export const effectiveMissingMode = (msoa: Msoa[], mode: MissingMode): MissingMode =>
  (mode === 'msoa' && msoa.length > 0 ? 'msoa' : 'seat');

/**
 * ALG-3b.
 * 'seat' (prototype): target = T·raw/Σraw, gap = max(0, target − homes).
 * 'msoa' (taxonomy): target_i = T·raw_i/Σraw over all MSOAs, gap_s = Σ_{i∈s} max(0, target_i − built_i), target_s = Σ target_i.
 */
export function missingHomes(rows: SeatRow[], msoa: Msoa[], total: number, mode: MissingMode): { mode: MissingMode; bySeat: Map<string, MissingResult> } {
  const bySeat = new Map<string, MissingResult>();
  if (effectiveMissingMode(msoa, mode) === 'msoa') {
    const rawT = msoa.reduce((s, m) => s + (m.raw || 0), 0);
    for (const r of rows) bySeat.set(r.code, { target: 0, gap: 0 });
    for (const m of msoa) {
      const acc = bySeat.get(m.pcon);
      if (!acc) continue;
      const t = rawT > 0 ? (total * (m.raw || 0)) / rawT : 0;
      acc.target += t;
      acc.gap += Math.max(0, t - (m.built || 0));
    }
    return { mode: 'msoa', bySeat };
  }
  const rawT = rows.reduce((s, r) => s + (r.raw || 0), 0);
  for (const r of rows) {
    const target = rawT > 0 ? (total * (r.raw || 0)) / rawT : 0;
    bySeat.set(r.code, { target, gap: Math.max(0, target - r.homes) });
  }
  return { mode: 'seat', bySeat };
}
