# 06 System architecture

## 1. Prototype architecture (as-is)

The prototype is a single 460 KB HTML file:
- inline data: seats, boroughs, library and postcodes,
- inline JavaScript: compute, render, memo and admin,
- jsPDF from a CDN.

It depends on the Claude artifact runtime for:
- `db` (shared real-time document store),
- `user` (identity and roles),
- `sample` (LLM calls),
- `assets` (PDF storage),
- `downloads` (file save).

The rebuild must replace each of these.

| Prototype capability | Rebuild replacement |
|---|---|
| Inline `DATA` snapshot | Pipeline output `data/build/*.json`, bundled as the fallback snapshot |
| `claude.use("db")` real-time collections | Database with change subscriptions (see options) |
| `claude.use("user")` roles | Auth provider plus a roles table (Viewer, Contributor, Editor) |
| `claude.use("sample")` | Server endpoint calling the Anthropic Messages API (streaming) |
| `claude.use("assets")` PDF storage | Object storage (or DB blob) behind an authenticated URL |
| `claude.use("downloads")` | Browser download of the generated PDF blob |
| jsPDF | Same library (client-side), or server-side rendering |

## 2. Target architecture (to-be)

```
            ┌───────────────── data/raw/ (sources) ─────────────────┐
            │ WhereToBuild · Forest MRP · Datahub · Census · ONS …   │
            └───────────────┬───────────────────────────────────────┘
                            ▼
                 ┌───────────────────────┐
                 │  pipeline/ (Python)   │  F15: build, fit, validate
                 └──────────┬────────────┘
                            ▼
                 data/build/*.json  (versioned snapshot)
                    │                         │
       seed/import  ▼                         ▼ bundled fallback
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Backend API            │◄──────►│  Web app (browser)           │
│  - data read (seats…)   │  HTTP/ │  - core/ engine (ALG-1..14)  │
│  - live updates (SSE/WS)│  WS    │  - views: map, card, table,  │
│  - auth + roles         │        │    scatter, lab, admin       │
│  - import/seed (Editor) │        │  - PDF build (jsPDF)         │
│  - memo + Q&A → Claude  │        └──────────────────────────────┘
│  - memo/PDF storage     │
└────────┬───────┬────────┘
         ▼       ▼
     Database   Anthropic API
```

**Principles**
- **Pure engine.** All of ALG-1 to ALG-14 lives in one side-effect-free module (`core/`) with no DOM or network access. It is used by the web app and, if needed, by the server (e.g. the memo endpoint rebuilds seat facts server-side so clients can't inject facts).
- **Data as data.** Type text, hypothesis copy, fixes, blocker categories, the prompt template and the library are data files, not code.
- **Snapshot-first.** The app renders from the bundled snapshot immediately and upgrades to live data when the back end connects.
- **Server-side secrets.** The LLM key and write permissions exist only on the server.

## 3. Proposed repository layout

```
/docs                  this document set
/data/raw              source files (git-lfs or documented download script)
/data/build            pipeline outputs (committed; small)
/pipeline              Python: ingest, aggregate, model, validate (F15)
/core                  engine: ALG-1..14 + types (TypeScript)
/web                   front end (views F01–F14)
/server                API: data, auth, import, memo, storage
/prompts               memo + Q&A templates (versioned)
/content               TYPES, FIX, BLOCK, method text (JSON/MD)
/tests                 unit, golden, e2e
```

## 4. Key flows

**Recompute.** Settings or data change → `core.compute(rows, boroughs, settings)` → derived rows → views re-render.

**Import.** Editor uploads JSON → server validates (FR-ADM-4) → confirm → server writes → bumps `meta.version` → broadcasts → clients merge and recompute.

**Memo.**
1. Client sends `{seatCode, settings}`.
2. Server loads the data, runs `core`, builds seat facts, hypotheses, similar seats and retrieval, then fills the prompt.
3. Server streams from the Claude API back to the client.
4. Client builds the PDF and uploads it.
5. Server stores the memo record plus the PDF (Contributor+).

## 5. Security

- Role enforcement on the server for import, seed and memo save.
- Rate-limit memo and Q&A endpoints per user.
- Escape all LLM and user text before rendering (the prototype's `md()` escapes before formatting; keep that order).
- Validate that `[Kxx]` citations in output exist in the supplied context.
- CORS locked to the app origin.

## 6. Observability

- Log each memo request with seat, data version, model, token usage, latency and outcome (no memo text in logs).
- Log each import with who, version, fields and seat count.

## 7. Open decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Front-end stack | (a) Vanilla TS + Vite, closest to the prototype; (b) React/Svelte + Vite | (a) or Svelte: the UI is mostly SVG and tables; keep it light |
| D2 | Back end and database | (a) Supabase/Postgres + realtime + auth + storage; (b) Firebase/Firestore; (c) FastAPI + Postgres + SSE | (a): one service covers db, realtime, auth and storage; the collection model maps cleanly |
| D3 | Pipeline language | Python (pandas, statsmodels for quantile regression) | Python |
| D4 | Missing-homes aggregation | Seat-level `max(0, target−homes)` (prototype) vs MSOA-level `Σ max(0, …)` (taxonomy §5) | Decide with the team; run both and compare totals against the ~35k/63k figures |
| D5 | PDF generation | Client jsPDF (prototype) vs server-side | Client jsPDF for release 1 |
| D6 | LLM model | Claude Sonnet 5 (`claude-sonnet-5`) default; Opus 5.5 (`claude-opus-5-5`) option | Sonnet for cost and latency; make it configurable |
| D7 | Hosting | Vercel/Netlify + Supabase, or a single container | Decide with D2 |
| D8 | Deployment scope | Hackathon demo vs production | Build release 1 to spec, with the demo as a milestone |
