/** F09 Area-type guide, F12 method, F13 status. */
import { S, subscribe } from '../state';
import { $, fmt, h, set } from '../dom';
import { TYPE_ORDER, typeInfo } from '../content';
import { chip } from './card';

export function mountGuide() {
  const render = () => {
    const counts: Record<string, number> = {};
    S.seats.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
    set($('#game'), h`${TYPE_ORDER.map(k => { const t = typeInfo(k); return h`<div class="cell" data-type="${k}">
      <div class="cellhead">${chip(k)}<span class="note" data-testid="type-count">${counts[k] || 0} seats</span></div>
      <div class="who">${t.who}</div><p>${t.logic}</p><p><b>Ask:</b> ${t.ask}</p></div>`; })}`);
  };
  subscribe((_, why) => { if (why === 'settings' || why === 'data') render(); });
  render();
}

export function mountMethod() {
  const render = () => {
    const meta = S.data.meta as Record<string, any>;
    const vm = meta.vModel ?? {};
    const measured = S.seats.filter(r => !r.vEst).length, n = S.seats.length;
    const model = meta.model ?? {};
    set($('#method'), h`
      <p><b>Outside demand (WhereToBuild, Warwick).</b> The housing gap: people searching for homes minus homes available (sales and rentals, 2019–2024), by neighbourhood (MSOA). The file shared had its numbers turned into clock durations by a spreadsheet locale setting; values were rebuilt by requiring gap = gap-per-km² × area. That recovered 954 of 1,002 London neighbourhoods exactly; the rest use their borough's median density. Total London gap: ${fmt(meta.wtbTotal)} home-seekers.</p>
      <p><b>Resident concern.</b> Prime Radiant polling via Forest (MRP, 17 Aug 2026): share who say their neighbours are concerned about housing shortages. Measured for <span data-testid="measured">${measured}</span> seats. The other ${n - measured} are estimated from a London regression (R² ${vm.r2 ?? '—'}, n=${vm.n ?? '—'}, typical error ±${vm.mae ?? '—'} points) and shown with a dashed outline.</p>
      <p><b>Missing-homes model.</b> For each neighbourhood, capacity is the build rate reached by the best-performing ${model.q ? `${Math.round((1 - model.q) * 100)}%` : 'fifth'} of neighbourhoods with similar transport access (PTAL) and brownfield capacity (quantile frontier), scaled by demand per existing home (elasticity ${model.elasticity ?? 0.5}), then calibrated so London's total matches your target (now ${fmt(S.settings.total)} a year). Missing homes = model minus actual completions, never below zero. Mode: ${S.settings.missingMode === 'msoa' ? 'per neighbourhood, summed to seats' : 'per seat'}${meta.missingMode === 'msoa_fallback' ? ' (neighbourhood data approximate in this snapshot)' : ''}.</p>
      <p><b>Building activity.</b> Planning London Datahub completions, approved-not-started, under construction, lapsed and refused homes since 2019; brownfield land register; borough context from the Housing Delivery Test, net additions, Council Taxbase and May 2026 council control.</p>
      <p><b>Area type.</b> Seats split into thirds on outside demand per resident and on resident concern. The four corners get named types; everything else is middle ground.</p>
      <p><b>Persuadability.</b> <code>closeness = 1 / (1 + margin/5)</code>, <code>split = 1 − |2 × concern rank − 1|</code>, blended by the slider. <code>Priority = missing homes (share of max) × persuadability</code>.</p>
      <p><b>Seats and MPs.</b> 2024 results from the House of Commons Library, current MPs from mySociety (Sep 2026), postcodes from the ONS postcode directory.</p>
      <p><b>Limits.</b> 75 seats is a small sample and concern is modelled, not surveyed seat by seat. This shows patterns, not causes. Councils decide planning applications, so the MP is a pressure lever, not the decision-maker.</p>
      ${(meta.notes ?? []).length ? h`<p><b>Build notes.</b> ${(meta.notes as string[]).join(' ')}</p>` : ''}`);
  };
  subscribe((_, why) => { if (why === 'settings' || why === 'data') render(); });
  render();
}

export function mountStatus() {
  const render = () => { const el = $('#bkstatus')!; el.textContent = `Snapshot data · version ${S.version}`; el.dataset.mode = 'snapshot'; };
  subscribe((_, why) => { if (why === 'data') render(); });
  render();
}
