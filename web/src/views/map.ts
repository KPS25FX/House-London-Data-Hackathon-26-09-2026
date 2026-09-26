/** F03 Hex map with 7 layers, legend and tooltip. */
import * as core from '@dcv/core';
import { S, select, setLayer, subscribe } from '../state';
import { $, abbr, esc, fmt, h, lum, pc1, raw, seq, set } from '../dom';
import { biv, blockInfo, layers, typeInfo, TYPE_ORDER, BIV } from '../content';
import type { Seat } from '../types';

const R = 13, W = Math.sqrt(3) * R;
function hexPts(cx: number, cy: number) {
  const p: string[] = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); p.push((cx + R * Math.cos(a)).toFixed(1) + ',' + (cy + R * Math.sin(a)).toFixed(1)); }
  return p.join(' ');
}
export const blockCat = (r: Seat) => core.blockCat(r, S.ctx) as string;

function fill(r: Seat, maxGap: number): string {
  switch (S.layer) {
    case 'type': return biv(r.Vt, r.Mt);
    case 'gap': return seq(maxGap ? r.gap / maxGap : 0);
    case 'prio': return seq(r.prio / 100);
    case 'M': return seq(r.Mp);
    case 'V': return seq(r.Vp);
    case 'margin': return seq(1 - Math.min(1, r.marginPct / 40));
    case 'blocker': return blockInfo(blockCat(r)).c;
  }
  return '#ccc';
}

export function mountMap() {
  const root = $('#mapsec')!;
  set(root, h`
    <div class="sechead"><h2 id="maph">London map</h2><span class="note">One hexagon per constituency, placed roughly where it sits.</span></div>
    <div class="layers" role="group" aria-label="Map layer" id="layers"></div>
    <div class="mapbox" id="mapbox"><svg class="map" id="map" role="group" aria-label="Hex map of London's 75 parliamentary constituencies"></svg><div class="tip" id="tip" hidden></div></div>
    <div class="legendrow" id="legend" aria-live="polite"></div>
    <p class="note mapnote">Dashed outline: resident concern estimated (no Forest reading pulled yet for this seat).</p>`);
  const svg = $('#map')!;
  const pick = (e: Event) => (e.target as Element).closest('g[data-code]') as SVGGElement | null;
  svg.addEventListener('click', e => { const g = pick(e); if (g) select(g.dataset.code!); });
  svg.addEventListener('keydown', e => {
    const g = pick(e); if (!g) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(g.dataset.code!); }
  });
  const tip = $('#tip')!, box = $('#mapbox')!;
  svg.addEventListener('mousemove', e => {
    const g = pick(e); if (!g) { tip.hidden = true; return; }
    const r = S.seats.find(x => x.code === g.dataset.code); if (!r) return;
    set(tip, h`<b>${r.name}</b><br>${typeInfo(r.type).label} · ${fmt(r.wtbGap)} home-seekers unserved<br>${fmt(r.gap)} missing homes / yr · ${blockInfo(blockCat(r)).l}<br>Concerned: ${pc1(r.V)}${r.vEst ? ' (est.)' : ''} · Margin ${r.marginPct.toFixed(1)} pts`);
    tip.hidden = false;
    const b = box.getBoundingClientRect();
    let x = e.clientX - b.left + box.scrollLeft + 12; const y = e.clientY - b.top + 12;
    if (x > b.width - 230) x -= 250;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  svg.addEventListener('mouseleave', () => (tip.hidden = true));
  $('#layers')!.addEventListener('click', e => {
    const b = (e.target as Element).closest('button[data-l]') as HTMLButtonElement | null;
    if (b) setLayer(b.dataset.l as never);
  });
  subscribe((_, why) => { if (why !== 'llm') render(); });
  render();
}

function render() {
  set($('#layers'), h`${layers().map(l => h`<button type="button" data-l="${l.id}" aria-pressed="${S.layer === l.id}">${l.label}</button>`)}`);
  const svg = $('#map')!;
  const pos = S.seats.map(r => ({ r, x: r.q * W + (Math.abs(r.r) % 2 ? W / 2 : 0), y: -r.r * 1.5 * R }));
  if (!pos.length) return;
  const xs = pos.map(p => p.x), ys = pos.map(p => p.y);
  const x0 = Math.min(...xs) - W, y0 = Math.min(...ys) - R * 1.4, w = Math.max(...xs) - x0 + W, hh = Math.max(...ys) - y0 + R * 1.4;
  svg.setAttribute('viewBox', `${x0} ${y0} ${w} ${hh}`);
  const maxGap = Math.max(...S.seats.map(x => x.gap));
  const focused = (document.activeElement as HTMLElement | null)?.dataset?.code;
  svg.innerHTML = pos.map(p => {
    const f = fill(p.r, maxGap), dark = lum(f) < 0.5;
    const dim = S.fborough && p.r.borough !== S.fborough;
    const sel = S.sel === p.r.code;
    const label = `${p.r.name}: ${typeInfo(p.r.type).label}, ${fmt(p.r.gap)} missing homes a year${p.r.vEst ? ', concern estimated' : ''}`;
    return `<g data-code="${esc(p.r.code)}" class="hx${dim ? ' dim' : ''}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(label)}"><polygon class="hex${p.r.vEst ? ' est' : ''}${sel ? ' sel' : ''}" points="${hexPts(p.x, p.y)}" fill="${f}"></polygon><text x="${p.x}" y="${p.y + 3}" text-anchor="middle" class="${dark ? 'lt' : ''}">${esc(abbr(p.r.name))}</text></g>`;
  }).join('');
  // keep the selected hex on top so its outline isn't clipped by neighbours
  const selG = svg.querySelector(`g[data-code="${CSS.escape(S.sel ?? '')}"]`); if (selG) svg.appendChild(selG);
  if (focused) (svg.querySelector(`g[data-code="${CSS.escape(focused)}"]`) as SVGGElement | null)?.focus();
  renderLegend();
}

function renderLegend() {
  const el = $('#legend')!;
  if (S.layer === 'type') {
    const cells: string[] = [];
    for (let v = 2; v >= 0; v--) for (let m = 0; m < 3; m++) cells.push(`<div style="background:${BIV[v]?.[m]}"></div>`);
    set(el, h`<div class="bivar" data-legend="type"><div class="axl vert">Residents concerned →</div><div><div class="cells">${raw(cells.join(''))}</div><div class="axl">Market demand →</div></div></div>
      <div class="types">${TYPE_ORDER.map(k => { const t = typeInfo(k); return h`<div><span class="sw" style="background:${t.color}"></span><b>${t.label}</b> · ${t.who}</div>`; })}</div>`);
  } else if (S.layer === 'blocker') {
    const n: Record<string, number> = {};
    S.seats.forEach(r => { const k = blockCat(r); n[k] = (n[k] || 0) + 1; });
    set(el, h`<div class="catleg" data-legend="blocker">${Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, c]) => { const b = blockInfo(k); return h`<span><i style="background:${b.c}"></i>${b.l} (${c})</span>`; })}</div>`);
  } else {
    const L = ({ gap: ['0', 'most homes missing'], prio: ['low', 'highest priority'], M: ['least demand', 'most home-seekers per resident'], V: ['least concerned', 'most concerned'], margin: ['safe (40+ pts)', 'knife-edge'] } as Record<string, [string, string]>)[S.layer] ?? ['', ''];
    set(el, h`<div class="seqleg" data-legend="${S.layer}"><div class="seqbar" style="background:linear-gradient(90deg,${seq(0)},${seq(1)})"></div><div class="seqlab"><span>${L[0]}</span><span>${L[1]}</span></div></div>`);
  }
}
