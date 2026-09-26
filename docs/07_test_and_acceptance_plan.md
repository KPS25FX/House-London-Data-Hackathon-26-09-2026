# 07 Test and acceptance plan

## 1. Strategy

| Level | What | Tooling (suggested) |
|---|---|---|
| Unit | Each ALG in `core/` in isolation, with hand-computed cases | Vitest / pytest |
| Golden (parity) | Full `core.compute` on the prototype snapshot. Outputs must equal the values extracted from the prototype | Vitest with a fixture `tests/golden/prototype_snapshot.json` |
| Pipeline | Schema validation, determinism, reproduction of the prototype snapshot | pytest |
| Integration | API: import validation, role enforcement, live broadcast, memo endpoint (LLM mocked) | Supertest / pytest + httpx |
| End-to-end | User journeys per role in a real browser | Playwright |
| Accessibility | Automated axe checks plus manual keyboard pass | axe-core, Playwright |
| LLM evaluation | Memo structure, citation validity and no invented numbers, on a sample of seats | Scripted checks + human review |

## 2. Golden parity fixture

Extract `DATA.rows`, `DATA.boroughs`, `KB` and `PC` from the prototype HTML into `tests/golden/`. Record the prototype's computed outputs for each seat at the default settings (T = 55,800, w = 0.5) and at T ∈ {52,287, 88,000}, w ∈ {0, 1}: `Mp, Vp, Mt, Vt, type, target, gap, dP, prio, rank, bpkP`, hypothesis titles and confidences, blocker category and the 3 similar seats.

The rebuild must match exactly: categorical outputs identical, numeric outputs within 1e-9.

## 3. Acceptance tests (release 1)

| ID | Test | Traces |
|---|---|---|
| AT-01 | Snapshot area-type counts are ready 15, locked 3, worried 3, settled 11, middle 43 | ALG-2, F09 |
| AT-02 | Total missing homes ≈ 35,000 at 55,800 and ≈ 63,000 at 88,000 (±2%), or D4 has been resolved and the figures documented | ALG-3, F07 |
| AT-03 | Findings reproduce taxonomy §8 (7.8 vs 10.3; 5.2 vs 11.4, ρ −0.42; 76 vs 87, ρ −0.58; 22% vs 42%, ρ −0.65) | ALG-14, F08 |
| AT-04 | Only `wtbPer1k` and `V` affect `type`. Mutating any other field leaves types unchanged | FR-CLS-3 |
| AT-05 | Slider at 100 orders priority identically to `gap × close`. At 0, to `gap × swing` | ALG-4 |
| AT-06 | Every seat has ≥ 1 hypothesis. All library references resolve | ALG-7, F05 |
| AT-07 | `vEst` seats show "est." or a dashed outline on the map, card, table and memo, and are excluded from the scatter and finding 4 | FR-DAT-7 |
| AT-08 | Postcodes: full, outward-only, lowercase or spaced, typo and outside-London cases give the specified results | ALG-11, F02 |
| AT-09 | Campaigner journey: postcode → card → blockers → target seats → memo, done by keyboard only | F01–F06, F10, NFR-2 |
| AT-10 | Policy journey: borough → target → blocker map → memo | F01, F03, F07, F10 |
| AT-11 | Import: an invalid code, field or type is rejected whole with a specific message. A valid import updates a second session within 2 s and bumps the version | F14, F13 |
| AT-12 | A non-editor calling the import or seed API gets 403 | NFR-7 |
| AT-13 | With the back end offline, the app loads from the snapshot, the status reads "Database unavailable · showing snapshot", and memo buttons explain why they're disabled | NFR-8 |
| AT-14 | Memo has 8 sections in order, 600–800 words (±15%), only in-context `[Kxx]` ids, and no numbers absent from seat facts (automated diff of numerals) | F10 |
| AT-15 | Memo PDF has the data version on every page footer and the correct page count | F10 |
| AT-16 | A saved memo is flagged stale after a data version bump | FR-MEMO-6 |
| AT-17 | Pipeline runs twice with identical outputs, and the outputs pass import validation | F15 |
| AT-18 | Recompute plus redraw < 200 ms (median of 20 runs) | NFR-1 |
| AT-19 | axe: no serious or critical violations in light or dark mode at 360 px and 1280 px | NFR-2–4 |

## 4. Definition of done (per feature)

- Acceptance criteria in [03](03_feature_specification.md) pass.
- Unit and golden tests are green.
- Copy matches the prototype or an agreed change.
- Accessible by keyboard and screen reader.
- Documented in `docs/` if its behaviour differs from the prototype.
