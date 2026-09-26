/** Editable wording for the Evidence page (download / import on the Data page). Fit and risk stay calculated by core. */
import * as core from '@dcv/core';

type PolicyBase = (typeof core.POLICY_BASE)[number];
const TEXT_KEYS = ['name', 'strength', 'delivered', 'who'] as const;
const LIST_KEYS = ['guard', 'cards', 'track'] as const;
let overrides: Record<string, Partial<PolicyBase>> = {};

export function policyText(p: PolicyBase): PolicyBase { return { ...p, ...(overrides[p.id] ?? {}) } as PolicyBase; }

export function exportPolicies(): unknown[] {
  return core.POLICY_BASE.map(p => { const q = policyText(p); return { id: q.id, name: q.name, lvl: q.lvl, strength: q.strength, delivered: q.delivered, who: q.who, guard: q.guard, cards: q.cards, track: q.track }; });
}

/** Validate and apply an imported JSON array. Returns a message. Throws on invalid input. */
export function importPolicies(arr: unknown): number {
  if (!Array.isArray(arr)) throw new Error('Expected a JSON array of policies, as downloaded.');
  const ids = new Set(core.POLICY_BASE.map(p => p.id as string));
  const bad = arr.find(x => !x || typeof x !== 'object' || !ids.has((x as { id?: string }).id ?? ''));
  if (bad !== undefined) throw new Error(`Unknown policy id "${(bad as { id?: string } | null)?.id}". Allowed: ${[...ids].join(', ')}.`);
  const next: Record<string, Partial<PolicyBase>> = {};
  for (const x of arr as Record<string, unknown>[]) {
    const o: Record<string, unknown> = {};
    for (const k of TEXT_KEYS) if (typeof x[k] === 'string' && x[k]) o[k] = (x[k] as string).slice(0, 2000);
    for (const k of LIST_KEYS) if (Array.isArray(x[k]) && (x[k] as unknown[]).length) o[k] = (x[k] as unknown[]).slice(0, 8).map(s => String(s).slice(0, 600));
    if (typeof x.lvl === 'string' && x.lvl in core.EV_LVL) o.lvl = x.lvl;
    next[x.id as string] = o as Partial<PolicyBase>;
  }
  overrides = next;
  return arr.length;
}
