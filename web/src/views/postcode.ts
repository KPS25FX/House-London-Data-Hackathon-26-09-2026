/** F02 Postcode lookup (both inputs share this). */
import * as core from '@dcv/core';
import { S, select, seat } from '../state';

let pending: string | null = null;
const listeners: ((v: string, msg: string) => void)[] = [];
export function onPostcode(fn: (v: string, msg: string) => void) { listeners.push(fn); }
/** Message to show after a selection: the lookup's own message, else "Showing {seat}." */
export function consumeMsg(name: string | undefined): string {
  const m = pending; pending = null;
  return m ?? (name ? `Showing ${name}.` : '');
}

/** Look up a postcode, select the seat and broadcast the message line. */
export function lookup(rawInput: string): { ok: boolean; msg: string } {
  const res = core.lookupPostcode(rawInput, S.data.postcodes);
  const pc = rawInput.trim().toUpperCase().replace(/\s+/g, ' ');
  let msg: string; let code: string | null = null;
  if ('err' in res) msg = res.err;
  else {
    const r = seat(res.code);
    if (r) { code = r.code; msg = res.partial ? `Showing the seat covering most of ${pc}. Enter the full postcode to be exact.` : `Showing ${r.name}.`; }
    else msg = `${pc} isn't a London postcode in this lookup. Check for typos, or try the first half (e.g. SE15).`;
  }
  listeners.forEach(f => f(rawInput, msg));
  if (code) {
    pending = msg;
    select(code);
    if (window.innerWidth < 900) document.getElementById('card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return { ok: !!code, msg };
}
