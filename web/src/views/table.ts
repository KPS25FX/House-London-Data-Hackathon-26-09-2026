/** F06 Campaign ranking table (filters + sorts). */
import * as core from '@dcv/core';
import { S, select, setFilter, setSort, subscribe } from '../state';
import { $, fmt, h, pc1, set } from '../dom';
import { partyShort, TYPE_ORDER, typeInfo } from '../content';
import { chip, marginText } from './card';
import type { Seat, SortId } from '../types';

const SORTS: Record<SortId, [string, (a: Seat, b: Seat) => number]> = {
  prio: ['Campaign priority', (a, b) => b.prio - a.prio],
  gap: ['Homes missing', (a, b) => b.gap - a.gap],
  margin: ['Election margin', (a, b) => a.marginPct - b.marginPct],
  stalled: ['Stalled permissions', (a, b) => (b.approvedNS + b.lapsed) - (a.approvedNS + a.lapsed)],
};

export function mountTable() {
  const root = $('#ranksec')!;
  set(root, h`
    <div class="sechead"><h2 id="rankh">Where to campaign</h2><span class="note">Select a row to load the seat.</span></div>
    <div class="controls" id="filters"></div>
    <div id="settings"></div>
    <div class="tablewrap"><table id="rank"><caption class="sr">Seats ranked</caption><thead><tr>
      <th class="num" scope="col">#</th><th scope="col">Seat</th><th scope="col">Type</th><th class="num" scope="col">Missing/yr</th><th class="num" scope="col">Concern</th><th class="num" scope="col">Margin</th><th scope="col">MP</th><th scope="col">Main blocker</th><th class="num" scope="col">Priority</th>
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
  tb.addEventListener('keydown', e => {
    const tr = (e.target as Element).closest('tr[data-code]') as HTMLElement | null;
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(tr.dataset.code!); }
  });
  subscribe((_, why) => { if (why !== 'llm' && why !== 'layer') render(); });
  render();
}

function render() {
  $('#rankh')!.textContent = S.role === 'policy' ? 'Where homes are missing' : 'Where to campaign';
  const parties = [...new Set(S.seats.map(r => partyShort(r.mpParty)))].sort();
  const boroughs = [...new Set(S.seats.map(r => r.borough))].sort();
  set($('#filters'), h`
    <div class="ctl"><label for="ftype">Type</label><select id="ftype"><option value="">All types</option>${TYPE_ORDER.map(k => h`<option value="${k}"${S.ftype === k ? ' selected' : ''}>${typeInfo(k).label}</option>`)}</select></div>
    <div class="ctl"><label for="fparty">Party</label><select id="fparty"><option value="">All parties</option>${parties.map(p => h`<option${S.fparty === p ? ' selected' : ''}>${p}</option>`)}</select></div>
    <div class="ctl"><label for="fborough">Borough</label><select id="fborough"><option value="">All of London</option>${boroughs.map(b => h`<option${S.fborough === b ? ' selected' : ''}>${b}</option>`)}</select></div>
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
