/** F06 Campaign ranking table (filters + sorts). */
import * as core from '@dcv/core';
import { S, select, setFilter, setSort, subscribe } from '../state';
import { $, fmt, h, pc1, set } from '../dom';
import { partyShort, TYPE_ORDER, typeInfo } from '../content';
import { chip, marginText } from './card';
import { go } from '../router';
import type { Seat, SortId } from '../types';

const SORTS: Record<SortId, [string, (a: Seat, b: Seat) => number]> = {
  prio: ['MP leverage', (a, b) => b.prio - a.prio],
  gap: ['Most homes missing', (a, b) => b.gap - a.gap],
  margin: ['Closest seats', (a, b) => a.marginPct - b.marginPct],
  stalled: ['Most stalled permissions', (a, b) => (b.approvedNS + b.lapsed) - (a.approvedNS + a.lapsed)],
};

export function mountTable() {
  const root = $('#ranksec')!;
  set(root, h`
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h2 id="rankh">Seat rankings</h2><span class="note" id="ranknote">Sort by missing homes, MP leverage, margin or stalled permissions. Select a row to load the seat.</span></div>
    <div class="controls" id="filters"></div>
    <div id="settings"></div>
    <div class="tablewrap"><table id="rank"><caption class="sr">Seats ranked</caption><thead><tr>
      <th class="num" scope="col">#</th><th scope="col">Seat</th><th scope="col">Area type</th><th class="num" scope="col">Homes missing a year</th><th class="num" scope="col">Residents worried</th><th class="num" scope="col">2024 margin</th><th scope="col">MP</th><th scope="col">Main blocker</th><th class="num" scope="col">MP leverage</th>
    </tr></thead><tbody></tbody></table></div>`);
  root.addEventListener('change', e => {
    const t = e.target as HTMLSelectElement;
    if (t.id === 'ftype') setFilter({ ftype: t.value });
    if (t.id === 'fparty') setFilter({ fparty: t.value });
    if (t.id === 'fborough') setFilter({ fborough: t.value });
    if (t.id === 'fsort') setSort(t.value as SortId);
  });
  const tb = $('#rank tbody')!;
  tb.addEventListener('click', e => { const tr = (e.target as Element).closest('tr[data-code]') as HTMLElement | null; if (tr) select(tr.dataset.code!); });
  tb.addEventListener('dblclick', e => { const tr = (e.target as Element).closest('tr[data-code]') as HTMLElement | null; if (tr) go('p-seat'); });
  tb.addEventListener('keydown', e => {
    const tr = (e.target as Element).closest('tr[data-code]') as HTMLElement | null;
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(tr.dataset.code!); }
  });
  subscribe((_, why) => { if (why !== 'llm' && why !== 'layer' && why !== 'trend' && why !== 'policy' && why !== 'scen') render(); });
  render();
}

function render() {
  const parties = [...new Set(S.seats.map(r => partyShort(r.mpParty)))].sort();
  const boroughs = [...new Set(S.seats.map(r => r.borough))].sort();
  set($('#filters'), h`
    <div class="ctl"><label for="ftype">Area type</label><select id="ftype"><option value="">All types</option>${TYPE_ORDER.map(k => h`<option value="${k}"${S.ftype === k ? ' selected' : ''}>${typeInfo(k).label}</option>`)}</select></div>
    <div class="ctl"><label for="fparty">MP's party</label><select id="fparty"><option value="">All parties</option>${parties.map(p => h`<option${S.fparty === p ? ' selected' : ''}>${p}</option>`)}</select></div>
    <div class="ctl"><label for="fborough">Council</label><select id="fborough"><option value="">All of London</option>${boroughs.map(b => h`<option${S.fborough === b ? ' selected' : ''}>${b}</option>`)}</select></div>
    <div class="ctl"><label for="fsort">Sort by</label><select id="fsort">${(Object.keys(SORTS) as SortId[]).map(k => h`<option value="${k}"${S.sort === k ? ' selected' : ''}>${SORTS[k][0]}</option>`)}</select></div>`);
  const list = S.seats.slice().sort(SORTS[S.sort][1]).filter(r =>
    (!S.ftype || r.type === S.ftype) && (!S.fparty || partyShort(r.mpParty) === S.fparty) && (!S.fborough || r.borough === S.fborough));
  const tb = $('#rank tbody')!;
  if (!list.length) { set(tb, h`<tr><td colspan="9" class="note">No seats match these filters.</td></tr>`); return; }
  set(tb, h`${list.map(r => {
    const tbk = core.topBlocker(r, S.ctx);
    return h`<tr data-code="${r.code}" tabindex="0" class="${S.sel === r.code ? 'sel' : ''}" aria-selected="${S.sel === r.code}">
      <td class="num">${r.rank}</td>
      <td><b>${r.name}</b><span class="why">${core.reasons(r).join(' · ') || '—'}</span></td>
      <td>${chip(r.type)}</td>
      <td class="num">${fmt(r.gap)}</td>
      <td class="num">${pc1(r.V)}${r.vEst ? h`<span class="flag"> est.</span>` : ''}</td>
      <td class="num">${marginText(r)}</td>
      <td>${r.mp || 'Vacant'} <span class="note">${partyShort(r.mpParty)}</span></td>
      <td class="blk">${tbk ? tbk.t : 'No single blocker'}</td>
      <td class="num"><div class="pbar">${Math.round(r.prio)}<div class="bar"><i style="width:${Math.max(0, Math.min(100, r.prio))}%"></i></div></div></td></tr>`;
  })}`);
}
