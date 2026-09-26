# 09 Pipeline graphs

Mermaid diagrams of the system's inputs, computations and request flows. Names follow [10_interfaces.md](10_interfaces.md) and the maths in [08_formal_model.md](08_formal_model.md). The diagrams render in GitHub and in the VS Code Markdown preview (Mermaid extension).

## 1. Data lineage: raw inputs → pipeline → SQLite → JSON

```mermaid
flowchart LR
  subgraph RAW["Raw inputs"]
    direction TB
    shivM["data-raw/shiv/london_msoa.csv"]
    shivC["data-raw/shiv/london_constituency.csv"]
    shivB["data-raw/shiv/london_borough.csv"]
    pData["reference/prototype/data.json"]
    pBor["reference/prototype/boroughs.json"]
    pKb["reference/prototype/kb.json"]
    pPc["reference/prototype/pc.json"]
    pHoc["reference/prototype/hoc.json"]
    pMps["reference/prototype/mps.json"]
    pW["reference/prototype/msoa_pcon_w.json"]
    manuel["Manuel PDF: 7 policy cards"]
  end

  subgraph PIPE["pipeline/ (Python)"]
    direction TB
    ingest["ingest"]
    clean["clean"]
    model["model<br/>ALG-3a frontier, ALG-15 V"]
    ind["indicators<br/>side tagging"]
    dbw["db<br/>schema.sql"]
    export["export"]
    report["report<br/>diff vs seed"]
  end

  subgraph DB["db/london.sqlite"]
    direction TB
    tSeat[("seat")]
    tBor[("borough")]
    tMsoa[("msoa")]
    tInd[("indicator")]
    tSI[("seat_indicator")]
    tPol[("policy")]
    tEff[("policy_effect")]
    tPc[("postcode")]
    tMeta[("meta")]
  end

  subgraph OUT["web/public/data/"]
    direction TB
    jSeats["seats.json"]
    jBor["boroughs.json"]
    jMsoa["msoa.json"]
    jPol["policies.json"]
    jPc["postcodes.json"]
    jInd["indicators.json"]
    jMeta["meta.json"]
  end

  shivM --> ingest
  shivC --> ingest
  shivB --> ingest
  pData --> ingest
  pBor --> ingest
  pKb --> ingest
  pPc --> ingest
  pHoc --> ingest
  pMps --> ingest
  pW --> ingest
  manuel -->|"hand-transcribed E01-E07, L01-L05"| ingest

  ingest --> clean --> model --> ind --> dbw
  clean --> dbw
  dbw --> tSeat & tBor & tMsoa & tInd & tSI & tPol & tEff & tPc & tMeta
  dbw --> report

  tSeat --> export
  tBor --> export
  tMsoa --> export
  tInd --> export
  tSI --> export
  tPol --> export
  tEff --> export
  tPc --> export
  tMeta --> export

  export --> jSeats & jBor & jMsoa & jPol & jPc & jInd & jMeta
  report -.->|"notes[]"| jMeta
```

Source priority: Shiv's CSVs are primary for recomputable fields. The prototype JSON seeds `V`, `vEst`, `wtbGap`, `wtbPer1k`, `afford`, `hpg5`, elections, MPs, `q`/`r` and `raw`/`tops`. `msoa_pcon_w.json` feeds the per-neighbourhood fallback (`meta.missingMode = 'msoa_fallback'`).

## 2. Compute DAG (core, per `compute()` call and downstream)

Nodes are values and edge labels are the fields that flow along them. Rounded nodes are core functions.

```mermaid
flowchart TD
  seats[/"seats.json : SeatRow[]"/]
  msoa[/"msoa.json : Msoa[]"/]
  settings[/"Settings {total, wClose, missingMode}"/]
  bor[/"boroughs.json"/]
  pol[/"policies.json"/]

  seats -->|wtbPer1k| rkM("pctRank")
  seats -->|V| rkV("pctRank")
  rkM -->|Mp| tM("tier")
  rkV -->|Vp| tV("tier")
  tM -->|Mt| ty("areaType")
  tV -->|Vt| ty
  ty -->|type| seat[("Seat = SeatRow & Derived")]

  msoa -->|"raw_i"| cal("calibrate")
  settings -->|total| cal
  cal -->|"κ_T, target"| gap("gap")
  msoa -->|"built_i"| gap
  seats -->|homes| gap
  settings -->|missingMode| gap

  seats -->|marginPct| cl("close")
  rkV -->|Vp| sw("swing")
  cl -->|close| dp("dP")
  sw -->|swing| dp
  settings -->|wClose| dp

  gap -->|gap| pr("prio")
  dp -->|dP| pr
  pr -->|"prioRaw, prio"| rk("rank")
  rk -->|rank| seat
  gap -->|"gap, target, bpd"| seat

  seats -->|"homes, wtbGap"| bpk("bpk")
  bpk -->|bpk| rkB("pctRank")
  rkB -->|bpkP| seat

  seat -->|"Mt, Vt, bpkP, gap, owned, ..."| hyp("hypotheses")
  bor -->|"apprRate"| hyp
  hyp -->|"Hypothesis[]"| tb("topBlocker")
  tb --> bc("blockCat")
  seat -->|"Mp, Vp, owned, marginPct, bpkP"| sim("similarSeats")
  seat -->|"wtbPer1k, owned, privRent, regPer100, V, bd"| fnd("findings")
  hyp -->|"titles, k"| ret("retrieve")
  pol --> ret
```

## 3. Policy memo chain

```mermaid
flowchart LR
  S[("Seat")] --> sf("seatFacts")
  S --> hy("hypotheses")
  S --> ss("similarSeats")
  hy --> rt("retrieve")
  P[/"policies.json<br/>+ PolicyEffect"/] --> rt
  sf -->|premises| ba("buildArgument")
  hy -->|diagnosis| ba
  rt -->|"options: policy x effect x holder"| ba
  ba -->|PolicyArgument| mp("memoPrompt")
  sf --> mp
  hy --> mp
  ss --> mp
  rt -->|docs| mp
  mp -->|prompt| api["server POST /api/memo"]
  api --> llm{"ANTHROPIC_API_KEY set?"}
  llm -->|yes| claude["Claude API (streaming)"]
  llm -->|no| mock["mock: render PolicyArgument"]
  claude --> md["Markdown, 8 sections"]
  mock --> md
  md --> vc("validateCitations")
  vc -->|"trailer meta: docIds, unknownCitations"| lab["web lab view"]
  lab --> pdf["jsPDF"]
  pdf --> out[/"memo PDF"/]
```

## 4. Request sequence: postcode to PDF

```mermaid
sequenceDiagram
  actor U as User
  participant W as web (Vite TS)
  participant C as core (pure TS)
  participant Srv as server :8787
  participant L as Claude API / mock

  W->>W: fetch /data/*.json on load
  W->>C: compute(rows, msoa, settings)
  C-->>W: Seat[]
  U->>W: enter postcode (e.g. SE15 5DQ)
  W->>C: lookupPostcode(raw, pc)
  C-->>W: { code, partial } or { err }
  W->>W: select seat code
  W->>C: hypotheses, topBlocker, similarSeats, verdict, reasons
  C-->>W: view models
  W-->>U: seat card, map highlight, diagnosis
  U->>W: click "Generate memo"
  W->>Srv: POST /api/memo { code, settings }
  Srv->>Srv: load data JSON, build Ctx
  Srv->>C: compute(...), memoPrompt(seat, ctx)
  C-->>Srv: { prompt, docs, argument }
  alt live
    Srv->>L: messages.stream(prompt)
    L-->>Srv: text deltas
  else mock
    Srv->>Srv: render argument deterministically
  end
  loop chunks
    Srv-->>W: text/plain Markdown chunk
    W-->>U: render progressively
  end
  Srv->>C: validateCitations(text, docIds)
  Srv-->>W: final trailer line: meta {docIds, unknownCitations, model}
  U->>W: click "Download PDF"
  W->>W: jsPDF render
  W-->>U: memo PDF
```

## 5. Module dependency graph

```mermaid
flowchart TB
  subgraph PY["Python"]
    pipeline["pipeline/<br/>ingest, clean, model, export"]
  end
  subgraph ART["Artefacts"]
    sqlite[("db/london.sqlite")]
    json[/"web/public/data/*.json"/]
  end
  subgraph TS["TypeScript workspaces"]
    core["core/ (pure: no DOM, no fetch, no deps on web/server)"]
    web["web/ (Vite UI)"]
    server["server/ (Node, /api)"]
  end

  pipeline -->|write| sqlite
  sqlite -->|export| json
  web -->|import| core
  server -->|import| core
  web -->|"HTTP /api/memo, /api/ask"| server
  web -.->|fetch| json
  server -.->|read| json
  rule["core has no outgoing edges:<br/>it imports nothing from web or server"]
  core --- rule
```

Only `web` and `server` import `core`. `core` has no runtime dependencies on either, and it reads data only through arguments. The pipeline shares nothing with the TS code except the JSON contract in docs/10 §1.

## 6. Typed input → output table (core API)

| Function | Inputs | Output | ALG |
|---|---|---|---|
| `compute` | `rows: SeatRow[]`, `msoa: Msoa[]`, `settings: Settings` | `Seat[]` | 1–5 |
| `pctRank` *(internal)* | `sorted: number[]`, `v: number` | `number ∈ (0,1)` | 1 |
| `tier` *(internal)* | `p: number` | `Tier` | 2 |
| `areaType` *(internal)* | `Mt: Tier`, `Vt: Tier` | `AreaType` | 2 |
| `calibrate` *(internal)* | `rows: SeatRow[]`, `total: number` | `number` (κ_T) | 3b |
| `hypotheses` | `s: Seat`, `ctx: Ctx` | `Hypothesis[]` (sorted by `s` desc) | 7 |
| `topBlocker` | `s: Seat`, `ctx: Ctx` | `Hypothesis \| null` | 8 |
| `blockCat` | `s: Seat`, `ctx: Ctx` | `BlockerCat` | 8 |
| `similarSeats` | `s: Seat`, `seats: Seat[]`, `n = 3` | `Seat[]` | 9 |
| `retrieve` | `s: Seat`, `H: Hypothesis[]`, `policies: Policy[]` | `Policy[]` (≤ 12) | 10 |
| `seatFacts` | `s: Seat`, `ctx: Ctx` | `Record<string, unknown>` | 10 |
| `buildArgument` | `s: Seat`, `ctx: Ctx` | `PolicyArgument` | policy/argument.ts |
| `memoPrompt` | `s: Seat`, `ctx: Ctx` | `{ prompt: string; docs: Policy[]; argument: PolicyArgument }` | 10 |
| `askPrompt` | `s: Seat`, `ctx: Ctx`, `earlierMemo: string`, `question: string` | `string` | F11 |
| `lookupPostcode` | `raw: string`, `pc: Postcodes` | `{ code; partial } \| { err }` | 11 |
| `verdict` | `s: Seat`, `ctx: Ctx` | `string` | 12 |
| `reasons` | `s: Seat` | `string[]` (≤ 3) | 13 |
| `findings` | `seats: Seat[]` | `Finding[]` | 14 |
| `spearman` | `x: number[]`, `y: number[]` | `number ∈ [-1,1]` | 14 |
| `validateCitations` | `text: string`, `allowedIds: string[]` | `{ unknown: string[] }` | 10 |
