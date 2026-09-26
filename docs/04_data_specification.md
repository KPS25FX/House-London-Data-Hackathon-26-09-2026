# 04 Data specification

## 1. Overview

| Collection | Key | Count | Written by | Read by |
|---|---|---|---|---|
| `seats` | ONS PCON24 code (e.g. `E14001073`) | 75 | Pipeline, Editors (import) | All |
| `boroughs` | ONS LAD code (e.g. `E09000002`) | 33 | Pipeline, Editors (seed) | All |
| `kb` (policy library) | `K01`… | currently K01–K52 | Editors (seed) | All, memo retrieval |
| `postcodes` | Outward code | all Greater London districts | Pipeline | Lookup |
| `meta/config` | singleton | 1 | Pipeline, Editors | All |
| `memos` | seat code | ≤ 75 (one per seat) | Contributors+ | All |

Snapshot `meta` at prototype time: `version "2026-09-26.2"`, `target 52287` (the data default; the UI default is 55,800), `wtbTotal 605421`, `vModel {r2 0.526, n 51, mae 7.5}`, `model {coef [1.3212, 0.2388, 0.162], q 0.8, elasticity 0.5, median_gap_per1k 135.3}`.

## 2. Seat record

Side codes follow `demand_taxonomy.md`: **M** = market demand, **V** = voter demand/opinion, **VC** = voter composition, **VW** = voter weight, **X** = political exposure, **O** = outcome/supply, **ID** = identity/layout, **D** = derived at runtime (not stored).

The stored, importable field list is `SEAT_FIELDS`: `name, borough, boroughs, wtbGap, wtbPer1k, wtbPerKm2, wtbFlag, afford, affEst, outright, owned, social, privRent, homes, pop, hpg5, V, vEst, won, second, majority, marginPct, turnout, mp, mpParty, mpNote, q, r, adults, households, dwellings, overcrowd, movedIn, underocc, completed7, approvedNS, startedNC, lapsed, refused, pipeline, bf, ptal, medPrice, regPer100, raw, tops`.

Numeric fields (validated as finite numbers on import): `wtbGap, wtbPer1k, wtbPerKm2, wtbFlag, afford, outright, owned, social, privRent, homes, pop, hpg5, V, majority, marginPct, turnout, q, r, adults, households, dwellings, overcrowd, movedIn, underocc, completed7, approvedNS, startedNC, lapsed, refused, pipeline, bf, ptal, medPrice, regPer100, raw`.

### 2.1 Stored fields

| Field | Side | Type / unit | Meaning | Source |
|---|---|---|---|---|
| `code` | ID | string | ONS PCON24 code (key) | ONS |
| `name` | ID | string | Seat name | ONS |
| `borough` | ID | string | Borough covering most of the seat | ONS best-fit |
| `boroughs` | ID | string[] | All boroughs the seat overlaps | ONS |
| `q`, `r` | ID | int | Axial hex-map position | Hand layout |
| `pop`, `adults`, `households` | ID | count | Residents, adults, households | Census 2021 / ONS MYE |
| `wtbGap` | M | count | Searchers minus available properties, MSOA → seat best-fit sum | WhereToBuild (Warwick) |
| `wtbPer1k` | M | per 1,000 residents | **Market axis** | Derived |
| `wtbPerKm2` | M | per km² | Gap density | WhereToBuild |
| `wtbFlag` | M | int | Count/flag of imputed MSOAs in the seat (48 imputed London-wide) | Recovery process |
| `afford` | M (corroborating) | ratio | House price to earnings | HoC Library via Forest (`parliament_house_price_to_earnings_ratio`) |
| `affEst` | M | bool | `afford` estimated | Derived |
| `medPrice` | M (corroborating) | £ | Median price, year to Mar 2026 | HMLR |
| `hpg5` | M (corroborating) | % | 5-year price change | HoC Library via Forest (`parliament_house_price_pct_change_5y`) |
| `V` | V | share 0–1 | **Voter axis**: share saying neighbours are concerned about housing shortages | Prime Radiant MRP via Forest (`mrp_concern_housing_shortages`, 17 Aug 2026) |
| `vEst` | V | bool | `V` estimated by regression (24 seats) | Derived |
| `owned`, `outright` | VC | % | Owner-occupied; owned outright | Census 2021 (`tenure_owned_pct`, `tenure_outright_pct`) |
| `privRent`, `social` | VC | % | Private renting; social renting | Census 2021 (`tenure_private_rent_pct`, `tenure_social_rent_pct`) |
| `movedIn` | VC | % | Moved in within the last year | Census 2021 |
| `underocc`, `overcrowd` | VC | % | 2+ spare bedrooms; overcrowded | Census 2021 |
| `regPer100` | VW | per 100 adults | Registered parliamentary electors per 100 adults | ONS electoral statistics Dec 2025 / Census adults |
| `won`, `second` | X | string | 2024 winner and runner-up party | HoC Library |
| `majority` | X | votes | 2024 majority | HoC Library |
| `marginPct` | X | pts | 2024 margin | HoC Library |
| `turnout` | X | % | 2024 turnout | HoC Library |
| `mp`, `mpParty`, `mpNote` | X | string | Current MP, party, note if vacant | mySociety (Sep 2026) |
| `homes` | O | homes/yr | Completions, avg 2019/20–2024/25 | Planning London Datahub |
| `completed7` | O | homes | Completions 2019–2026 | Datahub |
| `approvedNS`, `startedNC`, `lapsed`, `refused`, `pipeline` | O | homes | Pipeline since 2019 | Datahub |
| `dwellings` | O | count | Existing stock 2025 | VOA |
| `bf` | O (capacity) | homes | Brownfield max net dwellings | Brownfield land register |
| `ptal` | O (capacity) | index | Mean PTAL access index | TfL |
| `raw` | O (model) | homes/yr | Uncalibrated model potential (ALG-3a) | Pipeline |
| `tops` | O (model) | array | Top 3 missing neighbourhoods: `{n: name, miss: homes/yr, built: homes/yr, bf, ptal}` | Pipeline |

### 2.2 Derived at runtime (D), never stored

`Mp, Vp` (percentiles), `Mt, Vt` (tiers), `type`, `target`, `gap`, `bpd` (built per 1,000 dwellings), `swing`, `close`, `dP`, `prioRaw`, `prio`, `rank`, `bpk`, `bpkP`. See [05](05_algorithm_specification.md).

## 3. Borough record

| Field | Type | Meaning |
|---|---|---|
| `lad` | string | LAD code (key) |
| `name` | string | Borough name |
| `hdt` | share | Housing Delivery Test 2025 result (0.58 = 58%) |
| `hdtCons` | string | HDT consequence (e.g. "Presumption") |
| `netAdd6`, `netAdd2425` | homes | Net additional dwellings, 6-year and 2024/25 |
| `pldVsNet` | % | Datahub completions as % of official net additions (coverage check) |
| `apprRate` | % | Major residential approval rate since 2019 |
| `inTime` | % | Decisions in time |
| `approved`, `approvedNS`, `startedNC`, `lapsed`, `refused` | homes | Borough pipeline |
| `pctSecond`, `secondHomes` | %, count | Second homes (Council Taxbase 2025) |
| `pctEmpty`, `emptyLT` | %, count | Long-term empty homes |
| `control`, `largest`, `seats` | string, string, int | Council control, largest party, council seats (May 2026) |
| `underocc`, `overcrowd`, `privRent`, `owned` | % | Borough composition |
| `bf` | homes | Borough brownfield capacity |

## 4. Policy library entry (`kb`)

```json
{ "id": "K01", "title": "London Plan 2021: targets and affordable housing route",
  "tags": ["london","targets","policy","affordable"],
  "text": "…",
  "src": [{ "name": "The London Plan 2021, Chapter 4 (Housing)", "url": "https://…" }] }
```
Special entries include "Borough profile: {borough}" (one per borough), K10 (Datahub coverage caveat) and K14 (missing-homes model). A `src.url` beginning with `#` is an internal reference and is shown without a link.

## 5. Postcode lookup

The prototype uses a compact map: `outward → [defaultSeatIdx, {seatIdx: "concatenated 3-char inward codes"}]`. The default index is the modal seat for the district, or −1 for outside London. **[New]** In the rebuild, store it as `{outward: {default: code|null, exceptions: {inward: code}}}` keyed by seat *code*, not array index, so reordering rows can't break it.

## 6. Memo record (`memos/{code}`)

| Field | Type | Meaning |
|---|---|---|
| `code`, `name` | string | Seat |
| `text` | string ≤ 200,000 chars | Memo Markdown |
| `docIds` | string[] | Library ids in context |
| `hypotheses` | string[] | Hypothesis titles |
| `dataVersion` | string | Version at generation (drives the stale flag) |
| `modelTier` | string | LLM model used |
| `createdAt` | ISO datetime | |
| `by` | user id | Author |
| `pdfId` | string or null | Stored PDF reference |

## 7. `meta/config`

| Field | Meaning |
|---|---|
| `version` | `YYYY-MM-DD.HHMM` or `YYYY-MM-DD.n` |
| `updatedAt` | ISO datetime |
| `note` | Human note of the last change |
| `target` | Default London target in the data |
| `vModel` | `{r2, n, mae}` of the V-estimate regression |
| `wtbTotal` | London total WhereToBuild gap |
| `model` | `{coef, q, elasticity, median_gap_per1k}` of the missing-homes model |

## 8. Import format

A JSON array, or an object with `rows`:
```json
[{ "code": "E14001073", "V": 0.2412, "vEst": false }]
```
Rules: FR-ADM-4. The version is auto-assigned at import time.

## 9. Known data gaps (to close)

| Gap | Affects | Plan |
|---|---|---|
| Full Forest MRP extract (24 seats estimated) | `V`, `vEst`, classification, findings | Pull `mrp_concern_housing_shortages` for all 75 London seats via Forest and import with `vEst:false` |
| Original WhereToBuild CSV | `wtbGap` accuracy (48 imputed MSOAs), no tightness measure | Request from Warwick; rerun F15 |
| Searchers per listing (tightness) | Market side | Add a field when the CSV arrives (corroborating only) |
| Electoral registration, `movedIn`, PTAL, brownfield, Datahub pipeline | Not available in Forest | Keep as separate raw inputs to F15 (see `step_1.md`) |
