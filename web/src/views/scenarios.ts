/** Scenarios page: levers (core.LEVERS), presets, KPIs and top-10 shortfall bars (core.scenarioSummary), saved scenarios (localStorage). */
import * as core from '@dcv/core';
import { S, select, setScen, subscribe } from '../state';
import { $, fmt, h, set } from '../dom';
import { go, onPage } from '../router';
import type { Scenario } from '../types';

const KEY = 'dcv.scenarios';
interface Saved { id: string; name: string; levers: Scenario; total: number; results: { missing: number; added: number; meet: number; flips: number }; createdAt: string; dataVersion: string }
function readSaved(): Saved[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v as Saved[] : []; } catch { return []; } }
function writeSaved(list: Saved[]): boolean { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } }

export function mountScenarios() {
  set($('#sim'), h`
    <div class="labhead"><div><div class="eyebrow">Scenario builder</div><h2 id="simh">What would close the gap?</h2></div><span class="note">Move a lever and the totals, the map and the seat cards update. Levers add up and may overlap, so treat the combined figure as an upper bound.</span></div>
    <div class="simgrid"><div class="levers" id="levers">
      <div class="presets">${core.PRESETS.map((p, i) => h`<button type="button" data-p="${i}">${p[0]}</button>`)}<button type="button" data-p="reset">Reset</button></div>
      ${core.LEVERS.map(l => h`<div class="lever"><div class="lvtop"><label for="lv-${l.id}">${l.label}</label><output id="lvo-${l.id}">0%</output></div><input type="range" id="lv-${l.id}" data-lv="${l.id}" min="0" max="${l.max}" step="${l.step}" value="0"><p class="note">${l.desc}</p></div>`)}
    </div><div><div class="kpis simk" id="simkpis"></div><div id="simbars"></div></div></div>
    <div class="scsave" id="scsave"><label for="scname" class="note">Save these settings to compare later (stored in this browser)</label><div class="scrow"><input id="scname" placeholder="Scenario name, e.g. Pipeline + median lift" maxlength="80"><button type="button" id="scsavebtn">Save scenario</button></div></div>
    <p class="note" id="scmsg" role="status"></p>
    <div id="scenlist"></div>`);
  const root = $('#sim')!;
  root.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.lv) setScen({ ...S.scen, [t.dataset.lv]: +t.value });
  });
  root.addEventListener('click', e => {
    const b = (e.target as Element).closest('button') as HTMLButtonElement | null; if (!b) return;
    if (b.dataset.p) { setScen(b.dataset.p === 'reset' ? { ...core.ZERO_SCENARIO } : { ...core.PRESETS[+b.dataset.p]![1] }); return; }
    if (b.dataset.code) { select(b.dataset.code); go('p-seat'); return; }
    if (b.id === 'scsavebtn') { save(); return; }
    if (b.dataset.load) { const s = readSaved().find(x => x.id === b.dataset.load); if (s) setScen({ ...core.ZERO_SCENARIO, ...s.levers }); return; }
    if (b.dataset.del) { writeSaved(readSaved().filter(x => x.id !== b.dataset.del)); renderList(); }
  });
  subscribe((_, why) => { if (why === 'scen' || why === 'settings' || why === 'data') render(); });
  onPage(id => { if (id === 'p-scen') render(); });
  render();
}

function summary() { return core.scenarioSummary(S.seats, S.scenSeats); }

function save() {
  const inp = $('#scname') as HTMLInputElement, msg = $('#scmsg')!;
  const name = inp.value.trim();
  if (!name) { msg.textContent = 'Give the scenario a name first.'; return; }
  const s = summary();
  const item: Saved = { id: 's' + Date.now().toString(36), name: name.slice(0, 80), levers: { ...S.scen }, total: S.settings.total,
    results: { missing: Math.round(s.missing), added: Math.round(s.added), meet: s.meet, flips: s.flips.length }, createdAt: new Date().toISOString(), dataVersion: S.version };
  if (writeSaved([item, ...readSaved()])) { msg.textContent = `Saved "${item.name}".`; inp.value = ''; }
  else msg.textContent = "Couldn't save: browser storage is unavailable.";
  renderList();
}

function render() {
  for (const l of core.LEVERS) {
    const v = S.scen[l.id] ?? 0;
    const inp = $(`#lv-${l.id}`) as HTMLInputElement | null;
    if (inp && document.activeElement !== inp) inp.value = String(v);
    const o = $(`#lvo-${l.id}`); if (o) o.textContent = v + '%';
  }
  const s = summary(), g0 = s.missing0, g1 = s.missing, n = S.seats.length;
  set($('#simkpis'), h`
    <div class="kpi"><div class="k">Missing homes a year, London</div><div class="v" data-testid="kpi-missing">${fmt(g1)}</div><div class="d">${g1 < g0 ? `down ${fmt(g0 - g1)} from ${fmt(g0)} (−${((1 - g1 / g0) * 100).toFixed(0)}%). Extra homes in seats already at their share don't reduce this.` : `against a ${fmt(S.settings.total)} target`}</div></div>
    <div class="kpi"><div class="k">Extra homes a year</div><div class="v" data-testid="kpi-added">${fmt(s.added)}</div><div class="d">permissions ${fmt(s.addS)} · median lift ${fmt(s.addL)} · brownfield ${fmt(s.addB)}</div></div>
    <div class="kpi"><div class="k">Seats meeting their share</div><div class="v">${s.meet} <small>of ${n}</small></div><div class="d">${s.meet > s.meet0 ? `up from ${s.meet0}` : 'no change'}</div></div>
    <div class="kpi"><div class="k">Seats where new renter voters exceed the 2024 majority</div><div class="v">${s.flips.length}</div><div class="d">${s.flips.length ? s.flips.slice(0, 3).map(r => r.name).join(', ') + (s.flips.length > 3 ? '…' : '') : S.scen.reg ? 'none at this level' : 'move the registration lever'}</div></div>`);
  const top = S.scenSeats.slice().sort((a, b) => b.gap - a.gap).slice(0, 10), mx = Math.max(...top.map(r => r.gap), 1);
  set($('#simbars'), h`<div class="note" style="margin:4px 0 8px">Ten largest shortfalls: <span class="sw2 aft"></span>still missing <span class="sw2 cut"></span>closed by the scenario</div>
    ${top.map(r => h`<button type="button" class="sbrow" data-code="${r.code}"><span class="sbl">${r.name}</span><span class="sbb"><i class="aft" style="width:${(r.gapS / mx * 100).toFixed(1)}%"></i><i class="cut" style="width:${((r.gap - r.gapS) / mx * 100).toFixed(1)}%"></i></span><span class="sbv">${fmt(r.gapS)}${r.gapS < r.gap ? h` <small>from ${fmt(r.gap)}</small>` : ''}</span></button>`)}`);
  renderList();
}

function renderList() {
  const L = readSaved();
  if (!L.length) { set($('#scenlist'), h`<p class="note">No saved scenarios yet. Set the levers, name it and save to compare later.</p>`); return; }
  const cur = JSON.stringify(S.scen);
  set($('#scenlist'), h`<div class="tablewrap" style="margin-top:10px"><table class="sctab"><thead><tr><th>Scenario</th><th>Levers</th><th class="num">Missing a year</th><th class="num">Extra homes</th><th class="num">Seats meeting share</th><th class="num">Renter flips</th><th></th></tr></thead><tbody>
    ${L.map(s => h`<tr class="${JSON.stringify({ ...core.ZERO_SCENARIO, ...s.levers }) === cur ? 'cur' : ''}"><td><b>${s.name}</b><span class="why">${new Date(s.createdAt).toLocaleDateString('en-GB')} · target ${fmt(s.total)}</span></td>
      <td class="note">${core.LEVERS.filter(l => (s.levers[l.id] ?? 0) > 0).map(l => `${l.label} ${s.levers[l.id]}%`).join(' · ') || 'none'}</td>
      <td class="num">${fmt(s.results.missing)}</td><td class="num">${fmt(s.results.added)}</td><td class="num">${s.results.meet}</td><td class="num">${s.results.flips}</td>
      <td><button type="button" class="lk" data-load="${s.id}">Load</button> <button type="button" class="lk" data-del="${s.id}">Delete</button></td></tr>`)}
    </tbody></table></div>`);
}
