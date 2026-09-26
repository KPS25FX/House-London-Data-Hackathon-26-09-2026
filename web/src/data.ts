/** Loaders for the static data snapshot in /data (written by the pipeline). */
import type { SeatRow, Msoa, Policy, Postcodes, Meta, Borough } from './types';

export interface Data {
  seats: SeatRow[]; boroughs: Borough[]; msoa: Msoa[]; policies: Policy[]; postcodes: Postcodes; meta: Meta;
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
  return { seats, boroughs, msoa, policies, postcodes, meta };
}
