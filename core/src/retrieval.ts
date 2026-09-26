// ALG-10 BM25 retrieval over the policy library.
import type { Hypothesis, Policy, Seat } from './types.js';
import { TYPES } from './content.js';

const STOP = new Set('the a an of and or to in on for with by is are was were be as at from that this it its their than into about over under per not no'.split(' '));
export const tokenize = (s: string | undefined | null): string[] =>
  (s || '').toLowerCase().replace(/[^a-z0-9%\s-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));

export type BM25 = (query: string) => { id: string; s: number }[];

export function buildBM(policies: Policy[]): BM25 {
  const docs = policies.map(k => tokenize(k.title + ' ' + k.tags.join(' ') + ' ' + k.tags.join(' ') + ' ' + k.text));
  const tfs = docs.map(d => { const tf = new Map<string, number>(); for (const w of d) tf.set(w, (tf.get(w) ?? 0) + 1); return tf; });
  const N = docs.length;
  const avg = N ? docs.reduce((s, d) => s + d.length, 0) / N : 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1);
  return (q: string) => {
    const qt = tokenize(q);
    return docs.map((d, i) => {
      let s = 0;
      const tf = tfs[i]!;
      for (const w of qt) {
        const f = tf.get(w);
        if (!f) continue;
        const dfw = df.get(w) ?? 0;
        const idf = Math.log(1 + (N - dfw + 0.5) / (dfw + 0.5));
        s += idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * d.length / avg));
      }
      return { id: policies[i]!.id, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  };
}

const bmCache = new WeakMap<Policy[], BM25>();
function bmFor(policies: Policy[]): BM25 {
  let bm = bmCache.get(policies);
  if (!bm) { bm = buildBM(policies); bmCache.set(policies, bm); }
  return bm;
}

const isProfile = (p: Policy): boolean => p.kind === 'borough_profile' || p.title.startsWith('Borough profile');

export function boroughProfile(borough: string, policies: Policy[]): Policy | undefined {
  return policies.find(k => k.title === 'Borough profile: ' + borough) ??
    policies.find(k => k.kind === 'borough_profile' && k.scope === borough);
}

/** Policy ids retrieve() always returns when present in the library. */
export const ALWAYS_DOCS = ['K10', 'K14'] as const;

export function retrieve(s: Seat, H: Hypothesis[], policies: Policy[]): Policy[] {
  const byId = new Map(policies.map(p => [p.id, p]));
  const ids = new Set<string>();
  const b = boroughProfile(s.borough, policies);
  if (b) ids.add(b.id);
  H.forEach(h => h.k.forEach(k => ids.add(k)));
  const q = [s.borough, s.name, TYPES[s.type].label, ...H.map(h => h.t + ' ' + h.p)].join(' ');
  bmFor(policies)(q).slice(0, 14).forEach(x => {
    const p = byId.get(x.id);
    if (ids.size < 11 && !(p && isProfile(p))) ids.add(x.id);
  });
  // K10 and K14 are cited by the prompt rules and data gaps, so they are always included when they exist.
  ALWAYS_DOCS.forEach(k => { if (byId.has(k)) ids.add(k); });
  ['K05', 'K02'].forEach(k => { if (ids.size < 12) ids.add(k); });
  return [...ids].map(id => byId.get(id)).filter((p): p is Policy => !!p);
}
