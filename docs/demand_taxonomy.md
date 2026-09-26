# Demand That Can't Vote: Market Demand vs Voter Demand

A reference for agents working on the London housing tool. It defines the two kinds of demand, the variables that belong to each, how seats are classified, and the rules that keep the two separate.

---

## 1. The core distinction

| | **Market demand** | **Voter demand** |
|---|---|---|
| Question it answers | Do people *outside* want to live here? | Do the people who *vote here* want more homes? |
| Whose preference | Prospective residents (searchers, movers, would-be renters/buyers) | Current residents who are on the register |
| Revealed by | Behaviour: searches, prices, competition for listings | Stated opinion and electoral weight: polling, turnout, registration |
| Political weight | None locally (they can't vote here yet) | Direct: they elect the MP and councillors |
| Policy lever it signals | Where homes *should* go (targets, allocations, viability) | Whether local politics *will allow* them (MP/council incentives) |
| Unit | Home-seekers, £, ratios | % of residents, votes, registration rates |

**One-line test:** if the number would change when *outsiders* change their behaviour, it is market demand. If it changes only when *residents* change their minds or their voting power changes, it is voter demand.

---

## 2. Market side: variables

### 2a. Demand measures (core)
| Field (db `seats`) | Meaning | Source | Level |
|---|---|---|---|
| `wtbGap` | Housing gap: people searching minus available properties | WhereToBuild (Warwick) | MSOA → seat (best-fit sum) |
| `wtbPer1k` | `wtbGap` per 1,000 residents. **The market-demand axis used for classification** | Derived | Seat |
| `wtbPerKm2` | Gap per km² | WhereToBuild | Seat |
| *(tightness)* | Searchers per available listing | WhereToBuild | Not recovered from the file; request the original CSV |

### 2b. Price signals (corroborating, not used to classify)
| Field | Meaning | Source |
|---|---|---|
| `afford` | House price to earnings ratio | HoC Library via Forest |
| `medPrice` | Median price, year to March 2026 | HMLR via dataset |
| `hpg5` | 5-year price change (%) | HoC Library via Forest |

Price is a noisy demand signal: it also reflects local income, stock type and viability. Use it to corroborate WhereToBuild, never in place of it.

### 2c. Supply-response variables (what the market has delivered; *outcomes*, not demand)
| Field | Meaning | Source |
|---|---|---|
| `homes` | Homes completed a year, avg 2019/20–2024/25 | Planning London Datahub |
| `completed7` | Homes completed 2019–2026 | Datahub |
| `approvedNS`, `startedNC`, `lapsed`, `refused`, `pipeline` | Planning pipeline since 2019 | Datahub |
| `dwellings` | Existing stock 2025 | VOA via dataset |
| `bf` | Brownfield capacity (max net dwellings) | Brownfield land register |
| `ptal` | Public transport access index | TfL PTAL |
| `raw`, `target`, `gap` | Model potential, model "should build" a year, missing homes a year | Missing-homes model (section 5) |

---

## 3. Voter side: variables

### 3a. Voter demand (core)
| Field | Meaning | Source | Notes |
|---|---|---|---|
| `V` | Share saying their neighbours are concerned about housing shortages. **The voter-demand axis used for classification** | Prime Radiant MRP via Forest (17 Aug 2026 wave) | `vEst=true` means estimated (24 seats) from a regression on ownership, social renting, demand, price/earnings and mobility (R² ≈ 0.53, typical error ±7.5 pts) |

### 3b. Voter weight and electorate composition (explains *whose* voice counts; **never** part of `V`)
| Field | Meaning | Source |
|---|---|---|
| `owned`, `outright` | % owner-occupied, % owned outright | Census 2021 |
| `privRent`, `social` | % private renting, % social renting | Census 2021 |
| `movedIn` | % moved in within the last year | Census 2021 |
| `underocc`, `overcrowd` | % with 2+ spare bedrooms, % overcrowded | Census 2021 |
| `regPer100` | Registered parliamentary electors per 100 adults (includes people not eligible to vote) | ONS electoral statistics Dec 2025 vs Census adults |

### 3c. Political exposure (the MP's incentive)
| Field | Meaning | Source |
|---|---|---|
| `won`, `second`, `majority`, `marginPct` | 2024 result and margin | HoC Library |
| `mp`, `mpParty` | Current MP | mySociety (Sep 2026) |
| Borough `control`, `largest` | Council control after May 2026 | Borough dataset |

---

## 4. Rules that keep the two sides separate

1. **Classify on one variable per axis.** Market axis = `wtbPer1k`. Voter axis = `V`. Nothing else goes into either axis.
2. **No composition inside `V`.** Tenure, age, turnout and registration *explain* voter demand; putting them into the voter axis makes the voice test circular (you'd be regressing ownership on ownership).
3. **No outcomes inside market demand.** Completions, pipeline and prices are responses to demand, not demand itself. Using them to measure demand hides the very shortfall being tested.
4. **Estimated `V` is second-class.** Show `vEst` seats as estimates. Exclude them from voice-test statistics (current tool: n = 51 measured seats) but allow them in classification and ranking with a flag.
5. **Per-resident, not totals.** Compare seats on per-resident (demand) or per-existing-home (building) rates so seat size doesn't drive results.
6. **Association, not causation.** Every finding is a pattern across 75 seats / 1,002 neighbourhoods.

**Diagnostic when a variable's side is unclear:**
- Is it measured on people who don't live here yet? → Market.
- Is it an opinion or electoral fact about current residents? → Voter.
- Is it about homes built, approved or refused? → Outcome (neither side; it is what the two sides produce).
- Is it about who the residents are (tenure, age)? → Voter *composition*: an explanatory variable, never an axis.

---

## 5. How "should build" and missing homes are computed (market side)

Per neighbourhood (MSOA, n = 1,002):

1. **Capacity frontier.** Quantile regression at the 80th percentile of `log(1 + completions per 1,000 dwellings per year)` on `log(PTAL)` and `log(1 + brownfield capacity per 1,000 dwellings)`. Fitted coefficients: const 1.321, PTAL 0.239, brownfield 0.162. Price is deliberately excluded (it bakes existing constraint into the frontier).
2. **Demand scaling.** Multiply capacity by `(gap per 1,000 dwellings / London median)^0.5`, clipped to [0.25, 4].
3. **Calibration.** Scale so London's total equals the chosen target: 52,287 (London Plan 2021), 55,800 (draft London Plan 2026) or ~88,000 (government assessed need).
4. **Missing homes** = `max(0, model − actual Datahub completions a year)`, summed to seats.

At 55,800, about 35,000 homes a year are missing; at 88,000, about 63,000.

---

## 6. Classification (area types)

Rank all 75 seats within London on each axis and split each into thirds (low / mid / high).

| Market (`wtbPer1k`) | Voter (`V`) | Type | Meaning | Primary lever | Who acts |
|---|---|---|---|---|---|
| High | Low | **Locked out** | Outsiders want in; residents unbothered | Pressure from above the borough: Mayor call-in (50+ homes), Delivery Test presumption, renter registration | Mayor/GLA, campaigners |
| High | High | **Ready to build** | Both want homes; politics isn't the blocker | Delivery: stalled permissions, council capacity, public land | Council, MP, GLA |
| Low | High | **Worried, no market** | Residents anxious; market won't build at these prices | Public money: social rent grant, estate renewal, empty-homes premiums | Council, GLA |
| Low | Low | **Settled** | Neither side pushing | Low priority | — |
| Any mid | Any mid | **Middle ground** | MP closest to indifferent | Persuasion: visible local evidence of who is priced out | Campaigners |

Current distribution in the tool: Ready to build 15, Locked out 3, Worried no market 3, Settled 11, Middle ground 43. Re-derive live, because the thirds move when the data changes.

---

## 7. Where the two sides meet: the MP's decision

The MP backs building when voters who reward it outweigh voters who punish it:

- **Closeness:** `1 / (1 + marginPct / 5)`: tighter seats respond more to any organised bloc.
- **Split residents:** `1 − |2 × rank(V) − 1|`: highest when resident opinion is evenly divided.
- **Persuadability (`dP`)** = weighted blend of the two (default 50/50).
- **Campaign priority** = `(missing homes / London max) × dP`, scaled 0–100.

Market demand sets the *size of the prize* (missing homes). Voter demand and margin set the *probability the MP moves*. Never merge these into one score earlier than this step.

---

## 8. Key findings the taxonomy supports (current data)

| Finding | Side tested | Comparison (top vs bottom third of seats) | Rank correlation |
|---|---|---|---|
| Building doesn't follow demand | Market → outcome | 7.8 vs 10.3 new homes / 1,000 existing / yr | −0.09 (seats), −0.10 (1,002 MSOAs) |
| Owner-dominated seats build ~55% less | Voter composition → outcome | 5.2 vs 11.4 | −0.42 (p < 0.001) |
| Renter-heavy seats are under-registered | Voter weight | 76 vs 87 registered per 100 adults | −0.58 |
| Owners worry less about housing | Voter composition → voter demand | 22% vs 42% concerned | −0.65 (measured seats) |
| Demand and concern mostly rise together | Market vs voter | — | +0.43 |

Interpretation: the gap persists because building responds to who votes here (ownership), not to who wants to move here (market demand).

---

## 9. Hypothesis rules (seat level)

Each rule reads one side, or explicitly both, and names a lever and who holds it.

| Hypothesis | Side | Trigger (simplified) |
|---|---|---|
| Homeowner resistance | Voter | `owned ≥ 58` and build-per-demand in bottom 40% |
| High demand, not getting built | Market | Market tier high, build-per-demand bottom 40%, prices flat or low ownership |
| Permissions granted but not built | Outcome (delivery) | `approvedNS + lapsed > 0.8 × completed7` and > 1,000 |
| Council says no more often | Outcome (approval) | Borough major-scheme approval < 75% and `refused > 300` |
| Brownfield could close the gap | Market capacity | `bf > 3,000`, `bf > 5 × gap` |
| Many adults can't vote on it | Voter weight | `regPer100 < 75` and `privRent ≥ 30` |
| Political will exists; capacity gap | Both | Voter tier high, market tier ≥ mid, build-per-demand bottom half |
| Supply concentrated here | Outcome vs market | Build-per-demand top 20% |
| Local affordability, not outside demand | Both | Market low, voter high |
| Social housing / estate renewal | Voter composition | `social ≥ 33` and voter tier ≥ mid |
| Under-registered renters could decide it | Voter weight × exposure | `privRent ≥ 30`, `marginPct < 15` |
| MP highly exposed | Exposure | `marginPct < 5` |
| Green Belt near stations | Market capacity | Outer borough with Green Belt, market tier ≥ mid |

Evidence labels: Strong evidence / Some evidence / Early signal (downgraded when `vEst` is true).

---

## 10. Data locations for the agent

- **Live tool (team, database-backed):** collections `seats` (75, keyed by ONS PCON24 code), `boroughs` (33, keyed by LAD code), `kb` (policy library, K01–K52), `meta/config` (data version), `memos` (saved memos by seat code).
- **Write access:** `seats`, `boroughs`, `kb`, `meta` are Editor-only; `memos` is Contributor+.
- **Updating data:** use the in-page import (JSON array of `{code, field: value}`) or write `seats/<code>` directly, then bump `meta/config.version`.
- **Pending inputs:** full Forest MRP extract (replaces 24 estimated `V` values; set `vEst: false`), original WhereToBuild CSV (adds tightness, fixes 48 imputed neighbourhoods).
