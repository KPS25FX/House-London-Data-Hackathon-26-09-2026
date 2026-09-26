# 03 Feature specification

One section per feature. Each lists purpose, UI, behaviour, states and acceptance criteria (AC). Copy in quotes is the prototype's wording and should be kept unless a change is agreed.

| ID | Feature | Traces to | Pri |
|---|---|---|---|
| F01 | Role selector and guided steps | FR-SET-4, FR-VIEW-8 | M |
| F02 | Postcode lookup | FR-NAV-1, FR-NAV-2 | M |
| F03 | Hex map with layers | FR-VIEW-1 | M |
| F04 | Seat card | FR-VIEW-2 | M |
| F05 | Diagnosis panel and evidence library | FR-VIEW-3, FR-CLS-7 | M |
| F06 | Campaign ranking table | FR-VIEW-4, FR-NAV-4 | M |
| F07 | Settings: target and persuadability | FR-SET-1–3 | M |
| F08 | Evidence view (voice test) | FR-VIEW-5 | M |
| F09 | Area-type guide | FR-VIEW-6 | M |
| F10 | Policy memo generation and PDF | FR-MEMO-1–8, 10 | M |
| F11 | Follow-up Q&A | FR-MEMO-9 | S |
| F12 | Method and sources panel | FR-VIEW-7 | M |
| F13 | Data back end and status | FR-DAT-6, FR-DAT-8 | M |
| F14 | Admin: seed and import | FR-ADM-1–7 | M |
| F15 | Data pipeline **[New]** | FR-DAT-9 | S |

Page order (prototype): How to use → London map + Your area → Why homes aren't being built in [seat] → Where to campaign → Who decides what gets built (evidence) → The decision each area type calls for → Method → Data back end.

---

## F01 Role selector and guided steps

**Purpose.** Give each persona a four-step path through the tool.

**UI.** A two-button toggle ("Campaigner" / "Policy") with a one-line role note. Below it, an ordered list of 4 step cards. Each card has a heading, a one-line explanation, an optional input or button, and a "now" line showing current state. Completed steps get a done style.

**Campaigner steps**
1. *Find your seat.* Postcode input + Go. Now: "Selected: {seat} · MP {name}" or "No seat selected yet."
2. *See what's blocking homes.* Button "Show the blockers" scrolls to F05 (or focuses the postcode input if no seat is selected). Now: "Main blocker in {seat}: {blocker}."
3. *Pick where to push.* Button "Show target seats" sets the layer to *Where to campaign*, sorts the table by priority and scrolls to it. Now: the top 3 seats by priority as links, plus "{seat} ranks {n} of 75."
4. *Take the case to your MP.* Button "Write the memo" (disabled with no seat or no LLM). Now: memo status.

**Policy steps**
1. *Choose an area.* Borough select. Now: "{borough | All of London}: {n} seats · {built}/yr built · {missing}/yr missing · Delivery Test {x}% ({consequence})".
2. *Set the London target.* Target select (mirrors F07). Now: "London is {total missing} homes a year short where need is highest."
3. *Diagnose what's blocking homes.* Button "Map the blockers" sets the blocker layer. Now: most common blocker in scope and its count (excluding "none").
4. *Get the policy memo.* As campaigner step 4.

**Role defaults.** Campaigner sets layer `prio`, sort `prio`, table heading "Where to campaign". Policy sets layer `blocker`, sort `gap`, table heading "Where homes are missing". The role persists in local storage; the default is Campaigner.

**AC**
- AC1 Switching role changes steps, layer, sort, heading and note without a reload.
- AC2 The role survives a page reload. With storage unavailable, the page still loads as Campaigner.
- AC3 Step 4 is disabled until a seat is selected and memo generation is available.

## F02 Postcode lookup

**Purpose.** Get from "where I live" to "my seat" in one action.

**UI.** Text input ("Postcode, e.g. SE15 5DQ") + Go, in the "Your area" section and in campaigner step 1 (the two inputs stay in sync). A message line appears below.

**Behaviour** (algorithm in [05 ALG-11](05_algorithm_specification.md#alg-11-postcode-lookup)).
- Full postcode: exact seat. Message "Showing {seat}."
- Outward code only (e.g. SE15): the seat covering most of that district. Message "Showing the seat covering most of SE15. Enter the full postcode to be exact."
- Errors:
  - Fewer than 2 characters: "Enter a postcode, for example SE15 5DQ."
  - Unknown: "{PC} isn't a London postcode in this lookup. Check for typos, or try the first half (e.g. SE15)."
  - Known district but outside London: "{PC} is outside Greater London."

**AC**
- AC1 `se155dq`, `SE15 5DQ` and ` se15  5dq ` resolve identically.
- AC2 Outward-only input returns the district's modal seat with the partial message.
- AC3 A successful lookup selects the seat (FR-NAV-3) and scrolls to the card on narrow screens.

## F03 Hex map with layers

**Purpose.** See London at a glance on any one measure.

**UI.** An SVG hex grid, one pointy-top hex per seat at axial position (`q`, `r`), each labelled with a 1–3 letter abbreviation (initials, skipping and/of/the/upon). Label colour flips to light on dark fills. Above it, a layer toolbar of 7 toggle buttons. Below it, a legend. A tooltip follows the pointer.

**Layers and colouring**

| Layer id | Label | Fill |
|---|---|---|
| `type` | Area type | Bivariate 3×3 palette `BIV[Vt][Mt]` (Stevens) |
| `gap` | Missing homes | Sequential, `gap / max gap` |
| `prio` | Where to campaign | Sequential, `prio / 100` |
| `M` | Outside demand | Sequential, `Mp` |
| `V` | Residents worried | Sequential, `Vp` |
| `margin` | Seat margin | Sequential, `1 − min(1, marginPct/40)` (knife-edge = darkest) |
| `blocker` | Main blocker | Categorical, 8 blocker colours |

Bivariate palette (rows = voter tier 0→2, columns = market tier 0→2):
```
V0: #e8e8e8 #ace4e4 #5ac8c8
V1: #dfb0d6 #a5add3 #5698b9
V2: #be64ac #8c62aa #3b4994
```

**Legend.**
- *Area type:* a 3×3 grid with axis labels "Market demand →" and "Residents concerned →", plus the 5 type swatches with their one-line descriptions.
- *Blocker:* the categories present, with seat counts.
- *Sequential layers:* a gradient bar with end labels, e.g. "least concerned" to "most concerned", "safe (40+ pts)" to "knife-edge".

**Tooltip.** Seat name; type · unserved home-seekers; missing homes/yr · blocker; concern % (est.) · margin.

**States.**
- Selected hex: outlined.
- Seat with estimated `V`: dashed outline.
- Borough filter active: seats in other boroughs dimmed.

**AC**
- AC1 All 75 seats render. No two share a position.
- AC2 Every layer shows the right legend. Switching layers doesn't change the selection.
- AC3 Hexes are focusable. Enter/Space selects. Each has an accessible name.
- AC4 Seats with `vEst=true` show a dashed outline on every layer.

## F04 Seat card

**Purpose.** Everything about one seat in plain language.

**Content, top to bottom**
1. Eyebrow "Constituency", seat name, area-type chip.
2. MP line: "{MP} · {party}" or "No sitting MP · {note}". A Reform MP who was elected as a Conservative is annotated.
3. "2024: {won} won over {second}, by {majority} votes ({margin} pts)".
4. "Council: {borough} · {control} · Delivery Test {hdt}% ({consequence})".
5. **Verdict paragraph** (ALG-12): builds X a year, should build Y, so Z short or keeping up; about N in 10 residents worry; majority tiny/marginal/safe; main issue.
6. **Top 2 fixes:** the fix and who can act, from the top two hypotheses (excluding "No strong signal").
7. **"See the numbers"** (collapsible), six stats:
   - Missing homes a year (model target · built a year 2019/20–2024/25)
   - Residents who say neighbours worry (rank of 75, or "Estimated, Forest reading not yet pulled")
   - Home-seekers the market can't house (per 1,000 · rank of 75)
   - Owned / private rent / social rent % (outright %, % with 2+ spare bedrooms)
   - Approved not started · lapsed · refused (under construction · brownfield room)
   - Registered voters per 100 adults (% moved in within a year · % overcrowded)
8. Priority bar: "Campaign priority {prio}/100 · rank {n} of 75" and up to 3 reasons (ALG-13).
9. "Campaign ask for this type of seat": the type's ask text.

**AC**
- AC1 Every figure matches the computed values for the current settings.
- AC2 Estimated `V` is labelled wherever it appears.
- AC3 With no seat selected, the card is empty. No errors.

## F05 Diagnosis panel and evidence library

**Purpose.** Explain *why* homes aren't being built and what would help.

**UI.** Heading "Why homes aren't being built in {seat}". One card per hypothesis, in score order:
- Confidence badge: Strong evidence, Some evidence or Early signal.
- Title and explanation paragraph.
- Evidence line (numbers).
- "What would help", "Who can act".
- "To confirm" (the test) and "Background" (library ids as links).

Below the cards, a collapsible evidence list "Evidence the memo draws on ({n} library entries)". Each entry shows `[Kxx] Title. Text. Source: links`.

**Behaviour.** Hypotheses come from ALG-7. The evidence list comes from ALG-10 retrieval. Clicking a `[Kxx]` link opens the evidence list at that entry.

**Fix / who-can-act table.** This is fixed content, one row per hypothesis title. Keep the prototype's wording, stored as data rather than code.

**AC**
- AC1 Every seat shows at least one hypothesis. If none fire: "No strong signal from current data".
- AC2 Confidence is downgraded where the rules specify it for `vEst` seats.
- AC3 Each hypothesis's library references resolve to existing entries.

## F06 Campaign ranking table

**Purpose.** Compare and shortlist seats.

**Columns.** # (priority rank) · Seat (name + reasons line) · Type (chip) · Missing/yr · Concern (% + "est.") · Margin ("{n} votes" if majority < 1,000, else "{x} pts") · MP (name + short party) · Main blocker · Priority (number + bar).

**Controls**
- Filters: Type (all or 5 types), Party (all or short party names; "Vacant" if no MP), Borough (all or 33).
- Sort:
  - Campaign priority (desc)
  - Homes missing (desc)
  - Election margin (asc)
  - Stalled permissions (`approvedNS + lapsed`, desc)

**Behaviour.**
- Clicking a row selects the seat.
- The selected row is highlighted.
- If no rows match: "No seats match these filters."
- Party short names: Lab, Lab Co-op, Con, Lib Dem, Reform, Ind.

**AC**
- AC1 Filters combine with AND.
- AC2 The rank column always shows priority rank, whatever the sort.
- AC3 The borough filter here and in F01 stay in sync.

## F07 Settings: target and persuadability

**UI.** Collapsible "Adjust assumptions" block:
- London target select: 52,287 / 55,800 (default) / 88,000.
- Persuadability slider 0–100 (default 50), with output "{w} / {100−w}" labelled "close seat / residents split".

**Behaviour.** Any change triggers a recompute (ALG-3, ALG-4) and redraws the map, card, table, scatter, diagnosis and steps. The target also mirrors the policy step 2 select.

**AC**
- AC1 Target 55,800 gives total missing ≈ 35,000/yr. Target 88,000 gives ≈ 63,000/yr (tolerance ±2%).
- AC2 Slider at 100 ranks by closeness only. At 0, by resident split only.

## F08 Evidence view ("Who decides what gets built: demand, or the people already here?")

**Scatter.**
- Measured-`V` seats with `wtbPer1k > 0`.
- x = `wtbPer1k` on a log10 scale (ticks 10, 20, 50, 100, 200, 500 within range). y = `V`, 0–60% (ticks every 10%).
- Points are coloured by the bivariate palette. The selected point is outlined. Tooltip shows name, per 1,000, % concerned and type. Click selects.

**Findings.** Four cards. Each has a headline comparison "{top third} vs {bottom third}", an explanation, a "So what" line and a rank correlation (ALG-14):
1. High-demand seats build less than low-demand ones (build per 1,000 existing homes by `wtbPer1k` thirds; ρ build vs demand).
2. Owner-dominated seats build about X% less (by `owned` thirds; ρ build vs owned).
3. Renter-heavy seats have fewer people on the register (`regPer100` by `privRent` thirds; ρ).
4. Owners worry far less about housing (`V` by `owned` thirds, measured seats only; ρ).

Footer: "These are patterns across London, not proof of cause."

**AC**
- AC1 With the current snapshot, findings reproduce the taxonomy §8 values: 7.8 vs 10.3; 5.2 vs 11.4, ρ −0.42; 76 vs 87, ρ −0.58; 22% vs 42%, ρ −0.65 (±0.1 / ±1 pt).
- AC2 Estimated seats are excluded from the scatter and from finding 4.

## F09 Area-type guide ("The decision each area type calls for")

Five cards in the order Locked out, Ready to build, Middle ground, Worried no market, Settled. Each shows chip, live seat count, "who" line, logic paragraph and "Ask:". Text is taken from the prototype's `TYPES` table (see [05 ALG-2](05_algorithm_specification.md#alg-2-tiers-and-area-type)).

**AC.** The counts sum to 75 and match the map.

## F10 Policy memo generation and PDF

**Purpose.** Turn the seat diagnosis into a document someone can hand to an MP or council.

**UI.** In the diagnosis section:
- "Write a policy memo" button, "Stop" button, status line.
- While generating: a spinner and "Reading the seat data and policy library…", then "Drafting the memo… {n} words", then "Building the PDF…".
- Result card: PDF icon, eyebrow "Policy memo · {seat}", bottom-line excerpt (first 2 sentences of "Bottom line"), meta line (when, by whom, saved or not, stale flag), actions: Open PDF · Download PDF · Copy text.
- The button then reads "Write a new memo".

**Behaviour**
1. Build context (ALG-10): seat facts JSON, hypotheses, 3 similar seats, 11–12 library entries.
2. Send the fixed prompt to the LLM with streaming. Cancellable.
3. On completion:
   - Build the PDF.
   - Store the PDF.
   - Save the memo record (FR-MEMO-5), unless the response was truncated or the user can't write.
4. Selecting a seat with a saved memo shows it immediately, author shown as "you", a teammate's name or "a teammate". If `dataVersion` ≠ current version: "data has changed since; write a new one for current figures".
5. Recent memos list: up to 8, newest first, with PDF link, date and "View seat".

**PDF layout (A4, mm, margins 18)**
- 4 mm accent bar at the top of every page.
- Eyebrow "POLICY MEMO · LONDON HOUSING", seat name (20 pt bold), line "{borough} · {MP (party)} · 2024 margin", line "Generated {date} by {name} · model target {total} homes a year London-wide".
- Key-figures strip, 4 boxes: Homes built a year · Model: should build · Missing a year · Residents worried (est.).
- Body from Markdown: `##` becomes a 12.5 pt accent heading, bullets use accent dots, paragraphs 10 pt.
- "Sources consulted": each library entry with its source links, then a fixed data-sources sentence.
- Footer on every page: "Policy memo · {seat} · data version {v}" and "{i} / {n}".
- Characters outside the PDF font's range are transliterated (≈ → ~, → → ->, ≥ → >=, etc.).

**Error messages** (keep these):

| Error | Message |
|---|---|
| not_granted | "Memo generation needs your permission to use Claude." |
| rate_limited | "Too many requests just now. Try again in a minute." |
| session_expired | "Sign in to Claude again, then retry." |
| prompt_too_large | "Too much context for one memo." |
| refused | "Claude declined this request." |
| unavailable | "Claude isn't available for this account." |
| upstream_error | "The connection dropped. Try again." |
| other | "Something went wrong. Try again." |

If the user cancels: "Stopped." If generation is interrupted partway, show the partial text as "Interrupted before finishing".

**AC**
- AC1 The memo cites only library ids that were in its context. Validate after generation and flag any unknown ids.
- AC2 The memo contains all 8 sections in order.
- AC3 The PDF opens in standard viewers, paginates correctly and carries the data version on every page.
- AC4 A Viewer can generate and download, but the memo is not saved ("not saved: view-only access").
- AC5 Switching seats mid-generation aborts the request.

## F11 Follow-up Q&A

**UI.** Shown after a memo exists: text input + Ask. The answer streams in below as rendered Markdown with `[Kxx]` links.

**Behaviour.** The prompt is:
- the memo prompt's rules (everything above "FORMAT"),
- then seat data, library, earlier memo (first 6,000 characters) and the question,
- then the instruction "Answer in under 200 words, citing library entries".

Answers are not cached or saved.

**AC.** An answer appears within the streaming UI. Errors use the F10 messages.

## F12 Method and sources panel

Static explanatory text with live values:
- Outside demand (WhereToBuild), including the locale-recovery note (954 of 1,002 exact).
- Resident concern (Forest MRP, 17 Aug 2026; measured count; estimate model R², n, ±error; dashed outline).
- Missing-homes model (quantile frontier, elasticity 0.5, calibration).
- Building activity (Datahub, brownfield register, borough context sources).
- Area type.
- Persuadability formulas.
- Seats and MPs (HoC Library, mySociety Sep 2026, ONS postcode directory).
- Limits.

**AC.** The measured-seat count and V-model statistics update when data changes.

## F13 Data back end and status

**Behaviour.**
- On load, try to connect to the live store and subscribe to `meta/config`, `seats`, `kb`, `boroughs` and `memos`.
- Incoming seat docs merge into rows (unknown codes with a name are added).
- Library and borough collections replace the snapshot when non-empty.
- Updates are debounced (about 120 ms) into a single recompute and redraw.

**Status line** (always visible):

| Mode | Text |
|---|---|
| snapshot | "Snapshot data · version {v}" |
| live | "Live database · version {v} · updated {date}" |
| empty | "Database connected but empty · showing snapshot {v}" |
| error | "Database unavailable · showing snapshot {v}" |

**AC**
- AC1 With no back end, the app is fully usable read-only.
- AC2 An import by an Editor appears in another open session within 2 s, without a reload.

## F14 Admin: seed and import

**UI.** Section "Data back end", visible to Editors only.
- Stats: seats {n}/75 · library entries · boroughs · memos · version.
- **Seed** button with inline confirm (Yes/No).
- **Import** file picker or paste box, a validation summary ("{n} seats, fields: …. New data version: {v}.") and a confirm step.
- Message line.

**Behaviour.**
- Seed writes all snapshot seats, library, boroughs and `meta/config` sequentially. Progress shows every 10 docs.
- Import validates (FR-ADM-4), writes merged fields (full records if the DB is empty), then updates `meta/config` with version and note.
- Errors:
  - "The database is full. Delete old memos and try again."
  - "You don't have permission to change shared data."
  - "Import stopped part-way. Re-run the same file to finish."

**Allowed import fields.** Listed in [04 §2](04_data_specification.md#2-seat-record) (the `SEAT_FIELDS` list).

**AC**
- AC1 An import with an unknown code, an unknown field or a non-numeric value is rejected whole, and the error names the item and field.
- AC2 Importing the same file twice leaves the data unchanged apart from the version.
- AC3 Non-editors can't reach the admin endpoints (server-enforced).

## F15 Data pipeline **[New]**

**Purpose.** Replace the prototype's hand-built snapshot with reproducible builds.

**Behaviour.** A command (e.g. `make data` or `python -m pipeline build`) that:
1. Reads raw inputs from `data/raw/` (WhereToBuild MSOA CSV, Forest MRP extract, Datahub, brownfield register, PTAL, Census, ONS electoral stats, HoC results, mySociety MPs, borough context, ONS postcode directory, MSOA→PCON best-fit lookup).
2. Aggregates MSOA to seat (best-fit sum), computes `wtbPer1k` and the missing-homes model inputs (`raw` per ALG-3a), fits the V-estimate regression for seats without measured `V`, and assigns `vEst`.
3. Writes `data/build/seats.json`, `boroughs.json`, `kb.json`, `postcodes.json` and `meta.json` (version, model coefficients, V-model stats, WhereToBuild total), plus a `provenance.json` per field.
4. Validates against the schema, checks that all 75 codes are present, and runs sanity checks (ranges, no NaN).

**AC**
- AC1 Two runs on the same inputs produce byte-identical outputs.
- AC2 The output passes the import validation used by F14.
- AC3 The pipeline reproduces the prototype snapshot within tolerance, or documents each difference.
