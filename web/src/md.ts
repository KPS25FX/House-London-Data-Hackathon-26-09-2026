/** Minimal, safe Markdown: escape first, then headings, bullets, bold and [K01]/[E01]/[L01] evidence links. */
import { esc } from './dom';

const REF = /\[([A-Z]\d{2,3})\]/g;

function inline(t: string, known: Set<string>): string {
  // split "[K01, K02]" into "[K01] [K02]"
  t = t.replace(/\[([A-Z]\d{2,3}(?:\s*,\s*[A-Z]\d{2,3})+)\]/g, (_, list: string) => list.split(',').map(x => `[${x.trim()}]`).join(' '));
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(REF, (m, id: string) => (known.has(id) ? `<a href="#ev-${id}" class="kref" data-k="${id}">[${id}]</a>` : `<span class="kunk" title="Not in this memo's sources">${m}</span>`));
}

export function md(src: string, known: Set<string>): string {
  let out = '';
  let inList = false;
  for (const line of src.split('\n')) {
    const L = line.trimEnd();
    if (/^\s*[-*] /.test(L)) {
      if (!inList) { out += '<ul>'; inList = true; }
      out += '<li>' + inline(L.replace(/^\s*[-*] /, ''), known) + '</li>';
      continue;
    }
    if (inList) { out += '</ul>'; inList = false; }
    const hm = L.match(/^(#{1,3}) (.*)/);
    if (hm) { const n = hm[1]!.length + 1; out += `<h${n}>${inline(hm[2]!, known)}</h${n}>`; continue; }
    if (L.trim()) out += '<p>' + inline(L, known) + '</p>';
  }
  if (inList) out += '</ul>';
  return out;
}

/** Split off the trailing <!--meta {...}--> line. */
export function stripTrailer(text: string): { body: string; meta: Record<string, unknown> | null } {
  const m = text.match(/\n?<!--meta\s*([\s\S]*?)-->\s*$/);
  if (!m) return { body: text.replace(/\n?<!--meta[\s\S]*$/, ''), meta: null };
  let meta: Record<string, unknown> | null = null;
  try { meta = JSON.parse(m[1]!); } catch { meta = null; }
  return { body: text.slice(0, m.index).trimEnd(), meta };
}

export function bottomLine(text: string): string {
  const parts = text.split(/\n## /);
  const sec = parts.find(s => /^Bottom line/i.test(s));
  const body = (sec ?? text.replace(/^#.*\n/, '')).replace(/^Bottom line[^\n]*\n/i, '').replace(/\*\*/g, '').split(/\n## /)[0]!.trim();
  const sents = body.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [body];
  return sents.slice(0, 2).join(' ').trim();
}
