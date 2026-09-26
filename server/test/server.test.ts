import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

vi.mock('@dcv/core', () => {
  const argument = {
    seat: 'E1',
    premises: [{ id: 'P1', kind: 'premise', text: 'Builds 300 homes a year.', support: ['K14'] }],
    diagnosis: [{ id: 'D1', kind: 'diagnosis', text: 'Homeowner opposition is the main blocker.', support: ['P1', 'K05'], confidence: 'moderate' }],
    options: [{ id: 'O1', lever: 'a design code', holder: ['council'], policyIds: ['K05'],
      expectedEffects: [{ outcome: 'approvals', direction: '+', certainty: 'medium', note: 'Faster consent.' }],
      risk: 'Slow to adopt.', addresses: ['homeowner'] }],
    asks: { mp: 'Back the design code.', council: 'Adopt the design code.' },
    dataGaps: ['Concern is estimated.'],
  };
  const docs = [
    { id: 'K05', title: 'Design codes', tags: [], text: '', src: [], kind: 'library' },
    { id: 'K14', title: 'Model limits', tags: [], text: '', src: [], kind: 'library' },
  ];
  return {
    compute: (rows: { code: string; name: string }[]) => rows.map((r) => ({ ...r, gap: 100 })),
    memoPrompt: (s: { name: string }) => ({ prompt: `PROMPT for ${s.name}`, docs, argument }),
    askPrompt: (_s: unknown, _c: unknown, _m: string, q: string) => `ASK ${q}`,
    validateCitations: (text: string, allowed: string[]) => {
      const found = [...text.matchAll(/\[(K\d+)\]/g)].map((m) => m[1]!);
      return { unknown: [...new Set(found.filter((id) => !allowed.includes(id)))] };
    },
  };
});

const { createApp } = await import('../src/app.js');
const { DataStore, parseSettings } = await import('../src/data.js');
const { MockLlm, LlmError } = await import('../src/llm.js');
const { loadConfig } = await import('../src/config.js');
import type { Llm, StreamOpts } from '../src/llm.js';

const dataset = {
  seats: [{ code: 'E1', name: 'Testford' }],
  boroughs: [{ name: 'Testham' }],
  msoa: [],
  policies: [],
  meta: { version: 'v-test' },
} as never;

class ScriptLlm implements Llm {
  readonly mode = 'live' as const;
  readonly model = 'claude-sonnet-5';
  constructor(private chunks: string[], private failAt?: { index: number; err: unknown }) {}
  async *stream(_p: string, _o: StreamOpts): AsyncIterable<string> {
    for (let i = 0; i < this.chunks.length; i++) {
      if (this.failAt && this.failAt.index === i) throw this.failAt.err;
      yield this.chunks[i]!;
    }
  }
}

let server: Server | null = null;
async function start(llm: Llm, memoMax = 10): Promise<string> {
  const store = new DataStore('/nonexistent', dataset);
  server = createApp(
    { store, llm, config: { allowedOrigins: ['http://localhost:5173'], memoLimit: { max: memoMax, windowMs: 60_000 }, askLimit: { max: 30, windowMs: 60_000 } } },
    () => {},
  );
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
afterEach(async () => {
  if (server) await new Promise((r) => server!.close(r));
  server = null;
});

const post = (base: string, path: string, body: unknown) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('config', () => {
  it('uses mock mode (no key) and defaults', () => {
    const c = loadConfig({ ANTHROPIC_API_KEY: '' } as NodeJS.ProcessEnv);
    expect(c.apiKey).toBeUndefined();
    expect(c.port).toBe(8787);
    expect(c.model).toBe('claude-sonnet-5');
  });
});

describe('settings validation', () => {
  it('accepts defaults, presets and range; rejects bad values', () => {
    expect(parseSettings(undefined)).toEqual({ ok: true, settings: { total: 55800, wClose: 0.5, missingMode: 'msoa' } });
    expect(parseSettings({ total: 88000, wClose: 1, missingMode: 'seat' }).ok).toBe(true);
    expect(parseSettings({ total: 70000 }).ok).toBe(true);
    expect(parseSettings({ total: 1000 }).ok).toBe(false);
    expect(parseSettings({ wClose: 2 }).ok).toBe(false);
    expect(parseSettings({ missingMode: 'x' }).ok).toBe(false);
  });
});

describe('HTTP API', () => {
  it('health reports mock mode', async () => {
    const base = await start(new MockLlm());
    const r = await fetch(base + '/api/health');
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, llm: 'mock', model: 'mock' });
  });

  it('memo streams 8 sections and ends with the meta trailer', async () => {
    const base = await start(new MockLlm(16));
    const r = await post(base, '/api/memo', { code: 'E1', settings: { total: 55800, wClose: 0.5, missingMode: 'msoa' } });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/text\/plain/);
    const text = await r.text();
    const heads = ['# Policy memo: Testford', '## Bottom line', '## What the data shows', '## Diagnosis',
      '## Policy context and history', '## Options', '## Outlook and implications', '## Campaign ask', '## Data gaps'];
    let pos = -1;
    for (const h of heads) {
      const i = text.indexOf(h);
      expect(i, h).toBeGreaterThan(pos);
      pos = i;
    }
    const m = /\n<!--meta (.*)-->$/.exec(text);
    expect(m).not.toBeNull();
    const meta = JSON.parse(m![1]!);
    expect(meta).toMatchObject({ docIds: ['K05', 'K14'], unknownCitations: [], model: 'mock' });
  });

  it('reports unknown citations', async () => {
    const base = await start(new ScriptLlm(['# Memo\n', 'See [K05] and [K99].']));
    const text = await (await post(base, '/api/memo', { code: 'E1' })).text();
    const meta = JSON.parse(/<!--meta (.*)-->$/.exec(text)![1]!);
    expect(meta.unknownCitations).toEqual(['K99']);
    expect(meta.model).toBe('claude-sonnet-5');
  });

  it('unknown seat is 404', async () => {
    const base = await start(new MockLlm());
    const r = await post(base, '/api/memo', { code: 'NOPE' });
    expect(r.status).toBe(404);
  });

  it('invalid settings is 400', async () => {
    const base = await start(new MockLlm());
    const r = await post(base, '/api/memo', { code: 'E1', settings: { total: 5, wClose: 0.5, missingMode: 'msoa' } });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe('bad_settings');
  });

  it('maps upstream rate limit before streaming to 429 with F10 copy', async () => {
    const base = await start(new ScriptLlm(['x'], { index: 0, err: new LlmError('rate_limited') }));
    const r = await post(base, '/api/memo', { code: 'E1' });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'rate_limited', message: 'Too many requests just now. Try again in a minute.' });
  });

  it('mid-stream failure appends an error trailer', async () => {
    const base = await start(new ScriptLlm(['part one ', 'two'], { index: 1, err: new Error('boom') }));
    const text = await (await post(base, '/api/memo', { code: 'E1' })).text();
    expect(text.startsWith('part one ')).toBe(true);
    expect(text).toMatch(/<!--error \{"error":"other"/);
  });

  it('ask streams an answer and rejects long questions', async () => {
    const base = await start(new MockLlm());
    const ok = await post(base, '/api/ask', { code: 'E1', memo: 'm', question: 'Why?' });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain('Why?');
    const bad = await post(base, '/api/ask', { code: 'E1', memo: 'm', question: 'x'.repeat(501) });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('question_too_long');
  });

  it('rate limit triggers 429', async () => {
    const base = await start(new MockLlm(), 2);
    expect((await post(base, '/api/memo', { code: 'E1' })).status).toBe(200);
    expect((await post(base, '/api/memo', { code: 'E1' })).status).toBe(200);
    const r = await post(base, '/api/memo', { code: 'E1' });
    expect(r.status).toBe(429);
    expect((await r.json()).message).toBe('Too many requests just now. Try again in a minute.');
  });

  it('rejects bodies over 64KB', async () => {
    const base = await start(new MockLlm());
    const r = await post(base, '/api/ask', { code: 'E1', memo: 'x'.repeat(70_000), question: 'q' });
    expect(r.status).toBe(413);
  });

  it('CORS only for allowed origins', async () => {
    const base = await start(new MockLlm());
    const a = await fetch(base + '/api/health', { headers: { origin: 'http://localhost:5173' } });
    expect(a.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const b = await fetch(base + '/api/health', { headers: { origin: 'http://evil.example' } });
    expect(b.headers.get('access-control-allow-origin')).toBeNull();
  });
});
