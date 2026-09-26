// Borough time series (v2 prototype SERIES / latest / first / growth / trRange / parseSeries). Pure.

export interface Metric {
  id: string; label: string; unit: string; fmt: string; source: string;
  better: 'low' | 'high' | string | null;
  years: string[];
  data: Record<string, (number | null)[]>;   // keyed by borough name; each array has years.length entries
  london?: (number | null)[] | null;
  note?: string;
  yoy?: Record<string, number>;
}
export interface Series { metrics: Metric[] }

export interface Point { v: number; i: number; year: string }

export const metricById = (s: Series | undefined, id: string): Metric | undefined => s?.metrics.find(m => m.id === id);

export function latest(m: Metric | undefined, borough: string): Point | null {
  const a = m?.data[borough];
  if (!m || !a) return null;
  for (let i = a.length - 1; i >= 0; i--) { const v = a[i]; if (v != null) return { v, i, year: m.years[i]! }; }
  return null;
}

export function first(m: Metric | undefined, borough: string): Point | null {
  const a = m?.data[borough];
  if (!m || !a) return null;
  for (let i = 0; i < a.length; i++) { const v = a[i]; if (v != null) return { v, i, year: m.years[i]! }; }
  return null;
}

/** Percent change first -> latest non-null value; null when missing or first is 0. */
export function growth(m: Metric | undefined, borough: string): number | null {
  const f = first(m, borough), l = latest(m, borough);
  return f && l && f.v ? (l.v / f.v - 1) * 100 : null;
}

/**
 * [lo, hi] for colouring. With yearIdx omitted it matches the prototype trRange (all years, so colours stay stable
 * while animating); pass yearIdx to restrict to one year.
 */
export function metricRange(m: Metric, yearIdx?: number): [number, number] {
  const all: number[] = [];
  for (const a of Object.values(m.data)) {
    if (yearIdx == null) { for (const v of a) if (v != null) all.push(v); }
    else { const v = a[yearIdx]; if (v != null) all.push(v); }
  }
  return all.length ? [Math.min(...all), Math.max(...all)] : [0, 0];
}

/** Format a metric value like the prototype fmtS. */
export function fmtMetric(m: Metric, v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return 'n/a';
  const r = Math.round(v).toLocaleString('en-GB');
  return m.fmt === 'gbp' ? '£' + r : m.fmt === 'pct' ? v.toFixed(1) + '%' : m.fmt === 'x' ? v.toFixed(1) + '×' : r;
}

/** Quote-aware CSV splitter (prototype csvRows). */
export function csvRows(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = '';
      if (row.length > 1 || row[0] !== '') out.push(row);
      row = [];
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); out.push(row); }
  return out;
}

export const LONDON_BOROUGHS: readonly string[] = [
  'Barking and Dagenham', 'Barnet', 'Bexley', 'Brent', 'Bromley', 'Camden', 'City of London', 'Croydon', 'Ealing', 'Enfield',
  'Greenwich', 'Hackney', 'Hammersmith and Fulham', 'Haringey', 'Harrow', 'Havering', 'Hillingdon', 'Hounslow', 'Islington',
  'Kensington and Chelsea', 'Kingston upon Thames', 'Lambeth', 'Lewisham', 'Merton', 'Newham', 'Redbridge',
  'Richmond upon Thames', 'Southwark', 'Sutton', 'Tower Hamlets', 'Waltham Forest', 'Wandsworth', 'Westminster',
];

/**
 * Port of the prototype parseSeries for London Datastore long-format CSV
 * (dataset,area_code,area_name,area_type,period,year,measure,breakdown,value,unit,source).
 * Keeps rows with a numeric value whose area_type is 'borough' with a known borough name, or the London region
 * (area_type matching /region \(london\)/, or area_name 'London' with a region type) -> Metric.london.
 * One metric per dataset|measure|breakdown having at least one borough row; at most 40.
 * Periods sort by year then period text. Throws Error with the prototype's messages.
 * Deviation: `note` is 'Imported' (no date, to stay pure).
 */
export function parseSeriesCsv(text: string, boroughNames: readonly string[] = LONDON_BOROUGHS): Series {
  const R = csvRows(text);
  if (R.length < 2) throw new Error('That file has no data rows.');
  const H = R[0]!.map(h => h.trim().toLowerCase());
  const need = ['dataset', 'area_name', 'area_type', 'period', 'measure', 'breakdown', 'value'];
  const miss = need.filter(n => !H.includes(n));
  if (miss.length) throw new Error('Missing columns: ' + miss.join(', ') + '.');
  const ix: Record<string, number> = Object.fromEntries(H.map((h, i) => [h, i]));
  const BN = new Set(boroughNames);
  type Grp = { dataset: string; measure: string; breakdown: string; unit: string; source: string; pts: [string, string, number | null, number][] };
  const G = new Map<string, Grp>();
  const col = (c: string[], k: string): string => (ix[k] != null ? (c[ix[k]!] ?? '') : '');
  for (const c of R.slice(1)) {
    const v = parseFloat(col(c, 'value'));
    if (!isFinite(v)) continue;
    const at = col(c, 'area_type').toLowerCase(), an = col(c, 'area_name');
    const isL = /region \(london\)/.test(at) || (an === 'London' && /region/.test(at));
    if (!(at === 'borough' && BN.has(an)) && !isL) continue;
    const key = [col(c, 'dataset'), col(c, 'measure'), col(c, 'breakdown')].join('|');
    let g = G.get(key);
    if (!g) {
      g = { dataset: col(c, 'dataset'), measure: col(c, 'measure'), breakdown: col(c, 'breakdown'),
        unit: col(c, 'unit'), source: col(c, 'source'), pts: [] };
      G.set(key, g);
    }
    g.pts.push([isL ? '__L' : an, col(c, 'period'), ix.year != null ? +col(c, 'year') : null, v]);
  }
  const list = [...G.values()].filter(g => g.pts.some(p => p[0] !== '__L'));
  if (!list.length) throw new Error('No London borough rows found.');
  if (list.length > 40) throw new Error(`That file has ${list.length} measures. Split it into files of 40 or fewer.`);
  const hum = (s: string) => String(s || '').replace(/_/g, ' ').replace(/^./, x => x.toUpperCase());
  const metrics = list.map((g): Metric => {
    const per = [...new Set(g.pts.map(p => p[1]))];
    const yrOf: Record<string, number | null> = Object.fromEntries(g.pts.map(p => [p[1], p[2]]));
    per.sort((a, b) => ((yrOf[a] ?? 0) - (yrOf[b] ?? 0)) || String(a).localeCompare(String(b)));
    const data: Record<string, (number | null)[]> = {};
    let lon: (number | null)[] | null = null;
    for (const [a, pe, , v] of g.pts) {
      const k = per.indexOf(pe);
      if (a === '__L') { lon = lon || per.map(() => null); lon[k] = v; }
      else { (data[a] = data[a] || per.map(() => null))[k] = v; }
    }
    const id = ('u_' + [g.dataset, g.measure, g.breakdown].join('_')).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
    const u = (g.unit || '').toLowerCase();
    return {
      id, label: `${hum(g.measure)}${g.breakdown && !/^all/i.test(g.breakdown) ? ` (${g.breakdown})` : ''}`,
      unit: g.unit, fmt: /gbp|£/.test(u) ? 'gbp' : /percent|%/.test(u) ? 'pct' : /ratio/.test(u) ? 'x' : 'int',
      source: g.source || g.dataset, better: null, years: per.map(String), data, london: lon, note: 'Imported',
    };
  });
  return { metrics };
}
