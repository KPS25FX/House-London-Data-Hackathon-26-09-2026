/** Bootstrap: build the page shell, load data, init state, mount views. */
import { loadData } from './data';
import { init, setLlm } from './state';
import { esc } from './dom';
import { mountSteps } from './views/steps';
import { mountMap } from './views/map';
import { mountCard } from './views/card';
import { mountLab } from './views/lab';
import { mountTable } from './views/table';
import { mountSettings } from './views/settings';
import { mountScatter } from './views/scatter';
import { mountGuide, mountMethod, mountStatus } from './views/guide';
import { mountAdmin } from './views/admin';

const SHELL = `
<a class="skip" href="#area">Skip to the map</a>
<header class="appbar">
  <div class="in">
    <div class="brand"><svg class="mk" viewBox="0 0 30 30" aria-hidden="true"><g fill="#4cc3b9"><rect x="2" y="2" width="8" height="8"/><rect x="11" y="2" width="8" height="8"/><rect x="20" y="2" width="8" height="8"/><rect x="2" y="11" width="8" height="8"/><rect x="20" y="11" width="8" height="8"/><rect x="2" y="20" width="8" height="8"/><rect x="11" y="20" width="8" height="8"/><rect x="20" y="20" width="8" height="8"/></g><rect x="11.5" y="11.5" width="7" height="7" fill="none" stroke="#e9eff4" stroke-width="1" stroke-dasharray="2 1.5"/></svg>
      <div><b>The Demand That Can't Vote</b><span>London housing supply and representation tool</span></div></div>
    <span class="bkstatus" id="bkstatus" data-mode="snapshot" role="status">Snapshot data</span>
  </div>
  <nav class="tabs" aria-label="Sections"><a href="#start">How to use</a><a href="#area">Map</a><a href="#lab">Diagnosis</a><a href="#ranksec">Where to campaign</a><a href="#voicesec">Evidence</a><a href="#gamesec">Area types</a><a href="#methodsec">Method</a><a href="#adminsec">Data</a></nav>
</header>
<main class="wrap">
  <div class="pagehead">
    <div><h1>Where London is short of homes, what is blocking them, and who can act</h1>
    <p>Missing homes per seat against a London target, the local blocker behind each shortfall, and the MP, council and Mayoral levers that can move it.</p></div>
  </div>
  <section class="panel wf" id="start" aria-labelledby="starth"></section>
  <div class="grid" id="area">
    <section class="panel" id="mapsec" aria-labelledby="maph"></section>
    <section class="panel" id="areasec" aria-labelledby="pch"></section>
  </div>
  <section class="panel lab" id="lab" aria-labelledby="labh"></section>
  <section class="panel" id="ranksec" aria-labelledby="rankh"></section>
  <section class="panel" id="voicesec" aria-labelledby="voiceh"></section>
  <section class="panel" id="gamesec" aria-labelledby="gameh">
    <h2 id="gameh">The decision each area type calls for</h2>
    <p class="lede">An MP backs more homes when the voters who reward it outweigh the voters who punish it. Market demand says whether homes would actually get built; resident concern says which way the MP's own voters lean.</p>
    <div class="game" id="game"></div>
  </section>
  <section class="panel" id="methodsec" aria-labelledby="methodh">
    <details><summary id="methodh">How the numbers are built</summary><div class="method" id="method"></div></details>
  </section>
  <section class="panel admin" id="adminsec" aria-labelledby="adminh"></section>
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
  mountSteps();
  mountMap();
  mountCard();
  mountLab();
  mountTable();
  mountSettings();
  mountScatter();
  mountGuide();
  mountMethod();
  mountAdmin();
  document.body.dataset.ready = 'true';
  void checkHealth();
}

void boot();
