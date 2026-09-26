/** Thin, tolerant accessors over core.CONTENT (copy lives in core, not here). */
import { CONTENT } from '@dcv/core';
import type { Hyp, LayerId } from './types';

type AnyRec = Record<string, any>;
const C = CONTENT as unknown as AnyRec;

export interface TypeInfo { label: string; color: string; who: string; ask: string; logic: string }
export const TYPE_ORDER = ['locked', 'ready', 'middle', 'worried', 'settled'] as const;
export function typeInfo(k: string): TypeInfo {
  const t = (C.TYPES || {})[k] || {};
  return { label: t.label ?? k, color: t.color ?? '#cccccc', who: t.who ?? '', ask: t.ask ?? '', logic: t.logic ?? '' };
}
export function blockInfo(k: string): { l: string; c: string } {
  const b = (C.BLOCK || {})[k] || {};
  return { l: b.l ?? b.label ?? k, c: b.c ?? b.color ?? '#d3d9df' };
}
export const BLOCK_KEYS = (): string[] => Object.keys(C.BLOCK || {});
export function layers(): { id: LayerId; label: string }[] {
  const L = C.LAYERS;
  if (Array.isArray(L)) return L.map((x: AnyRec) => ({ id: x.id, label: x.label ?? x.l }));
  if (L && typeof L === 'object') return Object.entries(L).map(([id, v]) => ({ id: id as LayerId, label: typeof v === 'string' ? v : (v as AnyRec).label }));
  return [
    { id: 'type', label: 'Area type' }, { id: 'gap', label: 'Missing homes' }, { id: 'prio', label: 'Where to campaign' },
    { id: 'M', label: 'Outside demand' }, { id: 'V', label: 'Residents worried' }, { id: 'margin', label: 'Seat margin' }, { id: 'blocker', label: 'Main blocker' },
  ];
}
export function partyShort(mpParty: string | null | undefined): string {
  if (!mpParty) return 'Vacant';
  return (C.PARTY || {})[mpParty] ?? mpParty;
}
export function confLabel(c: string): string {
  return (C.CONF_LABEL || {})[c] ?? ({ strong: 'Strong evidence', moderate: 'Some evidence', tentative: 'Early signal' } as AnyRec)[c] ?? c;
}
/** FIX may be keyed by hypothesis title or id; values [fix, who] or {fix, who}. */
export function fixFor(h: Hyp): [string, string] {
  const F = C.FIX || {};
  const v = F[h.t] ?? F[h.id];
  if (!v) return ['', ''];
  if (Array.isArray(v)) return [v[0] ?? '', v[1] ?? ''];
  return [v.fix ?? '', v.who ?? ''];
}
export const BIV: string[][] = (Array.isArray(C.BIV) ? C.BIV : null) ?? [
  ['#e8e8e8', '#ace4e4', '#5ac8c8'],
  ['#dfb0d6', '#a5add3', '#5698b9'],
  ['#be64ac', '#8c62aa', '#3b4994'],
];
export const biv = (vt: number, mt: number) => BIV[vt]?.[mt] ?? '#cccccc';
