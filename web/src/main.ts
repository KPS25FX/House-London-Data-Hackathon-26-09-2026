/** Bootstrap: build the tabbed page shell, load data, init state, mount views. */
import { loadData } from './data';
import { init, setLlm } from './state';
import { esc } from './dom';
import { mountRouter } from './router';
import { mountMap } from './views/map';
import { mountCard } from './views/card';
import { mountLab } from './views/lab';
import { mountTable } from './views/table';
import { mountSettings } from './views/settings';
import { mountScatter } from './views/scatter';
import { mountGuide, mountMethod, mountStatus } from './views/guide';
import { mountAdmin } from './views/admin';
import { mountScenarios } from './views/scenarios';
import { mountTrends } from './views/trends';
import { mountEvidence } from './views/evidence';
import { TARGETS } from './views/settings';

const MARK = `<svg class="mk" viewBox="0 0 30 30" aria-hidden="true"><g fill="#4cc3b9"><rect x="2" y="2" width="8" height="8"/><rect x="11" y="2" width="8" height="8"/><rect x="20" y="2" width="8" height="8"/><rect x="2" y="11" width="8" height="8"/><rect x="20" y="11" width="8" height="8"/><rect x="2" y="20" width="8" height="8"/><rect x="11" y="20" width="8" height="8"/><rect x="20" y="20" width="8" height="8"/></g><rect x="11.5" y="11.5" width="7" height="7" fill="none" stroke="#e9eff4" stroke-width="1" stroke-dasharray="2 1.5"/></svg>`;

const SHELL = `
<a class="skip" href="#p-map">Skip to the map</a>
<header class="appbar">
  <div class="in">
    <div class="brand">${MARK}<div><b>London Housing Gap Explorer</b><span>London housing supply and representation tool</span></div></div>
    <div class="gtarget"><label for="wtot">London housing target (homes a year)</label><select id="wtot">${TARGETS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select><span class="gtnote">Missing homes are measured against this. Switch it to compare targets.</span></div>
    <span class="bkstatus" id="bkstatus" data-mode="snapshot" role="status">Snapshot data</span>
  </div>
  <nav class="tabs" aria-label="Pages"><a href="#p-map">Map</a><a href="#p-seat">Seat brief</a><a href="#p-scen">Scenarios</a><a href="#p-trends">Trends</a><a href="#p-rank">Rankings</a><a href="#p-evidence">Evidence</a><a href="#p-data" id="tabdata">Data</a></nav>
</header>
<main class="wrap">
<div class="page" id="p-map">
  <header class="phead"><div class="eyebrow">1 · Map</div><h1>Where is London short of homes?</h1><p>Colour London's 75 seats by missing homes, the main blocker, MP leverage or a borough trend. Select a seat to see its summary, then open its brief.</p></header>
  <div class="grid" id="area">
    <section class="panel" id="mapsec" aria-labelledby="maph"></section>
    <section class="panel mapselp" aria-live="polite"><div id="mapsel"></div><div class="layerhelp" id="layerhelp"></div></section>
  </div>
  <span class="proto">Resident views for 24 seats are modelled estimates</span>
</div>

<div class="page" id="p-seat" hidden>
  <header class="phead"><div class="eyebrow">2 · Seat brief</div><h1>Why is this seat short of homes, and what would help?</h1><p>Pick a seat to get its numbers, the likely blockers with the evidence behind each, what past policy says, and a policy memo you can share.</p></header>
  <div class="grid seatgrid">
    <section class="panel" id="areasec" aria-labelledby="pch"></section>
    <section class="panel lab" id="lab" aria-labelledby="labh"></section>
  </div>
</div>

<div class="page" id="p-scen" hidden>
  <header class="phead"><div class="eyebrow">3 · Scenarios</div><h1>Which levers would close the gap?</h1><p>Combine existing levers, see how many missing homes each closes and which seats move, then save scenarios to compare later.</p></header>
  <section class="panel" id="sim" aria-labelledby="simh"></section>
</div>

<div class="page" id="p-trends" hidden>
  <header class="phead"><div class="eyebrow">4 · Trends</div><h1>How has affordability changed in each borough?</h1><p>Track prices, rents, affordability ratios, tenure, affordable-housing delivery and rough sleeping over time, and compare each borough with London.</p></header>
  <section class="panel" id="trends" aria-labelledby="trh"></section>
</div>

<div class="page" id="p-rank" hidden>
  <header class="phead"><div class="eyebrow">5 · Rankings</div><h1>Which seats should we prioritise?</h1><p>Sort and filter all 75 seats by missing homes, MP leverage, margin or stalled permissions. Select a row to open that seat's brief.</p></header>
  <section class="panel" id="ranksec" aria-labelledby="rankh"></section>
</div>

<div class="page" id="p-evidence" hidden>
  <header class="phead"><div class="eyebrow">6 · Evidence</div><h1>Does the evidence back this policy here?</h1><p>Pick a seat and a policy. The tool rates how well it fits the seat, what could go wrong there, what past evaluations found, and the guardrails to attach.</p></header>
  <section class="panel" id="pcheck" aria-labelledby="pch2"></section>
  <section class="panel" aria-labelledby="pcmh"><h2 id="pcmh">Every policy, rated for this seat</h2><p class="note" style="margin:4px 0 10px">Sorted by fit, discounted for risk. Choose Check to see the detail above.</p><div class="tablewrap" id="pcmatrix"></div></section>
  <section class="panel" aria-labelledby="wgh"><h2 id="wgh">Why the gap persists across London</h2><p class="note" style="margin:4px 0 10px">Live comparisons of the top and bottom thirds of London's 75 seats. Patterns, not proof of cause.</p><div class="whygap" id="whygap"></div>
    <details class="more"><summary>See the voice test chart and full findings</summary><div id="voicesec"></div></details>
    <details class="more" id="gamesec"><summary>How seats are grouped into area types</summary>
      <h2 id="gameh">The decision each area type calls for</h2>
      <p class="lede">An MP backs more homes when the voters who reward it outweigh the voters who punish it. Market demand says whether homes would actually get built; resident concern says which way the MP's own voters lean.</p>
      <div class="game" id="game"></div>
    </details>
  </section>
  <section class="panel" id="pastpol" aria-labelledby="pph"><details class="more"><summary id="pph">Source evaluations behind the ratings (<span id="evcount">0</span>) and lessons</summary>
    <div class="evcards" id="evcards"></div>
    <div class="lessons"><h3>Lessons that repeat across evaluations</h3><ol id="lessons"></ol><p class="note">Evidence gaps: nothing collected here evaluates housebuilding targets, affordable-housing quotas, rent regulation, Local Housing Allowance or the Renters' Rights reforms.</p></div>
  </details></section>
</div>

<div class="page" id="p-data" hidden>
  <header class="phead"><div class="eyebrow">7 · Data</div><h1>Manage the data</h1><p>Import new seat figures, time series or policy evidence. Changes apply to this browser session.</p></header>
  <section class="panel admin" id="adminsec" aria-labelledby="adminh"></section>
  <section class="panel" id="methodsec" aria-labelledby="methodh">
    <details open><summary id="methodh">How the numbers are built</summary><div class="method" id="method"></div></details>
  </section>
</div>
</main>`;

async function checkHealth() {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as { ok?: boolean; llm?: string };
    setLlm(j.llm === 'live' ? 'live' : 'mock');
  } catch { setLlm('off'); }
}

async function boot() {
  const app = document.getElementById('app')!;
  let data;
  try { data = await loadData(); }
  catch (e) {
    app.innerHTML = `<main class="wrap"><section class="panel"><h1>Couldn't load the data</h1><p>${esc((e as Error).message)}. Run the data pipeline (npm run data) so web/public/data exists, then reload.</p></section></main>`;
    return;
  }
  app.innerHTML = SHELL;
  init(data);
  mountStatus();
  mountMap();
  mountCard();
  mountLab();
  mountTable();
  mountSettings();
  mountScenarios();
  mountTrends();
  mountEvidence();
  mountScatter();
  mountGuide();
  mountMethod();
  mountAdmin();
  mountRouter();
  document.body.dataset.ready = 'true';
  void checkHealth();
}

void boot();
