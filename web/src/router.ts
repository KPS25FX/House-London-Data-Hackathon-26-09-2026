/** Tabbed pages with hash routing (#p-map, #p-seat, ...). */
type PageFn = (id: string) => void;
const hooks: PageFn[] = [];
export let current = 'p-map';
export const onPage = (f: PageFn) => { hooks.push(f); };

export function showPage(id: string, keep = false) {
  const el = id ? document.getElementById(id) : null;
  if (!el || !el.classList.contains('page')) id = 'p-map';
  current = id;
  document.querySelectorAll<HTMLElement>('.page').forEach(p => { p.hidden = p.id !== id; });
  document.querySelectorAll('.tabs a').forEach(a => {
    const on = a.getAttribute('href') === '#' + id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  hooks.forEach(f => f(id));
  if (!keep) window.scrollTo(0, 0);
}

/** Go to an element: switch to its page first if needed, then scroll to it. */
export function go(id: string, block: ScrollLogicalPosition = 'start') {
  const el = document.getElementById(id); if (!el) return;
  const pg = el.classList.contains('page') ? el : (el.closest('.page') as HTMLElement | null);
  if (pg && pg.hidden) {
    try { history.replaceState(null, '', '#' + pg.id); } catch { /* ignore */ }
    showPage(pg.id, true);
  }
  if (el === pg) window.scrollTo({ top: 0, behavior: 'smooth' });
  else el.scrollIntoView({ behavior: 'smooth', block });
}

export function mountRouter() {
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));
  showPage(location.hash.slice(1), true);
}
