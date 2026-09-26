// Number formatting helpers (same output as the prototype).
export const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
export const pc1 = (n: number): string => (n * 100).toFixed(0) + '%';
export const pts = (m: number): string => (m < 1 ? m.toFixed(2) : m.toFixed(1)) + ' pts';
export function ordinal(n: number): string {
  n = Math.max(1, n);
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || 'th');
}
