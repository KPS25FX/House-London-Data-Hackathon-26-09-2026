# 02 Functional specification

Each requirement is testable. Priority is MoSCoW. Formulas referenced as `ALG-x` are defined in [05 Algorithm specification](05_algorithm_specification.md).

## 1. Data and computation (FR-DAT)

| ID | Requirement | Pri |
|---|---|---|
| FR-DAT-1 | The system shall hold one record per London seat (75), keyed by ONS PCON24 code, with the fields in [04 §2](04_data_specification.md#2-seat-record). | M |
| FR-DAT-2 | The system shall hold one record per London borough (33), keyed by LAD code, with the fields in [04 §3](04_data_specification.md#3-borough-record). | M |
| FR-DAT-3 | The system shall hold a policy library of entries (currently K01–K52), each with id, title, tags, text and sources. | M |
| FR-DAT-4 | The system shall hold a postcode-to-seat lookup covering Greater London postcodes. | M |
| FR-DAT-5 | On load, and whenever data or settings change, the system shall recompute all derived seat values (ALG-1 to ALG-6). | M |
| FR-DAT-6 | The system shall carry a data version string and display it with every data-dependent output (status line, memo, PDF footer). | M |
| FR-DAT-7 | Each seat shall carry `vEst` (true when `V` is estimated), and every display of `V` shall mark estimated values. | M |
| FR-DAT-8 | If the live database is unavailable or empty, the system shall fall back to a bundled snapshot dataset and say so in the status line. | M |
| FR-DAT-9 | **[New]** A pipeline shall regenerate the seat, borough and postcode datasets from raw source files, deterministically, with provenance for each field. | S |

## 2. Classification and scoring (FR-CLS)

| ID | Requirement | Pri |
|---|---|---|
| FR-CLS-1 | The system shall rank seats by percentile on `wtbPer1k` (market) and `V` (voter), using mid-rank ties (ALG-1). | M |
| FR-CLS-2 | The system shall assign each seat a tier (0/1/2) per axis by thirds, and an area type: Locked out, Ready to build, Worried no market, Settled, Middle ground (ALG-2). | M |
| FR-CLS-3 | No variable other than `wtbPer1k` and `V` shall enter the classification. | M |
| FR-CLS-4 | The system shall compute per-seat model target and missing homes for the selected London total (ALG-3). | M |
| FR-CLS-5 | The system shall compute closeness, resident split, persuadability `dP`, campaign priority (0–100) and rank (ALG-4). | M |
| FR-CLS-6 | The system shall compute building per unserved home-seeker (`bpk`) and its percentile (`bpkP`) (ALG-5). | M |
| FR-CLS-7 | The system shall evaluate the 13 hypothesis rules per seat, attach confidence, evidence, test and library references, and sort by score (ALG-7). | M |
| FR-CLS-8 | The system shall derive each seat's main blocker category from its top eligible hypothesis (ALG-8). | M |
| FR-CLS-9 | The system shall find the 3 most similar seats to any seat (ALG-9). | M |

## 3. Settings (FR-SET)

| ID | Requirement | Pri |
|---|---|---|
| FR-SET-1 | The user shall choose the London annual target: 52,287 (London Plan 2021), 55,800 (draft London Plan, default), or 88,000 (government assessed need). | M |
| FR-SET-2 | The user shall set the persuadability weight between closeness and resident split, 0–100 (default 50/50). | M |
| FR-SET-3 | Changing a setting shall update map, card, table, scatter, diagnosis and guided steps without a reload. | M |
| FR-SET-4 | The user shall choose a role (Campaigner or Policy). The role sets the default map layer and table sort, and changes the guided steps. The choice persists per browser. | M |

## 4. Navigation and selection (FR-NAV)

| ID | Requirement | Pri |
|---|---|---|
| FR-NAV-1 | The user shall select a seat by postcode (full or outward code), by clicking a map hex, a table row, a scatter point, a similar-seat link or a recent memo. | M |
| FR-NAV-2 | Postcode lookup shall normalise input (case, spaces), resolve full postcodes exactly, resolve outward codes to the seat covering most of that district, and report partial matches, typos and non-London postcodes in plain language. | M |
| FR-NAV-3 | Selecting a seat shall update the map highlight, seat card, table highlight, scatter highlight, diagnosis panel and guided steps. | M |
| FR-NAV-4 | The user shall filter by borough. Doing so dims other seats on the map, filters the table and auto-selects the borough's seat with the most missing homes if no seat in that borough is selected. | M |

## 5. Views (FR-VIEW)

| ID | Requirement | Pri |
|---|---|---|
| FR-VIEW-1 | Hex map of 75 seats with 7 layers: area type (bivariate 3×3), missing homes, where to campaign, outside demand, residents worried, seat margin, main blocker. Includes legend, tooltip and dashed outline for estimated `V`. | M |
| FR-VIEW-2 | Seat card: name, MP, 2024 result, council, area type, plain-language verdict, top 2 fixes, detailed numbers, priority bar and campaign ask. | M |
| FR-VIEW-3 | Diagnosis panel: all hypotheses with confidence, explanation, evidence, fix, who can act, test and library references, plus the retrieved evidence list. | M |
| FR-VIEW-4 | Ranking table: rank, seat plus reasons, type, missing/yr, concern, margin, MP and party, main blocker, priority. Filters for type, party and borough. Sorts by priority, missing homes, margin (ascending) and stalled permissions. | M |
| FR-VIEW-5 | Evidence view: scatter of `wtbPer1k` (log x) against `V` for measured seats, coloured by type, plus 4 headline findings with top-third vs bottom-third comparisons and Spearman correlations. | M |
| FR-VIEW-6 | Area-type guide: 5 cards with seat count, who, logic and ask per type. | M |
| FR-VIEW-7 | Method and sources panel describing every data source and model, with live figures (measured seat count, V-model R², n, error). | M |
| FR-VIEW-8 | Guided "How to use" steps per role, each showing the current state ("now" line) and an action button. | S |

## 6. Memo and Q&A (FR-MEMO)

| ID | Requirement | Pri |
|---|---|---|
| FR-MEMO-1 | For the selected seat, the user shall generate a policy memo using an LLM, grounded only in seat facts, hypotheses, 3 similar seats and retrieved library entries (ALG-10). | M |
| FR-MEMO-2 | The memo shall follow the fixed section structure (Bottom line, What the data shows, Diagnosis, Policy context and history, Options, Outlook and implications, Campaign ask, Data gaps), 600–800 words, with inline `[Kxx]` citations. | M |
| FR-MEMO-3 | Generation shall stream progress (word count), be cancellable, and show a specific message per failure type. | M |
| FR-MEMO-4 | The system shall render the memo as an A4 PDF with a header, seat line, key-figures strip, body, sources consulted and a footer with data version and page numbers. | M |
| FR-MEMO-5 | Contributors and above shall save the memo (one per seat, replacing the previous one) with text, library ids, hypotheses, data version, model, author, timestamp and PDF reference. | M |
| FR-MEMO-6 | A saved memo shall be shown when its seat is selected. It shall be flagged stale if the data version has changed since it was written. | M |
| FR-MEMO-7 | The user shall download the PDF and copy the memo text. | M |
| FR-MEMO-8 | The system shall list the 8 most recent saved memos with links to the PDF and the seat. | S |
| FR-MEMO-9 | After a memo exists, the user shall ask follow-up questions. Answers are under 200 words, cite the library, and use seat data plus the earlier memo. | S |
| FR-MEMO-10 | Library citations in memo and answers shall link to the evidence list entry. | S |

## 7. Data administration (FR-ADM)

| ID | Requirement | Pri |
|---|---|---|
| FR-ADM-1 | Only Editors shall see the admin panel. | M |
| FR-ADM-2 | The admin panel shall show counts: seats (n/75), library entries, boroughs, memos, and the current data version. | M |
| FR-ADM-3 | Editors shall seed the database from the bundled snapshot (seats, library, boroughs, config), after an explicit confirmation step. | M |
| FR-ADM-4 | Editors shall import a JSON array of `{code, field: value}` objects. Validation: the code must be one of the 75 seats, the field must be in the allowed list, numeric fields must be finite numbers. Any error rejects the whole file with a specific message. | M |
| FR-ADM-5 | A valid import shall show a summary (seat count, fields, new version) and require confirmation before writing. | M |
| FR-ADM-6 | On import, the system shall write changed fields, set a new version `YYYY-MM-DD.HHMM` with a note, and push the update to all connected users in real time. | M |
| FR-ADM-7 | Writes shall retry once on transient failure. Partial failures shall report that re-running the same file completes it. | M |

## 8. Non-functional requirements (NFR)

| ID | Requirement | Pri |
|---|---|---|
| NFR-1 | **Performance:** recompute plus redraw after a setting change completes in under 200 ms on a mid-range laptop. | M |
| NFR-2 | **Accessibility:** WCAG 2.2 AA. Map hexes, table rows and scatter points are keyboard-operable (Enter/Space), have accessible names, and colour is never the only encoding (labels, legends, text values). | M |
| NFR-3 | **Responsive:** usable at 360 px width. Selecting a seat on narrow screens scrolls to the card. | M |
| NFR-4 | **Theming:** light and dark mode, both meeting contrast requirements. | S |
| NFR-5 | **Provenance:** every figure traceable to a source and vintage (see [04](04_data_specification.md)). | M |
| NFR-6 | **Honesty copy:** findings, method and memo state "association, not causation" and flag estimates. | M |
| NFR-7 | **Security:** role checks enforced server-side for all writes. LLM keys never reach the browser. User-supplied text rendered as escaped text. | M |
| NFR-8 | **Resilience:** the app works read-only from the snapshot if the database or LLM is down. Memo features degrade with a clear message. | M |
| NFR-9 | **Reproducibility:** given the same inputs and settings, all derived values are identical (deterministic ranking and tie handling). | M |
| NFR-10 | **Privacy:** no personal data stored beyond user id and display name on memos. | M |
| NFR-11 | **Language:** plain UK English. Numbers formatted `en-GB`. | M |
