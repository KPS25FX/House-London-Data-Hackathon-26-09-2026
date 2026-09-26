/** Tiny store. Holds UI state + derived seats; views subscribe and re-render. No business logic: core does the maths. */
import * as core from '@dcv/core';
import type { Data } from './data';
import type { Ctx, LayerId, Seat, Settings, SortId, Borough, SeatRow, Scenario, ScenSeat, Series } from './types';

export interface AppState {
  data: Data;
  settings: Settings;
  layer: LayerId;
  view: 'geo' | 'hex';
  sort: SortId;
  sel: string | null;
  ftype: string; fparty: string; fborough: string;
  seats: Seat[];
  ctx: Ctx;
  scen: Scenario;
  scenSeats: ScenSeat[];
  series: Series | null;
  trm: string | null; trb: string | null; trYi: number | null;
  pol: string | null;
  version: string;
  llm: 'live' | 'mock' | 'off' | null;
}

type Listener = (s: AppState, reason: string) => void;
const listeners: Listener[] = [];
export let S: AppState;

function buildCtx(seats: Seat[], data: Data, settings: Settings): Ctx {
  const boroughs: Record<string, Borough> = {};
  for (const b of data.boroughs) boroughs[(b as { name: string }).name] = b;
  return { seats, boroughs, policies: data.policies, settings, meta: data.meta } as Ctx;
}

function recomputeScen() { S.scenSeats = core.computeScenario(S.seats, S.scen); }
function recompute() {
  const seats = core.compute(S.data.seats, S.data.msoa, S.settings);
  S.seats = seats;
  S.ctx = buildCtx(seats, S.data, S.settings);
  recomputeScen();
}

export function init(data: Data) {
  const settings = { total: 55800, wClose: 0.5, missingMode: 'msoa' } as Settings;
  S = {
    data, settings,
    layer: 'gap', view: data.geo ? 'geo' : 'hex', sort: 'gap',
    sel: null, ftype: '', fparty: '', fborough: '',
    seats: [], ctx: {} as Ctx, scen: { ...core.ZERO_SCENARIO }, scenSeats: [],
    series: (data.series as Series | null) ?? null, trm: null, trb: null, trYi: null, pol: null,
    version: String((data.meta as { version?: string }).version ?? 'snapshot'), llm: null,
  };
  recompute();
}

export function subscribe(fn: Listener) { listeners.push(fn); }
export function notify(reason = 'update') { for (const l of listeners) l(S, reason); }

export function seat(code: string | null | undefined): Seat | undefined { return code ? S.seats.find(x => x.code === code) : undefined; }
export function selected(): Seat | undefined { return seat(S.sel); }
export function scenSeat(code: string | null | undefined): ScenSeat | undefined { return code ? S.scenSeats.find(x => x.code === code) : undefined; }

export function setSettings(p: Partial<Settings>) { S.settings = { ...S.settings, ...p } as Settings; recompute(); notify('settings'); }
export function select(code: string | null) {
  const r = seat(code);
  if (S.fborough && r && r.borough !== S.fborough) S.fborough = '';
  S.sel = r ? r.code : null; S.pol = null; notify('select');
}
export function setLayer(l: LayerId) { S.layer = l; notify('layer'); }
export function setView(v: AppState['view']) { S.view = v; notify('layer'); }
export function setSort(s: SortId) { S.sort = s; notify('table'); }
export function setFilter(p: Partial<Pick<AppState, 'ftype' | 'fparty' | 'fborough'>>) { Object.assign(S, p); notify('filter'); }
export function setLlm(m: AppState['llm']) { S.llm = m; notify('llm'); }

/** Scenario levers changed: recompute scenario seats; switch the map to the scenario layer when one is on. */
export function setScen(scen: Scenario) {
  S.scen = { ...scen }; S.pol = null; recomputeScen();
  if (core.isScenarioOn(S.scen) && S.layer !== 'scen') S.layer = 'scen';
  if (!core.isScenarioOn(S.scen) && S.layer === 'scen') S.layer = 'gap';
  notify('scen');
}
export function setPolicy(id: string | null) { S.pol = id; notify('policy'); }

/** Trends controls. `showMap` switches the map to the borough-trend layer. */
export function setTrend(p: Partial<Pick<AppState, 'trm' | 'trb' | 'trYi'>>, showMap = false) {
  Object.assign(S, p);
  if (showMap) S.layer = 'trend';
  notify('trend');
}
export function setSeries(series: Series, version: string) {
  S.series = series; S.trm = null; S.trYi = null; S.version = version; notify('data');
}

/** Replace seat rows (admin import) and bump version. */
export function applyRows(rows: SeatRow[], version: string) {
  S.data = { ...S.data, seats: rows, meta: { ...S.data.meta, version } };
  S.version = version; recompute(); notify('data');
}
