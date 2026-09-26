// Scenario builder (v2 prototype LEV / PRESETS / computeScen / scenRes). Pure.
import type { Seat } from './types.js';

export type LeverId = 'stalled' | 'lift' | 'bf' | 'reg';
/** Lever settings in percent (0..Lever.max). */
export type Scenario = Record<LeverId, number>;
export interface Lever { id: LeverId; label: string; max: number; step: number; desc: string }

export const LEVERS: Lever[] = [
  { id: 'stalled', label: 'Build out stalled permissions', desc: 'Share of homes approved since 2019 but not yet started that get built, spread over five years.', max: 100, step: 5 },
  { id: 'lift', label: 'Lift low-building seats toward the London median', desc: 'Share of the gap to the median build rate (homes a year per 1,000 existing) closed in seats below it.', max: 100, step: 5 },
  { id: 'bf', label: 'Develop registered brownfield land', desc: 'Share of brownfield-register capacity delivered, spread over ten years.', max: 50, step: 5 },
  { id: 'reg', label: 'Register private renters', desc: 'Share of unregistered renter adults added to the register. Changes MP leverage, not supply. Assumes half are eligible and 60% of new registrants vote.', max: 100, step: 5 },
];

export const PRESETS: [string, Scenario][] = [
  ['Unlock the pipeline', { stalled: 60, lift: 0, bf: 0, reg: 0 }],
  ['Match the London median', { stalled: 0, lift: 50, bf: 0, reg: 0 }],
  ['Brownfield first', { stalled: 0, lift: 0, bf: 20, reg: 0 }],
  ["Renters' voice", { stalled: 0, lift: 0, bf: 0, reg: 50 }],
  ['All levers', { stalled: 50, lift: 40, bf: 15, reg: 50 }],
];

export const ZERO_SCENARIO: Scenario = Object.freeze({ stalled: 0, lift: 0, bf: 0, reg: 0 }) as Scenario;

export const isScenarioOn = (scen: Scenario): boolean => Object.values(scen).some(v => v > 0);

export interface ScenSeat extends Seat {
  addS: number;  // extra homes/yr from stalled permissions
  addL: number;  // extra homes/yr from lifting toward the median build rate
  addB: number;  // extra homes/yr from brownfield register capacity
  add: number;   // addS + addL + addB
  gapS: number;  // missing homes/yr after the scenario
  bloc: number;  // new renter voters from registration
  flip: boolean; // bloc >= 2024 majority
}

/** Median of seat build rates (homes/yr per 1,000 dwellings), as the prototype medBpd: sorted[floor(n/2)]. */
export function medianBpd(seats: Pick<Seat, 'bpd'>[]): number {
  const a = seats.map(s => s.bpd).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)]! : 0;
}

/**
 * Prototype computeScen. One deviation: gapS = max(0, gap - add) instead of max(0, target - homes - add), so it
 * follows whichever missing-homes mode produced `gap` (identical in 'seat' mode; in 'msoa' mode zero levers give gapS == gap).
 */
export function computeScenario(seats: Seat[], scen: Scenario): ScenSeat[] {
  const S = { ...ZERO_SCENARIO, ...scen };
  const med = medianBpd(seats);
  return seats.map(r => {
    const addS = (r.approvedNS || 0) * S.stalled / 100 / 5;
    const addL = Math.max(0, med - r.bpd) * (r.dwellings || 0) / 1000 * S.lift / 100;
    const addB = (r.bf || 0) * S.bf / 100 / 10;
    const add = addS + addL + addB;
    const gapS = Math.max(0, r.gap - add);
    const unreg = Math.max(0, (r.adults || 0) * (1 - Math.min(100, r.regPer100) / 100)) * (r.privRent || 0) / 100;
    const bloc = unreg * 0.5 * 0.6 * S.reg / 100;
    const flip = S.reg > 0 && r.majority != null && bloc >= r.majority;
    return { ...r, addS, addL, addB, add, gapS, bloc, flip };
  });
}

export interface ScenarioSummary {
  missing0: number; missing: number; added: number; addS: number; addL: number; addB: number;
  meet0: number; meet: number; flips: ScenSeat[];
}

/** Totals shown in the prototype drawSim KPIs / scenRes (unrounded; round for display). */
export function scenarioSummary(base: Seat[], s: ScenSeat[]): ScenarioSummary {
  const sum = <T>(a: T[], f: (x: T) => number) => a.reduce((t, x) => t + f(x), 0);
  return {
    missing0: sum(base, r => r.gap), missing: sum(s, r => r.gapS),
    added: sum(s, r => r.add), addS: sum(s, r => r.addS), addL: sum(s, r => r.addL), addB: sum(s, r => r.addB),
    meet0: base.filter(r => r.gap < 1).length, meet: s.filter(r => r.gapS < 1).length,
    flips: s.filter(r => r.flip),
  };
}
