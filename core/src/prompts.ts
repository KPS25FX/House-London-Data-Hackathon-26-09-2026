// ALG-10 memo prompt (prototype memoPrompt, extended with POLICY ARGUMENT) and follow-up ask prompt.
import type { Ctx, Policy, PolicyArgument, Seat } from './types.js';
import { TYPES } from './content.js';
import { hypotheses } from './hypotheses.js';
import { retrieve } from './retrieval.js';
import { similarSeats } from './similarity.js';
import { seatFacts } from './facts.js';
import { buildArgument } from './policy/argument.js';
import { fmt } from './format.js';

export const PROMPT_VERSION = 'memo-v2';

export const MEMO_SECTIONS = [
  '## Bottom line', '## What the data shows', '## Diagnosis', '## Policy context and history',
  '## Options', '## Outlook and implications', '## Campaign ask', '## Data gaps',
] as const;

export function memoPrompt(r: Seat, ctx: Ctx): { prompt: string; docs: Policy[]; argument: PolicyArgument } {
  const H = hypotheses(r, ctx);
  const docs = retrieve(r, H, ctx.policies);
  const argument = buildArgument(r, ctx, H);
  // Evaluation policies referenced by the argument must be in LIBRARY too so they can be cited.
  const byId = new Map(ctx.policies.map(p => [p.id, p]));
  const have = new Set(docs.map(d => d.id));
  for (const o of argument.options) for (const id of o.policyIds) {
    const p = byId.get(id);
    if (p && !have.has(id)) { docs.push(p); have.add(id); }
  }
  const sims = similarSeats(r, ctx.seats);
  const prompt = `You are a housing policy analyst writing a short, rigorous policy memo about one London parliamentary constituency for campaigners and policymakers.

RULES
- Use ONLY the seat data, similar seats, POLICY ARGUMENT and LIBRARY entries below. Do not add facts, numbers, schemes, dates or named people that are not given here. If something useful is missing, say what data would settle it.
- Cite library entries inline by their id, e.g. [K01], [E03] or [L02], every time you use one. Seat numbers come from SEAT DATA; do not cite them.
- Treat the hypotheses as starting points: support, qualify or reject each one using the data. Association is not causation.
- Flag data limits where they matter: completions are Planning London Datahub records, which miss some homes in a few boroughs [K10]; resident concern may be estimated; the missing-homes figure comes from the model in [K14] and depends on the London-wide target chosen.
- Prefer levers that already exist over new ones. Say who holds each lever: MP, borough council, Mayor/GLA, or government.
- Plain English, UK spelling, no filler. About 600-800 words.

FORMAT (Markdown)
# Policy memo: ${r.name}
## Bottom line
(2-3 sentences)
## What the data shows
(4-6 bullets with the key numbers)
## Diagnosis
(each hypothesis: verdict - supported / partly / not supported - and why)
## Policy context and history
(what has already been tried or is changing here and London-wide, from the library only)
## Options
(3-5 options: the lever, who holds it, expected effect, main risk)
## Outlook and implications
(what happens under the draft London Plan and current trends; second-order effects)
## Campaign ask
(one specific ask of the MP and one of the council)
## Data gaps
(bullets)

SEAT DATA
${JSON.stringify(seatFacts(r, ctx), null, 1)}

HYPOTHESES FROM THE TOOL
${H.map((h, i) => `${i + 1}. ${h.t} [confidence: ${h.c}] - ${h.p} Evidence: ${h.ev}. Test: ${h.test}`).join('\n')}

POLICY ARGUMENT
Follow this structure: premises (P ids) support the diagnosis (D ids); each option addresses a diagnosed hypothesis and lists the policy ids behind it; the asks and data gaps close the memo. Build "What the data shows" from the premises, "Diagnosis" from the diagnosis claims, "Options" from the options (lever, holder, expected effects, risk), "Campaign ask" from asks and "Data gaps" from dataGaps. Cite the policy ids (K, E or L) listed in each option wherever you use them. Do not cite P, D or O ids in the memo text.
${JSON.stringify(argument, null, 1)}

SIMILAR SEATS (for comparison)
${sims.map(s => `- ${s.name} (${s.borough}): ${TYPES[s.type].label}; ${fmt(s.wtbGap)} unserved; ${Math.round(s.V * 100)}% concerned; ${fmt(s.homes)} completions; ${Math.round(s.owned)}% owned; margin ${s.marginPct.toFixed(1)} pts`).join('\n')}

LIBRARY
${docs.map(d => `[${d.id}] ${d.title}: ${d.text}`).join('\n\n')}
`;
  return { prompt, docs, argument };
}

export function askPrompt(r: Seat, ctx: Ctx, earlierMemo: string, question: string): string {
  const { docs } = memoPrompt(r, ctx);
  return `You are a housing policy analyst answering a follow-up question about a policy memo on one London parliamentary constituency (${r.name}).

RULES
- Use ONLY the seat data, the earlier memo and the LIBRARY entries below. Do not add facts, numbers, schemes, dates or named people that are not given here. If the data cannot answer the question, say so and say what data would settle it.
- Cite library entries inline by their id, e.g. [K01], [E03] or [L02], every time you use one.
- Association is not causation. Say who holds any lever you mention: MP, borough council, Mayor/GLA, or government.
- Plain English, UK spelling, no filler. Under 250 words unless the question needs more.

SEAT DATA
${JSON.stringify(seatFacts(r, ctx), null, 1)}

EARLIER MEMO
${earlierMemo}

LIBRARY
${docs.map(d => `[${d.id}] ${d.title}: ${d.text}`).join('\n\n')}

QUESTION
${question}
`;
}
