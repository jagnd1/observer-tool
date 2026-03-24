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

function topLabel(i, n) {
  if (i === 0)     return 'one WHY/systemic level above core'
  if (i === n - 1) return 'most abstract/meta/universal level'
  return 'abstraction level ' + (i + 1)
}

function botLabel(i, m) {
  if (i === 0)     return 'one HOW/mechanical level below core'
  if (i === m - 1) return 'most granular/atomic root'
  return 'detail level ' + (i + 1)
}

export function buildPrompt(q, n, m, p) {
  const topTpl = Array.from({ length: n }, (_, i) =>
    `"<${topLabel(i, n)}>"`
  ).join(', ')

  const botTpl = Array.from({ length: m }, (_, i) =>
    `"<${botLabel(i, m)}>"`
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
  if (!text) return null

  // Try multiple extraction strategies
  const strategies = [
    // Strategy 1: Clean markdown code fences (```json ... ``` or ``` ... ```)
    () => {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenced) return fenced[1].trim()
      return null
    },
    // Strategy 2: Find first complete JSON object using manual brace matching
    () => {
      let depth = 0
      let start = -1
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (depth === 0) start = i
          depth++
        } else if (text[i] === '}') {
          depth--
          if (depth === 0 && start !== -1) {
            const candidate = text.slice(start, i + 1)
            try {
              const parsed = JSON.parse(candidate)
              if (parsed && (parsed.core !== undefined || parsed.top || parsed.bottom || parsed.sides)) {
                return candidate
              }
            } catch {
              // Continue searching for next object
            }
          }
        }
      }
      return null
    },
    // Strategy 3: Simple regex fallback (original)
    () => {
      const match = text.match(/\{[\s\S]*\}/)
      return match ? match[0] : null
    },
  ]

  for (const strategy of strategies) {
    try {
      const candidate = strategy()
      if (candidate) {
        const parsed = JSON.parse(candidate)
        // Basic validation: must have core or at least one array
        if (parsed && (parsed.core !== undefined || Array.isArray(parsed.top) || Array.isArray(parsed.bottom) || Array.isArray(parsed.sides))) {
          return parsed
        }
      }
    } catch {
      continue
    }
  }

  return null
}

// ─── Refinement user content ──────────────────────────────────────────────────

/**
 * Builds the userContent string for a refinement API call.
 * feedback: { [nodeKey]: 'accept'|'correct' }
 * comments: { [nodeKey]: string }
 * Node key convention:
 *   'core'          → previousOutput.core
 *   'top_k' (k≥1)  → previousOutput.top[k-1]   (top_1 = ↑1 = closest to core)
 *   'bot_k' (k≥1)  → previousOutput.bottom[k-1]
 *   'side_k' (k≥1) → previousOutput.sides[k-1]
 */
export function buildRefinementUserContent(previousOutput, feedback, comments, problem, solution) {
  const n = (previousOutput.top    || []).length
  const m = (previousOutput.bottom || []).length
  const p = (previousOutput.sides  || []).length

  const nodeVal = (key) => {
    if (key === 'core') return previousOutput.core || ''
    const t = key.match(/^top_(\d+)$/)
    if (t) return (previousOutput.top    || [])[+t[1] - 1] || ''
    const b = key.match(/^bot_(\d+)$/)
    if (b) return (previousOutput.bottom || [])[+b[1] - 1] || ''
    const s = key.match(/^side_(\d+)$/)
    if (s) return (previousOutput.sides  || [])[+s[1] - 1] || ''
    return ''
  }

  const keys = [
    'core',
    ...Array.from({ length: n }, (_, i) => `top_${i + 1}`),
    ...Array.from({ length: m }, (_, i) => `bot_${i + 1}`),
    ...Array.from({ length: p }, (_, i) => `side_${i + 1}`),
  ]

  const feedbackLines = keys
    .filter(k => feedback[k])
    .map(k => {
      const val     = nodeVal(k)
      const comment = comments[k] ? ` — "${comments[k]}"` : ''
      if (feedback[k] === 'accept')  return `- ${k} ("${val}"): ACCEPTED`
      if (feedback[k] === 'correct') return `- ${k} ("${val}"): CORRECT${comment}`
      return null
    })
    .filter(Boolean)
    .join('\n')

  return `PROBLEM:\n${problem}\n\nPROPOSED SOLUTION:\n${solution}

PREVIOUS ANALYSIS:
${JSON.stringify(previousOutput, null, 2)}

USER FEEDBACK:
${feedbackLines || '(no specific feedback — refine for sharpness)'}

INSTRUCTIONS:
- ACCEPTED nodes: the insight is correct — keep wording; may refine subtly
- CORRECT nodes: user disagrees — integrate their direction, substantially rewrite
- Uncorrected nodes: sharpen if possible
- Return the same JSON structure. Max 20 words per item. No hedging. No preamble.`
}
