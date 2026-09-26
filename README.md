# The Demand That Can't Vote

London housing policy tool. For each of London's 75 seats it separates **market demand** (outsiders who want to live there) from **voter demand** (residents' concern), estimates missing homes, diagnoses the blocker, ranks where campaigning moves the MP, and writes a **policy memo** grounded in seat statistics and past-policy evaluations.

## Quick start
```bash
npm install
pip install -r pipeline/requirements.txt
npm run data            # python -m pipeline build -> db/london.sqlite + web/public/data/*.json
npm run server          # memo API on :8787 (mock mode unless ANTHROPIC_API_KEY is set in server/.env)
npm run dev             # website on :5173 (proxies /api)
npm test                # core + server + pipeline tests
npm run e2e             # Playwright end-to-end
```

## Layout
| Path | Role |
|---|---|
| `pipeline/` | Python: ingest Shiv CSVs + prototype seed + Manuel policy cards → clean → SQLite → JSON |
| `core/` | Pure TypeScript engine: classification, missing homes, leverage, hypotheses, similarity, retrieval, policy argument, prompts |
| `server/` | Node API: `/api/memo`, `/api/ask` (Claude, streamed), `/api/health` |
| `web/` | Vite + TypeScript website (map, card, diagnosis, argument, memo/PDF, ranking, evidence) |
| `docs/` | Specs 01–07, formal model 08, pipeline graphs 09, interface contracts 10 |
| `reference/prototype/` | Original artifact source and seed data (read-only) |
| `demand_taxonomy.md`, `step_1.md` | Market vs voter definitions and Forest indicator lists |
