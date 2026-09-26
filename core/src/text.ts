// ALG-12 verdict and ALG-13 reasons (plain text, no HTML).
import type { Ctx, Hypothesis, Seat } from './types.js';
import { hypotheses } from './hypotheses.js';
import { fmt, pts } from './format.js';

export function verdict(r: Seat, ctx: Ctx, Hs: Hypothesis[] = hypotheses(r, ctx)): string {
  const H = Hs.filter(h => h.id !== 'none');
  const tens = Math.round(r.V * 10);
  let s = `${r.name} builds about ${fmt(r.homes)} homes a year. Given its transport, land and demand, it should be nearer ${fmt(r.target)}` +
    (r.gap > 0 ? `, so it is about ${fmt(r.gap)} a year short.` : ', so it is keeping up.');
  s += ` About ${tens} in 10 residents say their neighbours worry about housing${r.vEst ? ' (estimated)' : ''}.`;
  s += r.marginPct < 5 ? ` The MP's majority is tiny (${r.majority < 1000 ? fmt(r.majority) + ' votes' : r.marginPct.toFixed(1) + ' points'}).`
    : r.marginPct < 12 ? ` The seat is marginal (${r.marginPct.toFixed(1)} points).`
      : ` The seat is safe (${r.marginPct.toFixed(0)} points).`;
  const top = H[0];
  if (top) s += ` Main issue: ${top.t.charAt(0).toLowerCase() + top.t.slice(1)}.`;
  return s;
}

/** Up to 3 reasons; empty array when none apply (UI shows "—", see reasonsLine). */
export function reasons(r: Seat): string[] {
  const out: string[] = [];
  if (r.marginPct < 5) out.push(`knife-edge seat (${r.majority != null && r.majority < 1000 ? fmt(r.majority) + ' votes' : pts(r.marginPct)})`);
  else if (r.marginPct < 12) out.push(`marginal (${r.marginPct.toFixed(1)} pts)`);
  if (r.swing > 0.7) out.push('residents split on housing');
  if (r.gap > 600) out.push(`${fmt(r.gap)} homes a year short`);
  if (r.Mt === 2) out.push('high outside demand');
  return out.slice(0, 3);
}

export const reasonsLine = (r: Seat): string => reasons(r).join(' · ') || '—';
