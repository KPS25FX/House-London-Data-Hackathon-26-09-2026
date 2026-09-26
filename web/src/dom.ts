/** Tiny DOM helpers. All dynamic text goes through esc() or textContent. */
export const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Tagged template: interpolated values are escaped unless wrapped with raw(). */
export class Raw { constructor(public html: string) {} }
export const raw = (s: string) => new Raw(s);
export function h(strings: TemplateStringsArray, ...vals: unknown[]): Raw {
  let out = strings[0] ?? '';
  vals.forEach((v, i) => {
    if (Array.isArray(v)) out += v.map(x => (x instanceof Raw ? x.html : esc(x))).join('');
    else out += v instanceof Raw ? v.html : v == null ? '' : esc(v);
    out += strings[i + 1] ?? '';
  });
  return new Raw(out);
}
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T | null;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];
export function set(el: Element | null, html: Raw) { if (el) el.innerHTML = html.html; }

export const fmt = (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : Math.round(n).toLocaleString('en-GB'));
export const pc1 = (n: number | null | undefined) => (n == null ? '—' : (n * 100).toFixed(0) + '%');
export const pts = (m: number) => (m < 1 ? m.toFixed(2) : m.toFixed(1)) + ' pts';
export function ordinal(n: number) { n = Math.max(1, n); const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]!); }
export function abbr(n: string) {
  return n.replace(/,/g, '').split(/\s+/).filter(w => w && !/^(and|of|the|upon)$/i.test(w)).map(w => w[0]).join('').slice(0, 3).toUpperCase();
}

/* colour helpers */
export function cssVar(n: string) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888'; }
function hex2rgb(hx: string) { hx = hx.replace('#', ''); if (hx.length === 3) hx = hx.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(hx.slice(i, i + 2), 16)); }
export function mix(a: string, b: string, t: number) { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i]! - x) * t)).join(',')})`; }
export function lum(c: string) { const m = c.startsWith('#') ? hex2rgb(c) : (c.match(/\d+/g) || ['0', '0', '0']).map(Number); const [r, g, b] = m as number[]; return (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255; }
export function seq(t: number) { return mix(cssVar('--seq0'), cssVar('--seq1'), Math.max(0, Math.min(1, isFinite(t) ? t : 0))); }
