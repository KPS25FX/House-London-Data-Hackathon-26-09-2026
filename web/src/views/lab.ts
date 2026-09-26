/** F05 diagnosis + evidence, structured PolicyArgument, F10 memo (stream + PDF), F11 follow-up Q&A. */
import * as core from '@dcv/core';
import { S, selected, subscribe } from '../state';
import { $, esc, h, set } from '../dom';
import { confLabel, fixFor } from '../content';
import { bottomLine, md, stripTrailer } from '../md';
import { buildMemoPdf, memoFile } from '../pdf';
import { memoChanged, memoState, setRequestMemo } from '../memostate';
import type { Argument, Hyp, Policy, Seat } from '../types';

const ERR: Record<string, string> = {
  not_granted: 'Memo generation needs your permission to use Claude.',
  rate_limited: 'Too many requests just now. Try again in a minute.',
  session_expired: 'Sign in to Claude again, then retry.',
  prompt_too_large: 'Too much context for one memo.',
  refused: 'Claude declined this request.',
  unavailable: "Claude isn't available for this account.",
  upstream_error: 'The connection dropped. Try again.',
};
const errCopy = (c?: string) => (c && ERR[c]) || 'Something went wrong. Try again.';
const DEFAULT_STATUS = "Writes a 2–3 page PDF from this seat's data, similar seats and the policy library.";
const ARROW: Record<string, [string, string]> = { '+': ['↑', 'increases'], '-': ['↓', 'decreases'], '0': ['=', 'no clear change'], mixed: ['±', 'mixed'] };

let lab: { r: Seat; H: Hyp[]; docs: Policy[] } | null = null;
let ctl: AbortController | null = null;
let memoText = '';
let lastPdf: { code: string; text: string; blob: Blob } | null = null;
let currentCode: string | null = null;

export function mountLab() {
  set($('#lab'), h`
    <div class="labhead">
      <div><h2 id="labh">Why homes aren't being built in <span id="labseat">this seat</span>, and what would help</h2></div>
      <span class="note">Each finding shows how strong the evidence is, the numbers behind it, what would fix it and who can act.</span>
    </div>
    <div class="empty" id="labempty">Select a seat on the map, in the rankings or by postcode to see its diagnosis.</div>
    <div class="hyps" id="hyps"></div>
    <div class="argument" id="argument"></div>
    <div class="memobar">
      <button type="button" class="primary" id="memobtn">Write a policy memo</button>
      <button type="button" id="stopbtn" hidden>Stop</button>
      <span class="note" id="memostatus" role="status" aria-live="polite">${DEFAULT_STATUS}</span>
    </div>
    <p class="note llmnote" id="llmnote" hidden></p>
    <div class="memo" id="memo" hidden></div>
    <details class="memofull" id="memofull" hidden><summary>Read the memo</summary><div class="memo-md" id="memomd"></div></details>
    <form class="askf" id="askform" hidden autocomplete="off">
      <label for="askin" class="note">Ask a follow-up about this seat</label>
      <div class="askrow"><input id="askin" placeholder="e.g. What would the draft London Plan change here?"><button type="submit">Ask</button></div>
      <div class="answer" id="answer" aria-live="polite"></div>
    </form>
    <details class="evid" id="evid"><summary>Evidence the memo draws on (<span id="evidn">0</span> library entries)</summary><ol id="evidlist"></ol></details>`);
  $('#memobtn')!.addEventListener('click', genMemo);
  $('#stopbtn')!.addEventListener('click', () => ctl?.abort());
  $('#askform')!.addEventListener('submit', e => { e.preventDefault(); void ask(); });
  $('#lab')!.addEventListener('click', e => {
    const a = (e.target as Element).closest('a.kref') as HTMLAnchorElement | null;
    if (!a) return;
    e.preventDefault();
    const d = $('#evid') as HTMLDetailsElement; d.open = true;
    const li = document.getElementById('ev-' + a.dataset.k);
    if (li) { li.scrollIntoView({ behavior: 'smooth', block: 'center' }); li.classList.add('flash'); setTimeout(() => li.classList.remove('flash'), 1200); }
  });
  setRequestMemo(() => { if (!memoState.busy) void genMemo(); });
  subscribe((_, why) => { if (why === 'select' || why === 'settings' || why === 'data' || why === 'llm') render(); });
  render();
}

function known(): Set<string> { return new Set(S.data.policies.map(p => p.id)); }
const kref = (id: string) => h`<a href="#ev-${id}" class="kref" data-k="${id}">[${id}]</a>`;

function render() {
  const r = selected();
  renderLlmNote();
  const btn = $('#memobtn') as HTMLButtonElement;
  btn.disabled = !r || memoState.busy || S.llm === null || S.llm === 'off';
  $('#labempty')!.hidden = !!r;
  if (!r) {
    $('#labseat')!.textContent = 'this seat';
    set($('#hyps'), h``); set($('#argument'), h``); set($('#evidlist'), h``); $('#evidn')!.textContent = '0';
    resetMemo(); currentCode = null; return;
  }
  $('#labseat')!.textContent = r.name;
  const H = core.hypotheses(r, S.ctx);
  const docs = core.retrieve(r, H, S.data.policies);
  lab = { r, H, docs };
  set($('#hyps'), h`${H.map(x => { const [fix, who] = fixFor(x); return h`<div class="hyp">
    <span class="conf ${x.c}">${confLabel(x.c)}</span><h3>${x.t}</h3><p>${x.p}</p><div class="ev">${x.ev}</div>
    ${fix ? h`<div class="fix"><b>What would help:</b> ${fix}</div><div class="whoa"><b>Who can act:</b> ${who}</div>` : ''}
    <div class="lv"><b>To confirm:</b> ${x.test}${x.k.length ? h` · <b>Background:</b> ${x.k.map(kref)}` : ''}</div></div>`; })}`);
  renderArgument(r);
  $('#evidn')!.textContent = String(docs.length);
  set($('#evidlist'), h`${docs.map(d => h`<li id="ev-${d.id}"><b>[${d.id}] ${d.title}.</b> ${d.text} <span class="note">Source: ${(d.src || []).map((s, i) => h`${i ? '; ' : ''}${s.url && /^https?:/.test(s.url) ? h`<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>` : s.name}`)}</span></li>`)}`);
  if (currentCode !== r.code) { resetMemo(); currentCode = r.code; }
}

function renderLlmNote() {
  const n = $('#llmnote')!;
  if (S.llm === 'mock') { n.hidden = false; n.textContent = 'Mock memo mode: set ANTHROPIC_API_KEY on the server for live drafting'; }
  else if (S.llm === 'off') { n.hidden = false; n.textContent = "The memo server isn't reachable. Start it with npm run server, then reload."; }
  else n.hidden = true;
}

function renderArgument(r: Seat) {
  let A: Argument;
  try { A = core.buildArgument(r, S.ctx); } catch { set($('#argument'), h``); return; }
  const pol = new Map(S.data.policies.map(p => [p.id, p]));
  const sup = (ids: string[]) => ids.length ? h`<span class="sup">from ${ids.map(id => (pol.has(id) ? kref(id) : h`<span class="pid">${id}</span>`))}</span>` : '';
  const effects = (E: Argument['options'][number]['expectedEffects']) => h`<ul class="effects">${E.map(e => {
    const [ar, word] = ARROW[e.direction] ?? ['·', e.direction];
    return h`<li><span class="dir d${e.direction === '-' ? 'm' : e.direction === '+' ? 'p' : 'z'}" role="img" aria-label="${word}" title="${word}">${ar}</span><b>${e.outcome}</b> <span class="cert">${e.certainty} certainty</span>${e.note ? h` · ${e.note}` : ''}${e.who ? h` <span class="note">(${e.who})</span>` : ''}</li>`;
  })}</ul>`;
  set($('#argument'), h`<details class="arg" open><summary>Argument: from the facts to the asks</summary>
    <div class="argflow">
      <div class="argcol"><h3>1 · What the data shows</h3><ol class="plist">${A.premises.map(p => h`<li id="arg-${p.id}"><span class="pid">${p.id}</span> ${p.text}</li>`)}</ol></div>
      <div class="argcol"><h3>2 · Diagnosis</h3><ol class="plist">${A.diagnosis.map(d => h`<li>${d.confidence ? h`<span class="conf ${d.confidence}">${confLabel(d.confidence)}</span> ` : ''}${d.text} ${sup(d.support)}</li>`)}</ol></div>
    </div>
    <h3 class="opth">3 · Options and expected effects</h3>
    <div class="options">${A.options.map(o => h`<div class="opt"><div class="optl"><b>${o.lever}</b></div>
      <div class="note">Who acts: ${o.holder.join(', ') || '—'}${o.policyIds.length ? h` · Evidence: ${o.policyIds.map(id => (pol.has(id) ? kref(id) : id))}` : ''}</div>
      ${effects(o.expectedEffects)}${o.risk ? h`<div class="risk"><b>Risk:</b> ${o.risk}</div>` : ''}</div>`)}</div>
    <h3 class="opth">4 · The asks</h3>
    <div class="asks"><div class="askc"><div class="eyebrow">Ask of the MP</div><p>${A.asks.mp}</p></div><div class="askc"><div class="eyebrow">Ask of the council</div><p>${A.asks.council}</p></div></div>
    ${A.dataGaps.length ? h`<p class="note gaps"><b>Data gaps:</b> ${A.dataGaps.join(' · ')}</p>` : ''}
  </details>`);
}

function resetMemo() {
  if (ctl) ctl.abort();
  memoText = ''; lastPdf = null;
  const m = $('#memo')!; m.hidden = true; m.innerHTML = '';
  ($('#memofull') as HTMLDetailsElement).hidden = true; $('#memomd')!.innerHTML = '';
  $('#askform')!.hidden = true; $('#answer')!.innerHTML = '';
  $('#memostatus')!.textContent = DEFAULT_STATUS;
  $('#memobtn')!.textContent = 'Write a policy memo';
  if (memoState.text || memoState.forCode) { memoState.text = ''; memoState.forCode = null; memoChanged(); }
}

async function stream(url: string, body: unknown, signal: AbortSignal, onText: (t: string) => void): Promise<string> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!res.ok) {
    let code = 'other';
    try { const j = await res.json(); code = j.error || j.code || code; } catch { /* not json */ }
    throw Object.assign(new Error(code), { code });
  }
  if (!res.body) { const t = await res.text(); onText(t); return t; }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let text = '';
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value, { stream: true }); onText(text); }
  } catch (e) { throw Object.assign(e as Error, { partial: text }); }
  text += dec.decode(); return text;
}

function memoMeta() {
  return { version: S.version, createdAt: new Date().toISOString(), total: S.settings.total };
}

function showMemo(r: Seat, text: string, note: string, unknown: string[] = []) {
  const m = $('#memo')!; m.hidden = false;
  set(m, h`<div class="memocard" data-testid="memo-card"><div class="mc-icon" aria-hidden="true">PDF</div><div class="mc-body"><div class="eyebrow">Policy memo · ${r.name}</div>
    <p class="mc-bl">${bottomLine(text)}</p>
    <div class="note">${note}${unknown.length ? h` · <span class="flag">Cites ids not in its sources: ${unknown.join(', ')}</span>` : ''}</div>
    <div class="mc-actions"><button type="button" class="btn" id="mcopen">Open PDF</button><button type="button" class="btn primary" id="mcdl">Download PDF</button><button type="button" class="btn" id="mccopy">Copy text</button></div></div></div>`);
  ($('#memofull') as HTMLDetailsElement).hidden = false;
  $('#memomd')!.innerHTML = md(text, known());
  $('#mcdl')!.addEventListener('click', () => download(r, text, false));
  $('#mcopen')!.addEventListener('click', () => download(r, text, true));
  $('#mccopy')!.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text); $('#memostatus')!.textContent = 'Memo text copied.'; }
    catch { $('#memostatus')!.textContent = "Copy isn't available here; use Download PDF."; }
  });
  $('#askform')!.hidden = false;
}

function pdfFor(r: Seat, text: string): Blob {
  if (lastPdf && lastPdf.code === r.code && lastPdf.text === text) return lastPdf.blob;
  const blob = buildMemoPdf(r, text, lab?.docs ?? [], memoMeta());
  lastPdf = { code: r.code, text, blob }; return blob;
}

function download(r: Seat, text: string, open: boolean) {
  try {
    const url = URL.createObjectURL(pdfFor(r, text));
    if (open) window.open(url, '_blank', 'noopener');
    else { const a = document.createElement('a'); a.href = url; a.download = memoFile(r.name); document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch { $('#memostatus')!.textContent = "The PDF couldn't be built; the text is still available to copy."; }
}

async function genMemo() {
  if (!lab || memoState.busy) return;
  const { r } = lab;
  const st = $('#memostatus')!, b = $('#memobtn') as HTMLButtonElement, stop = $('#stopbtn')!, m = $('#memo')!;
  ctl = new AbortController(); const my = ctl;
  memoState.busy = true; memoChanged();
  b.disabled = true; stop.hidden = false; m.hidden = false; st.textContent = '';
  set(m, h`<div class="memoprog"><span class="spin" aria-hidden="true"></span><span id="progtxt" role="status">Reading the seat data and policy library…</span></div>`);
  try {
    const full = await stream('/api/memo', { code: r.code, settings: S.settings }, my.signal, t => {
      const w = stripTrailer(t).body.split(/\s+/).filter(Boolean).length;
      const p = $('#progtxt'); if (p) p.textContent = `Drafting the memo… ${w} words`;
    });
    const { body, meta } = stripTrailer(full);
    const p = $('#progtxt'); if (p) p.textContent = 'Building the PDF…';
    memoText = body;
    const allowed = (meta?.docIds as string[] | undefined) ?? lab.docs.map(d => d.id);
    const unknown = (meta?.unknownCitations as string[] | undefined) ?? core.validateCitations(body, allowed).unknown;
    try { pdfFor(r, body); } catch { st.textContent = "The PDF couldn't be built in this view; the text is still available to copy."; }
    const model = meta?.model ? ` · ${String(meta.model)}` : '';
    showMemo(r, body, `Written just now${model} · not saved (server storage comes later)`, unknown);
    memoState.text = body; memoState.forCode = r.code;
  } catch (e) {
    const err = e as Error & { code?: string; partial?: string };
    if (err.name === 'AbortError' || my.signal.aborted) {
      if (currentCode === r.code) { m.hidden = true; st.textContent = 'Stopped.'; }
    } else if (err.partial) {
      memoText = stripTrailer(err.partial).body; showMemo(r, memoText, 'Interrupted before finishing'); st.textContent = errCopy('upstream_error');
    } else { m.hidden = true; st.textContent = errCopy(err.code); }
  } finally {
    if (ctl === my) ctl = null;
    memoState.busy = false; stop.hidden = true;
    b.disabled = !selected(); b.textContent = memoText ? 'Write a new memo' : 'Write a policy memo';
    memoChanged();
  }
}

async function ask() {
  const r = lab?.r; if (!r) return;
  const q = ($('#askin') as HTMLInputElement).value.trim(); if (!q) return;
  const a = $('#answer')!; a.innerHTML = '<p class="thinking">Thinking…</p>';
  const c = new AbortController();
  try {
    const t = await stream('/api/ask', { code: r.code, settings: S.settings, memo: memoText.slice(0, 6000), question: q }, c.signal,
      txt => { a.innerHTML = md(stripTrailer(txt).body, known()); });
    a.innerHTML = md(stripTrailer(t).body, known());
  } catch (e) {
    const err = e as Error & { code?: string; partial?: string };
    a.innerHTML = err.partial ? md(err.partial, known()) : `<p class="note">${esc(errCopy(err.code))}</p>`;
  }
}

