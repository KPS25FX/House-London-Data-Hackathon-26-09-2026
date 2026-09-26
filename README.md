# The Demand That Can't Vote

A London housing policy tool. For each of London's 75 Westminster seats it estimates how many homes a year are missing against a London target, diagnoses the main local blocker, and shows the MP, council and Mayoral levers that could move it. It can also write a policy brief as a PDF.

The app is one self-contained HTML page (`dist/index.html`) built from `app/template.html` plus the JSON files in `data/`.

## Quick start

```bash
npm install                      # jspdf (tests) + playwright
npx playwright install chromium
npm run build                    # -> dist/index.html
npm test                         # build + end-to-end tests with a mocked Claude runtime
# CHROMIUM_PATH=/path/to/chrome npm test   (use an existing Chromium)
```

Open `dist/index.html` in a browser. Outside Claude it runs in **snapshot mode**: map, diagnosis, rankings and evidence all work from the embedded data. The shared database, memo writing and PDF saving need the Claude artifact runtime (see below) or your own backend.

## Repository layout

| Path | What it is |
|---|---|
| `app/template.html` | The whole app: HTML, CSS, JS. Placeholders `__DATA__`, `__PC__`, `__KB__`, `__BOROUGHS__`, `__GEO__` are filled at build time. |
| `app/build.py` | Inlines `data/*.json` into the template, writes `dist/index.html`. |
| `data/data.json` | 75 seat rows (all fields below), model metadata, data version. |
| `data/geo.json` | Simplified 2024 constituency boundaries and borough outlines as SVG paths (built by `pipeline/geo_build.py`). |
| `data/london_hex.json` | Hex cartogram positions (ODI `uk-constituencies-2023.hexjson`, London subset). |
| `data/pc.json` | Outward-code → seat lookup (with inward-code exceptions for split outcodes). |
| `data/kb.json` | Policy library for retrieval: K01–K14 policy entries, K20–K52 borough profiles (built by `pipeline/kb_build.py`). |
| `data/boroughs.json` | 33 boroughs: Housing Delivery Test 2025, approvals, pipeline, second and empty homes, council control. |
| `data/msoa_pcon_w.json` | MSOA → seat area weights (used to aggregate MSOA results to seats). |
| `data/seat_tops.json` | Top neighbourhoods by missing homes within each seat. |
| `data/mps.json`, `data/hoc.json` | Current MPs; 2024 results (majority, valid votes, turnout). |
| `data/model_meta.json` | Fitted missing-homes model coefficients. |
| `data/restricted/` | Event-use-only inputs (WhereToBuild). Git-ignored. |
| `pipeline/` | Scripts that produce the data files (see below). |
| `tests/` | Playwright tests with a mocked `window.claude` (db, user, sample, assets, downloads). |
| `docs/demand_taxonomy.md` | Market vs voter demand: definitions, variables, classification rules. Written for agents working on the tool. |
| `.github/workflows/build.yml` | CI: build, test, upload `dist/index.html`. |

## How the numbers are built

1. **Missing homes** (`pipeline/missing_homes_model.py`). For 1,002 MSOAs: quantile regression (q = 0.8) of `log(1 + completions per 1,000 dwellings a year)` on `log(PTAL)` and `log(1 + brownfield capacity per 1,000 dwellings)`. Coefficients: 1.321, 0.239, 0.162. Capacity is scaled by WhereToBuild demand, `(gap per 1,000 dwellings / London median)^0.5`, clipped to [0.25, 4]. That gives a per-MSOA `raw` value, which is summed to seats with the area weights. In the browser, `target = London total × raw / Σraw` and `missing = max(0, target − actual completions)`. Selectable totals: 52,287 (London Plan 2021), 55,800 (draft London Plan), about 88,000 (government assessed need).
2. **Voter side.** `V` is the share saying their neighbours are concerned about housing, from Prime Radiant MRP via Forest (17 Aug 2026 wave). 24 seats are estimated from a regression on ownership, price/earnings, price change and demand (`vEst: true`). The regression is in `pipeline/build_seats_base.py`.
3. **Area types.** Terciles on `wtbPer1k` (market) × `V` (voter): Locked out, Ready to build, Worried no market, Settled, Middle ground.
4. **MP leverage.** `closeness = 1/(1 + margin/5)`, `split = 1 − |2 × rank(V) − 1|`, blended by a slider. Priority = missing-homes share × leverage.
5. **Blockers.** Deterministic rules in `hypotheses()` (template) grouped into seven categories for the map (`blockCat()`).

## Pipeline

```bash
./scripts_vendor.sh              # clones drkane/geo-lookups and mysociety/2025-constituencies into vendor/
pip install -r requirements.txt
python pipeline/decode.py        # WhereToBuild xlsx repair (needs data/restricted inputs)
python pipeline/missing_homes_model.py data/restricted/msoa.pkl
python pipeline/build_seats_base.py
python pipeline/kb_build.py
python pipeline/geo_build.py
npm run build
```

`build_seats_base.py` builds the core seat rows: WhereToBuild, HoC results, MPs, Forest price and tenure fields (hard-coded in `seats_raw.py` and `tenure.py`), plus the V model. The fields added after that (Census 2021 tenure and mobility, Datahub pipeline, brownfield, PTAL, prices, registration, `raw`, `tops`) were merged into `data.json` interactively and are **not yet scripted**. To regenerate them, rebuild from the London dataset files listed below and join on `code` (PCON24CD). Scripting this merge is the first job for a fully reproducible pipeline.

Scripts were written in a flat working directory. Before running, check the input and output paths at the top of each script.

## Data sources

| Data | Source |
|---|---|
| Housing demand gap (MSOA) | WhereToBuild, Warwick: https://wheretobuild.warwick.ac.uk/ (**event use only**; commit summaries only) |
| Completions, pipeline, lapsed, refused | Planning London Datahub: https://www.planningdata.london.gov.uk/ |
| Resident concern, price/earnings, tenure | Forest research releases (Prime Radiant MRP, HoC Library) via the Forest connector |
| 2024 results | House of Commons Library, General Election 2024 results |
| 2024 constituency boundaries | mySociety 2025-constituencies: https://github.com/mysociety/2025-constituencies |
| MSOA/ward lookups and ward boundaries | drkane/geo-lookups: https://github.com/drkane/geo-lookups |
| Hex cartogram | ODI Leeds hexmaps: https://github.com/odileeds/hexmaps |
| Housing Delivery Test | MHCLG: https://www.gov.uk/government/collections/housing-delivery-test |
| Census 2021 | ONS via Nomis: https://www.nomisweb.co.uk/ |
| PTAL | TfL via London Datastore: https://data.london.gov.uk/ |
| Brownfield land | https://www.planning.data.gov.uk/dataset/brownfield-land |

## Runtime back end (inside Claude)

The page asks the Claude artifact runtime for capabilities with `claude.use(name)`:

- `db`: collections `seats` (75, keyed by PCON24 code), `boroughs` (keyed by name), `kb`, `meta/config` (`version`, `updatedAt`), `memos` (keyed by seat code: `text`, `pdfId`, `docs`, `by`, `createdAt`). Rules: seats, boroughs, kb and meta need admin (Editor) to write; memos need Contributor.
- `sample`: memo writing. The prompt is built by `memoPrompt()` from the seat data, similar seats and BM25-retrieved library entries.
- `assets`: stores the memo PDF (served at `/_blob/<id>`).
- `downloads`: saves the PDF to the viewer's device.
- `user`: names memo authors and gates the admin panel.

If any capability is missing, the page falls back to the embedded snapshot and hides the affected controls.

## Making it a standalone app

To run the tool outside Claude, replace `window.claude` with your own services. The code paths are isolated in `initBackend()`, `genMemo()` and `saveMemo()`.

- **Database:** Supabase or Firestore with the same collections. Keep `meta/config.version` so clients know when to refresh.
- **Memo generation:** a serverless function that calls the Anthropic API with `memoPrompt()` output. Never put the API key in the page.
- **PDF storage:** object storage (S3 or R2) in place of `assets`.
- **Data refresh:** a scheduled GitHub Action that runs the pipeline, commits `data/*.json` and redeploys `dist/` (for example to GitHub Pages).

## Known gaps

- 24 seats use estimated resident concern until the full Forest MRP extract is pulled.
- WhereToBuild tightness couldn't be recovered from the shared file. 48 MSOAs use their borough's median density.
- Findings are associations across 75 seats and 1,002 MSOAs, not causal estimates.
