/** Loaders for the static data snapshot in /data (written by the pipeline). */
import type { SeatRow, Msoa, Policy, Postcodes, Meta, Borough } from './types';

/** Boundary map: seat outlines as SVG path strings in a w x h box. */
export interface Geo { w: number; h: number; seats: Record<string, string>; boroughs?: string; cent?: Record<string, [number, number]> }

export interface Data {
  seats: SeatRow[]; boroughs: Borough[]; msoa: Msoa[]; policies: Policy[]; postcodes: Postcodes; meta: Meta; series: unknown | null; geo: Geo | null;
}

async function get<T>(name: string, fallback?: T): Promise<T> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`);
    return (await r.json()) as T;
  } catch (e) {
    if (fallback !== undefined) return fallback;
    throw e;
  }
}

export async function loadData(): Promise<Data> {
  const [seats, boroughs, msoa, policies, postcodes, meta] = await Promise.all([
    get<SeatRow[]>('seats'), get<Borough[]>('boroughs', []), get<Msoa[]>('msoa', []),
    get<Policy[]>('policies', []), get<Postcodes>('postcodes', {} as Postcodes), get<Meta>('meta'),
  ]);
  const [series, geo] = await Promise.all([get<unknown | null>('series', null), get<Geo | null>('geo', null)]);
  return { seats, boroughs, msoa, policies, postcodes, meta, series, geo };
}
