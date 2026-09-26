# 01 Product requirements

## 1. Problem

London is short of homes, but homes don't get built where the demand is. The people who most want to live in an area (renters, movers, people priced out) don't vote there. The people who do vote there (existing residents, disproportionately homeowners) often don't feel the shortage. Building follows the second group, not the first.

The tool makes this gap visible seat by seat. For each of London's 75 parliamentary seats it shows:

- **Market demand:** how many outsiders want to live there.
- **Voter demand:** how worried current residents are about housing.
- **Missing homes:** how far building falls short of what the seat could deliver.
- **What is blocking building, and who can fix it.**
- **Where campaigning is most likely to change an MP's position.**

## 2. Goals

| ID | Goal | Measure |
|---|---|---|
| G1 | Separate market demand from voter demand cleanly and show where they diverge | Every seat classified on exactly two axes (`wtbPer1k`, `V`) per `demand_taxonomy.md` |
| G2 | Quantify missing homes per seat under a chosen London target | Missing homes shown for all 75 seats under 3 target scenarios |
| G3 | Diagnose the likely blocker per seat, with evidence strength and who can act | Every seat has ranked hypotheses with confidence labels |
| G4 | Rank seats by where a campaign is most likely to move the MP | 0–100 priority score and rank for all 75 seats |
| G5 | Turn a seat's evidence into a citable policy memo | 2–3 page PDF memo generated from seat data and policy library only |
| G6 | Keep data current without code changes | Editors can import updated fields; all users see the new version |

## 3. Non-goals

- Proving causation. The tool shows associations across 75 seats and 1,002 neighbourhoods.
- Site-level planning advice or viability appraisals.
- Coverage outside Greater London.
- Replacing official statistics; the tool cites them.

## 4. Users and roles

| Persona | Needs | Primary path |
|---|---|---|
| **Campaigner** (housing advocacy group, local activist) | Find their seat, understand the blocker, choose target seats, take a written case to an MP | Postcode → seat card → "Where to campaign" ranking → memo |
| **Policy analyst** (GLA, think tank, council officer, MP staff) | Pick a borough, set the target they work to, see which blocker dominates where, get a memo citing precedent | Borough filter → target setting → blocker map → memo |
| **Editor** (team member maintaining data) | Load new data (polling, completions) and have everyone see it | Admin panel → import JSON → version bump |
| **Viewer** (anyone given the link) | Read-only exploration | Map, card, table |

Access levels: Viewer (read), Contributor (read + save memos), Editor (read + save memos + change shared data).

## 5. Scope

### In scope (release 1)
- All features F01–F14 in the [feature specification](03_feature_specification.md), matching the prototype.
- F15, a reproducible data pipeline that regenerates the seat dataset from source files. **[New]**

### Out of scope (release 1)
- Neighbourhood (MSOA) level map. MSOA data is used in the model, but the UI shows seats only, plus top neighbourhoods as text.
- Historical time series and trend views.
- Public API.
- Automated scheduled data refresh (manual import only).

## 6. Assumptions and dependencies

- WhereToBuild (Warwick) MSOA housing-gap data is available for event use. The original CSV is still pending; the current values were rebuilt after a spreadsheet locale error (954 of 1,002 neighbourhoods recovered exactly, 48 imputed).
- Prime Radiant MRP housing concern (`mrp_concern_housing_shortages`, 17 Aug 2026 wave) is available through the Forest MCP server. 24 seats are currently estimated and must be replaced with measured values.
- Planning London Datahub completions and pipeline, brownfield land register, TfL PTAL, Census 2021, ONS electoral statistics, HoC Library 2024 results and mySociety MP data are available as files.
- An LLM API (Anthropic Claude) is available for memo generation.

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Estimated `V` for 24 seats misclassifies seats | Wrong area type and priority | Flag visibly (dashed outline, "est."), exclude from findings statistics, replace with the Forest extract |
| Readers infer causation | Misleading advocacy | "Patterns, not causes" copy on findings, method and memo |
| LLM memo invents facts | Credibility damage | Retrieval-grounded prompt, citations required, "use only given data" rule, data-gap section |
| Target choice changes results a lot (35k vs 63k missing/yr) | Confusion | Target shown in every missing-homes figure and memo footer |
| Seat thirds shift when data changes | Area types change silently | Re-derive live; show data version everywhere |
