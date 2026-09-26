/** F02 "Your area" panel + F04 seat card. */
import * as core from '@dcv/core';
import { S, select, selected, setFilter, subscribe } from '../state';
import { $, fmt, h, ordinal, pc1, set } from '../dom';
import { fixFor, typeInfo } from '../content';
import { consumeMsg, lookup, onPostcode } from './postcode';
import type { Seat } from '../types';

export function chip(type: string) {
  const t = typeInfo(type);
  return h`<span class="chip t-${type}" style="background:${t.color}">${t.label}</span>`;
}
export const marginText = (r: Seat) => (r.majority != null && r.majority < 1000 ? `${fmt(r.majority)} votes` : `${r.marginPct.toFixed(1)} pts`);

export function mountCard() {
  set($('#areasec'), h`
    <h2 id="pch">Choose a seat</h2><div class="pick" id="pick"></div><p class="note" style="margin:8px 0 0">Or enter a postcode:</p>
    <form class="pc" id="pcform" autocomplete="off">
      <label for="pcin" class="sr">Postcode</label>
      <input id="pcin" name="pc" placeholder="Postcode, e.g. SE15 5DQ" inputmode="text" autocapitalize="characters">
      <button type="submit">Look up</button>
    </form>
    <div class="pcmsg" id="pcmsg" role="status" aria-live="polite"></div>
    <div class="card" id="card" aria-live="polite"></div>`);
  $('#pcform')!.addEventListener('submit', e => {
    e.preventDefault();
    lookup(($('#pcin') as HTMLInputElement).value);
  });
  $('#pick')!.addEventListener('change', e => {
    const t = e.target as HTMLSelectElement;
    if (t.id === 'sbor2') {
      setFilter({ fborough: t.value });
      const top = t.value ? S.seats.filter(r => r.borough === t.value).sort((a, b) => b.gap - a.gap)[0] : undefined;
      if (top && selected()?.borough !== t.value) select(top.code);
    }
    if (t.id === 'sseat2' && t.value) select(t.value);
  });
  onPostcode((v, msg) => { ($('#pcin') as HTMLInputElement).value = v; $('#pcmsg')!.textContent = msg; });
  subscribe((_, why) => {
    if (why === 'select') $('#pcmsg')!.textContent = consumeMsg(selected()?.name);
    if (why !== 'llm' && why !== 'layer' && why !== 'trend' && why !== 'policy') { render(); renderPick(); }
  });
  render(); renderPick();
}

function renderPick() {
  const boroughs = [...new Set(S.seats.map(x => x.borough))].sort();
  const scope = (S.fborough ? S.seats.filter(x => x.borough === S.fborough) : S.seats).slice().sort((a, b) => a.name.localeCompare(b.name));
  const has = scope.some(x => x.code === S.sel);
  set($('#pick'), h`<div class="ctl"><label for="sbor2">Council</label><select id="sbor2"><option value="">All of London</option>${boroughs.map(b => h`<option${b === S.fborough ? ' selected' : ''}>${b}</option>`)}</select></div>
    <div class="ctl"><label for="sseat2">Seat</label><select id="sseat2">${has ? '' : h`<option value="" selected>Select a seat…</option>`}${scope.map(x => h`<option value="${x.code}"${x.code === S.sel ? ' selected' : ''}>${x.name}</option>`)}</select></div>`);
}

function render() {
  const el = $('#card')!;
  const r = selected();
  if (!r) { el.innerHTML = ''; return; }
  const t = typeInfo(r.type);
  const B = S.ctx.boroughs[r.borough] as (Record<string, any> | undefined);
  const mpLine = r.mp
    ? h`<b>${r.mp}</b> · ${r.mpParty}${r.mpParty === 'Reform UK' ? ' (elected as Conservative)' : ''}`
    : h`<b>No sitting MP</b> · ${r.mpNote ?? ''}`;
  const maj = r.majority != null ? `${fmt(r.majority)} votes (${r.marginPct.toFixed(1)} pts)` : `${r.marginPct.toFixed(1)} pts`;
  const H = core.hypotheses(r, S.ctx).filter(x => x.id !== 'none').slice(0, 2);
  const n = S.seats.length || 75;
  set(el, h`
    <div class="top"><div><div class="eyebrow">Constituency</div><h3 class="seatname" data-testid="seat-name">${r.name}</h3>
      <div class="mp">${mpLine}</div>
      <div class="mp">2024: ${r.won} won over ${r.second}, by ${maj}</div>
      <div class="mp">Council: ${r.borough}${B ? ` · ${B.control || 'control n/a'} · Delivery Test ${Math.round((B.hdt ?? 0) * 100)}% (${B.hdtCons ?? ''})` : ''}</div></div>
      ${chip(r.type)}</div>
    <p class="verdict">${core.verdict(r, S.ctx)}</p>
    <div class="helps">${H.map(x => { const [fix, who] = fixFor(x); return h`<div class="help"><b>${fix || x.t}</b><span>Who can act: ${who || '—'}</span></div>`; })}</div>
    <details class="adjust"><summary>See the numbers</summary>
    <div class="stats">
      <div class="stat"><div class="k">Missing homes a year</div><div class="v" data-testid="card-gap">${fmt(r.gap)}</div><div class="s">Model ${fmt(r.target)} · built ${fmt(r.homes)} a year (2019/20–2024/25)</div></div>
      <div class="stat"><div class="k">Residents who say neighbours worry about housing</div><div class="v">${pc1(r.V)}${r.vEst ? ' est.' : ''}</div><div class="s">${r.vEst ? h`<span class="flag">Estimated, Forest reading not yet pulled</span>` : `${ordinal(Math.round(r.Vp * n))} of ${n} in London`}</div></div>
      <div class="stat"><div class="k">Home-seekers the local market can't house</div><div class="v">${fmt(r.wtbGap)}</div><div class="s">${fmt(r.wtbPer1k)} per 1,000 residents · ${ordinal(Math.round(r.Mp * n))} of ${n} (WhereToBuild)</div></div>
      <div class="stat"><div class="k">Homes owned / private rent / social rent</div><div class="v">${Math.round(r.owned)} / ${Math.round(r.privRent)} / ${Math.round(r.social)}%</div><div class="s">${(r.outright ?? 0).toFixed(0)}% owned outright · ${Math.round(r.underocc)}% with 2+ spare bedrooms</div></div>
      <div class="stat"><div class="k">Approved, not started · lapsed · refused (homes since 2019)</div><div class="v">${fmt(r.approvedNS)} · ${fmt(r.lapsed)} · ${fmt(r.refused)}</div><div class="s">${fmt(r.startedNC)} under construction · brownfield room for ${fmt(r.bf)}</div></div>
      <div class="stat"><div class="k">Registered voters per 100 adults</div><div class="v">${(r.regPer100 ?? 0).toFixed(0)}</div><div class="s">${Math.round(r.movedIn)}% moved in within a year · ${Math.round(r.overcrowd)}% overcrowded</div></div>
    </div></details>
    <div class="bars"><div class="note">Campaign priority ${Math.round(r.prio)}/100 · rank ${r.rank} of ${n}</div><div class="bar"><i style="width:${Math.max(0, Math.min(100, r.prio))}%"></i></div><div class="note">${core.reasons(r).join(' · ') || '—'}</div></div>
    <div class="ask"><div class="eyebrow">Campaign ask for this type of seat</div><p>${t.ask}</p></div>`);
}
