/** F07 Settings: target, persuadability, missing-homes mode. Built once, then patched in place so the slider keeps its drag. */
import { S, setSettings, subscribe } from '../state';
import { $, fmt, h, set } from '../dom';
import { TARGETS } from './steps';

export function mountSettings() {
  const root = $('#settings')!;
  set(root, h`<details class="adjust"><summary>Adjust assumptions</summary><div class="controls">
      <div class="ctl"><label for="wtot">London target (homes a year)</label><select id="wtot">${TARGETS.map(([v, l]) => h`<option value="${v}">${l}</option>`)}</select></div>
      <div class="ctl"><label for="wclose">Persuadability: close seat / residents split</label><input type="range" id="wclose" min="0" max="100" value="50"><output for="wclose" id="wcloseo">50 / 50</output></div>
      <div class="ctl"><span id="mml">Missing homes</span><div class="seg" role="group" aria-labelledby="mml">
        <button type="button" data-mm="msoa" aria-pressed="true">per neighbourhood</button><button type="button" data-mm="seat" aria-pressed="false">per seat</button></div></div>
      </div>
      <p class="note">Total missing across London: <b data-testid="total-missing" id="totmiss"></b> homes a year.<span id="mmnote"></span></p></details>`);
  root.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'wtot') setSettings({ total: +t.value });
  });
  root.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'wclose') setSettings({ wClose: +t.value / 100 });
  });
  root.addEventListener('click', e => {
    const b = (e.target as Element).closest('button[data-mm]') as HTMLButtonElement | null;
    if (b) setSettings({ missingMode: b.dataset.mm as 'msoa' | 'seat' });
  });
  const patch = () => {
    const w = Math.round(S.settings.wClose * 100);
    ($('#wtot') as HTMLSelectElement).value = String(S.settings.total);
    ($('#wclose') as HTMLInputElement).value = String(w);
    $('#wcloseo')!.textContent = `${w} / ${100 - w}`;
    root.querySelectorAll('button[data-mm]').forEach(b => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.mm === S.settings.missingMode)));
    $('#totmiss')!.textContent = fmt(S.seats.reduce((s, x) => s + x.gap, 0));
    const fallback = (S.data.meta as { missingMode?: string }).missingMode === 'msoa_fallback';
    $('#mmnote')!.textContent = fallback ? ' Neighbourhood figures are approximate in this snapshot (fallback mode): some neighbourhood values are estimates.' : '';
  };
  subscribe((_, why) => { if (why === 'settings' || why === 'data') patch(); });
  patch();
}
