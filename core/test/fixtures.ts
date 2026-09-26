// Loads the prototype data files and adapts them to the contract types.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { compute, DEFAULT_SETTINGS } from '../src/index.js';
import type { Borough, Ctx, Meta, Policy, Postcodes, SeatRow, Settings } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, '../../reference/prototype');
const load = (f: string): any => JSON.parse(readFileSync(resolve(proto, f), 'utf8'));

const data = load('data.json');
export const rows: SeatRow[] = data.rows;

const bRaw: Record<string, Omit<Borough, 'name'>> = load('boroughs.json');
export const boroughs: Record<string, Borough> = Object.fromEntries(
  Object.entries(bRaw).map(([name, b]) => [name, { ...b, name } as Borough]));

export const policies: Policy[] = (load('kb.json') as Omit<Policy, 'kind'>[]).map(k => ({
  ...k, kind: k.title.startsWith('Borough profile') ? 'borough_profile' : 'library',
}));

export const meta: Meta = {
  version: data.version, generatedAt: '2026-09-26T00:00:00Z', target: data.target, vModel: data.vModel,
  wtbTotal: data.wtbTotal, model: { coef: [1.3212, 0.2388, 0.162], q: 0.8, elasticity: 0.5, median_gap_per1k: 135.3 },
  missingMode: 'msoa_fallback', notes: [],
};

/** Prototype pc.json: {OUT: [defaultIdx, {idx: "INWINW..."}]} -> contract Postcodes. */
export function postcodes(): Postcodes {
  const pc: Record<string, [number, Record<string, string>]> = load('pc.json');
  const out: Postcodes = {};
  for (const [o, [d, ex]] of Object.entries(pc)) {
    const x: Record<string, string> = {};
    for (const [idx, str] of Object.entries(ex || {})) {
      const code = rows[+idx]?.code;
      for (let i = 0; i < str.length; i += 3) if (code) x[str.substr(i, 3)] = code;
    }
    out[o] = { d: d === -1 ? null : rows[d]!.code, ...(Object.keys(x).length ? { x } : {}) };
  }
  return out;
}

export function makeCtx(settings: Settings = DEFAULT_SETTINGS, r: SeatRow[] = rows): Ctx {
  return { seats: compute(r, [], settings), boroughs, policies, settings, meta };
}
