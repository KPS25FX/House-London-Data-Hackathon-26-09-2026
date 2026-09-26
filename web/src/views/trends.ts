/** Trends page: measure + borough selects, year slider + Play, line chart (borough vs London), borough ranking, "Show on map". */
import * as core from '@dcv/core';
import { S, selected, setLayer, setTrend, subscribe } from '../state';
import { $, h, set } from '../dom';
import { go, onPage } from '../router';
import { curMetric, curYear, fmtM } from '../trendsel';

let timer: number | null = null;

export function mountTrends() {
  set($('#trends'), h`
    <div class="labhead"><div><div class="eyebrow">Borough trends</div><h2 id="trh">How has the squeeze changed over time?</h2></div><span class="note">Pick a measure and a borough, then drag the year or press Play. The map follows the year you pick.</span></div>
    <div class="controls">
      <div class="ctl"><label for="trm">Measure</label><select id="trm"></select></div>
      <div class="ctl"><label for="trb">Borough</label><select id="trb"></select></div>
      <div class="ctl trslide"><label for="try">Year <output id="tryo" data-testid="trend-year"></output></label><input type="range" id="try" min="0" max="1" step="1" value="0"></div>
      <button type="button" class="tbtn" id="trplay">Play</button><button type="button" class="tbtn sec" id="trmap" aria-pressed="false">Show on map</button>
    </div>
    <div class="trgrid">
      <div><svg id="trline" class="sc" role="img" aria-label="Line chart of the selected measure over time for the borough and London"></svg><div class="trleg" id="trleg"></div><p class="readout" id="trread"></p></div>
      <div class="trrank" id="trrank"></div>
    </div>`);
  $('#trm')!.addEventListener('change', e => { stop(); setTrend({ trm: (e.target as HTMLSelectElement).value, trYi: null }); });
  $('#trb')!.addEventListener('change', e => setTrend({ trb: (e.target as HTMLSelectElement).value }));
  $('#try')!.addEventListener('input', e => setTrend({ trYi: +(e.target as HTMLInputElement).value }, S.layer === 'trend'));
  $('#trplay')!.addEventListener('click', play);
  $('#trmap')!.addEventListener('click', () => {
    if (S.layer === 'trend') { setLayer('gap'); return; }
    setTrend({}, true); go('p-map');
  });
  $('#trrank')!.addEventListener('click', e => {
    const b = (e.target as Element).closest('button[data-b]') as HTMLButtonElement | null;
    if (b) setTrend({ trb: b.dataset.b! });
  });
  subscribe((_, why) => { if (why === 'trend' || why === 'data' || why === 'layer') render(); });
  onPage(id => { if (id === 'p-trends') render(); else stop(); });
  render();
}

function stop() { if (timer != null) { clearInterval(timer); timer = null; } const b = $('#trplay'); if (b) b.textContent = 'Play'; }
function play() {
  if (timer != null) { stop(); return; }
  const m = curMetric(); if (!m) return;
  const n = m.years.length;
  if (curYear(m) >= n - 1) setTrend({ trYi: 0 });
  $('#trplay')!.textContent = 'Pause';
  const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1400 : 700;
  timer = window.setInterval(() => {
    const mm = curMetric(); if (!mm) { stop(); return; }
    const i = curYear(mm);
    if (i >= mm.years.length - 1) { stop(); return; }
    setTrend({ trYi: i + 1 }, S.layer === 'trend');
  }, ms);
}

function render() {
  const m = curMetric();
  const trmap = $('#trmap')!;
  trmap.setAttribute('aria-pressed', String(S.layer === 'trend'));
  trmap.textContent = S.layer === 'trend' ? 'Showing on map' : 'Show on map';
  if (!m) { set($('#trread'), h`No time series loaded. Import one on the Data page.`); return; }
  const i = curYear(m), n = m.years.length;
  set($('#trm'), h`${(S.series?.metrics ?? []).map(x => h`<option value="${x.id}"${x.id === m.id ? ' selected' : ''}>${x.label}</option>`)}`);
  const bs = Object.keys(m.data).sort();
  let b = S.trb && m.data[S.trb] ? S.trb : null;
  if (!b) { const r = selected(); b = r && m.data[r.borough] ? r.borough : bs[0] ?? ''; }
  set($('#trb'), h`${bs.map(x => h`<option${x === b ? ' selected' : ''}>${x}</option>`)}`);
  const sl = $('#try') as HTMLInputElement;
  sl.max = String(n - 1); if (document.activeElement !== sl) sl.value = String(i); sl.value = String(i); sl.disabled = n < 2;
  ($('#trplay') as HTMLButtonElement).disabled = n < 2;
  $('#tryo')!.textContent = m.years[i] ?? '';

  // line chart
  const svg = $('#trline')!, W = 640, H = 300, mg = { l: 62, r: 18, t: 14, b: 34 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const B = m.data[b] ?? [], L = m.london ?? [];
  const vals = [...B, ...L].filter((v): v is number => v != null);
  const lo0 = vals.length ? Math.min(...vals) : 0, hi0 = vals.length ? Math.max(...vals) : 1;
  const pad = (hi0 - lo0) * 0.08 || 1, lo = Math.max(0, lo0 - pad), hi = hi0 + pad;
  const X = (k: number) => mg.l + (n < 2 ? 0.5 : k / (n - 1)) * (W - mg.l - mg.r), Y = (v: number) => H - mg.b - (v - lo) / (hi - lo) * (H - mg.t - mg.b);
  let g = '';
  for (let t = 0; t <= 4; t++) { const v = lo + (hi - lo) * t / 4; g += `<line class="gl" x1="${mg.l}" x2="${W - mg.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${mg.l - 8}" y="${Y(v) + 4}" text-anchor="end">${fmtM(m, v)}</text>`; }
  const step = Math.ceil(n / 8);
  m.years.forEach((y, k) => { if (k % step === 0 || k === n - 1) g += `<text x="${X(k)}" y="${H - mg.b + 18}" text-anchor="middle">${y}</text>`; });
  const path = (a: (number | null)[]) => { let d = '', on = false; a.forEach((v, k) => { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + X(k).toFixed(1) + ',' + Y(v).toFixed(1); on = true; }); return d; };
  g += `<line class="yr" x1="${X(i)}" x2="${X(i)}" y1="${mg.t}" y2="${H - mg.b}"/>`;
  if (L.length) g += `<path class="ln lon" d="${path(L)}"/>`;
  g += `<path class="ln bor" d="${path(B)}"/>`;
  if (B[i] != null) g += `<circle class="dot bor" cx="${X(i)}" cy="${Y(B[i]!)}" r="4.5"/>`;
  if (L[i] != null) g += `<circle class="dot lon" cx="${X(i)}" cy="${Y(L[i]!)}" r="4"/>`;
  svg.innerHTML = g;
  set($('#trleg'), h`<span><i class="sw bor"></i>${b}</span>${L.length ? h`<span><i class="sw lon"></i>London</span>` : ''}<span class="note">${m.source}${m.note ? ` · ${m.note}` : ''}</span>`);

  // ranking for year i
  const rk = Object.entries(m.data).map(([k, a]) => [k, a[i]] as [string, number | null | undefined]).filter((x): x is [string, number] => x[1] != null).sort((a, c) => c[1] - a[1]);
  const mx = Math.max(...rk.map(x => x[1]), 1e-9);
  set($('#trrank'), h`<div class="note" style="margin-bottom:6px">${m.label}, ${m.years[i]}${m.better ? ` · ${m.better === 'low' ? 'lower' : 'higher'} is better` : ''}</div>
    ${rk.map(([k, v], j) => h`<button type="button" class="rkrow${k === b ? ' on' : ''}" data-b="${k}"><span class="rkn">${j + 1}</span><span class="rkl">${k}</span><span class="rkb"><i style="width:${(v / mx * 100).toFixed(1)}%"></i></span><span class="rkv">${fmtM(m, v)}</span></button>`)}`);

  // readout
  const f = core.first(m, b), cur = B[i];
  let s = h``;
  if (cur != null) {
    const pos = rk.findIndex(x => x[0] === b);
    const since = f && f.year !== m.years[i] && f.v ? `, ${cur >= f.v ? 'up' : 'down'} ${Math.abs((cur / f.v - 1) * 100).toFixed(0)}% since ${f.year}` : '';
    s = h`<b>${b}</b>: ${fmtM(m, cur)} in ${m.years[i]}${since}${L[i] != null ? `. London: ${fmtM(m, L[i])}` : ''}${pos >= 0 ? `. Ranks ${pos + 1} of ${rk.length} boroughs` : ''}.`;
  } else s = h`No ${m.label.toLowerCase()} figure for ${b} in ${m.years[i]}.`;
  set($('#trread'), s);
}
