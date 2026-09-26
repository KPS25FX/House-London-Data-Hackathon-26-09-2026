# London Housing Gap Explorer — "The Demand That Can't Vote"

An interactive map and policy tool for London's 75 parliamentary seats. For each seat it separates **market demand** (people outside the seat who want to live there) from **voter demand** (how worried current residents are about housing), estimates how many homes a year are missing against a London target, diagnoses the most likely local blocker, and suggests policies scored for fit and risk against past policy evaluations. It can draft a policy memo for any seat.

Built at **House London #2 Data Hackathon, Newspeak House, 26 Sep 2026**.

![Screenshot of the map view](docs/screenshot.png)
<!-- TODO: add docs/screenshot.png (map view with a seat selected). -->

## The problem

The people who most need homes in an area (renters, movers, people priced out) often don't vote there. The people who do vote there feel the shortage least. Local politics follows voters, so housebuilding tends to follow voter sentiment rather than demand. The tool shows that gap seat by seat and turns it into something a campaigner, council officer or MP's team can act on.

## The method

1. **Classify every indicator as market-side or voter-side.** Each variable is tagged by whose preference it measures (`pipeline/indicators.py`; definitions in [`docs/demand_taxonomy.md`](docs/demand_taxonomy.md) and [`docs/step_1_market_vs_voter.md`](docs/step_1_market_vs_voter.md)). Market = behaviour of would-be residents (search demand, prices). Voter = opinion or electoral weight of current residents (polled concern, registration, margins). Tenure and age are *voter composition*: they explain voter demand but are kept out of the voter axis. Homes built, approved or refused are *outcomes* of the two sides.
2. **Measure voter–market disagreement per seat.** Each side is reduced to a headline indicator: market = WhereToBuild housing gap per 1,000 residents (`wtbPer1k`); voter = share of residents saying their neighbours worry about housing (`V`). Both are ranked across London's 75 seats, and the pair of ranks places each seat in a 3×3 grid (`core/src/compute.ts`, `core/src/classify.ts`). Seats where the sides disagree, **Locked out** (high outside demand, residents unbothered) and **Worried, no market** (residents anxious, little outside demand), are the voter–market gap.
3. **Estimate missing homes.** A quantile regression over 1,002 neighbourhoods (MSOAs) of building rates on transport access and brownfield capacity gives each area its potential; London's target is shared out in proportion and compared with actual completions (`core/src/missing.ts`, `pipeline/model.py`).
4. **Suggest policies per seat.** Deterministic rules diagnose the likely blocker (`core/src/hypotheses.ts`). Each candidate policy is scored for **fit** and **risk** from the seat's own data, next to what past evaluations found it **delivered** (`core/src/policyfit.ts`). A memo writer (`server/`) turns the diagnosis into a cited brief.

The voter-vs-market indicator split, the disagreement measure and evidence-weighted policy suggestions are Keval's model design. The current build uses one headline indicator per side; a multi-indicator distance between the two sides is the natural next step. Full formulas: [`docs/08_formal_model.md`](docs/08_formal_model.md) and [`docs/05_algorithm_specification.md`](docs/05_algorithm_specification.md).

All findings are associations across 75 seats and 1,002 neighbourhoods, not causal estimates.

## How to run

Tested with Node 24 and Python 3.14.

```bash
npm ci                                   # JS dependencies (core, web, server)
pip install -r pipeline/requirements.txt
npm run data      # python -m pipeline build -> web/public/data/*.json + db/london.sqlite
npm run dev       # website on http://localhost:5173
npm run server    # memo API on :8787; mock mode unless ANTHROPIC_API_KEY is set in server/.env
npm test          # core + server (vitest) + pipeline (pytest)
npx playwright install chromium && npm run e2e   # end-to-end browser tests
```

The built JSON is committed, so `npm run dev` works without running the pipeline. See [`server/README.md`](server/README.md) for the memo API.

## Repository layout

| Path | What it is |
|---|---|
| `pipeline/` | Python data pipeline: ingest, clean, model, then write `web/public/data/*.json` and a SQLite copy |
| `core/` | Pure TypeScript engine: classification, missing homes, leverage, blockers, policy fit, scenarios, memo prompts |
| `web/` | Vite + TypeScript website: map, seat card, scenarios, trends, evidence, rankings; built data in `web/public/data/` |
| `server/` | Small Node API that streams policy memos from Claude (`/api/memo`, `/api/ask`) |
| `docs/` | Product, functional, data and algorithm specs (01–10), demand taxonomy, demo script |
| `data-raw/shiv/` | Seat, borough and neighbourhood datasets collated by Shivam (Census, Planning London Datahub, brownfield, PTAL, prices) |
| `data-raw/manuel/` | London Datastore extracts and the qualitative policy evidence base collated by Manuel |
| `tools/turingdb/` | Loads the London Datastore extracts into a TuringDB graph |
| `reference/` | The original single-file prototype and its seed data. The pipeline reads seed values, policy cards and trend series from here |

## Data sources and limits

| Data | Source | Notes |
|---|---|---|
| Housing demand gap | WhereToBuild, University of Warwick: https://wheretobuild.warwick.ac.uk/ | **Event use only.** The raw neighbourhood-level data is **not** in this repo; only seat-level summaries derived from it are |
| Resident concern about housing (`V`) | Prime Radiant MRP (17 Aug 2026 wave) via the Forest research connector | 51 seats measured; 24 estimated by regression (`vEst`). TODO: confirm redistribution terms |
| Price/earnings, price change, election shares | House of Commons Library via Forest | |
| Completions, pipeline, lapsed, refused | Planning London Datahub: https://www.planningdata.london.gov.uk/ | Misses some homes in a few boroughs |
| 2024 results, MPs | House of Commons Library; mySociety | |
| Census 2021 tenure, mobility | ONS via Nomis | |
| PTAL; house prices, rents, affordability, rough sleeping | TfL, HM Land Registry and GLA via London Datastore | |
| Brownfield land | https://www.planning.data.gov.uk/dataset/brownfield-land | |
| Boundaries, lookups, hex map | mySociety 2025-constituencies; drkane/geo-lookups; ODI Leeds hexmaps | |
| Policy evidence | English Housing Survey and six published evaluations (`data-raw/manuel/`) | |

Known gaps: 24 seats use estimated resident concern; WhereToBuild neighbourhood data could not be used directly, so neighbourhood potential is split from seat totals by transport and brownfield capacity.

## Team

| Who | Role |
|---|---|
| Keval Patel ([@KPS25FX](https://github.com/KPS25FX)) | Software engineering and modelling: voter-vs-market indicator model, disagreement measure, policy scoring; wrote the functional specifications that drove the build in Claude Code |
| Shivam Gujral ([@shivam9111](https://github.com/shivam9111)) | Data collation and housing domain analysis; market/voter demand taxonomy |
| Manuel (TODO: confirm full name and link; commits as `2015mmarchetti-sudo`) | Data collation and housing domain analysis; policy evidence base; TuringDB graph |

Code largely generated with Claude Code from functional specifications written by Keval.
