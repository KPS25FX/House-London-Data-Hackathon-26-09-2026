/** F01 Role selector and guided steps. */
import * as core from '@dcv/core';
import { S, select, selected, setFilter, setLayer, setRole, setSettings, setSort, subscribe } from '../state';
import { $, go, fmt, h, set } from '../dom';
import type { Raw } from '../dom';
import { blockInfo } from '../content';
import { lookup, onPostcode } from './postcode';
import { blockCat } from './map';
import { memoState, onMemoChange, requestMemo } from '../memostate';
import type { Seat } from '../types';

const NOTE = {
  campaigner: 'For campaigners: find your seat, see what is blocking homes, pick where to push and take the case to your MP.',
  policy: 'For policy teams: choose an area, set the target, map the blockers and get a policy memo.',
};
export const TARGETS: [number, string][] = [
  [52287, 'London Plan 2021: 52,287 a year'],
  [55800, 'Draft London Plan: 55,800 a year'],
  [88000, 'Government assessed need: ~88,000 a year'],
];

let pcValue = '';
let pcMsg = '';

export function mountSteps() {
  const root = $('#start')!;
  root.addEventListener('click', e => {
    const b = (e.target as Element).closest('button') as HTMLButtonElement | null;
    if (!b || b.disabled) return;
    if (b.dataset.role) { setRole(b.dataset.role as 'campaigner' | 'policy'); return; }
    if (b.dataset.code) { select(b.dataset.code); go('area'); return; }
    switch (b.id) {
      case 'sblock':
        if (!S.sel) { ($('#spc') as HTMLInputElement | null)?.focus(); return; }
        go('lab'); break;
      case 'starget': setLayer('prio'); setSort('prio'); go('rankh'); break;
      case 'smap': setLayer('blocker'); go('area'); break;
      case 'smemo': go('lab'); requestMemo(); break;
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const v = ($('#spc') as HTMLInputElement).value;
    pcValue = v;
    const res = lookup(v);
    pcMsg = res.ok ? '' : res.msg;
    render();
  });
  root.addEventListener('change', e => {
    const t = e.target as HTMLSelectElement;
    if (t.id === 'sbor') setFilter({ fborough: t.value });
    if (t.id === 'stot') setSettings({ total: +t.value });
  });
  onPostcode(v => { pcValue = v; });
  subscribe((_, why) => { if (why === 'select') pcMsg = ''; render(); });
  onMemoChange(render);
  render();
}

function step(n: number, title: string, body: Raw | string, now: Raw | string, done: boolean) {
  return h`<li class="step${done ? ' done' : ''}"><div class="lbl">Step ${n}</div><h3>${title}</h3>${body}<div class="now">${now}</div></li>`;
}

function memoNow(): Raw {
  const r = selected();
  if (!r) return h`Select a seat in step 1.`;
  if (S.llm === 'off') return h`The memo server isn't reachable right now.`;
  if (memoState.busy) return h`Writing a memo for <b>${r.name}</b>…`;
  if (memoState.forCode === r.code && memoState.text) return h`A memo for <b>${r.name}</b> is ready. Writing again replaces it.`;
  return h`2–3 page PDF for <b>${r.name}</b>.`;
}

function render() {
  const r = selected();
  const canMemo = !!r && S.llm !== null && S.llm !== 'off';
  const memoBtn = h`<button type="button" class="go" id="smemo"${canMemo ? '' : ' disabled'}>Write the memo</button>`;
  const memoDone = !!(r && memoState.forCode === r.code && memoState.text);
  let steps: Raw[];
  if (S.role === 'campaigner') {
    const top3 = S.seats.slice().sort((a, b) => b.prio - a.prio).slice(0, 3);
    const tb = r ? core.topBlocker(r, S.ctx) : null;
    steps = [
      step(1, 'Find your seat',
        h`<form id="spcf" autocomplete="off"><label class="sr" for="spc">Postcode</label><input id="spc" placeholder="Postcode, e.g. SE15 5DQ" value="${pcValue}"><button class="go" type="submit">Go</button></form>`,
        pcMsg ? h`${pcMsg}` : r ? h`Selected: <b>${r.name}</b> · MP ${r.mp ?? 'vacant'}` : 'No seat selected yet.', !!r),
      step(2, "See what's blocking homes", h`<button type="button" class="go sec" id="sblock">Show the blockers</button>`,
        r ? h`Main blocker in <b>${r.name}</b>: ${tb ? tb.t : 'No single blocker'}.` : 'Select a seat first.', !!r),
      step(3, 'Pick where to push', h`<button type="button" class="go sec" id="starget">Show target seats</button>`,
        h`<div class="seatlinks">${top3.map(x => h`<button type="button" data-code="${x.code}">${x.name}</button>`)}</div>${r ? h`<b>${r.name}</b> ranks ${r.rank} of ${S.seats.length}.` : ''}`,
        S.layer === 'prio'),
      step(4, 'Take the case to your MP', memoBtn, memoNow(), memoDone),
    ];
  } else {
    const scope = S.fborough ? S.seats.filter(x => x.borough === S.fborough) : S.seats;
    const sum = (f: (x: Seat) => number) => scope.reduce((s, x) => s + (f(x) || 0), 0);
    const B = S.fborough ? (S.ctx.boroughs[S.fborough] as Record<string, any> | undefined) : undefined;
    const cats: Record<string, number> = {};
    scope.forEach(x => { const k = blockCat(x); if (k !== 'none') cats[k] = (cats[k] || 0) + 1; });
    const topc = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    const boroughs = [...new Set(S.seats.map(x => x.borough))].sort();
    const total = S.seats.reduce((s, x) => s + x.gap, 0);
    steps = [
      step(1, 'Choose an area',
        h`<label class="sr" for="sbor">Council</label><select id="sbor"><option value="">All of London</option>${boroughs.map(b => h`<option${b === S.fborough ? ' selected' : ''}>${b}</option>`)}</select>`,
        h`${S.fborough || 'All of London'}: ${scope.length} seats · <b>${fmt(sum(x => x.homes))}</b>/yr built · <b>${fmt(sum(x => x.gap))}</b>/yr missing${B && B.hdt != null ? h` · Delivery Test <b>${Math.round(B.hdt * 100)}%</b> (${B.hdtCons})` : ''}`,
        !!S.fborough),
      step(2, 'Set the London target',
        h`<label class="sr" for="stot">London target</label><select id="stot">${TARGETS.map(([v, l]) => h`<option value="${v}"${v === S.settings.total ? ' selected' : ''}>${l}</option>`)}</select>`,
        h`London is <b>${fmt(total)}</b> homes a year short where need is highest.`, true),
      step(3, "Diagnose what's blocking homes", h`<button type="button" class="go sec" id="smap">Map the blockers</button>`,
        topc ? h`Most common blocker ${S.fborough ? `in ${S.fborough}` : 'across London'}: <b>${blockInfo(topc[0]).l.toLowerCase()}</b> (${topc[1]} of ${scope.length} seats).` : 'No single blocker stands out.',
        S.layer === 'blocker'),
      step(4, 'Get the policy memo', memoBtn, memoNow(), memoDone),
    ];
  }
  const active = document.activeElement as HTMLElement | null;
  const keepId = active && $('#start')!.contains(active) ? active.id : '';
  set($('#start'), h`
    <div class="wfhead"><div><h2 id="starth">How to use</h2><p class="note" id="rolenote">${NOTE[S.role]}</p></div>
      <div class="seg" role="group" aria-label="I am using this as">
        <button type="button" data-role="campaigner" aria-pressed="${S.role === 'campaigner'}">Campaigner</button><button type="button" data-role="policy" aria-pressed="${S.role === 'policy'}">Policy</button></div></div>
    <ol class="steps" id="steps">${steps}</ol>`);
  if (keepId) document.getElementById(keepId)?.focus();
}
