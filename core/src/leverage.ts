/** ALG-4: closeness of the race. */
export const closeness = (marginPct: number): number => 1 / (1 + marginPct / 5);
/** ALG-4: 1 when residents are split (median concern). */
export const swingOf = (Vp: number): number => 1 - Math.abs(2 * Vp - 1);
/** ALG-4: probability the MP moves, blending closeness and swing by slider weight. */
export const dPOf = (close: number, swing: number, wClose: number): number => wClose * close + (1 - wClose) * swing;
/** ALG-5: homes built per unserved home-seeker. */
export const bpkOf = (homes: number, wtbGap: number): number => homes / Math.max(wtbGap, 1);
