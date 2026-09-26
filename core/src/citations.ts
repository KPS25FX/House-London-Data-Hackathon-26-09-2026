// Find citation ids like [K01], [E03], [L02] (also "[K01, K04]") and report unknown ones.
const ID_RE = /^[EKL]\d{1,3}$/;

export function extractCitations(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\[([^\]\n]{1,80})\]/g)) {
    for (const tok of (m[1] ?? '').split(/[\s,;]+/)) if (ID_RE.test(tok)) found.add(tok);
  }
  return [...found];
}

export function validateCitations(text: string, allowedIds: string[]): { unknown: string[] } {
  const allowed = new Set(allowedIds);
  return { unknown: extractCitations(text).filter(id => !allowed.has(id)) };
}
