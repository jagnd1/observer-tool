export const QDEFS = [
  {
    id: 'problem',
    label: 'Problem clarity',
    tag: 'First principles',
    accent: '#1D6FB8',
    role: 'a first-principles observer stress-testing only the PROBLEM STATEMENT',
    focus: 'root cause vs symptom, baked-in assumptions, scope mismatch, missing context, what is NOT said',
  },
  {
    id: 'fit',
    label: 'Solution fit',
    tag: 'Logic chain',
    accent: '#0A7A5A',
    role: 'a logic auditor checking if the SOLUTION closes the loop on the problem',
    focus: 'root vs surface fix, reasoning chain gaps, new problems introduced, weakest assumption, scope mismatch',
  },
  {
    id: 'blindspots',
    label: 'Blind spots',
    tag: 'Observer mode',
    accent: '#B45309',
    role: 'an adversarial observer exposing what the proposer is NOT seeing',
    focus: 'second-order effects, unspoken failure modes, skeptic attacks, taken-for-granted risks, hidden constraints',
  },
  {
    id: 'alternatives',
    label: 'Alternatives',
    tag: 'Lateral thinking',
    accent: '#6D28D9',
    role: 'a lateral thinker generating fundamentally different approaches',
    focus: 'cross-domain solutions, contrarian takes, constraint removal, simplest overlooked path, inversion',
  },
]

export function buildPrompt(q, n, m, p) {
  const topTpl = Array.from({ length: n }, (_, i) =>
    `"<${i === 0 ? 'one WHY/systemic level above core' : i === n - 1 ? 'most abstract/meta/universal level' : `abstraction level ${i + 1}`}>"`
  ).join(', ')

  const botTpl = Array.from({ length: m }, (_, i) =>
    `"<${i === 0 ? 'one HOW/mechanical level below core' : i === m - 1 ? 'most granular/atomic root' : `detail level ${i + 1}`}>"`
  ).join(', ')

  const sideTpl = Array.from({ length: p }, (_, i) =>
    `"<lateral view ${i + 1}: adjacent domain / analogy / alt framing>"`
  ).join(', ')

  return `You are ${q.role}.
Focus: ${q.focus}

Context will be: PROBLEM + PROPOSED SOLUTION.

Return ONLY valid JSON (no markdown fences, no preamble):
{
  "top": [${topTpl}],
  "core": "<sharpest direct insight at problem level, max 20 words>",
  "bottom": [${botTpl}],
  "sides": [${sideTpl}]
}

Rules:
- top[0] = one abstraction up from core (why does this exist at a system level?)
- top[${Math.max(n - 1, 0)}] = most abstract/meta/universal insight
- core = sharpest insight at the immediate surface level
- bottom[0] = one step into mechanics/implementation
- bottom[${Math.max(m - 1, 0)}] = most granular/atomic/root level
- sides = ${p} lateral views: adjacent domains, analogies, alt framings
- Max 20 words per item. Incisive. No hedging. No bullet symbols. No "Note:" prefixes.`
}

export function parseResponse(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}
