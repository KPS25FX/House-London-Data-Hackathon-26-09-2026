/** Tiny store. Holds UI state + derived seats; views subscribe and re-render. No business logic: core does the maths. */
import * as core from '@dcv/core';
import type { Data } from './data';
import type { Ctx, LayerId, Role, Seat, Settings, SortId, Borough, SeatRow } from './types';

export interface AppState {
  data: Data;
  settings: Settings;
  role: Role;
  layer: LayerId;
  sort: SortId;
  sel: string | null;
  ftype: string; fparty: string; fborough: string;
  seats: Seat[];
  ctx: Ctx;
  version: string;
  llm: 'live' | 'mock' | 'off' | null;
}

const ROLE_KEY = 'dcv.role';
export function readRole(): Role {
  try { const v = localStorage.getItem(ROLE_KEY); return v === 'policy' ? 'policy' : 'campaigner'; } catch { return 'campaigner'; }
}
function writeRole(r: Role) { try { localStorage.setItem(ROLE_KEY, r); } catch { /* storage unavailable */ } }

type Listener = (s: AppState, reason: string) => void;
const listeners: Listener[] = [];
export let S: AppState;

function buildCtx(seats: Seat[], data: Data, settings: Settings): Ctx {
  const boroughs: Record<string, Borough> = {};
  for (const b of data.boroughs) boroughs[(b as { name: string }).name] = b;
  return { seats, boroughs, policies: data.policies, settings, meta: data.meta } as Ctx;
}

function recompute() {
  const seats = core.compute(S.data.seats, S.data.msoa, S.settings);
  S.seats = seats;
  S.ctx = buildCtx(seats, S.data, S.settings);
}

export function init(data: Data) {
  const role = readRole();
  const settings = { total: 55800, wClose: 0.5, missingMode: 'msoa' } as Settings;
  S = {
    data, settings, role,
    layer: role === 'policy' ? 'blocker' : 'prio', sort: role === 'policy' ? 'gap' : 'prio',
    sel: null, ftype: '', fparty: '', fborough: '',
    seats: [], ctx: {} as Ctx, version: String((data.meta as { version?: string }).version ?? 'snapshot'), llm: null,
  };
  recompute();
}

export function subscribe(fn: Listener) { listeners.push(fn); }
export function notify(reason = 'update') { for (const l of listeners) l(S, reason); }

export function seat(code: string | null | undefined): Seat | undefined { return code ? S.seats.find(x => x.code === code) : undefined; }
export function selected(): Seat | undefined { return seat(S.sel); }

export function setSettings(p: Partial<Settings>) { S.settings = { ...S.settings, ...p } as Settings; recompute(); notify('settings'); }
export function select(code: string | null) {
  const r = seat(code);
  if (S.fborough && r && r.borough !== S.fborough) S.fborough = '';
  S.sel = r ? r.code : null; notify('select');
}
export function setLayer(l: LayerId) { S.layer = l; notify('layer'); }
export function setSort(s: SortId) { S.sort = s; notify('table'); }
export function setFilter(p: Partial<Pick<AppState, 'ftype' | 'fparty' | 'fborough'>>) { Object.assign(S, p); notify('filter'); }
export function setRole(r: Role) {
  S.role = r; writeRole(r);
  S.layer = r === 'policy' ? 'blocker' : 'prio'; S.sort = r === 'policy' ? 'gap' : 'prio';
  notify('role');
}
export function setLlm(m: AppState['llm']) { S.llm = m; notify('llm'); }

/** Replace seat rows (admin import) and bump version. */
export function applyRows(rows: SeatRow[], version: string) {
  S.data = { ...S.data, seats: rows, meta: { ...S.data.meta, version } };
  S.version = version; recompute(); notify('data');
}
