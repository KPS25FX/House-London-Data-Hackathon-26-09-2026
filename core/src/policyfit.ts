// Policy check (v2 prototype POLICY_BASE / FITL / RISKL / EVL / defaultPol / drawPolicy scoring). Pure.
// Text is copied verbatim from the prototype; fit/risk scorers are kept separate (FIT_RISK) so PolicyBase stays JSON.
import type { BlockerCat, Ctx, Seat } from './types.js';
import type { LeverId, Scenario, ScenSeat } from './scenario.js';
import { LEVERS, medianBpd } from './scenario.js';
import type { Series } from './trends.js';
import { first, growth, latest, metricById } from './trends.js';
import { blockCat } from './blockers.js';
import { fmt, ordinal } from './format.js';

export type PolicyId = 'stalled' | 'lift' | 'brownfield' | 'estate' | 'transport' | 'homeless' | 'register';
export type EvidenceLevel = 'strong' | 'mod' | 'weak' | 'none';
export type Tone = 'good' | 'mid' | 'mid2' | 'bad';

export interface PolicyBase {
  id: PolicyId; name: string; lever: LeverId | null; lvl: EvidenceLevel; strength: string; delivered: string;
  who: string; track: string[]; cards: string[]; guard: string[];
}

export const EV_LVL: Record<EvidenceLevel, string> = { strong: 'Strong evidence', mod: 'Moderate evidence', weak: 'Weak or process evidence', none: 'Untested' };

export const POLICY_BASE: PolicyBase[] = [
  { id: 'stalled', name: 'Build out stalled permissions', lever: 'stalled', lvl: 'weak', strength: 'Process evaluations only',
    delivered: 'No counterfactual study of stalled-site funds. Evaluated programmes show delivery capacity and realistic timescales decide results.',
    who: 'Mayor/GLA, council, developers', track: ['affcomp', 'rent'], cards: ['K64', 'K66', 'K67'],
    guard: ['Target schemes stalled two years or more; use the 20% fast-track route and temporary CIL relief [K04]', 'Fund council delivery officers alongside capital; staff shortages held back the Towns Fund [K64]', 'Set 12-month build milestones and publish progress; 12–18 month deadlines slipped in retrofit programmes [K66]'] },
  { id: 'lift', name: 'Raise building where it lags (targets, planning pressure)', lever: 'lift', lvl: 'none', strength: 'Not evaluated in the evidence base',
    delivered: 'No evaluation covers housebuilding targets or planning pressure [K69]. The seat data shows owner-dominated seats build about 55% less.',
    who: 'GLA (London Plan targets), council, MP', track: ['afford', 'outright'], cards: ['K69', 'K64'],
    guard: ['Consult early and visibly; perceived lack of consultation held back Towns Fund outcomes [K64]', 'Where the borough fails the Housing Delivery Test, use the presumption in favour of development', 'Publish yearly completions against the target so progress is checked, since the policy is untested [K69]'] },
  { id: 'brownfield', name: 'Release brownfield land', lever: 'bf', lvl: 'weak', strength: 'Indirect: price effects from regeneration reviews',
    delivered: 'Nearby development raises property values (estate renewal 7 of 9 studies); no study measured what happened to renters.',
    who: 'Council (Local Plan), GLA; public landowners first', track: ['rent', 'afford'], cards: ['K60', 'K65', 'K01'],
    guard: ['Apply the 35% affordable fast-track route, 50% on public land [K01]', 'Start with publicly owned sites where affordable share is easiest to secure', 'Track local rents and moves out of the area for five years; no evaluation has [K67]'] },
  { id: 'estate', name: 'Estate renewal and infill', lever: null, lvl: 'mod', strength: 'SMS 3–4, 21 studies, none randomised',
    delivered: 'Reliably raised property prices and rents; little measured effect on jobs, health or crime; only 1 of 4 studies found better housing quality.',
    who: 'Council, housing associations, GLA', track: ['socrent', 'council'], cards: ['K60', 'K67'],
    guard: ['Resident ballot where homes are demolished, with a written right to return', 'Replace social rent homes like for like before counting net gain', 'Follow original residents for five years; no evaluation has done this [K60]'] },
  { id: 'transport', name: 'Transport-led growth', lever: null, lvl: 'weak', strength: 'Summary of reviews; thin evidence on rail and bus',
    delivered: 'Transport has the best evidence for economic gains, and raises nearby property prices. Owners gain; renters may lose.',
    who: 'TfL, GLA, government', track: ['price', 'rent'], cards: ['K65'],
    guard: ['Lock in affordable housing before land values rise around new stations', 'Pair schemes with skills and jobs support so existing residents benefit [K65]', 'Monitor rents near new stops'] },
  { id: 'homeless', name: 'Housing First and Navigator casework', lever: null, lvl: 'strong', strength: 'GRADE high for housing stability',
    delivered: 'High-certainty gains in housing stability for high-needs homeless adults; the London SIB beat its sustained-accommodation targets.',
    who: 'GLA, borough, specialist providers', track: ['rough'], cards: ['K63', 'K62'],
    guard: ['Target people with high needs; alternatives are better value for lower needs [K63]', 'Fund for at least three years; the SIB found three years too short for the most complex needs [K62]', 'Budget for ongoing costs: Housing First is not cost-saving [K63]'] },
  { id: 'register', name: 'Register private renters', lever: 'reg', lvl: 'none', strength: 'Not evaluated for housing outcomes',
    delivered: 'No evaluation links registration to housebuilding. Across evaluations, engaging residents drove success and satisfaction [K67].',
    who: 'Council electoral services, campaigners', track: ['privrent'], cards: ['K67'],
    guard: ['Target recent movers at tenancy start (letting agents, deposit schemes)', 'Time drives for the annual canvass and before elections', 'Measure register growth by ward to check it worked'] },
];

export const clamp01 = (x: number): number => Math.max(0, Math.min(1, isFinite(x) ? x : 0));

/** FITL: >= .66 strong, >= .33 moderate, else weak. */
export function fitLabel(s: number): { label: string; tone: 'good' | 'mid' | 'bad' } {
  return s >= 0.66 ? { label: 'Strong fit', tone: 'good' } : s >= 0.33 ? { label: 'Moderate fit', tone: 'mid' } : { label: 'Weak fit', tone: 'bad' };
}
/** RISKL: >= .6 high, >= .3 medium, else low. */
export function riskLabel(s: number): { label: string; tone: 'good' | 'mid' | 'bad' } {
  return s >= 0.6 ? { label: 'High risk', tone: 'bad' } : s >= 0.3 ? { label: 'Medium risk', tone: 'mid' } : { label: 'Low risk', tone: 'good' };
}
/** EVL. */
export function evidenceLabel(l: EvidenceLevel): { label: string; tone: Tone } {
  return ({ strong: { label: 'Strong evidence', tone: 'good' }, mod: { label: 'Moderate evidence', tone: 'mid' }, weak: { label: 'Weak evidence', tone: 'mid2' }, none: { label: 'Untested', tone: 'bad' } } as const)[l];
}

type AnySeat = Seat | ScenSeat;
interface FitEnv { seats: Seat[]; series?: Series; rough: number | null }
type Scorer = (r: AnySeat, e: FitEnv) => { s: number; why: string };

const FIT_RISK: Record<PolicyId, { fit: Scorer; risk: Scorer }> = {
  stalled: {
    fit: r => ({ s: clamp01((r.approvedNS || 0) / (Math.max(r.homes, 1) * 3)), why: `${fmt(r.approvedNS)} homes approved but not started: ${((r.approvedNS || 0) / Math.max(r.homes, 1)).toFixed(1)} years of current building` }),
    risk: r => r.hpg5 < 0
      ? { s: 0.65, why: `Prices down ${Math.abs(r.hpg5).toFixed(0)}% over five years, so schemes may stay unviable without relief` }
      : { s: 0.25, why: `Prices ${r.hpg5 >= 0 ? 'up' : 'down'} ${Math.abs(r.hpg5).toFixed(0)}% over five years; viability risk is moderate` },
  },
  lift: {
    fit: (r, e) => { const m = medianBpd(e.seats); return { s: clamp01(0.5 * clamp01((m - r.bpd) / m) + 0.5 * r.Mp), why: `Builds ${r.bpd.toFixed(1)} a year per 1,000 homes vs London median ${m.toFixed(1)}; outside demand ranks ${ordinal(Math.round(r.Mp * 75))} of 75` }; },
    risk: r => ({ s: clamp01((r.owned - 30) / 40), why: `${Math.round(r.owned)}% of homes owner-occupied: expect organised local opposition${r.owned >= 58 ? ', strongly' : ''}` }),
  },
  brownfield: {
    fit: r => ({ s: clamp01((r.bf || 0) / (Math.max(r.gap, 50) * 10)), why: `Brownfield register room for ${fmt(r.bf)} homes: ${r.gap > 0 ? ((r.bf || 0) / r.gap).toFixed(1) + " years of this seat's shortfall" : 'seat already meets its share'}` }),
    risk: (r, e) => {
      const m = metricById(e.series, 'rent'), g = growth(m, r.borough), f = first(m, r.borough);
      return { s: clamp01(0.6 * r.privRent / 45 + 0.4 * clamp01((g ?? 20) / 50)), why: `${Math.round(r.privRent)}% private renters${g != null && f ? `; ${r.borough} rents ${g >= 0 ? '+' : ''}${g.toFixed(0)}% since ${f.year}` : ''}: displacement risk if values rise` };
    },
  },
  estate: {
    fit: r => ({ s: clamp01((r.social - 15) / 30), why: `${Math.round(r.social)}% social renters (London median 20%)` }),
    risk: r => ({ s: clamp01(0.5 + 0.5 * r.privRent / 45), why: `Existing residents were never tracked in evaluations; ${fmt(r.households * r.social / 100)} social-rent households here` }),
  },
  transport: {
    fit: (r, e) => { const lo = e.seats.filter(x => x.ptal < r.ptal).length / 74; return { s: clamp01((1 - lo) * 0.5 + r.Mp * 0.5), why: `Transport access ranks ${ordinal(Math.round((1 - lo) * 74) + 1)} lowest of 75; outside demand ${ordinal(Math.round(r.Mp * 75))} of 75` }; },
    risk: r => ({ s: clamp01(r.privRent / 45), why: `${Math.round(r.privRent)}% private renters exposed to rising rents` }),
  },
  homeless: {
    fit: (r, e) => ({ s: clamp01((e.rough || 0) / 300), why: e.rough != null ? `${fmt(e.rough)} people seen rough sleeping in ${r.borough} last quarter` : 'No rough sleeping figure for this borough' }),
    risk: () => ({ s: 0.35, why: 'Low delivery risk; the main risk is cost, since it does not pay for itself' }),
  },
  register: {
    fit: r => ({ s: clamp01(0.5 * r.privRent / 45 + 0.5 * (r.marginPct < 15 ? 1 - r.marginPct / 15 : 0)), why: `${Math.round(r.privRent)}% private renters, ${r.regPer100.toFixed(0)} registered per 100 adults, 2024 margin ${r.marginPct.toFixed(1)} pts` }),
    risk: () => ({ s: 0.1, why: 'Low risk; the effect on what gets built is untested' }),
  },
};

export interface PolicyRating {
  policy: PolicyBase;
  fit: number; risk: number;
  score: number;           // fit * (1 - 0.5 * risk): the prototype's seat-matrix sort key
  label: string; tone: string;             // fitLabel(fit)
  riskLabel: string; riskTone: string;     // riskLabel(risk)
  evidence: string; evidenceTone: string;  // evidenceLabel(policy.lvl)
  verdict: string; verdictTone: 'good' | 'mid' | 'bad';
  reasons: string[];       // "Why it fits here"
  risks: string[];         // "What could go wrong here"
  scenarioHomes: number | null; // extra homes/yr from this policy's lever in the scenario (null when lever off / no adds)
}

const envFor = (r: AnySeat, ctx: Ctx, series?: Series): FitEnv => {
  const rr = (r as Seat & { rough?: number | null }).rough;
  return { seats: ctx.seats, series, rough: rr !== undefined ? rr : (latest(metricById(series, 'rough'), r.borough)?.v ?? null) };
};

function rateOne(P: PolicyBase, r: AnySeat, env: FitEnv, scen: Scenario): PolicyRating {
  const fr = FIT_RISK[P.id], f = fr.fit(r, env), k = fr.risk(r, env);
  const F = fitLabel(f.s), K = riskLabel(k.s), E = evidenceLabel(P.lvl);
  const verdict = f.s >= 0.33 && k.s < 0.6 ? (P.lvl === 'none' ? 'Worth piloting with monitoring' : 'Worth pursuing with the guardrails below')
    : f.s >= 0.33 ? 'Pursue only with strong guardrails' : 'Low priority here';
  const verdictTone = f.s >= 0.33 && k.s < 0.6 ? 'good' : f.s >= 0.33 ? 'mid' : 'bad';
  const sr = r as Partial<ScenSeat>;
  const scenarioHomes = P.lever && (scen[P.lever] ?? 0) > 0 && (sr.add ?? 0) > 0
    ? (P.lever === 'stalled' ? sr.addS ?? 0 : P.lever === 'lift' ? sr.addL ?? 0 : P.lever === 'bf' ? sr.addB ?? 0 : 0) : null;
  return {
    policy: P, fit: f.s, risk: k.s, score: f.s * (1 - 0.5 * k.s),
    label: F.label, tone: F.tone, riskLabel: K.label, riskTone: K.tone, evidence: E.label, evidenceTone: E.tone,
    verdict, verdictTone, reasons: [f.why], risks: [k.why], scenarioHomes,
  };
}

/** Every policy rated for one seat, sorted by score desc (prototype pcmatrix). `series` supplies rent growth and rough sleeping. */
export function rateSeat(seat: ScenSeat | Seat, ctx: Ctx, scen: Scenario, series?: Series): PolicyRating[] {
  const env = envFor(seat, ctx, series);
  return POLICY_BASE.map(P => rateOne(P, seat, env, scen)).sort((a, b) => b.score - a.score);
}

/** One policy rated for one seat (prototype pcverdict). */
export function ratePolicy(policyId: PolicyId, seat: ScenSeat | Seat, ctx: Ctx, scen: Scenario, series?: Series): PolicyRating {
  const P = POLICY_BASE.find(p => p.id === policyId) ?? POLICY_BASE[0]!;
  return rateOne(P, seat, envFor(seat, ctx, series), scen);
}

/**
 * "Where this policy would do most" (prototype pcbest): score = fit * (1 - 0.5*risk) * (need ? 1 : 0.25 + 0.75*gap/maxGap),
 * need = homeless | register. Top n (default 8).
 */
export function bestPlaces(policyId: PolicyId, ctx: Ctx, series?: Series, n = 8): { seat: Seat; fit: number; risk: number; score: number }[] {
  const P = POLICY_BASE.find(p => p.id === policyId) ?? POLICY_BASE[0]!;
  const fr = FIT_RISK[P.id];
  const gmx = Math.max(...ctx.seats.map(x => x.gap), 1), need = P.id === 'homeless' || P.id === 'register';
  return ctx.seats.map(x => {
    const env = envFor(x, ctx, series), f = fr.fit(x, env).s, k = fr.risk(x, env).s;
    return { seat: x, fit: f, risk: k, score: f * (1 - 0.5 * k) * (need ? 1 : 0.25 + 0.75 * x.gap / gmx) };
  }).sort((a, b) => b.score - a.score).slice(0, n);
}

export const LEVER_POLICY: Record<LeverId, PolicyId> = { stalled: 'stalled', lift: 'lift', bf: 'brownfield', reg: 'register' };
const BLOCK_POLICY: Record<BlockerCat, PolicyId> = { politics: 'lift', stalled: 'stalled', capacity: 'stalled', land: 'brownfield', afford: 'estate', voice: 'register', concentrated: 'transport', none: 'stalled' };

/** defaultPol: first active scenario lever's policy, else by the seat's blocker category. `ctx` is needed for blockCat. */
export function defaultPolicy(seat: Seat, scen: Scenario, ctx?: Ctx): PolicyId {
  const on = LEVERS.filter(l => (scen[l.id] ?? 0) > 0);
  if (on.length) return LEVER_POLICY[on[0]!.id];
  if (!ctx) return 'stalled';
  return BLOCK_POLICY[blockCat(seat, ctx)] ?? 'stalled';
}
