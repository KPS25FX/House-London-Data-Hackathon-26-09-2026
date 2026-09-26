/** Evidence page: policy check (core.ratePolicy / rateSeat / bestPlaces), why the gap persists (core.whyGap), past evaluations. */
import * as core from '@dcv/core';
import { S, scenSeat, select, setPolicy, setTrend, subscribe } from '../state';
import { $, esc, fmt, h, raw, set } from '../dom';
import type { Raw } from '../dom';
import { go, onPage } from '../router';
import { policyText } from '../policytext';
import { fmtM } from '../trendsel';
import type { Policy, Seat } from '../types';

type PolicyId = Parameters<typeof core.ratePolicy>[0];
const pchip = (label: string, tone: string) => h`<span class="pchip ${tone}">${label}</span>`;
/** Escape text, then turn [K01]-style citations into styled refs. */
const kx = (s: string): Raw => raw(esc(s).replace(/\[(K\d\d)\]/g, '<span class="kref">[$1]</span>'));

export function mountEvidence() {
  set($('#pcheck'), h`<h2 id="pch2" class="vh">Policy check</h2>
    <div class="controls"><div class="ctl"><label for="pcseat">Seat</label><select id="pcseat"></select></div><div class="ctl" style="flex:1;min-width:min(240px,100%)"><label for="pcpol">Policy</label><select id="pcpol"></select></div></div>
    <div class="pcscen" id="pcscen"></div>
    <div class="pcgrid"><div id="pcverdict"></div><div class="pcbest" id="pcbest"></div></div>`);
  $('#pcseat')!.addEventListener('change', e => select((e.target as HTMLSelectElement).value));
  $('#pcpol')!.addEventListener('change', e => setPolicy((e.target as HTMLSelectElement).value));
  $('#p-evidence')!.addEventListener('click', e => {
    const b = (e.target as Element).closest('button') as HTMLButtonElement | null; if (!b) return;
    if (b.dataset.pol) { setPolicy(b.dataset.pol); $('#pcheck')!.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.dataset.code) { select(b.dataset.code); return; }
    if (b.dataset.tr) { const r = cur(); setTrend({ trm: b.dataset.tr, trb: r?.borough ?? null, trYi: null }); go('p-trends'); }
  });
  subscribe((_, why) => { if (why !== 'llm' && why !== 'layer' && why !== 'trend' && why !== 'filter' && why !== 'table') render(); });
  onPage(id => { if (id === 'p-evidence') render(); });
  render();
  renderPast();
}

function cur(): Seat | undefined { return S.seats.find(x => x.code === S.sel) ?? S.seats.slice().sort((a, b) => a.name.localeCompare(b.name))[0]; }

function render() {
  const base = cur(); if (!base) return;
  const r = scenSeat(base.code) ?? base;
  const series = S.series ?? undefined;
  const pid = (S.pol && core.POLICY_BASE.some(p => p.id === S.pol) ? S.pol : core.defaultPolicy(base, S.scen, S.ctx)) as PolicyId;
  const rating = core.ratePolicy(pid, r, S.ctx, S.scen, series);
  const P = policyText(rating.policy);
  set($('#pcseat'), h`${S.seats.slice().sort((a, b) => a.name.localeCompare(b.name)).map(x => h`<option value="${x.code}"${x.code === base.code ? ' selected' : ''}>${x.name}</option>`)}`);
  set($('#pcpol'), h`${core.POLICY_BASE.map(p => h`<option value="${p.id}"${p.id === pid ? ' selected' : ''}>${policyText(p).name}</option>`)}`);
  const on = core.LEVERS.filter(l => (S.scen[l.id] ?? 0) > 0);
  set($('#pcscen'), on.length
    ? h`<span class="note">Levers in your scenario:</span> ${on.map((l, i) => { const id = core.LEVER_POLICY[l.id]; const p = core.POLICY_BASE.find(x => x.id === id)!; return h`${i ? ' · ' : ''}<button type="button" class="lk" data-pol="${id}">${policyText(p).name} (${S.scen[l.id]}%)</button>`; })}`
    : h`<span class="note">Tip: levers you set on the Scenarios page appear here for checking.</span>`);
  const track = P.track.map(id => {
    const m = core.metricById(series, id); if (!m) return null;
    const x = core.latest(m, base.borough);
    return h`<button type="button" class="lk" data-tr="${id}">${m.label}${x ? ` (${fmtM(m, x.v)}, ${x.year})` : ''}</button>`;
  }).filter((x): x is Raw => !!x);
  set($('#pcverdict'), h`<div class="pvhead"><div class="eyebrow">${base.name} · ${base.borough}</div><h2 data-testid="pc-policy">${P.name}</h2><div class="pvverdict ${rating.verdictTone}">${rating.verdict}</div>
      <div class="chips">${pchip(rating.label, rating.tone)}${pchip(rating.riskLabel, rating.riskTone)}${pchip(rating.evidence, rating.evidenceTone)}</div></div>
    <div class="pvrows">
      <div><h4>Why it fits here</h4><p>${rating.reasons.join('. ')}.</p></div>
      <div><h4>What could go wrong here</h4><p>${rating.risks.join('. ')}.</p></div>
      <div><h4>What past policy shows</h4><p>${kx(P.delivered)} <span class="note">${P.strength}. ${P.cards.map(c => `[${c}]`).join(' ')}</span></p></div>
      <div><h4>Attach these guardrails</h4><ul class="guard">${P.guard.map(g => h`<li>${kx(g)}</li>`)}</ul></div>
      <div class="two"><div><h4>Who acts</h4><p>${P.who}</p></div><div><h4>Track</h4><p>${track.length ? track.map((t, i) => h`${i ? ' · ' : ''}${t}`) : '—'}</p></div></div>
    </div>${rating.scenarioHomes != null ? h`<div class="scnote"><b>In your scenario:</b> about ${fmt(rating.scenarioHomes)} extra homes a year here from this lever.</div>` : ''}`);
  const best = core.bestPlaces(pid, S.ctx, series);
  const need = pid === 'homeless' || pid === 'register';
  set($('#pcbest'), h`<h3>Where this policy would do most</h3><p class="note">Ranked by fit and ${need ? '' : 'homes missing, '}discounted for local risk. Select a seat to check it.</p>
    ${best.map((o, i) => { const F = core.fitLabel(o.fit), K = core.riskLabel(o.risk); return h`<button type="button" class="bprow${o.seat.code === base.code ? ' on' : ''}" data-code="${o.seat.code}"><span class="rkn">${i + 1}</span><span class="bpl">${o.seat.name}<small>${o.seat.borough} · ${fmt(o.seat.gap)} missing a year</small></span>${pchip(F.label, F.tone)}${pchip(K.label, K.tone)}</button>`; })}`);
  const M = core.rateSeat(r, S.ctx, S.scen, series);
  set($('#pcmatrix'), h`<table class="pmtab" data-testid="policy-matrix"><thead><tr><th>Policy</th><th>Fit here</th><th>Risk here</th><th>Evidence</th><th></th></tr></thead><tbody>
    ${M.map(o => h`<tr class="${o.policy.id === pid ? 'sel' : ''}" data-polrow="${o.policy.id}"><td><b>${policyText(o.policy).name}</b><span class="why">${o.reasons[0] ?? ''}</span></td><td>${pchip(o.label, o.tone)}</td><td>${pchip(o.riskLabel, o.riskTone)}</td><td>${pchip(o.evidence, o.evidenceTone)}</td><td><button type="button" class="lk" data-pol="${o.policy.id}">Check</button></td></tr>`)}
    </tbody></table>`);
  $('#pcmh')!.textContent = `Every policy, rated for ${base.name}`;
  const w = core.whyGap(S.seats), v = core.whyGapValues(w);
  set($('#whygap'), h`${core.WHY_TEXT.map((t, i) => h`<div class="wg"><div class="v">${v[i]}</div><h4>${t[0]}</h4><p class="note">${t[1]}</p><p><b>So:</b> ${t[2]}</p></div>`)}`);
}

function strength(p: Policy): { label: string; cls: string } {
  const e = (p as { evidence?: { scale?: string; score?: string } }).evidence;
  if (e?.scale === 'GRADE' && /high/i.test(e.score ?? '')) return { label: 'Stronger evidence', cls: 'strong' };
  if (e?.scale === 'SMS' && /[3-5]/.test(e.score ?? '')) return { label: 'Moderate evidence', cls: 'moderate' };
  return { label: 'Process evidence only', cls: 'tentative' };
}

function renderPast() {
  const ev = S.data.policies.filter(p => (p as { kind?: string }).kind === 'evaluation');
  const cards = ev.filter(p => p.id.startsWith('E')), lessons = ev.filter(p => !p.id.startsWith('E'));
  $('#evcount')!.textContent = String(cards.length);
  const DIR: Record<string, string> = { '+': '↑', '-': '↓', '0': '=', mixed: '±' };
  set($('#evcards'), h`${cards.map(c => {
    const s = strength(c), pc = c as Policy & { lever?: string; scope?: string; effects?: { outcome: string; direction: string; note: string }[]; src?: { name: string }[] };
    return h`<article class="evc" data-testid="evcard"><div class="evtop"><span class="conf ${s.cls}">${s.label}</span><span class="note">${pc.lever ?? ''}</span></div>
      <h3>${c.title.replace(/^Evaluation:\s*/, '')}</h3><p>${c.text}</p>
      ${pc.effects?.length ? h`<dl>${pc.effects.map(f => h`<dt>${DIR[f.direction] ?? f.direction} ${f.outcome}</dt><dd>${f.note}</dd>`)}</dl>` : ''}
      <div class="note"><span class="kref">[${c.id}]</span>${pc.scope ? ` ${pc.scope}` : ''}</div></article>`;
  })}`);
  set($('#lessons'), h`${lessons.map(l => h`<li><b>${l.title.replace(/^Lesson:\s*/, '')}.</b> ${l.text}</li>`)}`);
}
