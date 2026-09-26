/** F14 (lightweight): client-side "Load JSON update", validated per FR-ADM-4, applied in memory with a version bump. */
import * as core from '@dcv/core';
import { S, applyRows, notify, setSeries } from '../state';
import { exportPolicies, importPolicies } from '../policytext';
import { $, h, set } from '../dom';
import type { SeatRow } from '../types';

export const SEAT_FIELDS = ['name', 'borough', 'boroughs', 'wtbGap', 'wtbPer1k', 'wtbPerKm2', 'wtbFlag', 'afford', 'affEst', 'outright', 'owned', 'social', 'privRent', 'homes', 'pop', 'hpg5', 'V', 'vEst', 'won', 'second', 'majority', 'marginPct', 'turnout', 'mp', 'mpParty', 'mpNote', 'q', 'r', 'adults', 'households', 'dwellings', 'overcrowd', 'movedIn', 'underocc', 'completed7', 'approvedNS', 'startedNC', 'lapsed', 'refused', 'pipeline', 'bf', 'ptal', 'medPrice', 'regPer100', 'raw', 'tops'];
const NUM = new Set(['wtbGap', 'wtbPer1k', 'wtbPerKm2', 'wtbFlag', 'afford', 'outright', 'owned', 'social', 'privRent', 'homes', 'pop', 'hpg5', 'V', 'majority', 'marginPct', 'turnout', 'q', 'r', 'adults', 'households', 'dwellings', 'overcrowd', 'movedIn', 'underocc', 'completed7', 'approvedNS', 'startedNC', 'lapsed', 'refused', 'pipeline', 'bf', 'ptal', 'medPrice', 'regPer100', 'raw']);
const ALLOWED = new Set(SEAT_FIELDS);

export type Validation = { ok: true; items: Record<string, unknown>[]; fields: string[] } | { ok: false; error: string };

/** Reject the whole file on the first unknown code, unknown field or non-numeric value. */
export function validateImport(json: unknown, codes: Set<string>): Validation {
  if (!Array.isArray(json)) return { ok: false, error: 'The file must be a JSON array of seat objects.' };
  const fields = new Set<string>();
  for (let i = 0; i < json.length; i++) {
    const it = json[i] as Record<string, unknown>;
    if (!it || typeof it !== 'object') return { ok: false, error: `Item ${i + 1} is not an object.` };
    const code = it.code;
    if (typeof code !== 'string' || !codes.has(code)) return { ok: false, error: `Item ${i + 1}: unknown seat code "${String(code)}".` };
    for (const [k, v] of Object.entries(it)) {
      if (k === 'code') continue;
      if (!ALLOWED.has(k)) return { ok: false, error: `Item ${i + 1} (${code}): field "${k}" is not an allowed seat field.` };
      if (NUM.has(k) && v !== null && (typeof v !== 'number' || !isFinite(v))) return { ok: false, error: `Item ${i + 1} (${code}): field "${k}" must be a number.` };
      fields.add(k);
    }
  }
  return { ok: true, items: json as Record<string, unknown>[], fields: [...fields] };
}

export function nextVersion(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export function mountAdmin() {
  set($('#adminsec'), h`
    <div class="labhead"><div><div class="eyebrow">This browser session</div><h2 id="adminh">Data updates</h2></div><span class="note">Changes apply to this browser session only; reload to return to the published snapshot.</span></div>
    <div class="admrow">
      <div class="admbox"><h3>Import seat data</h3><p class="note">A JSON array of objects, each with <code>code</code> (ONS constituency code) plus any fields to update, e.g. <code>[{"code":"E14001312","homes":412}]</code>.</p>
        <label class="filebtn" for="impfile">Choose JSON file</label><input type="file" id="impfile" class="sr" accept="application/json,.json">
        <div class="confirm" id="impconfirm" hidden><span id="impsummary"></span><button type="button" class="primary" id="impyes">Import</button><button type="button" id="impno">Cancel</button></div></div>
      <div class="admbox"><h3>Import time series</h3><p class="note">A CSV in the London Datastore long format: <code>dataset, area_code, area_name, area_type, period, year, measure, breakdown, value, unit, source</code>. Each measure and breakdown becomes a trend you can chart and map. Borough rows and the London row are used.</p>
        <label class="filebtn" for="serfile">Choose CSV file</label><input type="file" id="serfile" class="sr" accept=".csv,text/csv">
        <div class="confirm" id="serconfirm" hidden><span id="sersummary"></span><button type="button" class="primary" id="seryes">Import</button><button type="button" id="serno">Cancel</button></div></div>
      <div class="admbox"><h3>Policy evidence</h3><p class="note">Edit the wording behind the Evidence page: evidence strength, what past policy shows, guardrails, who acts. Download the current set, edit the JSON, and import it. Fit and risk ratings stay calculated from the data.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="poldl">Download JSON</button><label class="filebtn" for="polfile">Import JSON</label></div><input type="file" id="polfile" class="sr" accept="application/json,.json"></div>
    </div>
    <p class="note" id="adminmsg" role="status" aria-live="polite"></p>`);
  let pending: { items: Record<string, unknown>[]; version: string } | null = null;
  const msg = (t: string) => { $('#adminmsg')!.textContent = t; };
  $('#impfile')!.addEventListener('change', async e => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    let json: unknown;
    try { json = JSON.parse(await f.text()); } catch { msg("That file isn't valid JSON."); return; }
    const v = validateImport(json, new Set(S.data.seats.map(r => r.code)));
    if (!v.ok) { msg(`Import rejected: ${v.error}`); $('#impconfirm')!.hidden = true; return; }
    const version = nextVersion();
    pending = { items: v.items, version };
    $('#impsummary')!.textContent = `${v.items.length} seats, fields: ${v.fields.join(', ') || 'none'}. New data version: ${version}.`;
    $('#impconfirm')!.hidden = false; msg('');
  });
  $('#impno')!.addEventListener('click', () => { pending = null; $('#impconfirm')!.hidden = true; ($('#impfile') as HTMLInputElement).value = ''; });
  $('#impyes')!.addEventListener('click', () => {
    if (!pending) return;
    const byCode = new Map(pending.items.map(i => [i.code as string, i]));
    const rows = S.data.seats.map(r => { const u = byCode.get(r.code); if (!u) return r; const { code: _c, ...rest } = u; return { ...r, ...rest } as SeatRow; });
    applyRows(rows, pending.version);
    msg(`Imported ${pending.items.length} seats. Data version ${pending.version}.`);
    pending = null; $('#impconfirm')!.hidden = true; ($('#impfile') as HTMLInputElement).value = '';
  });
  let pendingSeries: ReturnType<typeof core.parseSeriesCsv> | null = null;
  $('#serfile')!.addEventListener('change', async e => {
    const inp = e.target as HTMLInputElement, f = inp.files?.[0]; if (!f) return;
    try {
      pendingSeries = core.parseSeriesCsv(await f.text());
      $('#sersummary')!.textContent = `${pendingSeries.metrics.length} measure(s): ${pendingSeries.metrics.map(m => m.label).slice(0, 4).join(', ')}${pendingSeries.metrics.length > 4 ? '…' : ''}. This replaces the trends.`;
      $('#serconfirm')!.hidden = false; msg('');
    } catch (err) { pendingSeries = null; $('#serconfirm')!.hidden = true; msg(`Import rejected: ${(err as Error).message}`); }
  });
  $('#serno')!.addEventListener('click', () => { pendingSeries = null; $('#serconfirm')!.hidden = true; ($('#serfile') as HTMLInputElement).value = ''; });
  $('#seryes')!.addEventListener('click', () => {
    if (!pendingSeries) return;
    const n = pendingSeries.metrics.length, version = nextVersion();
    setSeries(pendingSeries, version);
    msg(`Imported ${n} time series. Data version ${version}.`);
    pendingSeries = null; $('#serconfirm')!.hidden = true; ($('#serfile') as HTMLInputElement).value = '';
  });
  $('#poldl')!.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportPolicies(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'policy-evidence.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg('Saved policy-evidence.json.');
  });
  $('#polfile')!.addEventListener('change', async e => {
    const inp = e.target as HTMLInputElement, f = inp.files?.[0]; inp.value = ''; if (!f) return;
    let arr: unknown; try { arr = JSON.parse(await f.text()); } catch { msg("That file isn't valid JSON."); return; }
    try { const n = importPolicies(arr); msg(`Updated wording for ${n} policies.`); notify('policy'); }
    catch (err) { msg((err as Error).message); }
  });
}
