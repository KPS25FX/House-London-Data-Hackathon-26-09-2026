import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS, LEVERS, MISSING_GAP_MSOA_FALLBACK, MISSING_GAP_SEAT, POLICY_BASE, PRESETS, ZERO_SCENARIO,
  bestPlaces, buildArgument, compute, computeScenario, defaultPolicy, first, fitLabel, growth, isScenarioOn, latest,
  memoPrompt, metricRange, parseSeriesCsv, rateSeat, scenarioSummary, validateCitations, whyGap, whyGapValues,
} from '../src/index.js';
import type { Metric, Scenario, Series } from '../src/index.js';
import { makeCtx, rows } from './fixtures.js';

const here = dirname(fileURLToPath(import.meta.url));
const series: Series = JSON.parse(readFileSync(resolve(here, '../../web/public/data/series.json'), 'utf8'));

describe('scenario', () => {
  const ctx = makeCtx();
  it('zero scenario leaves gaps unchanged', () => {
    for (const mode of ['msoa', 'seat'] as const) {
      const seats = compute(rows, [], { ...DEFAULT_SETTINGS, missingMode: mode });
      const s = computeScenario(seats, ZERO_SCENARIO);
      s.forEach((x, i) => { expect(x.gapS).toBe(seats[i]!.gap); expect(x.add).toBe(0); expect(x.flip).toBe(false); });
      expect(isScenarioOn(ZERO_SCENARIO)).toBe(false);
    }
  });
  it('raising any lever never increases total missing', () => {
    for (const l of LEVERS) {
      let prev = Infinity;
      for (let v = 0; v <= l.max; v += l.step) {
        const sc: Scenario = { ...ZERO_SCENARIO, [l.id]: v };
        const tot = scenarioSummary(ctx.seats, computeScenario(ctx.seats, sc)).missing;
        expect(tot).toBeLessThanOrEqual(prev + 1e-9);
        prev = tot;
      }
    }
  });
  it('presets are valid', () => {
    expect(PRESETS.length).toBe(5);
    for (const [name, sc] of PRESETS) {
      expect(name).toBeTruthy();
      for (const l of LEVERS) { expect(sc[l.id]).toBeGreaterThanOrEqual(0); expect(sc[l.id]).toBeLessThanOrEqual(l.max); expect(sc[l.id] % l.step).toBe(0); }
      expect(isScenarioOn(sc)).toBe(true);
    }
    const all = scenarioSummary(ctx.seats, computeScenario(ctx.seats, PRESETS[4]![1]));
    console.log('All levers', { missing0: Math.round(all.missing0), missing: Math.round(all.missing), added: Math.round(all.added), meet: all.meet, flips: all.flips.length });
    expect(all.missing).toBeLessThan(all.missing0);
    expect(all.added).toBeCloseTo(all.addS + all.addL + all.addB, 6);
  });
});

describe('trends', () => {
  const m: Metric = { id: 't', label: 'T', unit: '', fmt: 'int', source: '', better: 'low', years: ['2000', '2001', '2002', '2003'],
    data: { A: [null, 10, 12, null], B: [5, null, null, 20], C: [null, null, null, null] } };
  it('latest / first / growth', () => {
    expect(latest(m, 'A')).toEqual({ v: 12, i: 2, year: '2002' });
    expect(first(m, 'A')).toEqual({ v: 10, i: 1, year: '2001' });
    expect(growth(m, 'A')).toBeCloseTo(20, 9);
    expect(growth(m, 'B')).toBeCloseTo(300, 9);
    expect(latest(m, 'C')).toBeNull();
    expect(growth(m, 'Z')).toBeNull();
    expect(metricRange(m)).toEqual([5, 20]);
    expect(metricRange(m, 1)).toEqual([10, 10]);
  });
  it('parseSeriesCsv', () => {
    const csv = [
      'dataset,area_code,area_name,area_type,period,year,measure,breakdown,value,unit,source',
      'rents,E09000007,Camden,borough,2012,2012,median_rent,All,1500,GBP per month,VOA',
      'rents,E09000007,Camden,borough,2011,2011,median_rent,All,1400,GBP per month,VOA',
      'rents,E09000012,Hackney,borough,2012,2012,median_rent,All,"1,300",GBP per month,VOA',
      'rents,E12000007,London,region (London),2011,2011,median_rent,All,1200,GBP per month,VOA',
      'rents,E06000001,Hartlepool,borough,2011,2011,median_rent,All,500,GBP per month,VOA',
      'rents,E09000007,Camden,borough,2011,2011,share,Studio,12.5,percent,VOA',
    ].join('\r\n');
    const s = parseSeriesCsv(csv);
    expect(s.metrics.length).toBe(2);
    const r = s.metrics[0]!;
    expect(r.id).toBe('u_rents_median_rent_all');
    expect(r.label).toBe('Median rent');
    expect(r.fmt).toBe('gbp');
    expect(r.years).toEqual(['2011', '2012']);
    expect(r.data.Camden).toEqual([1400, 1500]);
    expect(r.data.Hackney).toEqual([null, 1]);   // parseFloat("1,300") = 1, as in the prototype
    expect(r.london).toEqual([1200, null]);
    expect(r.data.Hartlepool).toBeUndefined();
    expect(s.metrics[1]!.label).toBe('Share (Studio)');
    expect(s.metrics[1]!.fmt).toBe('pct');
    expect(() => parseSeriesCsv('a,b\n1,2')).toThrow(/Missing columns/);
  });
  it('series.json is well formed', () => {
    expect(series.metrics.length).toBeGreaterThan(0);
    for (const x of series.metrics) for (const a of Object.values(x.data)) expect(a.length).toBe(x.years.length);
  });
});

describe('policy fit', () => {
  const ctx = makeCtx();
  it('fitLabel thresholds', () => {
    expect(fitLabel(0.66)).toEqual({ label: 'Strong fit', tone: 'good' });
    expect(fitLabel(0.659)).toEqual({ label: 'Moderate fit', tone: 'mid' });
    expect(fitLabel(0.33)).toEqual({ label: 'Moderate fit', tone: 'mid' });
    expect(fitLabel(0.329)).toEqual({ label: 'Weak fit', tone: 'bad' });
  });
  it('rateSeat returns every policy sorted, scores in [0,1]', () => {
    const scen = PRESETS[4]![1];
    const ss = computeScenario(ctx.seats, scen);
    for (const s of ss) {
      const R = rateSeat(s, ctx, scen, series);
      expect(R.map(r => r.policy.id).sort()).toEqual(POLICY_BASE.map(p => p.id).sort());
      for (let i = 0; i < R.length; i++) {
        const r = R[i]!;
        for (const v of [r.fit, r.risk, r.score]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
        if (i) expect(R[i - 1]!.score).toBeGreaterThanOrEqual(r.score);
        expect(r.reasons[0]).toBeTruthy();
        expect(r.risks[0]).toBeTruthy();
      }
    }
    expect(bestPlaces('homeless', ctx, series).length).toBe(8);
  });
  it('defaultPolicy follows the first active lever', () => {
    const s = ctx.seats[0]!;
    expect(defaultPolicy(s, { ...ZERO_SCENARIO, bf: 10 })).toBe('brownfield');
    expect(POLICY_BASE.map(p => p.id)).toContain(defaultPolicy(s, ZERO_SCENARIO, ctx));
  });
});

describe('why gap', () => {
  it('computes the four comparisons', () => {
    const w = whyGap(makeCtx().seats);
    console.log('whyGap', whyGapValues(w));
    expect(w.buildRateHighDemand).toBeGreaterThan(0);
    expect(w.ownerBuildGapPct).toBeGreaterThan(0);
    expect(w.measuredSeats).toBeGreaterThan(0);
    expect(whyGapValues(w)).toHaveLength(4);
  });
});

describe('memo fixes', () => {
  it('docs include K10 and K14; data gaps cite nothing unknown', () => {
    for (const mode of ['msoa', 'seat'] as const) {
      const ctx = makeCtx({ ...DEFAULT_SETTINGS, missingMode: mode });
      for (const s of ctx.seats) {
        const { docs, argument } = memoPrompt(s, ctx);
        const ids = docs.map(d => d.id);
        expect(ids).toContain('K10');
        expect(ids).toContain('K14');
        expect(validateCitations(argument.dataGaps.join(' '), ids).unknown).toEqual([]);
      }
    }
  });
  it('missing-homes data gap wording', () => {
    const cm = makeCtx({ ...DEFAULT_SETTINGS, missingMode: 'msoa' });
    expect(buildArgument(cm.seats[0]!, cm).dataGaps).toContain(
      "Missing homes are summed per neighbourhood; each seat's model potential is split across its neighbourhoods by transport and brownfield capacity because neighbourhood-level WhereToBuild demand was unavailable [K14].");
    expect(MISSING_GAP_MSOA_FALLBACK).toMatch(/summed per neighbourhood/);
    const cs = makeCtx({ ...DEFAULT_SETTINGS, missingMode: 'seat' });
    expect(buildArgument(cs.seats[0]!, cs).dataGaps).toContain(
      'Missing homes are computed per seat, so overbuilding neighbourhoods offset underbuilding ones [K14].');
    expect(MISSING_GAP_SEAT).toMatch(/per seat/);
  });
});
