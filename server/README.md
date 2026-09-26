# @dcv/server — memo server

Small `node:http` server (no framework) that turns a seat diagnosis into a streamed policy memo using Claude. The server loads the data JSON and calls `@dcv/core` itself, so clients never send facts.

## Run

```sh
cp server/.env.example server/.env    # then set ANTHROPIC_API_KEY
npm run server                        # or: npm -w server run start
npm -w server test                    # vitest
```

Config (env or `server/.env`; real env wins):

| Var | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | unset | unset = **mock mode** |
| `MODEL` | `claude-sonnet-5` | |
| `PORT` | `8787` | Vite proxies `/api` here |
| `DATA_DIR` | `<repo>/web/public/data` | needs `seats.json`, `boroughs.json`, `msoa.json`, `policies.json`, `meta.json` |
| `MEMO_RATE_MAX` / `ASK_RATE_MAX` | 10 / 30 | per IP per 10 minutes |

Data is loaded once at startup. Reload with `GET /api/reload` or `kill -HUP <pid>`. If the files are missing, the server still starts; memo/ask return 503 until a reload succeeds.

## Endpoints

- `GET /api/health` returns `{ ok, llm: 'live'|'mock', model, dataVersion, dataError }`.
- `POST /api/memo` with `{ code, settings }` streams `text/plain` Markdown (8 sections). The last line is the trailer
  `<!--meta {"docIds":[...],"unknownCitations":[...],"model":"...","dataVersion":"...","truncated"?:true}-->`.
- `POST /api/ask` with `{ code, settings, memo, question }` (question 500 chars max) streams a plain-text answer.
- `GET /api/reload` reloads the data files.

`settings` = `{ total: 52287|55800|88000 or 40000–120000, wClose: 0–1, missingMode: 'msoa'|'seat' }`. Missing fields take the defaults 55800 / 0.5 / 'msoa'.

### Errors

Errors before streaming starts come back as JSON `{ error, message }` with a status code:

| code | status | message |
|---|---|---|
| `bad_request`, `bad_settings`, `bad_json`, `question_too_long` | 400 | details |
| `unknown_seat` | 404 | |
| `body_too_large` | 413 | limit is 64 KB |
| `rate_limited` | 429 | "Too many requests just now. Try again in a minute." |
| `prompt_too_large` | 413 | "Too much context for one memo." |
| `refused` | 422 | "Claude declined this request." |
| `unavailable` | 503 | "Claude isn't available for this account." (bad key or no model access) |
| `upstream_error` | 502 | "The connection dropped. Try again." |
| `data_unavailable` | 503 | data not loaded |
| `other` | 500 | "Something went wrong. Try again." |

If the upstream fails after text has started streaming, the partial text ends with `\n<!--error {"error":...,"message":...}-->` and there is no meta trailer. When the client disconnects, the upstream request is aborted.

## Mock mode

With no `ANTHROPIC_API_KEY`, the server builds a deterministic memo from `core.buildArgument` (via `memoPrompt(...).argument`). It has all 8 sections and cites only supplied library ids, streamed in small chunks. `/api/ask` returns a short canned answer.

## Other behaviour

- CORS is allowed only from `http://localhost:5173` and `:4173`.
- Each request logs one line: route, seat, status, time taken, llm mode. Memo text and the key are never logged.
