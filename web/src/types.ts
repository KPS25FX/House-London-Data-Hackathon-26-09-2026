/** Types derived from the @dcv/core API so the web layer follows the contract exactly. */
import type * as core from '@dcv/core';
export type SeatRow = Parameters<typeof core.compute>[0][number];
export type Msoa = Parameters<typeof core.compute>[1][number];
export type Settings = Parameters<typeof core.compute>[2];
export type Seat = ReturnType<typeof core.compute>[number];
export type Ctx = Parameters<typeof core.hypotheses>[1];
export type Hyp = ReturnType<typeof core.hypotheses>[number];
export type Policy = Parameters<typeof core.retrieve>[2][number];
export type Postcodes = Parameters<typeof core.lookupPostcode>[1];
export type Argument = ReturnType<typeof core.buildArgument>;
export type Meta = Ctx['meta'];
export type Borough = Ctx['boroughs'][string];
export type Role = 'campaigner' | 'policy';
export type LayerId = 'type' | 'gap' | 'prio' | 'M' | 'V' | 'margin' | 'blocker';
export type SortId = 'prio' | 'gap' | 'margin' | 'stalled';
