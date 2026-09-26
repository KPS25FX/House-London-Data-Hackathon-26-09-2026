import Anthropic from '@anthropic-ai/sdk';
import type { Policy, PolicyArgument } from '@dcv/core';

export const SYSTEM_PROMPT = 'You are a careful UK housing policy analyst. Use only supplied data.';
export const MEMO_MAX_TOKENS = 8000;
export const ASK_MAX_TOKENS = 2000;

export type LlmErrorCode =
  | 'not_granted' | 'rate_limited' | 'session_expired' | 'prompt_too_large'
  | 'refused' | 'unavailable' | 'upstream_error' | 'other';

export const ERROR_MESSAGES: Record<LlmErrorCode, string> = {
  not_granted: 'Memo generation needs your permission to use Claude.',
  rate_limited: 'Too many requests just now. Try again in a minute.',
  session_expired: 'Sign in to Claude again, then retry.',
  prompt_too_large: 'Too much context for one memo.',
  refused: 'Claude declined this request.',
  unavailable: "Claude isn't available for this account.",
  upstream_error: 'The connection dropped. Try again.',
  other: 'Something went wrong. Try again.',
};

export const ERROR_STATUS: Record<LlmErrorCode, number> = {
  not_granted: 403, rate_limited: 429, session_expired: 401, prompt_too_large: 413,
  refused: 422, unavailable: 503, upstream_error: 502, other: 500,
};

export class LlmError extends Error {
  constructor(public code: LlmErrorCode, detail?: string) {
    super(detail ?? ERROR_MESSAGES[code]);
  }
}

/** Extra context an Llm may use; the live model ignores it, the mock builds its output from it. */
export interface LlmHints {
  kind: 'memo' | 'ask';
  argument?: PolicyArgument;
  docs?: Policy[];
  seatName?: string;
  question?: string;
}

export interface StreamOpts {
  maxTokens: number;
  signal: AbortSignal;
  hints?: LlmHints;
  /** Called once when the stream finishes normally. */
  onDone?: (info: { stopReason: string | null }) => void;
}

export interface Llm {
  readonly mode: 'live' | 'mock';
  readonly model: string;
  stream(prompt: string, opts: StreamOpts): AsyncIterable<string>;
}

/** Map any thrown value (SDK error, abort, etc.) to one of the F10 error codes. */
export function classifyError(e: unknown): LlmErrorCode {
  if (e instanceof LlmError) return e.code;
  if (e instanceof Anthropic.RateLimitError) return 'rate_limited';
  if (e instanceof Anthropic.AuthenticationError) return 'unavailable';
  if (e instanceof Anthropic.PermissionDeniedError) return 'unavailable';
  if (e instanceof Anthropic.NotFoundError) return 'unavailable';
  if (e instanceof Anthropic.BadRequestError) {
    return /too long|too many tokens|context window|prompt is too/i.test(e.message) ? 'prompt_too_large' : 'other';
  }
  if (e instanceof Anthropic.APIConnectionError) return 'upstream_error';
  if (e instanceof Anthropic.APIError) {
    const st = e.status ?? 0;
    if (st === 413) return 'prompt_too_large';
    if (st === 529 || st >= 500) return 'upstream_error';
    return 'other';
  }
  return 'other';
}

export class AnthropicLlm implements Llm {
  readonly mode = 'live' as const;
  private client: Anthropic;
  constructor(apiKey: string, readonly model: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 1 });
  }

  async *stream(prompt: string, opts: StreamOpts): AsyncIterable<string> {
    const stream = this.client.messages.stream(
      {
        model: this.model,
        max_tokens: opts.maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: opts.signal },
    );
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') yield ev.delta.text;
    }
    const final = await stream.finalMessage();
    const stop = (final.stop_reason as string | null) ?? null;
    if (stop === 'refusal') throw new LlmError('refused');
    opts.onDone?.({ stopReason: stop });
  }
}

const cite = (ids: string[], allowed: Set<string>) => {
  const ok = [...new Set(ids.filter((i) => allowed.has(i)))];
  return ok.length ? ' ' + ok.map((i) => `[${i}]`).join(' ') : '';
};

/** Deterministic memo in the 8-section format, built only from the PolicyArgument and supplied docs. */
export function mockMemo(arg: PolicyArgument, docs: Policy[], seatName?: string): string {
  const allowed = new Set(docs.map((d) => d.id));
  const name = seatName ?? arg.seat;
  const L: string[] = [];
  const diag0 = arg.diagnosis[0];
  const opt0 = arg.options[0];
  L.push(`# Policy memo: ${name}`, '');
  L.push('## Bottom line', '');
  L.push(
    (diag0 ? `${diag0.text}${cite(diag0.support, allowed)}` : `The data does not point to a single blocker in ${name}.`) +
      (opt0
        ? ` The most direct lever is ${opt0.lever}, held by ${opt0.holder.join(' and ') || 'the council'}.${cite(opt0.policyIds, allowed)}`
        : ''),
    '',
  );
  L.push('## What the data shows', '');
  for (const p of arg.premises) L.push(`- ${p.text}${cite(p.support, allowed)}`);
  if (!arg.premises.length) L.push('- No seat facts were supplied.');
  L.push('', '## Diagnosis', '');
  for (const d of arg.diagnosis) L.push(`- ${d.text}${d.confidence ? ` (${d.confidence})` : ''}${cite(d.support, allowed)}`);
  if (!arg.diagnosis.length) L.push('- No blocker was diagnosed with confidence.');
  L.push('', '## Policy context and history', '');
  for (const d of docs.slice(0, 6)) L.push(`- ${d.title} [${d.id}]`);
  if (!docs.length) L.push('- No library entries were supplied.');
  L.push('', '## Options', '');
  arg.options.forEach((o, i) => {
    L.push(`${i + 1}. **${o.lever}** (held by ${o.holder.join(', ') || 'unspecified'}).${cite(o.policyIds, allowed)} Risk: ${o.risk}`);
  });
  if (!arg.options.length) L.push('No options were identified from the supplied evidence.');
  L.push('', '## Outlook and implications', '');
  const effects = arg.options.flatMap((o) => o.expectedEffects.map((e) => ({ e, o })));
  for (const { e, o } of effects.slice(0, 6))
    L.push(`- ${e.outcome}: ${e.direction} (${e.certainty} certainty). ${e.note}${cite(o.policyIds, allowed)}`);
  if (!effects.length) L.push('- Effects of the options are not quantified in the supplied evidence.');
  L.push('', '## Campaign ask', '');
  L.push(`- **To the MP:** ${arg.asks.mp}`, `- **To the council:** ${arg.asks.council}`, '');
  L.push('## Data gaps', '');
  for (const g of arg.dataGaps) L.push(`- ${g}`);
  if (!arg.dataGaps.length) L.push('- None flagged.');
  L.push('', '_Mock mode: generated from the structured argument without a language model._', '');
  return L.join('\n');
}

export function mockAnswer(hints: LlmHints | undefined): string {
  const first = hints?.docs?.[0];
  return (
    `Mock answer for ${hints?.seatName ?? 'this seat'}. ` +
    `Question received: "${(hints?.question ?? '').slice(0, 120)}". ` +
    (first ? `See ${first.title} [${first.id}] for the most relevant library entry. ` : '') +
    'Set ANTHROPIC_API_KEY on the server for a real answer.'
  );
}

export class MockLlm implements Llm {
  readonly mode = 'mock' as const;
  readonly model = 'mock';
  constructor(private chunkSize = 64, private delayMs = 0) {}

  async *stream(_prompt: string, opts: StreamOpts): AsyncIterable<string> {
    const h = opts.hints;
    const text = h?.kind === 'memo' && h.argument ? mockMemo(h.argument, h.docs ?? [], h.seatName) : mockAnswer(h);
    for (let i = 0; i < text.length; i += this.chunkSize) {
      if (opts.signal.aborted) throw new LlmError('other', 'aborted');
      if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
      yield text.slice(i, i + this.chunkSize);
    }
    opts.onDone?.({ stopReason: 'end_turn' });
  }
}
