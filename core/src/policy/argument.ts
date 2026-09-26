// Structured policy argument: premises -> diagnosis -> options -> asks. [New]
import type { Claim, Ctx, HypId, Hypothesis, Option, Policy, PolicyArgument, PolicyEffect, Seat } from '../types.js';
import { FIX, HOLDERS, HYP_BLOCK, HYP_TITLES, RISK, TYPES } from '../content.js';
import { hypotheses } from '../hypotheses.js';
import { fmt, pc1 } from '../format.js';

type PremiseKey = 'build' | 'demand' | 'concern' | 'delivery' | 'tenure' | 'pipeline' | 'vote' | 'margin' | 'land' | 'borough' | 'type';

/** Which premises each hypothesis rests on. */
const HYP_PREMISES: Record<HypId, PremiseKey[]> = {
  homeowner: ['tenure', 'delivery', 'concern'],
  stalled: ['pipeline'],
  council_no: ['borough', 'pipeline'],
  brownfield: ['land', 'build'],
  cant_vote: ['vote', 'tenure'],
  high_demand_unbuilt: ['demand', 'delivery', 'build'],
  capacity: ['concern', 'demand', 'delivery'],
  concentrated: ['delivery', 'demand'],
  local_afford: ['concern', 'demand', 'tenure'],
  social: ['tenure', 'concern'],
  renters_decide: ['tenure', 'margin', 'vote'],
  exposed: ['margin'],
  green_belt: ['demand', 'type'],
  none: ['type'],
};

const HYP_IDS = new Set<string>(Object.keys(HYP_TITLES));
const firstSentence = (s: string): string => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

function premiseTexts(s: Seat, ctx: Ctx): [PremiseKey, string][] {
  const N = ctx.seats.length || 75;
  const B = ctx.boroughs[s.borough];
  const out: [PremiseKey, string][] = [
    ['build', `${s.name} completes about ${fmt(s.homes)} homes a year (${s.bpd.toFixed(1)} per 1,000 existing homes); the model says it should be nearer ${fmt(s.target)}, a gap of ${fmt(s.gap)} a year at a London total of ${fmt(ctx.settings.total)}.`],
    ['demand', `${fmt(s.wtbGap)} unserved home-seekers (${s.wtbPer1k} per 1,000 residents), ranking ${Math.round(s.Mp * N)} of ${N} on outside demand.`],
    ['concern', `${pc1(s.V)} of residents say neighbours worry about housing${s.vEst ? ' (estimated, not measured)' : ''}, ranking ${Math.round(s.Vp * N)} of ${N}.`],
    ['delivery', `${(s.bpk * 1000).toFixed(1)} homes built per 1,000 unserved home-seekers (percentile ${Math.round(s.bpkP * 100)} of London seats).`],
    ['tenure', `${Math.round(s.owned)}% owner-occupied (${Math.round(s.outright)}% outright), ${Math.round(s.privRent)}% private renters, ${Math.round(s.social)}% social renters.`],
    ['pipeline', `Since 2019: ${fmt(s.approvedNS)} homes approved not started, ${fmt(s.lapsed)} lapsed, ${fmt(s.refused)} refused, against ${fmt(s.completed7)} completed.`],
    ['vote', `${s.regPer100.toFixed(0)} registered voters per 100 adults; ${Math.round(s.movedIn)}% moved in within a year.`],
    ['margin', `${s.won} won in 2024 over ${s.second} by ${fmt(s.majority)} votes (${s.marginPct.toFixed(1)} pts).`],
    ['land', `Brownfield register capacity of ${fmt(s.bf)} homes; mean PTAL access index ${s.ptal}.`],
    ['type', `Area type: ${TYPES[s.type].label} (${TYPES[s.type].who}).`],
  ];
  if (B) out.push(['borough', `${s.borough}: major residential approval rate ${B.apprRate == null ? 'unknown' : Math.round(B.apprRate) + '%'}; Housing Delivery Test ${Math.round(B.hdt * 100)}% (${B.hdtCons}).`]);
  return out;
}

function matchingEvaluations(h: Hypothesis, policies: Policy[]): Policy[] {
  const cat = HYP_BLOCK[h.id];
  return policies.filter(p => p.kind === 'evaluation' &&
    (p.lever === h.id || p.tags.includes(h.id) || (cat !== 'none' && (p.lever === cat || p.tags.includes(cat)))));
}

function unionEffects(ps: Policy[]): PolicyEffect[] {
  const seen = new Set<string>();
  const out: PolicyEffect[] = [];
  for (const p of ps) for (const e of p.effects ?? []) {
    const k = `${e.outcome}|${e.direction}|${e.certainty}|${e.who ?? ''}`;
    if (!seen.has(k)) { seen.add(k); out.push({ ...e }); }
  }
  return out;
}

export function buildArgument(s: Seat, ctx: Ctx, H: Hypothesis[] = hypotheses(s, ctx)): PolicyArgument {
  const pt = premiseTexts(s, ctx);
  const premises: Claim[] = pt.map(([, text], i) => ({ id: `P${i + 1}`, kind: 'premise', text, support: [] }));
  const pid = new Map<PremiseKey, string>(pt.map(([k], i) => [k, `P${i + 1}`]));
  const policyIds = new Set(ctx.policies.map(p => p.id));

  const diagnosed = H.filter(h => h.id !== 'none');
  const diagnosis: Claim[] = diagnosed.map((h, i) => {
    const prem = HYP_PREMISES[h.id].map(k => pid.get(k)).filter((x): x is string => !!x);
    return { id: `D${i + 1}`, kind: 'diagnosis', text: `${h.t}. ${h.p} Evidence: ${h.ev}.`, support: [...prem, h.id], confidence: h.c };
  });

  const options: Option[] = diagnosed.map((h, i) => {
    const evals = matchingEvaluations(h, ctx.policies);
    const ids = [...new Set([...h.k.filter(k => policyIds.has(k)), ...evals.map(p => p.id)])];
    const holder = [...new Set([...HOLDERS[h.id], ...evals.flatMap(p => p.holder ?? [])])];
    return { id: `O${i + 1}`, lever: FIX[h.id][0], holder, policyIds: ids, expectedEffects: unionEffects(evals), risk: RISK[h.id], addresses: [h.id] };
  });

  const dataGaps: string[] = [];
  if (s.vEst) dataGaps.push('Resident concern is estimated from a regression on measured seats, not polled here.');
  const fellBack = ctx.settings.missingMode === 'msoa' && ctx.meta.missingMode === 'msoa_fallback';
  if (ctx.settings.missingMode === 'seat' || fellBack) dataGaps.push(fellBack
    ? 'Missing homes use the seat-level fallback: neighbourhood data was unavailable, so overbuilding areas offset underbuilding ones [K14].'
    : 'Missing homes are computed at seat level, so overbuilding neighbourhoods offset underbuilding ones [K14].');
  dataGaps.push(`The missing-homes figure depends on the chosen London total (${fmt(ctx.settings.total)} a year) and the model in [K14].`);
  dataGaps.push('Completions are Planning London Datahub records, which miss some homes in a few boroughs [K10].');
  if (!ctx.boroughs[s.borough]) dataGaps.push(`No borough record for ${s.borough}.`);
  if (options.length && options.every(o => o.expectedEffects.length === 0)) dataGaps.push('No evaluated evidence of effect is available for the options here.');
  if (!diagnosed.length) dataGaps.push('No hypothesis fired; the full polling extract may reveal a blocker.');

  const first = options[0];
  return {
    seat: s.code, premises, diagnosis, options,
    asks: { mp: TYPES[s.type].ask, council: first ? firstSentence(first.lever) : FIX.none[0] },
    dataGaps,
  };
}

/** Returns a list of well-formedness violations (empty when well formed). */
export function checkWellFormed(arg: PolicyArgument, policies: Policy[]): string[] {
  const v: string[] = [];
  const premiseIds = new Set(arg.premises.map(p => p.id));
  const diagnosedHyps = new Set<string>();
  for (const d of arg.diagnosis) {
    for (const x of d.support) {
      if (HYP_IDS.has(x)) diagnosedHyps.add(x);
      else if (!premiseIds.has(x)) v.push(`${d.id}: support ${x} is not a premise id`);
    }
    if (!d.support.some(x => premiseIds.has(x))) v.push(`${d.id}: no premise support`);
  }
  const allPolicy = new Set(policies.map(p => p.id));
  for (const o of arg.options) {
    if (!o.addresses.length) v.push(`${o.id}: addresses no hypothesis`);
    for (const h of o.addresses) if (!diagnosedHyps.has(h)) v.push(`${o.id}: addresses undiagnosed ${h}`);
    for (const p of o.policyIds) if (!allPolicy.has(p)) v.push(`${o.id}: unknown policy ${p}`);
  }
  if (!arg.asks.mp || !arg.asks.council) v.push('asks: missing mp or council ask');
  return v;
}
