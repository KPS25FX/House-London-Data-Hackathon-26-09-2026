// ALG-7 hypotheses, ported from the prototype hypotheses() with stable ids.
import type { Confidence, Ctx, Hypothesis, Seat } from './types.js';
import { HYP_TITLES, TYPES, isGreenBelt } from './content.js';
import { fmt, ordinal, pc1 } from './format.js';

const conf = (n: number): Confidence => (n >= 3 ? 'strong' : n === 2 ? 'moderate' : 'tentative');
const b = (x: boolean): number => (x ? 1 : 0);

export function hypotheses(r: Seat, ctx: Ctx): Hypothesis[] {
  const H: Hypothesis[] = [];
  const N = ctx.seats.length || 75;
  const bpk = (r.homes / Math.max(r.wtbGap, 1)) * 1000;
  const P = r.bpkP;
  const est = r.vEst ? ' (resident concern estimated)' : '';
  const margin = r.majority < 1000 ? fmt(r.majority) + ' votes' : r.marginPct.toFixed(1) + ' pts';

  if (r.owned >= 58 && P < 0.4) {
    const n = 1 + b(r.Vt === 0) + b(r.outright >= 30) - b(r.vEst);
    H.push({ id: 'homeowner', t: HYP_TITLES.homeowner, c: conf(n), s: 3 + n,
      p: 'A seat of mostly owners with little local concern about housing builds very little relative to the people trying to move in. The planning politics likely favour saying no.',
      ev: `${Math.round(r.owned)}% owner-occupied · ${Math.round(r.outright)}% owned outright · ${bpk.toFixed(1)} homes built per 1,000 unserved home-seekers · ${pc1(r.V)} concerned${est}`,
      test: 'Borough refusal rate and appeal outcomes; compare with similar-PTAL neighbourhoods that build more.',
      k: ['K12', 'K04', 'K06', 'K08'].concat(isGreenBelt(r.borough) ? ['K02'] : []) });
  }
  const Bd = ctx.boroughs[r.borough];
  const stuck = r.approvedNS + r.lapsed, built7 = Math.max(r.completed7 || 0, 1);
  if (stuck > 0.8 * built7 && stuck > 1000) {
    const n = 1 + b(r.lapsed > 300) + b(r.Mt >= 1);
    H.push({ id: 'stalled', t: HYP_TITLES.stalled, c: conf(n), s: 3 + n,
      p: 'Plenty has been approved here, but a large share is sitting unstarted or has lapsed. The bottleneck is delivery (viability, finance, building-safety gateways), not planning consent.',
      ev: `${fmt(r.approvedNS)} homes approved not started · ${fmt(r.lapsed)} lapsed · vs ${fmt(r.completed7)} completed since 2019`,
      test: 'Site-by-site: owner, reason stalled, whether the scheme qualifies for the 20% time-limited route or CIL relief.', k: ['K04', 'K05', 'K10'] });
  }
  if (Bd && Bd.apprRate != null && Bd.apprRate < 75 && r.refused > 300) {
    H.push({ id: 'council_no', t: HYP_TITLES.council_no, c: Bd.apprRate < 70 ? 'moderate' : 'tentative', s: 3,
      p: `${r.borough} approves a lower share of major housing schemes than most of London, and a meaningful number of homes here were refused. This is an approval problem, where call-in powers and the presumption bite.`,
      ev: `${r.borough} major residential approval rate since 2019: ${Math.round(Bd.apprRate)}% · ${fmt(r.refused)} homes refused here since 2019 · Delivery Test ${Math.round(Bd.hdt * 100)}% (${Bd.hdtCons})`,
      test: 'Refusal reasons and appeal success rates for refused schemes.', k: ['K04', 'K06'] });
  }
  if (r.bf > 3000 && r.gap > 150 && r.bf > 5 * r.gap) {
    H.push({ id: 'brownfield', t: HYP_TITLES.brownfield, c: 'moderate', s: 2,
      p: 'The brownfield register lists room for many more homes here than are being built. Directing effort to these sites avoids Green Belt fights.',
      ev: `brownfield capacity ${fmt(r.bf)} homes · missing ${fmt(r.gap)} a year`,
      test: 'Which sites lack permission, and who owns them (public land first).', k: ['K01', 'K04', 'K14'] });
  }
  if (r.regPer100 < 75 && r.privRent >= 30) {
    H.push({ id: 'cant_vote', t: HYP_TITLES.cant_vote, c: r.regPer100 < 72 ? 'strong' : 'moderate', s: 2 + b(r.marginPct < 10),
      p: 'Registered voters are well below the adult population, and private renters are a large share. The people most affected by shortages are the least represented at elections.',
      ev: `${r.regPer100.toFixed(0)} registered per 100 adults · ${Math.round(r.privRent)}% private renters · ${Math.round(r.movedIn)}% moved in within a year`,
      test: 'Ward-level register vs population; renter registration drive response rates.', k: ['K08', 'K12'] });
  }
  if (r.Mt === 2 && P < 0.4 && (r.hpg5 < 3 || r.owned < 50)) {
    const n = 1 + b(r.hpg5 < 0) + b(r.Vt >= 1);
    H.push({ id: 'high_demand_unbuilt', t: HYP_TITLES.high_demand_unbuilt, c: conf(n), s: 3 + n,
      p: 'Demand is high and residents are not especially opposed, yet completions are low and prices have stalled. That points to viability and delivery (costs, building-safety gateways, sales) more than planning refusals.',
      ev: `${fmt(r.wtbGap)} unserved home-seekers (${ordinal(Math.round(r.Mp * N))} of ${N} per resident) · 5-yr price change ${r.hpg5 > 0 ? '+' : ''}${r.hpg5}% · ${fmt(r.homes)} completions`,
      test: 'Datahub: homes approved but not started, and lapsed permissions, since 2019.', k: ['K05', 'K04', 'K07'] });
  }
  if (r.Vt === 2 && r.Mt >= 1 && P < 0.5) {
    H.push({ id: 'capacity', t: HYP_TITLES.capacity, c: r.vEst ? 'tentative' : 'moderate', s: 4,
      p: 'Residents already see housing as a problem and demand is there. Persuading the MP adds little. The ask is delivery: council capacity, stalled permissions, public land.',
      ev: `${pc1(r.V)} concerned${est} · demand ${ordinal(Math.round(r.Mp * N))} of ${N} · delivery ${ordinal(Math.round((1 - P) * N))} lowest of ${N}`,
      test: 'Datahub pipeline: permissions outstanding vs completions; council land holdings.', k: ['K04', 'K06', 'K13'] });
  }
  if (P > 0.8) {
    H.push({ id: 'concentrated', t: HYP_TITLES.concentrated, c: r.Mt === 0 ? 'strong' : 'moderate', s: 3,
      p: 'This seat builds far more per unserved home-seeker than most of London. That helps the headline numbers but can strain local infrastructure, while higher-demand areas elsewhere build little.',
      ev: `${bpk.toFixed(0)} homes built per 1,000 unserved home-seekers (top fifth of London)`,
      test: 'Infrastructure capacity (schools, GP, transport) and absorption rates of recent schemes.', k: ['K07', 'K10', 'K02', 'K12'] });
  }
  if (r.Mt === 0 && r.Vt === 2) {
    H.push({ id: 'local_afford', t: HYP_TITLES.local_afford, c: r.vEst ? 'tentative' : 'moderate', s: 3,
      p: 'Residents are worried but few outsiders are competing for homes here. Market-rate permissions are unlikely to help; subsidised social rent and bringing empty homes back into use are.',
      ev: `${pc1(r.V)} concerned${est} · demand ${ordinal(Math.round(r.Mp * N))} of ${N} · social rent ${Math.round(r.social)}%`,
      test: 'Housing register length and temporary accommodation numbers for the borough.', k: ['K04', 'K11', 'K01'] });
  }
  if (r.social >= 33 && r.Vt >= 1) {
    H.push({ id: 'social', t: HYP_TITLES.social, c: r.vEst ? 'tentative' : 'moderate', s: 3,
      p: 'A large social-rented population with real concern about housing. The most direct levers are grant-funded social rent and estate regeneration or infill with resident consent, not market-rate permissions alone.',
      ev: `${Math.round(r.social)}% social rent · ${pc1(r.V)} concerned${est} · ${fmt(r.homes)} completions`,
      test: 'Borough housing register and temporary accommodation; estate regeneration pipeline in Datahub.', k: ['K04', 'K01', 'K13'] });
  }
  if (r.privRent >= 30 && r.marginPct < 15 && !(r.regPer100 < 75)) {
    H.push({ id: 'renters_decide', t: HYP_TITLES.renters_decide, c: r.marginPct < 5 ? 'strong' : 'moderate', s: 2 + b(r.marginPct < 5),
      p: "Private renters are a large share here and are far less likely to be on the register than owners. The winning margin is small enough that registering them could change the MP's calculation.",
      ev: `${Math.round(r.privRent)}% private renters · 2024 margin ${margin} · registration 65% renters vs 95% outright owners (GB)`,
      test: 'Borough electoral register vs mid-year adult population.', k: ['K08', 'K09'] });
  }
  if (r.marginPct < 5 && !H.some(h => h.id === 'renters_decide')) {
    H.push({ id: 'exposed', t: HYP_TITLES.exposed, c: 'strong', s: 2,
      p: 'With a margin this small, visible pro-housing constituents matter more here than almost anywhere in London.',
      ev: `2024 margin ${margin} (${r.won} over ${r.second})`, test: 'Current polling for the seat.', k: ['K09'] });
  }
  if (isGreenBelt(r.borough) && r.Mt >= 1) {
    H.push({ id: 'green_belt', t: HYP_TITLES.green_belt, c: 'tentative', s: 1,
      p: `${r.borough} contains Green Belt land. The draft London Plan would allow release within about 15 minutes' walk of well-connected stations, which is where demand here should be tested first.`,
      ev: `demand ${ordinal(Math.round(r.Mp * N))} of ${N} · ${r.borough}`,
      test: 'Map Green Belt parcels within 1,200m of stations against WhereToBuild neighbourhoods.', k: ['K02'] });
  }
  if (!H.length) {
    H.push({ id: 'none', t: HYP_TITLES.none, c: 'tentative', s: 0, p: 'This seat sits near the London middle on demand, concern and delivery.',
      ev: `${TYPES[r.type].label}`, test: 'Check the full polling extract when it arrives.', k: ['K12', 'K14'] });
  }
  return H.sort((a, c) => c.s - a.s);
}
