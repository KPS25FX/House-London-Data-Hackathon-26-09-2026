// ALG-11 postcode lookup on the contract Postcodes format.
import type { Postcodes } from './types.js';

export function lookupPostcode(raw: string, pc: Postcodes): { code: string; partial: boolean } | { err: string } {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length < 2) return { err: 'Enter a postcode, for example SE15 5DQ.' };
  let out: string | undefined, inw: string | null = null;
  if (Object.prototype.hasOwnProperty.call(pc, s)) out = s;
  else if (s.length >= 5) { out = s.slice(0, -3); inw = s.slice(-3); }
  const entry = out !== undefined && Object.prototype.hasOwnProperty.call(pc, out) ? pc[out] : undefined;
  if (!entry) return { err: `${raw.trim().toUpperCase()} isn't a London postcode in this lookup. Check for typos, or try the first half (e.g. SE15).` };
  let code: string | null = entry.d;
  if (inw && entry.x && Object.prototype.hasOwnProperty.call(entry.x, inw)) code = entry.x[inw] ?? null;
  if (!code) return { err: `${raw.trim().toUpperCase()} is outside Greater London.` };
  return { code, partial: !inw };
}
