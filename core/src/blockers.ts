// ALG-8 main blocker, by hypothesis id (not title regex).
import type { BlockerCat, Ctx, HypId, Hypothesis, Seat } from './types.js';
import { HYP_BLOCK } from './content.js';
import { hypotheses } from './hypotheses.js';

const NOT_BLOCKERS: ReadonlySet<HypId> = new Set<HypId>(['exposed', 'green_belt', 'none']);

export function topBlocker(s: Seat, ctx: Ctx, H: Hypothesis[] = hypotheses(s, ctx)): Hypothesis | null {
  return H.find(h => !NOT_BLOCKERS.has(h.id)) ?? null;
}

export function blockCat(s: Seat, ctx: Ctx, H?: Hypothesis[]): BlockerCat {
  const h = topBlocker(s, ctx, H);
  return h ? HYP_BLOCK[h.id] : 'none';
}
