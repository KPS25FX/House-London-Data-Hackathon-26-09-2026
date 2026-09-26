/** Current Trends selection (metric + year index) read from state; formatting delegates to core. */
import * as core from '@dcv/core';
import { S } from './state';
import type { Metric } from './types';

export function curMetric(): Metric | undefined {
  const ms = S.series?.metrics ?? [];
  return ms.find(m => m.id === S.trm) ?? ms[0];
}
export function curYear(m: Metric): number {
  const n = m.years.length;
  return S.trYi == null || S.trYi >= n ? n - 1 : Math.max(0, S.trYi);
}
export const trendValue = (m: Metric, borough: string, i: number): number | null => m.data[borough]?.[i] ?? null;
export const fmtM = (m: Metric, v: number | null | undefined) => core.fmtMetric(m, v);
