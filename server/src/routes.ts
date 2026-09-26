import type { IncomingMessage, ServerResponse } from 'node:http';
import { askPrompt, memoPrompt, validateCitations } from '@dcv/core';
import type { Seat } from '@dcv/core';
import type { Config } from './config.js';
import { parseSettings, type DataStore } from './data.js';
import {
  ASK_MAX_TOKENS, ERROR_MESSAGES, ERROR_STATUS, MEMO_MAX_TOKENS, classifyError,
  type Llm, type LlmErrorCode, type LlmHints,
} from './llm.js';

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_QUESTION_CHARS = 500;
export const MAX_MEMO_CHARS = 20_000;

/** Fields the request logger prints. Never contains memo text or secrets. */
export interface ReqLog {
  route: string;
  seat?: string;
  status?: number;
  error?: string;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number, private now: () => number = Date.now) {}
  /** Returns true if allowed (and records the hit). */
  take(key: string): boolean {
    const t = this.now();
    const arr = (this.hits.get(key) ?? []).filter((x) => t - x < this.windowMs);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(t);
    this.hits.set(key, arr);
    if (this.hits.size > 10_000) this.hits.clear();
    return true;
  }
}

export interface AppDeps {
  store: DataStore;
  llm: Llm;
  config: Pick<Config, 'allowedOrigins' | 'memoLimit' | 'askLimit'>;
  reload?: () => boolean;
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const s = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(s) });
  res.end(s);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const len = Number(req.headers['content-length'] ?? 0);
    if (len > MAX_BODY_BYTES) return reject(new HttpError(413, 'body_too_large', 'Request body too large.'));
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    req.on('data', (c: Buffer) => {
      if (failed) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        failed = true;
        reject(new HttpError(413, 'body_too_large', 'Request body too large.'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (failed) return;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'bad_json', 'Body must be JSON.'));
      }
    });
    req.on('error', reject);
  });
}

export function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? 'unknown';
}

export function createHandler(deps: AppDeps) {
  const { store, llm, config } = deps;
  const memoLimiter = new RateLimiter(config.memoLimit.max, config.memoLimit.windowMs);
  const askLimiter = new RateLimiter(config.askLimit.max, config.askLimit.windowMs);

  function cors(req: IncomingMessage, res: ServerResponse): void {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
      res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
      res.setHeader('access-control-allow-headers', 'content-type');
    }
  }

  function seatAndCtx(body: Record<string, unknown>, log: ReqLog) {
    if (!store.ready) throw new HttpError(503, 'data_unavailable', 'Seat data is not loaded on the server.');
    const code = body.code;
    if (typeof code !== 'string' || !code) throw new HttpError(400, 'bad_request', 'code is required.');
    log.seat = code;
    const ps = parseSettings(body.settings);
    if (!ps.ok) throw new HttpError(400, 'bad_settings', ps.error);
    const ctx = store.ctx(ps.settings);
    const seat = ctx.seats.find((s: Seat) => s.code === code);
    if (!seat) throw new HttpError(404, 'unknown_seat', `Unknown seat: ${code}`);
    return { seat, ctx };
  }

  /**
   * Stream LLM output as text/plain. The first chunk is awaited before headers are sent,
   * so early upstream failures get a proper status + JSON error. Later failures append
   * an `<!--error {...}-->` trailer to the partial text.
   */
  async function streamLlm(
    req: IncomingMessage,
    res: ServerResponse,
    prompt: string,
    maxTokens: number,
    hints: LlmHints,
    log: ReqLog,
    trailer?: (text: string, stopReason: string | null) => string,
  ): Promise<void> {
    const ac = new AbortController();
    const onClose = () => {
      if (!res.writableEnded) ac.abort();
    };
    res.on('close', onClose);
    let stopReason: string | null = null;
    let text = '';
    const it = llm
      .stream(prompt, { maxTokens, signal: ac.signal, hints, onDone: (i) => (stopReason = i.stopReason) })
      [Symbol.asyncIterator]();
    try {
      let first: IteratorResult<string>;
      try {
        first = await it.next();
      } catch (e) {
        if (ac.signal.aborted) return;
        const code = classifyError(e);
        log.error = code;
        log.status = ERROR_STATUS[code];
        sendJson(res, ERROR_STATUS[code], { error: code, message: ERROR_MESSAGES[code] });
        return;
      }
      res.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'x-content-type-options': 'nosniff',
        'x-llm-mode': llm.mode,
      });
      log.status = 200;
      res.flushHeaders?.();
      try {
        let r = first;
        while (!r.done) {
          text += r.value;
          res.write(r.value);
          r = await it.next();
        }
      } catch (e) {
        if (ac.signal.aborted) {
          log.error = 'client_aborted';
          return;
        }
        const code: LlmErrorCode = classifyError(e);
        log.error = code;
        res.end(`\n<!--error ${JSON.stringify({ error: code, message: ERROR_MESSAGES[code] })}-->`);
        return;
      }
      res.end(trailer ? trailer(text, stopReason) : '');
    } finally {
      res.off('close', onClose);
    }
  }

  async function memo(req: IncomingMessage, res: ServerResponse, log: ReqLog) {
    const body = (await readBody(req)) as Record<string, unknown>;
    const { seat, ctx } = seatAndCtx(body, log);
    if (!memoLimiter.take(clientIp(req))) throw new HttpError(429, 'rate_limited', ERROR_MESSAGES.rate_limited);
    const mp = memoPrompt(seat, ctx);
    const docIds = mp.docs.map((d) => d.id);
    await streamLlm(
      req, res, mp.prompt, MEMO_MAX_TOKENS,
      { kind: 'memo', argument: mp.argument, docs: mp.docs, seatName: seat.name },
      log,
      (text, stopReason) => {
        const { unknown } = validateCitations(text, docIds);
        const meta: Record<string, unknown> = { docIds, unknownCitations: unknown, model: llm.model };
        if (stopReason === 'max_tokens') meta.truncated = true;
        if (store.version) meta.dataVersion = store.version;
        return `\n<!--meta ${JSON.stringify(meta)}-->`;
      },
    );
  }

  async function ask(req: IncomingMessage, res: ServerResponse, log: ReqLog) {
    const body = (await readBody(req)) as Record<string, unknown>;
    const question = body.question;
    if (typeof question !== 'string' || !question.trim()) throw new HttpError(400, 'bad_request', 'question is required.');
    if (question.length > MAX_QUESTION_CHARS)
      throw new HttpError(400, 'question_too_long', `Question must be ${MAX_QUESTION_CHARS} characters or fewer.`);
    const memoText = typeof body.memo === 'string' ? body.memo.slice(0, MAX_MEMO_CHARS) : '';
    const { seat, ctx } = seatAndCtx(body, log);
    if (!askLimiter.take(clientIp(req))) throw new HttpError(429, 'rate_limited', ERROR_MESSAGES.rate_limited);
    const prompt = askPrompt(seat, ctx, memoText, question.trim());
    const docs = llm.mode === 'mock' ? memoPrompt(seat, ctx).docs : undefined;
    await streamLlm(req, res, prompt, ASK_MAX_TOKENS, { kind: 'ask', docs, seatName: seat.name, question }, log);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse, log: ReqLog): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    log.route = `${req.method} ${url.pathname}`;
    cors(req, res);
    try {
      if (req.method === 'OPTIONS') {
        log.status = 204;
        res.writeHead(204);
        res.end();
        return;
      }
      if (url.pathname === '/api/health' && req.method === 'GET') {
        log.status = 200;
        sendJson(res, 200, {
          ok: store.ready, llm: llm.mode, model: llm.model,
          dataVersion: store.version ?? null, dataError: store.loadError,
        });
        return;
      }
      if (url.pathname === '/api/reload' && req.method === 'GET') {
        const ok = deps.reload ? deps.reload() : store.load();
        log.status = ok ? 200 : 500;
        sendJson(res, log.status, { ok, dataVersion: store.version ?? null, error: ok ? undefined : store.loadError });
        return;
      }
      if (url.pathname === '/api/memo') {
        if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');
        await memo(req, res, log);
        return;
      }
      if (url.pathname === '/api/ask') {
        if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');
        await ask(req, res, log);
        return;
      }
      throw new HttpError(404, 'not_found', 'Not found.');
    } catch (e) {
      if (res.headersSent) {
        if (!res.writableEnded) res.end();
        return;
      }
      if (e instanceof HttpError) {
        log.status = e.status;
        log.error = e.code;
        sendJson(res, e.status, { error: e.code, message: e.message });
      } else {
        log.status = 500;
        log.error = 'other';
        sendJson(res, 500, { error: 'other', message: ERROR_MESSAGES.other });
      }
    }
  };
}
