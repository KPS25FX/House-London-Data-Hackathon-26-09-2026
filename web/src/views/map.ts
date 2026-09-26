/** F03 Map: boundary view (geo.json) or equal-size hexes, 9 colour layers, legend, tooltip, selected-seat panel. */
import * as core from '@dcv/core';
import { S, scenSeat, select, setLayer, setView, subscribe } from '../state';
import { $, abbr, esc, fmt, h, lum, pc1, raw, seq, set } from '../dom';
import { biv, blockInfo, typeInfo, TYPE_ORDER, BIV, partyShort } from '../content';
import { go, onPage } from '../router';
import { curMetric, curYear, fmtM, trendValue } from '../trendsel';
import type { LayerId, Seat } from '../types';

export const LAYERS: { id: LayerId; label: string }[] = [
  { id: 'type', label: 'Area type' }, { id: 'gap', label: 'Missing homes' }, { id: 'prio', label: 'MP leverage' },
  { id: 'M', label: 'Outside demand' }, { id: 'V', label: 'Residents worried' }, { id: 'margin', label: 'Seat margin' },
  { id: 'blocker', label: 'Main blocker' }, { id: 'scen', label: 'After scenario' }, { id: 'trend', label: 'Borough trend' },
];
const LAYER_HELP: Record<LayerId, string> = {
  type: '<b>Area type</b> combines outside demand (across) with resident concern (up). Locked-out seats have demand but no local pressure to build.',
  gap: '<b>Missing homes</b>: homes a year each seat is short of its share of the London target, given its transport, land and demand.',
  prio: '<b>MP leverage</b>: missing homes weighted by how winnable the MP is (tight margin or residents split on housing).',
  M: "<b>Outside demand</b>: home-seekers the local market can't house, per 1,000 residents (WhereToBuild).",
  V: '<b>Residents worried</b>: share saying their neighbours worry about housing (Prime Radiant polling).',
  margin: '<b>Seat margin</b>: darker seats had closer 2024 results.',
  blocker: "<b>Main blocker</b>: the top-ranked reason homes aren't being built, from the seat brief's diagnosis.",
  scen: '<b>After scenario</b>: missing homes once the levers set on the Scenarios page are applied.',
  trend: "<b>Borough trend</b>: the measure and year chosen on the Trends page, shown for each seat's borough.",
};

const R = 13, W = Math.sqrt(3) * R;
function hexPts(cx: number, cy: number) {
  const p: string[] = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); p.push((cx + R * Math.cos(a)).toFixed(1) + ',' + (cy + R * Math.sin(a)).toFixed(1)); }
  return p.join(' ');
}
export const blockCat = (r: Seat) => core.blockCat(r, S.ctx) as string;

function trendFill(r: Seat): string {
  const m = curMetric(); if (!m) return cssNone();
  const i = curYear(m), v = trendValue(m, r.borough, i);
  if (v == null) return cssNone();
  const [lo, hi] = core.metricRange(m, i);
  const t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
  return seq(m.better === 'high' ? 1 - t : t);
}
const cssNone = () => 'var(--line)';

function fill(r: Seat, maxGap: number): string {
  switch (S.layer) {
    case 'type': return biv(r.Vt, r.Mt);
    case 'gap': return seq(maxGap ? r.gap / maxGap : 0);
    case 'prio': return seq(r.prio / 100);
    case 'M': return seq(r.Mp);
    case 'V': return seq(r.Vp);
    case 'margin': return seq(1 - Math.min(1, r.marginPct / 40));
    case 'blocker': return blockInfo(blockCat(r)).c;
    case 'scen': { const s = scenSeat(r.code); return seq(maxGap ? (s ? s.gapS : r.gap) / maxGap : 0); }
    case 'trend': return trendFill(r);
  }
  return '#ccc';
}

function tipHtml(r: Seat) {
  const s = scenSeat(r.code);
  return h`<b>${r.name}</b> · ${r.borough}<br>${fmt(r.gap)} missing homes a year · built ${fmt(r.homes)}${core.isScenarioOn(S.scen) && s ? h`<br>After scenario: ${fmt(s.gapS)}` : ''}<br>Main blocker: ${blockInfo(blockCat(r)).l}<br>${typeInfo(r.type).label} · residents concerned ${pc1(r.V)}${r.vEst ? ' (est.)' : ''}`;
}

export function mountMap() {
  set($('#mapsec'), h`
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <h2 id="maph">London map</h2>
      <div class="seg" role="group" aria-label="Map style" id="mapview"><button type="button" data-v="geo" aria-pressed="true">Boundaries</button><button type="button" data-v="hex" aria-pressed="false">Equal-size hexes</button></div>
    </div>
    <div class="layers" role="group" aria-label="Map layer" id="layers"></div>
    <div class="mapbox" id="mapbox"><svg class="map" id="map" role="group" aria-label="Map of London's 75 parliamentary constituencies"></svg><div class="tip" id="tip" hidden></div></div>
    <div class="legendrow" id="legend" aria-live="polite"></div>
    <p class="note mapnote">Dashed outline: resident concern estimated (no Forest reading pulled yet for this seat).</p>`);
  const svg = $('#map')!;
  const pick = (e: Event) => (e.target as Element).closest('[data-code]') as SVGElement | null;
  svg.addEventListener('click', e => { const g = pick(e); if (g) select(g.dataset.code!); });
  svg.addEventListener('keydown', e => {
    const g = pick(e); if (!g) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(g.dataset.code!); }
  });
  const tip = $('#tip')!, box = $('#mapbox')!;
  svg.addEventListener('mousemove', e => {
    const g = pick(e); if (!g) { tip.hidden = true; return; }
    const r = S.seats.find(x => x.code === g.dataset.code); if (!r) return;
    set(tip, tipHtml(r));
    tip.hidden = false;
    const b = box.getBoundingClientRect();
    let x = e.clientX - b.left + box.scrollLeft + 12; const y = e.clientY - b.top + 12;
    if (x > b.width - 250) x -= 270;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  svg.addEventListener('mouseleave', () => (tip.hidden = true));
  $('#layers')!.addEventListener('click', e => {
    const b = (e.target as Element).closest('button[data-l]') as HTMLButtonElement | null;
    if (b) setLayer(b.dataset.l as LayerId);
  });
  $('#mapview')!.addEventListener('click', e => {
    const b = (e.target as Element).closest('button[data-v]') as HTMLButtonElement | null;
    if (b) setView(b.dataset.v as 'geo' | 'hex');
  });
  if (!S.data.geo) ($('#mapview button[data-v="geo"]') as HTMLButtonElement).disabled = true;
  $('#mapsel')!.addEventListener('click', e => {
    const b = (e.target as Element).closest('button[data-go]') as HTMLButtonElement | null;
    if (b) go(b.dataset.go!);
  });
  subscribe((_, why) => { if (why !== 'llm' && why !== 'policy') render(); });
  onPage(id => { if (id === 'p-map') render(); });
  render();
}

function render() {
  set($('#layers'), h`${LAYERS.map(l => h`<button type="button" data-l="${l.id}" aria-pressed="${S.layer === l.id}">${l.label}</button>`)}`);
  document.querySelectorAll('#mapview button').forEach(b => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.v === S.view)));
  const svg = $('#map')!;
  if (!S.seats.length) return;
  const maxGap = Math.max(...S.seats.map(x => x.gap));
  const focused = (document.activeElement as HTMLElement | null)?.dataset?.code;
  const label = (r: Seat) => `${r.name}: ${typeInfo(r.type).label}, ${fmt(r.gap)} missing homes a year${r.vEst ? ', concern estimated' : ''}`;
  const geo = S.data.geo;
  if (S.view === 'geo' && geo) {
    svg.setAttribute('viewBox', `-4 -4 ${geo.w + 8} ${geo.h + 8}`);
    const sel = S.seats.find(r => r.code === S.sel);
    let out = S.seats.filter(r => geo.seats[r.code]).map(r => {
      const dim = S.fborough && r.borough !== S.fborough;
      return `<path class="seat${r.vEst ? ' est' : ''}${dim ? ' dim' : ''}${S.sel === r.code ? ' sel' : ''}" data-code="${esc(r.code)}" tabindex="0" role="button" aria-pressed="${S.sel === r.code}" aria-label="${esc(label(r))}" d="${esc(geo.seats[r.code])}" fill="${fill(r, maxGap)}"></path>`;
    }).join('');
    if (geo.boroughs) out += `<path class="boro" d="${esc(geo.boroughs)}"></path>`;
    if (sel && geo.seats[sel.code]) {
      const d = esc(geo.seats[sel.code]);
      out += `<path class="selo2" d="${d}"></path><path class="selo" d="${d}"></path>`;
      const c = geo.cent?.[sel.code];
      if (c) { const x = Math.max(90, Math.min(geo.w - 90, c[0])); out += `<text x="${x}" y="${c[1] + 5}" text-anchor="middle" style="font-size:17px">${esc(sel.name)}</text>`; }
    }
    svg.innerHTML = out;
  } else {
    const pos = S.seats.map(r => ({ r, x: r.q * W + (Math.abs(r.r) % 2 ? W / 2 : 0), y: -r.r * 1.5 * R }));
    const xs = pos.map(p => p.x), ys = pos.map(p => p.y);
    const x0 = Math.min(...xs) - W, y0 = Math.min(...ys) - R * 1.4, w = Math.max(...xs) - x0 + W, hh = Math.max(...ys) - y0 + R * 1.4;
    svg.setAttribute('viewBox', `${x0} ${y0} ${w} ${hh}`);
    svg.innerHTML = pos.map(p => {
      const f = fill(p.r, maxGap), dark = !f.startsWith('var') && lum(f) < 0.5;
      const dim = S.fborough && p.r.borough !== S.fborough;
      const sel = S.sel === p.r.code;
      return `<g data-code="${esc(p.r.code)}" class="hx${dim ? ' dim' : ''}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(label(p.r))}"><polygon class="hex${p.r.vEst ? ' est' : ''}${sel ? ' sel' : ''}" points="${hexPts(p.x, p.y)}" fill="${f}"></polygon><text x="${p.x}" y="${p.y + 3}" text-anchor="middle" class="${dark ? 'lt' : ''}">${esc(abbr(p.r.name))}</text></g>`;
    }).join('');
    const selG = svg.querySelector(`g[data-code="${CSS.escape(S.sel ?? '')}"]`); if (selG) svg.appendChild(selG);
  }
  if (focused) (svg.querySelector(`[data-code="${CSS.escape(focused)}"]`) as SVGElement | null)?.focus();
  renderLegend(maxGap);
  renderSel();
}

function renderLegend(maxGap: number) {
  const el = $('#legend')!;
  const bar = h`<div class="seqbar" style="background:linear-gradient(90deg,${seq(0)},${seq(1)})"></div>`;
  if (S.layer === 'type') {
    const cells: string[] = [];
    for (let v = 2; v >= 0; v--) for (let m = 0; m < 3; m++) cells.push(`<div style="background:${BIV[v]?.[m]}"></div>`);
    set(el, h`<div class="bivar" data-legend="type"><div class="axl vert">Residents concerned →</div><div><div class="cells">${raw(cells.join(''))}</div><div class="axl" style="margin-top:4px">Market demand →</div></div></div>
      <div class="types">${TYPE_ORDER.map(k => { const t = typeInfo(k); return h`<div><span class="sw" style="background:${t.color}"></span><b>${t.label}</b> · ${t.who}</div>`; })}</div>`);
  } else if (S.layer === 'blocker') {
    const n: Record<string, number> = {};
    S.seats.forEach(r => { const k = blockCat(r); n[k] = (n[k] || 0) + 1; });
    set(el, h`<div class="catleg" data-legend="blocker">${Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, c]) => { const b = blockInfo(k); return h`<span><i style="background:${b.c}"></i>${b.l} (${c})</span>`; })}</div>`);
  } else if (S.layer === 'scen') {
    set(el, h`<div class="seqleg" data-legend="scen"><div class="note" style="color:var(--ink)"><b>Missing homes a year after the scenario</b> (same scale as "Missing homes")${core.isScenarioOn(S.scen) ? '' : ' · no levers set yet'}</div>${bar}<div class="seqlab"><span>0</span><span>${fmt(maxGap)}</span></div></div>`);
  } else if (S.layer === 'trend') {
    const m = curMetric();
    if (!m) { set(el, h`<p class="note" data-legend="trend">No time series loaded.</p>`); return; }
    const i = curYear(m), [lo, hi] = core.metricRange(m, i);
    const [a, b] = m.better === 'high' ? [hi, lo] : [lo, hi];
    set(el, h`<div class="seqleg" data-legend="trend"><div class="note" style="color:var(--ink)"><b>${m.label}, ${m.years[i]}</b> · each seat shows its borough</div>${bar}<div class="seqlab"><span>${fmtM(m, a)}</span><span>${fmtM(m, b)}</span></div></div>`);
  } else {
    const L = ({ gap: ['0', 'most homes missing'], prio: ['low', 'highest leverage'], M: ['least demand', 'most home-seekers per resident'], V: ['least concerned', 'most concerned'], margin: ['safe (40+ pts)', 'knife-edge'] } as Record<string, [string, string]>)[S.layer] ?? ['', ''];
    set(el, h`<div class="seqleg" data-legend="${S.layer}">${bar}<div class="seqlab"><span>${L[0]}</span><span>${L[1]}</span></div></div>`);
  }
}

function renderSel() {
  $('#layerhelp')!.innerHTML = LAYER_HELP[S.layer] ?? '';
  const el = $('#mapsel')!;
  const r = S.seats.find(x => x.code === S.sel);
  if (!r) { set(el, h`<p class="note">Select a seat on the map.</p>`); return; }
  const t = typeInfo(r.type), s = scenSeat(r.code);
  set(el, h`<div class="mapsel" data-testid="mapsel"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div class="eyebrow">Selected seat</div><h2>${r.name}</h2></div><span class="chip t-${r.type}" style="background:${t.color}">${t.label}</span></div>
    <div class="mp">${r.borough} · ${r.mp ? h`<b>${r.mp}</b> (${partyShort(r.mpParty)})` : 'No sitting MP'} · margin ${r.marginPct.toFixed(1)} pts</div>
    <div class="kv"><div>Missing homes a year<b>${fmt(r.gap)}</b></div><div>Built a year<b>${fmt(r.homes)}</b></div><div>Main blocker<b class="t">${blockInfo(blockCat(r)).l}</b></div><div>Residents worried<b>${pc1(r.V)}${r.vEst ? h`<span class="flag"> est.</span>` : ''}</b></div>${core.isScenarioOn(S.scen) && s ? h`<div>After scenario<b>${fmt(s.gapS)}</b></div>` : ''}<div>MP leverage rank<b>${r.rank} <small class="note">of ${S.seats.length}</small></b></div></div>
    <div class="btnrow"><button type="button" data-go="p-seat">Open seat brief</button><button type="button" class="sec" data-go="p-scen">Test levers</button></div></div>`);
}
