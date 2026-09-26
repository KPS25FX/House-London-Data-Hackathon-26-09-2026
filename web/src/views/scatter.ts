/** F08 Evidence view: log-x scatter + four findings (core.findings). */
import * as core from '@dcv/core';
import { S, select, subscribe } from '../state';
import { $, esc, fmt, h, pc1, set } from '../dom';
import { biv, typeInfo } from '../content';

export function mountScatter() {
  set($('#voicesec'), h`
    <h2 id="voiceh">Who decides what gets built: demand, or the people already here?</h2>
    <p class="lede">If building followed need, the places people most want to move to would build most. They don't. Each finding below compares the top and bottom thirds of London's seats.</p>
    <div class="vt">
      <div><p class="note">Each dot is a seat with measured polling. Further right: more people trying to move in. Higher: more residents worried about housing. Colour: area type, as on the map.</p>
        <div class="mapbox" id="scbox"><svg id="scatter" class="sc" role="group" aria-label="Scatter of outside demand against resident concern"></svg><div class="tip" id="tip2" hidden></div></div></div>
      <div class="findings" id="findings"></div>
    </div>`);
  const svg = $('#scatter')!, tip = $('#tip2')!, box = $('#scbox')!;
  svg.addEventListener('click', e => { const c = (e.target as Element).closest('circle[data-code]') as SVGElement | null; if (c) select(c.dataset.code!); });
  svg.addEventListener('keydown', e => {
    const c = (e.target as Element).closest('circle[data-code]') as SVGElement | null;
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(c.dataset.code!); }
  });
  svg.addEventListener('mousemove', e => {
    const c = (e.target as Element).closest('circle[data-code]') as SVGElement | null;
    if (!c) { tip.hidden = true; return; }
    const r = S.seats.find(x => x.code === c.dataset.code); if (!r) return;
    set(tip, h`<b>${r.name}</b><br>${fmt(r.wtbPer1k)} per 1,000 · ${pc1(r.V)} concerned<br>${typeInfo(r.type).label}`);
    tip.hidden = false; const b = box.getBoundingClientRect();
    let x = e.clientX - b.left + 12; if (x > b.width - 230) x -= 250;
    tip.style.left = x + 'px'; tip.style.top = (e.clientY - b.top + 12) + 'px';
  });
  svg.addEventListener('mouseleave', () => (tip.hidden = true));
  subscribe((_, why) => { if (why === 'select' || why === 'settings' || why === 'data') render(); });
  render();
}

function render() {
  const svg = $('#scatter')!;
  const W0 = 640, H0 = 380, m = { l: 52, r: 16, t: 16, b: 44 };
  svg.setAttribute('viewBox', `0 0 ${W0} ${H0}`);
  const P = S.seats.filter(r => !r.vEst && r.wtbPer1k > 0);
  if (P.length) {
    const lx = Math.log10, xs = P.map(r => lx(r.wtbPer1k));
    const x0 = Math.floor(Math.min(...xs) * 10) / 10, x1 = Math.ceil(Math.max(...xs) * 10) / 10 || x0 + 1;
    const X = (v: number) => m.l + (lx(v) - x0) / (x1 - x0 || 1) * (W0 - m.l - m.r);
    const Y = (v: number) => H0 - m.b - v / 0.6 * (H0 - m.t - m.b);
    let g = '';
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach(v => { g += `<line class="gl" x1="${m.l}" x2="${W0 - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v * 100)}%</text>`; });
    [10, 20, 50, 100, 200, 500].filter(v => lx(v) >= x0 && lx(v) <= x1).forEach(v => { g += `<line class="gl" y1="${m.t}" y2="${H0 - m.b}" x1="${X(v)}" x2="${X(v)}"/><text x="${X(v)}" y="${H0 - m.b + 16}" text-anchor="middle">${v}</text>`; });
    g += `<text x="${(W0 + m.l) / 2}" y="${H0 - 6}" text-anchor="middle">Home-seekers unserved per 1,000 residents (log scale) →</text><text transform="translate(12 ${(H0 - m.b) / 2}) rotate(-90)" text-anchor="middle">Residents worried about housing →</text>`;
    const sel = P.find(r => r.code === S.sel);
    const pts = P.filter(r => r !== sel).concat(sel ? [sel] : []);
    g += pts.map(r => `<circle data-code="${esc(r.code)}" tabindex="0" role="button" aria-label="${esc(`${r.name}: ${fmt(r.wtbPer1k)} per 1,000, ${pc1(r.V)} concerned`)}" class="${S.sel === r.code ? 'sel' : ''}" cx="${X(r.wtbPer1k)}" cy="${Y(Math.min(0.6, r.V))}" r="6" fill="${biv(r.Vt, r.Mt)}"/>`).join('');
    svg.innerHTML = g;
  }
  const F = core.findings(S.seats);
  set($('#findings'), h`${F.map(f => h`<div class="fnd"><div class="cmp">${f.cmp}</div><p><b>${f.headline}</b> ${f.detail}</p><div class="so">So what: ${f.so}</div><div class="rho">${f.rhoText}</div></div>`)}
    <p class="note">These are patterns across London, not proof of cause.</p>`);
}
