import { describe, expect, it } from 'vitest';
import {
  BLOCK, DEFAULT_SETTINGS, MEMO_SECTIONS, blockCat, buildArgument, checkWellFormed, compute, findings, hypotheses,
  lookupPostcode, memoPrompt, missingHomes, similarSeats, validateCitations, verdict, reasons, askPrompt,
} from '../src/index.js';
import type { Msoa, SeatRow } from '../src/index.js';
import { makeCtx, policies, postcodes, rows } from './fixtures.js';

const counts = (types: string[]) => types.reduce<Record<string, number>>((m, t) => { m[t] = (m[t] ?? 0) + 1; return m; }, {});

describe('compute', () => {
  it('area-type counts on prototype data', () => {
    const c = counts(compute(rows, [], DEFAULT_SETTINGS).map(s => s.type));
    console.log('area types', c);
    expect(c).toEqual({ ready: 15, locked: 3, worried: 3, settled: 11, middle: 43 });
  });

  it('does not mutate inputs', () => {
    const before = JSON.stringify(rows);
    compute(rows, [], DEFAULT_SETTINGS);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it('only wtbPer1k and V affect type', () => {
    const base = compute(rows, [], DEFAULT_SETTINGS).map(s => s.type);
    const mutated: SeatRow[] = rows.map((r, i) => ({ ...r, owned: (i * 37) % 100, marginPct: (i * 7) % 40, homes: i * 11, raw: 1 + i, wtbGap: 5000 - i, regPer100: 60 + (i % 40), privRent: i % 50 }));
    const t2 = compute(mutated, [], { total: 88000, wClose: 0.9, missingMode: 'seat' }).map(s => s.type);
    expect(t2).toEqual(base);
  });

  it('slider extremes order by gap*close and gap*swing', () => {
    for (const [w, f] of [[1, 'close'], [0, 'swing']] as const) {
      const seats = compute(rows, [], { ...DEFAULT_SETTINGS, wClose: w });
      const byRank = seats.slice().sort((a, b) => a.rank - b.rank).map(s => s.code);
      const expected = seats.slice().sort((a, b) => b.gap * b[f] - a.gap * a[f]).map(s => s.code);
      expect(byRank).toEqual(expected);
    }
  });

  it('seat-mode total missing is positive and monotonic in T', () => {
    const tot = (T: number) => compute(rows, [], { total: T, wClose: 0.5, missingMode: 'seat' }).reduce((s, x) => s + x.gap, 0);
    const a = tot(55800), b = tot(88000);
    console.log('total missing (seat mode)', { T55800: Math.round(a), T88000: Math.round(b) });
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
  });

  it('msoa mode sums max(0, target_i - built_i) per seat; empty msoa falls back to seat', () => {
    const r2 = rows.slice(0, 2);
    const msoa: Msoa[] = [
      { code: 'A', name: 'a', pcon: r2[0]!.code, lad: '', dwellings: 1, built: 0, ptal: 1, bf: 0, raw: 1 },
      { code: 'B', name: 'b', pcon: r2[0]!.code, lad: '', dwellings: 1, built: 100, ptal: 1, bf: 0, raw: 1 },
      { code: 'C', name: 'c', pcon: r2[1]!.code, lad: '', dwellings: 1, built: 0, ptal: 1, bf: 0, raw: 2 },
    ];
    const res = missingHomes(r2, msoa, 100, 'msoa');
    expect(res.mode).toBe('msoa');
    expect(res.bySeat.get(r2[0]!.code)).toEqual({ target: 50, gap: 25 });
    expect(res.bySeat.get(r2[1]!.code)).toEqual({ target: 50, gap: 50 });
    expect(missingHomes(r2, [], 100, 'msoa').mode).toBe('seat');
  });
});

describe('hypotheses, blockers, similarity', () => {
  const ctx = makeCtx();
  const kbIds = new Set(policies.map(p => p.id));
  it('every seat has >=1 hypothesis with known library ids', () => {
    for (const s of ctx.seats) {
      const H = hypotheses(s, ctx);
      expect(H.length).toBeGreaterThan(0);
      for (const h of H) for (const k of h.k) expect(kbIds.has(k), `${s.name} ${h.id} ${k}`).toBe(true);
    }
  });
  it('blockCat valid; similarSeats returns 3 distinct others', () => {
    const cats = counts(ctx.seats.map(s => blockCat(s, ctx)));
    console.log('blocker categories', cats);
    for (const s of ctx.seats) {
      expect(Object.keys(BLOCK)).toContain(blockCat(s, ctx));
      const sim = similarSeats(s, ctx.seats);
      expect(sim).toHaveLength(3);
      expect(new Set(sim.map(x => x.code)).size).toBe(3);
      expect(sim.some(x => x.code === s.code)).toBe(false);
    }
  });
  it('verdict and reasons are plain text', () => {
    for (const s of ctx.seats) {
      const v = verdict(s, ctx);
      expect(v).not.toMatch(/<[a-z]/i);
      expect(v.startsWith(s.name)).toBe(true);
      expect(reasons(s).length).toBeLessThanOrEqual(3);
    }
  });
});

describe('postcode', () => {
  const pc = postcodes();
  const peckham = rows.find(r => r.name === 'Peckham')!.code;
  it('full, lower-case, outward and unknown', () => {
    expect(lookupPostcode('SE15 5DQ', pc)).toEqual({ code: peckham, partial: false });
    expect(lookupPostcode('se155dq', pc)).toEqual({ code: peckham, partial: false });
    expect(lookupPostcode('SE15', pc)).toEqual({ code: peckham, partial: true });
    expect(lookupPostcode('ZZ1 1ZZ', pc)).toHaveProperty('err');
    expect(lookupPostcode('S', pc)).toHaveProperty('err');
  });
  it('outside London districts return an error', () => {
    const outside = Object.entries(pc).find(([, v]) => v.d === null && !v.x);
    if (outside) expect((lookupPostcode(outside[0], pc) as { err: string }).err).toMatch(/outside Greater London/);
  });
});

describe('findings', () => {
  it('returns 4 findings with finite numbers', () => {
    const F = findings(makeCtx().seats);
    expect(F).toHaveLength(4);
    for (const f of F) { expect(Number.isFinite(f.a)).toBe(true); expect(Number.isFinite(f.b)).toBe(true); expect(Number.isFinite(f.rho)).toBe(true); }
    expect(F[3]!.n).toBe(51);
  });
});

describe('policy argument and prompts', () => {
  const ctx = makeCtx();
  it('buildArgument is well formed for all seats', () => {
    for (const s of ctx.seats) expect(checkWellFormed(buildArgument(s, ctx), policies), s.name).toEqual([]);
  });
  it('checkWellFormed catches violations', () => {
    const arg = buildArgument(ctx.seats[0]!, ctx);
    const bad = { ...arg, options: [{ id: 'O9', lever: 'x', holder: [], policyIds: ['K99'], expectedEffects: [], risk: '', addresses: [] }] };
    expect(checkWellFormed(bad, policies).length).toBeGreaterThan(0);
  });
  it('memoPrompt contains all sections and POLICY ARGUMENT', () => {
    const s = ctx.seats[0]!;
    const { prompt, docs, argument } = memoPrompt(s, ctx);
    for (const h of MEMO_SECTIONS) expect(prompt).toContain(h);
    expect(prompt).toContain('POLICY ARGUMENT');
    expect(docs.length).toBeGreaterThan(0);
    expect(argument.seat).toBe(s.code);
    expect(askPrompt(s, ctx, 'memo', 'why?')).toContain('QUESTION');
  });
  it('validateCitations finds unknown ids', () => {
    expect(validateCitations('See [K01] and [E03, L02] and [K99].', ['K01', 'E03', 'L02']).unknown).toEqual(['K99']);
  });
});
