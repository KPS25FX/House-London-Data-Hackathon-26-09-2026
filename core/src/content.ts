// Fixed copy, ported verbatim from reference/prototype/template.html.
import type { AreaType, BlockerCat, Confidence, HypId } from './types.js';

export const BIV: string[][] = [ // [voterTier][marketTier] (Stevens 3x3)
  ['#e4e8ec', '#b5c0da', '#6c83b5'],
  ['#b8d6be', '#90b2b3', '#567994'],
  ['#73ae80', '#5a9178', '#2a5a5b']];

export interface TypeInfo { label: string; color: string; who: string; ask: string; logic: string }
export const TYPES: Record<AreaType, TypeInfo> = {
  locked: { label: 'Locked out', color: '#6c83b5', who: 'High outside demand · residents unbothered',
    ask: "The pressure has to come from outside the seat. Ask the MP to back the borough hitting its housing target in public, support the Mayor's call-in and appeal routes on refused schemes, and push voter registration among renters and recent arrivals.",
    logic: "Developers would build, but the MP's own voters don't reward it. A local campaign alone can't flip the MP's calculation, so it changes who counts: register the people being priced out, and use decision-makers above the borough." },
  ready: { label: 'Ready to build', color: '#2a5a5b', who: 'High outside demand · residents want homes',
    ask: 'Politics is already on side. Ask the MP to press the council on delivery: planning officer capacity, stalled permissions, council-owned land.',
    logic: "Both the market and the MP's voters want homes, so persuasion adds little. The gap is capacity. Hold the MP to delivery rather than spending effort changing minds." },
  worried: { label: 'Worried, no market', color: '#73ae80', who: 'Low outside demand · residents anxious',
    ask: "More permissions won't get homes built here. Ask the MP to back public money: Affordable Homes Programme bids, council-led and social-rent schemes.",
    logic: "The voters want homes but prices don't cover the cost of building. This is a funding problem, not a planning one." },
  settled: { label: 'Settled', color: '#e4e8ec', who: 'Low outside demand · residents unbothered',
    ask: 'Low priority for a housing campaign. Watch for new transport links that could raise demand.',
    logic: 'Neither the market nor the voters are pushing. Campaign effort does more elsewhere.' },
  middle: { label: 'Middle ground', color: '#90b2b3', who: 'Moderate on at least one side',
    ask: 'This is a persuasion seat. Local evidence of who is being priced out, such as teachers, nurses and grown-up children, moves the MP most.',
    logic: 'The MP is closest to indifferent here. Small shifts in visible voter pressure can tip the balance, which makes these seats worth the most per hour of campaigning.' },
};

export const PARTY: Record<string, string> = { 'Labour': 'Lab', 'Labour/Co-operative': 'Lab Co-op', 'Conservative': 'Con', 'Liberal Democrat': 'Lib Dem', 'Reform UK': 'Reform', 'Independent': 'Ind' };

export const LAYERS = [
  { id: 'type', label: 'Area type' },
  { id: 'gap', label: 'Missing homes' },
  { id: 'prio', label: 'Where to campaign' },
  { id: 'M', label: 'Outside demand' },
  { id: 'V', label: 'Residents worried' },
  { id: 'margin', label: 'Seat margin' },
  { id: 'blocker', label: 'Main blocker' }] as const;

export const CONF_LABEL: Record<Confidence, string> = { strong: 'Strong evidence', moderate: 'Some evidence', tentative: 'Early signal' };

export const HYP_TITLES: Record<HypId, string> = {
  homeowner: 'Homeowner resistance is holding supply back',
  stalled: 'Permissions are granted but not built',
  council_no: 'The council says no more often than most',
  brownfield: 'Brownfield land could close much of the gap',
  cant_vote: "Many adults here can't vote on it",
  high_demand_unbuilt: "High demand, but schemes aren't getting built",
  capacity: 'Political will exists; delivery capacity is the gap',
  concentrated: 'Supply is concentrated here, not where demand is',
  local_afford: 'The need is local affordability, not outside demand',
  social: 'Need centres on social housing and estate renewal',
  renters_decide: 'Under-registered renters could decide this seat',
  exposed: 'The MP is highly exposed to any organised bloc',
  green_belt: 'Green Belt near stations could be in play',
  none: 'No strong signal from current data',
};

/** [fix, who can act] keyed by hypothesis id (prototype FIX, re-keyed from title to id). */
export const FIX: Record<HypId, [string, string]> = {
  homeowner: ["Show visible local support for specific schemes at planning committee, and ask the MP to back the borough's target in public.", 'Campaigners and the MP. The Mayor can call in refused schemes of 50+ homes.'],
  stalled: ["Get stalled sites moving: the 20% affordable fast-track route, temporary CIL relief and the Mayor's stalled-sites fund.", 'Mayor/GLA, the council and developers.'],
  council_no: ['Challenge refusals: Mayor call-in for 50+ homes and appeals. Where the Delivery Test is failed, the presumption in favour of development applies.', 'Mayor, Planning Inspectorate; campaigners speaking at committee.'],
  brownfield: ['Allocate and give permission on registered brownfield sites first, starting with public land.', 'The council (Local Plan) and GLA.'],
  cant_vote: ['Run a renter registration drive aimed at recent movers.', 'Council electoral services and campaigners.'],
  high_demand_unbuilt: ['Make schemes viable: the 20% fast-track route, CIL relief, stalled-sites funding.', 'Mayor and government.'],
  capacity: ['Ask the MP to press the council on delivery: planning officers, council-owned land, stalled permissions.', 'The MP and the council.'],
  concentrated: ['Make sure schools, GPs and transport keep up here, and argue for targets to shift toward high-demand areas that build little.', 'GLA (London Plan targets) and the council.'],
  local_afford: ['Bid for social rent grant and use council tax premiums on empty homes.', 'The council and GLA.'],
  social: ['Grant-funded social rent and estate infill, with resident ballots where homes are demolished.', 'The council, housing associations and GLA.'],
  renters_decide: ['Register renters before the next election; the margin is small enough for them to matter.', 'Campaigners and council electoral services.'],
  exposed: ['A small, visible group of pro-housing constituents meeting the MP will be noticed here.', 'Campaigners.'],
  green_belt: ['Test low-quality Green Belt sites within walking distance of stations, as the draft London Plan would allow.', 'The council and GLA.'],
  none: ['No single blocker stands out. Watch the pipeline and revisit when full polling arrives.', '—'],
};

/** Structured lever holders per hypothesis (derived from FIX[..][1]). [New] */
export const HOLDERS: Record<HypId, string[]> = {
  homeowner: ['Campaigners', 'MP', 'Mayor/GLA'],
  stalled: ['Mayor/GLA', 'Borough council', 'Developers'],
  council_no: ['Mayor/GLA', 'Planning Inspectorate', 'Campaigners'],
  brownfield: ['Borough council', 'Mayor/GLA'],
  cant_vote: ['Borough council', 'Campaigners'],
  high_demand_unbuilt: ['Mayor/GLA', 'Government'],
  capacity: ['MP', 'Borough council'],
  concentrated: ['Mayor/GLA', 'Borough council'],
  local_afford: ['Borough council', 'Mayor/GLA'],
  social: ['Borough council', 'Housing associations', 'Mayor/GLA'],
  renters_decide: ['Campaigners', 'Borough council'],
  exposed: ['Campaigners'],
  green_belt: ['Borough council', 'Mayor/GLA'],
  none: [],
};

/** Main risk of pursuing each lever. [New] */
export const RISK: Record<HypId, string> = {
  homeowner: 'Visible support may provoke organised opposition; call-in only covers schemes of 50+ homes.',
  stalled: 'Relief and fast-track routes can lower affordable housing or infrastructure contributions without guaranteeing starts.',
  council_no: 'Appeals and call-ins are slow and can harden local opposition.',
  brownfield: 'Registered capacity may be unviable or contaminated; allocation does not guarantee delivery.',
  cant_vote: 'Registration gains fade quickly where renters move often.',
  high_demand_unbuilt: 'Viability support may subsidise schemes that would have gone ahead anyway.',
  capacity: 'Council capacity takes time and money to build; results lag the ask.',
  concentrated: 'Shifting targets away can be read as licence to stop building here.',
  local_afford: 'Grant is limited and competitive; empty-homes premiums bring back few homes.',
  social: 'Estate schemes can displace existing tenants and fail resident ballots.',
  renters_decide: 'Registered renters may not turn out or may not prioritise housing.',
  exposed: 'A small bloc can be outweighed by organised opponents.',
  green_belt: 'Green Belt release is politically contested and slow to reach permission.',
  none: '—',
};

export const BLOCK: Record<BlockerCat, { l: string; c: string }> = {
  politics: { l: 'Planning politics', c: '#b5473f' },
  stalled: { l: 'Stalled or unviable schemes', c: '#dd8a2e' },
  capacity: { l: 'Council delivery capacity', c: '#2f5d8a' },
  land: { l: 'Unused brownfield land', c: '#6b8e3a' },
  afford: { l: 'Affordability / social housing', c: '#8a5a9e' },
  voice: { l: 'Renters without a vote', c: '#2a9d8f' },
  concentrated: { l: 'Already building a lot', c: '#9cc3d5' },
  none: { l: 'No single blocker', c: '#d3d9df' },
};

/** Blocker category per hypothesis id (ALG-8, by id rather than title regex). */
export const HYP_BLOCK: Record<HypId, BlockerCat> = {
  homeowner: 'politics', council_no: 'politics',
  stalled: 'stalled', high_demand_unbuilt: 'stalled',
  capacity: 'capacity', brownfield: 'land',
  local_afford: 'afford', social: 'afford',
  cant_vote: 'voice', renters_decide: 'voice',
  concentrated: 'concentrated',
  exposed: 'none', green_belt: 'none', none: 'none',
};

export const GB_BOROUGHS: readonly string[] = ['Barnet', 'Bexley', 'Bromley', 'Croydon', 'Enfield', 'Harrow', 'Havering', 'Hillingdon', 'Hounslow', 'Kingston upon Thames', 'Redbridge', 'Sutton'];
const GB_SET = new Set(GB_BOROUGHS);
export const isGreenBelt = (borough: string): boolean => GB_SET.has(borough);

export const CONTENT = { TYPES, FIX, BLOCK, LAYERS, PARTY, CONF_LABEL, GB_BOROUGHS, BIV, HYP_TITLES, HOLDERS, RISK, HYP_BLOCK };
