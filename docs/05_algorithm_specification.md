# 05 Algorithm specification

All algorithms run over the 75 seat rows `R`. Notation: `r.x` is field `x` of seat `r`. They are taken from the prototype source unless marked **[New]**.

## ALG-1 Percentile rank

For key `k`, sort all values ascending. For value `v`: `lo` = count of values < v, `hi` = count ≤ v.
```
pctRank(v) = ((lo + hi) / 2) / n          # mid-rank; ties share a percentile
```
Computed on all 75 seats (estimated `V` included):
- `Mp = pctRank(wtbPer1k)`
- `Vp = pctRank(V)`
- `bpkP = pctRank(bpk)`

## ALG-2 Tiers and area type

```
tier(p) = 0 if p < 1/3;  1 if p < 2/3;  2 otherwise
Mt = tier(Mp);  Vt = tier(Vp)

type = ready    if Mt=2 and Vt=2
       locked   if Mt=2 and Vt=0
       worried  if Mt=0 and Vt=2
       settled  if Mt=0 and Vt=0
       middle   otherwise
```
Expected snapshot counts: ready 15, locked 3, worried 3, settled 11, middle 43.

| Type | Colour | Who | Ask (abridged, full text in prototype `TYPES`) |
|---|---|---|---|
| Locked out | #5ac8c8 | High outside demand · residents unbothered | Target in public, Mayor call-in/appeals, register renters |
| Ready to build | #3b4994 | High outside demand · residents want homes | Press council on delivery capacity, stalled permissions, council land |
| Worried, no market | #be64ac | Low outside demand · residents anxious | Public money: AHP bids, council-led and social rent |
| Settled | #e8e8e8 | Low outside demand · residents unbothered | Low priority; watch transport |
| Middle ground | #a5add3 | Moderate on at least one side | Persuasion: local evidence of who is priced out |

## ALG-3 Missing homes

### ALG-3a Model potential (pipeline, per MSOA; produces `raw`)
Per neighbourhood `i` (n = 1,002):
1. Frontier: 80th-percentile quantile regression
   `log(1 + completions per 1,000 dwellings per yr) = c0 + c1·log(PTAL) + c2·log(1 + brownfield per 1,000 dwellings)`,
   with `c = [1.3212, 0.2388, 0.162]`. Price is deliberately excluded.
2. `capacity_i = (exp(fitted_i) − 1) × dwellings_i / 1000` (homes/yr).
3. Demand scaling: `s_i = clip((gapPer1kDwellings_i / 135.3)^0.5, 0.25, 4)`.
4. `raw_i = capacity_i × s_i`. Seat `raw = Σ raw_i` over the seat's MSOAs.

> **[New] Note:** the taxonomy (§5) defines missing homes as `Σ max(0, model_i − actual_i)` at MSOA level. The prototype applies `max(0, …)` at *seat* level (ALG-3b), so neighbourhoods that overbuild offset ones that underbuild inside a seat. Decide which is intended (see [06 §7](06_system_architecture.md#7-open-decisions)). The expected totals (~35k at 55,800, ~63k at 88,000) come from the taxonomy.

### ALG-3b Calibration (runtime)
```
rawT     = Σ_r r.raw
r.target = T × r.raw / rawT                    # T = chosen London target
r.gap    = max(0, r.target − r.homes)
r.bpd    = r.homes / max(r.dwellings, 1) × 1000   # built per 1,000 existing homes / yr
```

## ALG-4 Persuadability and campaign priority

```
r.close  = 1 / (1 + r.marginPct / 5)
r.swing  = 1 − |2·r.Vp − 1|                    # 1 when residents are split (median concern)
r.dP     = w·r.close + (1 − w)·r.swing          # w = slider/100, default 0.5
r.prioRaw = (r.gap / max_r gap) × r.dP
r.prio   = 100 × r.prioRaw / max_r prioRaw      # 0–100
r.rank   = position when sorted by prio desc (1 = highest)
```
Market demand sets the prize (`gap`). Voter demand and margin set the probability the MP moves (`dP`). They must not be merged earlier.

## ALG-5 Build per unserved home-seeker

```
r.bpk  = r.homes / max(r.wtbGap, 1)            # used for ranking
r.bpkP = pctRank(bpk)
```
In hypothesis evidence text, `bpk` is shown per 1,000 (`homes / max(wtbGap,1) × 1000`).

## ALG-6 Recompute trigger

Run ALG-1 to ALG-5 on load, on any data change (debounced about 120 ms) and on any settings change.

## ALG-7 Hypotheses

For seat `r`. `P = r.bpkP`. `conf(n)`: n ≥ 3 → strong, n = 2 → moderate, else tentative. `B` = borough record. Output entries have title `t`, confidence `c`, score `s`, explanation `p`, evidence `ev`, test and library ids `k`. Sort by `s` descending.

| # | Title | Fires when | Confidence | Score | Library |
|---|---|---|---|---|---|
| 1 | Homeowner resistance is holding supply back | `owned ≥ 58` and `P < 0.4` | `conf(1 + [Vt=0] + [outright ≥ 30] − [vEst])` | 3+n | K12, K04, K06, K08 (+K02 if Green Belt borough) |
| 2 | Permissions are granted but not built | `approvedNS + lapsed > 0.8 × max(completed7,1)` and `> 1000` | `conf(1 + [lapsed > 300] + [Mt ≥ 1])` | 3+n | K04, K05, K10 |
| 3 | The council says no more often than most | `B.apprRate < 75` and `refused > 300` | moderate if `apprRate < 70` else tentative | 3 | K04, K06 |
| 4 | Brownfield land could close much of the gap | `bf > 3000` and `gap > 150` and `bf > 5 × gap` | moderate | 2 | K01, K04, K14 |
| 5 | Many adults here can't vote on it | `regPer100 < 75` and `privRent ≥ 30` | strong if `regPer100 < 72` else moderate | 2 + [margin < 10] | K08, K12 |
| 6 | High demand, but schemes aren't getting built | `Mt = 2` and `P < 0.4` and (`hpg5 < 3` or `owned < 50`) | `conf(1 + [hpg5 < 0] + [Vt ≥ 1])` | 3+n | K05, K04, K07 |
| 7 | Political will exists; delivery capacity is the gap | `Vt = 2` and `Mt ≥ 1` and `P < 0.5` | tentative if vEst else moderate | 4 | K04, K06, K13 |
| 8 | Supply is concentrated here, not where demand is | `P > 0.8` | strong if `Mt = 0` else moderate | 3 | K07, K10, K02, K12 |
| 9 | The need is local affordability, not outside demand | `Mt = 0` and `Vt = 2` | tentative if vEst else moderate | 3 | K04, K11, K01 |
| 10 | Need centres on social housing and estate renewal | `social ≥ 33` and `Vt ≥ 1` | tentative if vEst else moderate | 3 | K04, K01, K13 |
| 11 | Under-registered renters could decide this seat | `privRent ≥ 30` and `marginPct < 15` and not `regPer100 < 75` | strong if margin < 5 else moderate | 2 + [margin < 5] | K08, K09 |
| 12 | The MP is highly exposed to any organised bloc | `marginPct < 5` and rule 11 did not fire | strong | 2 | K09 |
| 13 | Green Belt near stations could be in play | borough ∈ Green Belt set and `Mt ≥ 1` | tentative | 1 | K02 |
| — | No strong signal from current data | none of the above | tentative | 0 | K12, K14 |

Green Belt boroughs: Barnet, Bexley, Bromley, Croydon, Enfield, Harrow, Havering, Hillingdon, Hounslow, Kingston upon Thames, Redbridge, Sutton.

Explanation, evidence and test text templates are fixed copy (prototype `hypotheses()`). The fix and who-can-act text per title is in the prototype `FIX` table. Store both as data.

> **Taxonomy check:** the taxonomy's §9 simplified triggers (e.g. "build-per-demand bottom 40%") are implemented here with `bpkP`. Rule 7 uses `P < 0.5` ("bottom half").

## ALG-8 Main blocker

`topBlocker(r)` = title of the first hypothesis whose title does not match `exposed | Green Belt | No strong`, else "No single blocker". Map the title (regex) to a category:

| Category | Label | Colour | Title matches |
|---|---|---|---|
| politics | Planning politics | #be64ac | Homeowner, council says no |
| stalled | Stalled or unviable schemes | #c05a2c | not built, aren't getting built |
| capacity | Council delivery capacity | #3b4994 | delivery capacity |
| land | Unused brownfield land | #8a9a2b | Brownfield |
| afford | Affordability / social housing | #d4a017 | affordability, social housing |
| voice | Renters without a vote | #2f8f83 | can't vote, Under-registered |
| concentrated | Already building a lot | #9fd3d3 | concentrated |
| none | No single blocker | #c9ccd1 | otherwise |

**[New]** Use hypothesis ids rather than regex on titles, so copy edits can't change categories.

## ALG-9 Similar seats

Feature vector `f(x) = [Mp, Vp, owned/100, min(1, marginPct/40), bpkP]`. Squared Euclidean distance to every other seat. Return the 3 nearest.

## ALG-10 Memo retrieval and prompt

**Retrieval** (library entries for the memo context):
1. Add the "Borough profile: {borough}" entry if it exists.
2. Add every library id referenced by the seat's hypotheses.
3. BM25 search over the library with the query `borough + seat name + type label + all hypothesis titles and explanations`. Add results in score order, skipping other borough profiles, while the set has fewer than 11 entries.
4. Add K14, K05 and K02, in that order, while the set has fewer than 12 entries.

**BM25:** tokens are lowercase, split on non `[a-z0-9%-]`, length > 1, minus a stop list. The document is `title + tags×2 + text`. `k1 = 1.2`, `b = 0.75`, `idf = ln(1 + (N − df + 0.5)/(df + 0.5))`, term score `idf × tf × 2.2/(tf + 1.2 × (0.25 + 0.75 × len/avgLen))`.

**Seat facts JSON** (`seatFacts`): seat, borough_council, mp, ge2024, area_type, demand fields and ranks, concern (%, estimated, rank), completions, dwellings, build rate, model target and gap and London total, pipeline, brownfield, PTAL, median price, registration, moved in, overcrowded, underoccupied, top neighbourhoods, borough context (HDT, consequence, approval rate, control, second and empty homes), tenure, price-to-earnings, 5-year price change, priority and rank.

**Prompt.** Fixed template: role, RULES (use only the given data; cite `[Kxx]`; treat hypotheses as starting points; flag the Datahub [K10], estimated-concern and model [K14] limits; prefer existing levers and say who holds each; plain UK English, 600–800 words), FORMAT (8 sections), then SEAT DATA, HYPOTHESES (with confidence, explanation, evidence, test), SIMILAR SEATS and LIBRARY. The full template is in the prototype `memoPrompt()`. Store it versioned in the repo.

## ALG-11 Postcode lookup

1. `s = upper(raw)` with all non-alphanumerics removed. If `len(s) < 2` → error.
2. If `s` is a known outward code, `out = s` (partial). Otherwise, if `len(s) ≥ 5`, `out = s[:-3]` and `inw = s[-3:]`.
3. If `out` is unknown → error "not a London postcode".
4. Seat = the exception seat for `inw` if listed, else the district default. A default of −1 or null → error "outside Greater London".

## ALG-12 Verdict sentence

"{name} builds about {homes} homes a year. Given its transport, land and demand, it should be nearer {target}" + (", so it is about {gap} a year short." if gap > 0 else ", so it is keeping up.") + " About {round(V×10)} in 10 residents say their neighbours worry about housing{ (estimated)}." + margin clause (< 5: "The MP's majority is tiny (…)"; < 12: "The seat is marginal (x points)."; else "The seat is safe (x points).") + " Main issue: {top hypothesis, lower-cased first letter}."

## ALG-13 Reasons line

Up to 3 of, in order:
- `marginPct < 5` → "knife-edge seat ({majority} votes | x pts)"; otherwise `< 12` → "marginal (x pts)"
- `swing > 0.7` → "residents split on housing"
- `gap > 600` → "{gap} homes a year short"
- `Mt = 2` → "high outside demand"

Otherwise "—".

## ALG-14 Findings statistics

- `thirds(arr, key)`: sort ascending, `n = floor(len/3)`. Return the bottom `n` and top `n` (the middle is dropped).
- Spearman ρ: Pearson correlation of average ranks (ties get their mean rank).
- Build rate `bd = homes / dwellings × 1000`.
- Findings 1–3 use all 75 seats. Finding 4 uses measured-`V` seats only (n = 51).

## ALG-15 V estimate (pipeline) **[New, formalises prototype]**

For seats without measured `V`: an OLS regression on the 51 measured London seats of `V ~ owned + social + wtbPer1k + afford + movedIn` (the taxonomy lists ownership, social renting, demand, price/earnings, mobility). Report `r2`, `n` and `mae` into `meta.vModel`. Set `vEst = true` on predicted seats. The exact prototype coefficients are not in the artifact, so re-fit and document them.
