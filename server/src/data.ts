import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compute } from '@dcv/core';
import type { Borough, Ctx, Meta, Msoa, Policy, SeatRow, Settings } from '@dcv/core';

export interface Dataset {
  seats: SeatRow[];
  boroughs: Borough[];
  msoa: Msoa[];
  policies: Policy[];
  meta: Meta;
}

const ALLOWED_TOTALS = new Set([52287, 55800, 88000]);
export const DEFAULT_SETTINGS: Settings = { total: 55800, wClose: 0.5, missingMode: 'msoa' };

/** Validate client settings; missing fields take defaults. Returns an error string on bad input. */
export function parseSettings(input: unknown): { ok: true; settings: Settings } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, settings: { ...DEFAULT_SETTINGS } };
  if (typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'settings must be an object' };
  const s = input as Record<string, unknown>;
  const total = s.total ?? DEFAULT_SETTINGS.total;
  const wClose = s.wClose ?? DEFAULT_SETTINGS.wClose;
  const missingMode = s.missingMode ?? DEFAULT_SETTINGS.missingMode;
  if (typeof total !== 'number' || !Number.isFinite(total) || !(ALLOWED_TOTALS.has(total) || (total >= 40000 && total <= 120000)))
    return { ok: false, error: 'settings.total must be 52287, 55800, 88000 or a number between 40000 and 120000' };
  if (typeof wClose !== 'number' || !Number.isFinite(wClose) || wClose < 0 || wClose > 1)
    return { ok: false, error: 'settings.wClose must be a number between 0 and 1' };
  if (missingMode !== 'msoa' && missingMode !== 'seat')
    return { ok: false, error: "settings.missingMode must be 'msoa' or 'seat'" };
  return { ok: true, settings: { total, wClose, missingMode } };
}

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
}

export class DataStore {
  private data: Dataset | null = null;
  private cache = new Map<string, Ctx>();
  loadError: string | null = null;

  constructor(private dir: string, initial?: Dataset) {
    if (initial) this.data = initial;
  }

  /** (Re)load all data files. Keeps the previous dataset if loading fails. */
  load(): boolean {
    try {
      this.data = {
        seats: readJson<SeatRow[]>(this.dir, 'seats.json'),
        boroughs: readJson<Borough[]>(this.dir, 'boroughs.json'),
        msoa: readJson<Msoa[]>(this.dir, 'msoa.json'),
        policies: readJson<Policy[]>(this.dir, 'policies.json'),
        meta: readJson<Meta>(this.dir, 'meta.json'),
      };
      this.cache.clear();
      this.loadError = null;
      return true;
    } catch (e) {
      this.loadError = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  get ready(): boolean {
    return this.data !== null;
  }

  get version(): string | undefined {
    return this.data?.meta?.version;
  }

  /** Build (and memoise per settings) the computed context. */
  ctx(settings: Settings): Ctx {
    if (!this.data) throw new Error('data not loaded');
    const key = `${settings.total}|${settings.wClose}|${settings.missingMode}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const d = this.data;
    const boroughs: Record<string, Borough> = {};
    for (const b of d.boroughs) boroughs[b.name] = b;
    const ctx: Ctx = { seats: compute(d.seats, d.msoa, settings), boroughs, policies: d.policies, settings, meta: d.meta };
    if (this.cache.size >= 16) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, ctx);
    return ctx;
  }
}
