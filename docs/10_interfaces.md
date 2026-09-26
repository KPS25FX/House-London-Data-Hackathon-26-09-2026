# 10 Interface contracts (shared by pipeline, core, server, web)

Every module must follow these names exactly. If one has to change, update this file.

## 1. Data files: `web/public/data/*.json` (written by `pipeline/`, read by `core`, `web` and `server`)

| File | Shape |
|---|---|
| `seats.json` | `SeatRow[]` (75), sorted by `code`. Fields as in docs/04 §2, using the same names as `reference/prototype/data.json` rows: `code, name, borough, boroughs, q, r, pop, adults, households, dwellings, wtbGap, wtbPer1k, wtbPerKm2, wtbFlag, afford, affEst, medPrice, hpg5, V, vEst, owned, outright, privRent, social, movedIn, underocc, overcrowd, regPer100, won, second, majority, marginPct, turnout, mp, mpParty, mpNote, homes, completed7, approvedNS, startedNC, lapsed, refused, pipeline, bf, ptal, raw, tops` |
| `boroughs.json` | `Borough[]` (33): `lad, name, hdt (0–1), hdtCons, netAdd6, netAdd2425, pldVsNet, apprRate, inTime, approved, approvedNS, startedNC, lapsed, refused, pctSecond, pctEmpty, secondHomes, emptyLT, control, largest, seats, underocc, overcrowd, privRent, owned, bf` |
| `msoa.json` | `Msoa[]` (1,002): `code, name, pcon, lad, dwellings, built (homes/yr), ptal, bf, raw (homes/yr, uncalibrated model potential)` |
| `policies.json` | `Policy[]`: `id, title, tags[], text, src[{name,url}], kind ('library'\|'borough_profile'\|'evaluation'; E01–E07 and lessons L01–L05 are 'evaluation', and their `tags` include the HypIds / BlockerCats they bear on), lever?, holder?[], scope?, evidence? ({scale:'SMS'\|'GRADE'\|'none', score?: string}), effects?: PolicyEffect[]` |
| `postcodes.json` | `{ [outward: string]: { d: string \| null, x?: { [inward: string]: string } } }`. Values are seat **codes**; `null` means outside London. |
| `indicators.json` | `Indicator[]`: `key, label, side ('market'\|'voter'\|'voter_composition'\|'voter_weight'\|'exposure'\|'outcome'\|'identity'), unit, source, forestKey?` |
| `meta.json` | `{ version, generatedAt, target, vModel:{r2,n,mae}, wtbTotal, model:{coef,q,elasticity,median_gap_per1k}, missingMode:'msoa_exact'\|'msoa_fallback', notes: string[] }` |

`PolicyEffect = { outcome: string, direction: '+'|'-'|'0'|'mixed', certainty: 'high'|'medium'|'low', note: string, who?: string }`

## 2. Core API: `core/src/index.ts` (pure; no DOM or fetch)

```ts
type Side = 'market'|'voter'|'voter_composition'|'voter_weight'|'exposure'|'outcome'|'identity';
type AreaType = 'locked'|'ready'|'worried'|'settled'|'middle';
type Tier = 0|1|2;
type Confidence = 'strong'|'moderate'|'tentative';
type BlockerCat = 'politics'|'stalled'|'capacity'|'land'|'afford'|'voice'|'concentrated'|'none';
type MissingMode = 'msoa'|'seat';
interface Settings { total: number; wClose: number; missingMode: MissingMode }   // defaults 55800, 0.5, 'msoa'
interface Derived { Mp:number; Vp:number; Mt:Tier; Vt:Tier; type:AreaType; target:number; gap:number;
  bpd:number; swing:number; close:number; dP:number; prioRaw:number; prio:number; rank:number; bpk:number; bpkP:number }
type Seat = SeatRow & Derived;
interface Ctx { seats: Seat[]; boroughs: Record<string, Borough> /* keyed by name */; policies: Policy[]; settings: Settings; meta: Meta }
interface Hypothesis { id: HypId; t: string; c: Confidence; s: number; p: string; ev: string; test: string; k: string[] }
// HypId: 'homeowner'|'stalled'|'council_no'|'brownfield'|'cant_vote'|'high_demand_unbuilt'|'capacity'|'concentrated'|'local_afford'|'social'|'renters_decide'|'exposed'|'green_belt'|'none'

compute(rows: SeatRow[], msoa: Msoa[], settings: Settings): Seat[]      // ALG-1..5
hypotheses(s: Seat, ctx: Ctx): Hypothesis[]                              // ALG-7
topBlocker(s, ctx): Hypothesis | null;  blockCat(s, ctx): BlockerCat     // ALG-8 (by HypId, not regex)
similarSeats(s, seats, n=3): Seat[]                                      // ALG-9
retrieve(s, H, policies): Policy[]                                       // ALG-10 BM25
seatFacts(s, ctx): Record<string, unknown>                               // ALG-10
buildArgument(s, ctx): PolicyArgument                                    // policy/argument.ts
memoPrompt(s, ctx): { prompt: string; docs: Policy[]; argument: PolicyArgument }
askPrompt(s, ctx, earlierMemo: string, question: string): string
lookupPostcode(raw: string, pc: Postcodes): { code: string; partial: boolean } | { err: string }  // ALG-11
verdict(s, ctx): string; reasons(s): string[]                            // ALG-12, 13 (plain text, no HTML)
findings(seats): Finding[]                                               // ALG-14
spearman(x: number[], y: number[]): number
CONTENT: { TYPES, FIX, BLOCK, LAYERS, PARTY, CONF_LABEL, GB_BOROUGHS }   // copy text from prototype template.html
validateCitations(text: string, allowedIds: string[]): { unknown: string[] }
```

### PolicyArgument (a well-formed structure)
```ts
interface Claim { id: string; kind: 'premise'|'diagnosis'|'option'|'ask'; text: string;
  support: string[];      // ids of premises / policy ids ('K05') / hypothesis ids behind this claim
  confidence?: Confidence }
interface Option { id: string; lever: string; holder: string[]; policyIds: string[];
  expectedEffects: PolicyEffect[]; risk: string; addresses: HypId[] }
interface PolicyArgument { seat: string; premises: Claim[]; diagnosis: Claim[]; options: Option[];
  asks: { mp: string; council: string }; dataGaps: string[] }
```
Well-formedness: every diagnosis claim's support ⊆ premise ids ∪ hypothesis ids, and includes ≥ 1 premise; every option addresses ≥ 1 diagnosed HypId; every `policyIds` element exists in `policies`.

## 3. Server HTTP API (`server/`, port 8787; Vite proxies `/api` to it)
- `POST /api/memo` body `{ code: string, settings: Settings }`. Streams `text/plain` chunks of Markdown; the final trailer line is `\n<!--meta {"docIds":[...],"unknownCitations":[...],"model":"..."}-->`.
- `POST /api/ask` body `{ code, settings, memo, question }`. Streams text.
- `GET /api/health` returns `{ ok, llm: 'live'|'mock' }`. Mock mode applies when `ANTHROPIC_API_KEY` is unset and returns a deterministic memo built from `PolicyArgument`.
- The server loads the data JSON itself and calls `core`, so clients never send facts.

## 4. Agreed deviations (integration, 26 Sep 2026)
- `reasons(s)` returns `string[]` (empty when nothing applies); `reasonsLine(s)` gives the joined text or "—".
- `FIX` is keyed by `HypId`. `HOLDERS` and `RISK` tables feed `buildArgument` options.
- Evaluation policies attach to an option when `lever` or `tags` contain the hypothesis id or its blocker category (links set in `pipeline/policies.py` `DIAGNOSIS_LINKS`).
- Seat `boroughs` stays a `"A; B"` string (prototype parity). Split on `"; "`.
- Server streams errors after first byte as a trailer `
<!--error {...}-->` (no meta trailer).
- Default `missingMode` is `'msoa'`: totals are 34,934/yr at 55,800 and 63,175/yr at 88,000 (matches taxonomy §5); `'seat'` gives 28,405 / 56,927.

## 5. v2 prototype additions (26 Sep 2026, from `reference/prototype_v2/artifact_v2.html`)

### Data files
| File | Shape |
|---|---|
| `series.json` | `Series = { metrics: Metric[] }`. `Metric = { id, label, unit, fmt ('gbp'\|'pct'\|'x'\|'int'), source, better ('low'\|'high'\|null), years: string[], data: { [boroughName]: (number\|null)[] } (each length == years.length), london?: (number\|null)[], note?, yoy?: {[borough]: number} }`. Ids: `afford, price, rent, privrent, socrent, outright, affcomp, council, rough`. Extracted verbatim from the artifact `SERIES` literal by `pipeline/series.py` (not rebuilt from the Datastore zip; see meta.notes); the mangled pound sign in units is restored. |
| `geo.json` | `{ w, h, seats: { [seatCode]: svgPath } (75), cent: { [seatCode]: [x, y] }, boroughs: svgPath (all borough outlines in one path) }`, from the artifact `GEO` literal. |

### Core API (all exported from `core/src/index.ts`)
```ts
// scenario.ts
type LeverId = 'stalled'|'lift'|'bf'|'reg'; type Scenario = Record<LeverId, number>;   // percent
interface Lever { id: LeverId; label: string; max: number; step: number; desc: string }
LEVERS: Lever[]; PRESETS: [string, Scenario][]; ZERO_SCENARIO: Scenario; isScenarioOn(scen): boolean
interface ScenSeat extends Seat { addS; addL; addB; add; gapS; bloc: number; flip: boolean }
medianBpd(seats): number                                   // sorted[floor(n/2)] of bpd
computeScenario(seats: Seat[], scen: Scenario): ScenSeat[]
scenarioSummary(base: Seat[], s: ScenSeat[]): { missing0, missing, added, addS, addL, addB, meet0, meet, flips: ScenSeat[] }
// trends.ts
latest(m, borough) / first(m, borough): { v, i, year } | null;  growth(m, borough): number | null  (percent)
metricRange(m, yearIdx?): [lo, hi]   // all years when yearIdx omitted (prototype trRange)
metricById(series, id); fmtMetric(m, v); csvRows(text); LONDON_BOROUGHS
parseSeriesCsv(text, boroughNames = LONDON_BOROUGHS): Series      // throws Error with prototype messages
// policyfit.ts
type PolicyId = 'stalled'|'lift'|'brownfield'|'estate'|'transport'|'homeless'|'register'
interface PolicyBase { id; name; lever: LeverId|null; lvl: 'strong'|'mod'|'weak'|'none'; strength; delivered; who; track: string[]; cards: string[]; guard: string[] }
POLICY_BASE; EV_LVL; LEVER_POLICY; clamp01
fitLabel(s) / riskLabel(s): { label, tone: 'good'|'mid'|'bad' };  evidenceLabel(lvl)
rateSeat(seat, ctx, scen, series?): PolicyRating[]   // sorted by score = fit*(1-0.5*risk) desc
ratePolicy(policyId, seat, ctx, scen, series?): PolicyRating
bestPlaces(policyId, ctx, series?, n = 8): { seat, fit, risk, score }[]
defaultPolicy(seat, scen, ctx?): PolicyId           // ctx needed for the blocker fallback
interface PolicyRating { policy; fit; risk; score; label; tone; riskLabel; riskTone; evidence; evidenceTone;
  verdict; verdictTone; reasons: string[]; risks: string[]; scenarioHomes: number|null }
// why.ts
whyGap(seats): { buildRateHighDemand, buildRateLowDemand, buildRateMostOwned, buildRateLeastOwned, ownerBuildGapPct,
  regMostRenters, regFewestRenters, concernMostOwned, concernLeastOwned, measuredSeats }
whyGapValues(w): [string, string, string, string]; WHY_TEXT: [headline, measure, so][]
// compute.ts
compute(rows, msoa, settings, series?)   // v2 adds Derived.rough?: number|null (latest 'rough' for the borough)
```
Deviations from the artifact: `gapS = max(0, gap − add)` (so it follows `missingMode`; equals the artifact in `'seat'` mode). `rateSeat` takes an optional `series` for rent growth (brownfield risk) and rough sleeping (Housing First fit); without it they fall back as the artifact does when data is missing.

### Memo fixes
- `retrieve()` always includes `K10` and `K14` when present (`ALWAYS_DOCS`), since prompt rules and data gaps cite them.
- Data-gap wording is exported as `MISSING_GAP_MSOA_FALLBACK` (settings `'msoa'` + meta `'msoa_fallback'`) and `MISSING_GAP_SEAT` (settings `'seat'`).
