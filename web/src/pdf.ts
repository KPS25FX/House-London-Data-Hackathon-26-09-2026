/** F10 memo PDF (A4, mm, margins 18) built with jsPDF. */
import { jsPDF } from 'jspdf';
import type { Policy, Seat } from './types';

const MAP: Record<string, string> = {
  '≈': '~', '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '×': 'x', '−': '-', '‑': '-', ' ': ' ', ' ': ' ',
  '✓': 'v', '…': '...', '‐': '-', '′': "'", '″': '"', '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '•': '-',
};
/** Transliterate characters the built-in Helvetica can't draw. */
export const pdfSafe = (s: string) =>
  (s || '').replace(/[^\x00-\x7F£€]/g, c => MAP[c] ?? (c.normalize('NFKD').replace(/[^\x00-\x7F]/g, '') || ''));

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

export interface PdfMeta { version: string; createdAt: string; by?: string; total: number }

export function buildMemoPdf(r: Seat, text: string, docs: Policy[], meta: PdfMeta): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 18, CW = W - 2 * M;
  const ACC: [number, number, number] = [13, 107, 103], INK: [number, number, number] = [13, 27, 42], MUTED: [number, number, number] = [104, 119, 137];
  let y = 0;
  const header = () => { doc.setFillColor(...ACC); doc.rect(0, 0, W, 4, 'F'); };
  const need = (hh: number) => { if (y + hh > H - 18) { doc.addPage(); header(); y = M; } };
  const para = (s: string, o: { size?: number; style?: string; color?: [number, number, number]; indent?: number; gap?: number; lh?: number } = {}) => {
    const { size = 10, style = 'normal', color = INK, indent = 0, gap = 1.6, lh = 0.42 } = o;
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(pdfSafe(s), CW - indent) as string[];
    for (const l of lines) { need(size * lh); doc.text(l, M + indent, y); y += size * lh; }
    y += gap;
  };
  header(); y = M + 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...ACC);
  doc.text('POLICY MEMO · LONDON HOUSING', M, y); y += 7;
  para(r.name, { size: 20, style: 'bold', lh: 0.45, gap: 1 });
  const margin = r.majority != null && r.majority < 1000 ? `${fmt(r.majority)} votes` : `${r.marginPct.toFixed(1)} pts`;
  para(`${r.borough} · ${r.mp ? `${r.mp} (${r.mpParty})` : 'No sitting MP'} · 2024 margin ${margin}`, { size: 9.5, color: MUTED, gap: 0.5 });
  const when = new Date(meta.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  para(`Generated ${when}${meta.by ? ` by ${meta.by}` : ''} · model target ${fmt(meta.total)} homes a year London-wide`, { size: 8.5, color: MUTED, gap: 4 });
  const kf: [string, string][] = [
    ['Homes built a year', fmt(r.homes)], ['Model: should build', fmt(r.target)], ['Missing a year', fmt(r.gap)],
    [r.vEst ? 'Residents worried (est.)' : 'Residents worried', Math.round(r.V * 100) + '%'],
  ];
  const bw = CW / 4; need(18);
  kf.forEach((k, i) => {
    const x = M + i * bw; doc.setFillColor(238, 242, 241); doc.rect(x + 0.5, y, bw - 1, 15, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(pdfSafe(k[0]), x + 3, y + 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK); doc.text(pdfSafe(k[1]), x + 3, y + 12);
  });
  y += 21;
  for (const line of text.split('\n')) {
    const L = line.replace(/\*\*(.+?)\*\*/g, '$1').trimEnd();
    if (!L.trim() || /^# /.test(L)) continue;
    if (/^## /.test(L)) { y += 2; need(12); para(L.slice(3), { size: 12.5, style: 'bold', color: ACC, gap: 1.2 }); continue; }
    if (/^### /.test(L)) { para(L.slice(4), { size: 10.5, style: 'bold', gap: 1 }); continue; }
    if (/^\s*[-*] /.test(L)) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      const lines = doc.splitTextToSize(pdfSafe(L.replace(/^\s*[-*] /, '')), CW - 6) as string[];
      lines.forEach((l, i) => {
        need(4.3);
        if (i === 0) { doc.setFillColor(...ACC); doc.circle(M + 2, y - 1.2, 0.8, 'F'); }
        doc.setTextColor(...INK); doc.text(l, M + 6, y); y += 4.3;
      });
      y += 1.2; continue;
    }
    para(L, { gap: 2 });
  }
  y += 3; need(14);
  para('Sources consulted', { size: 11, style: 'bold', color: ACC, gap: 1 });
  for (const d of docs) {
    const src = (d.src || []).map(s => (s.url && !s.url.startsWith('#') ? `${s.name} ${s.url}` : s.name)).join('; ');
    para(`[${d.id}] ${d.title}. ${src}`, { size: 7.8, color: MUTED, gap: 1 });
  }
  para('Data: Planning London Datahub; WhereToBuild (Warwick); Prime Radiant MRP via Forest; House of Commons Library GE2024; Census 2021; MHCLG Housing Delivery Test. Associations, not proof of cause.', { size: 7.5, color: MUTED, gap: 0 });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(pdfSafe(`Policy memo · ${r.name} · data version ${meta.version}`), M, H - 10);
    doc.text(`${i} / ${n}`, W - M, H - 10, { align: 'right' });
  }
  return doc.output('blob');
}

export const memoFile = (name: string) => `policy-memo-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
