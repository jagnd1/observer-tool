import React, { useState, useRef, useEffect } from 'react'
import QuadrantCard from './QuadrantCard.jsx'
import DepthControls from './DepthControls.jsx'
import { QDEFS, buildPrompt, buildRefinementUserContent, parseResponse } from './quadrants.js'
import { callClaude } from './api.js'

// ─── Token estimation ─────────────────────────────────────────────────────────
// Rough estimate: 4 chars per token for English text. Include system + user content.

function estimatePromptTokens(system, userContent) {
  const approxTokens = (system.length + userContent.length) / 4
  // Max context for claude-sonnet-4-20250514 is 200k tokens; leave headroom
  return Math.ceil(approxTokens)
}

// ─── Convergence bar ──────────────────────────────────────────────────────────

function ConvergenceBar({ iterations, nodeFeedback, convergedQ }) {
  const nConverged = QDEFS.filter(q => convergedQ[q.id]).length
  const allDone    = nConverged === 4

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 5,
      }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
          {allDone ? 'All lenses converged ✓' : `Convergence · ${nConverged}/4 lenses`}
        </span>
        {allDone && (
          <span style={{ fontSize: 10, color: '#22c55e' }}>Near-optimal solution reached</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 3, height: 4 }}>
        {QDEFS.map(q => {
          const qData      = iterations[q.id]?.at(-1)
          const isConverged = convergedQ[q.id]
          const fb         = nodeFeedback[q.id] ?? {}
          const totalNodes = qData && !qData.error
            ? 1 + (qData.top?.length || 0) + (qData.bottom?.length || 0) + (qData.sides?.length || 0)
            : 0
          const accepted = Object.values(fb).filter(v => v === 'accept').length
          let opacity
          if (isConverged)              opacity = 1
          else if (!qData || qData.error) opacity = 0.12
          else if (totalNodes > 0)       opacity = 0.22 + 0.6 * (accepted / totalNodes)
          else                           opacity = 0.22

          return (
            <div key={q.id} style={{
              flex: 1, height: '100%',
              background: q.accent,
              opacity,
              borderRadius: 2,
              transition: 'opacity 0.4s ease',
            }} />
          )
        })}
      </div>
    </div>
  )
}

// ─── Main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [problem,  setProblem]  = useState('')
  const [solution, setSolution] = useState('')
  const [n, setN] = useState(2)
  const [m, setM] = useState(2)
  const [p, setP] = useState(2)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('observer-theme')
    return saved === 'light' || saved === 'dark' ? saved : null
  })

  // Iteration history per quadrant: { qId: ParsedResponse[] }
  const [iterations,    setIterations]    = useState({})
  // Node feedback per quadrant: { qId: { nodeKey: 'accept'|'correct' } }
  const [nodeFeedback,  setNodeFeedback]  = useState({})
  // Correction text per quadrant: { qId: { nodeKey: string } }
  const [nodeComments,  setNodeComments]  = useState({})
  // Per-quadrant refining state
  const [refiningQ,     setRefiningQ]     = useState({})
  // Converged quadrants
  const [convergedQ,    setConvergedQ]    = useState({})
  // Reset key per quadrant — increments on fresh analyze, NOT on refine
  const [resetKeys,     setResetKeys]     = useState({})

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [tokenWarning, setTokenWarning] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [mockMode, setMockMode] = useState(() => {
    const saved = localStorage.getItem('openrouter-mock')
    return saved === 'true' || saved === null ? true : saved === 'true'
  })

  // Track abort controllers for in-flight requests
  const abortControllersRef = useRef({})

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('observer-session')
      if (saved) {
        const data = JSON.parse(saved)
        setProblem(data.problem || '')
        setSolution(data.solution || '')
        setN(data.n ?? 2)
        setM(data.m ?? 2)
        setP(data.p ?? 2)
        setIterations(data.iterations || {})
        setNodeFeedback(data.nodeFeedback || {})
        setNodeComments(data.nodeComments || {})
        setConvergedQ(data.convergedQ || {})
        setResetKeys(data.resetKeys || {})
      }
      // Load API key if present
      const savedKey = localStorage.getItem('openrouter-api-key')
      if (savedKey) {
        setApiKeyInput(savedKey)
      }
    } catch (e) {
      console.warn('Failed to load session from localStorage:', e)
    }
  }, [])

  // Persist session to localStorage on relevant state changes
  useEffect(() => {
    try {
      const session = {
        problem,
        solution,
        n,
        m,
        p,
        iterations,
        nodeFeedback,
        nodeComments,
        convergedQ,
        resetKeys,
      }
      localStorage.setItem('observer-session', JSON.stringify(session))
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e)
    }
  }, [problem, solution, n, m, p, iterations, nodeFeedback, nodeComments, convergedQ, resetKeys])

  // Theme management
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('observer-theme', theme || 'system')
  }, [theme])

  // API key persistence
  useEffect(() => {
    if (apiKeyInput) {
      localStorage.setItem('openrouter-api-key', apiKeyInput)
    }
  }, [apiKeyInput])

  // Mock mode persistence
  useEffect(() => {
    localStorage.setItem('openrouter-mock', mockMode)
  }, [mockMode])

  // Cleanup: abort any in-flight requests on unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach(ac => ac.abort())
    }
  }, [])

  // ── Fresh analysis ───────────────────────────────────────────────────────

  const analyze = async () => {
    if (!problem.trim() || !solution.trim()) {
      setError('Both fields are required.')
      return
    }

    // Check token budget before proceeding
    const userContent = `PROBLEM:\n${problem.trim()}\n\nPROPOSED SOLUTION:\n${solution.trim()}`
    let estimatedTokens = 0
    QDEFS.forEach(q => {
      const system = buildPrompt(q, n, m, p)
      estimatedTokens = Math.max(estimatedTokens, estimatePromptTokens(system, userContent))
    })

    // Warn if approaching limit (150k tokens leaves headroom)
    if (estimatedTokens > 150000) {
      setTokenWarning(`Input may be too long for depth ${n}×${m}×${p}. Estimated: ~${estimatedTokens.toLocaleString()} tokens. Consider reducing depth.`)
      // Still proceed - don't block
    } else {
      setTokenWarning('')
    }

    // Cancel any in-flight requests
    Object.values(abortControllersRef.current).forEach(ac => ac.abort())
    abortControllersRef.current = {}

    setError('')
    setIterations({})
    setNodeFeedback({})
    setNodeComments({})
    setRefiningQ({})
    setConvergedQ({})
    setResetKeys(prev =>
      Object.fromEntries(QDEFS.map(q => [q.id, (prev[q.id] ?? 0) + 1]))
    )
    setLoading(true)

    const ctx = userContent

    await Promise.all(
      QDEFS.map(async (q) => {
        const ac = new AbortController()
        abortControllersRef.current[q.id] = ac
        try {
          const text   = await callClaude({ system: buildPrompt(q, n, m, p), userContent: ctx, maxTokens: 2000, signal: ac.signal, quadrantId: q.id })
          const parsed = parseResponse(text)
          if (parsed) {
            setIterations(prev => ({ ...prev, [q.id]: [parsed] }))
          } else {
            // Show snippet of what we got for debugging
            const snippet = text ? text.slice(0, 200) : '(empty response)'
            setIterations(prev => ({
              ...prev,
              [q.id]: [{ error: true, message: `Could not parse response. Received: ${snippet}...` }],
            }))
          }
        } catch (e) {
          // Don't report error if aborted
          if (e.name !== 'AbortError') {
            setIterations(prev => ({
              ...prev,
              [q.id]: [{ error: true, message: e.message }],
            }))
          }
        } finally {
          delete abortControllersRef.current[q.id]
        }
      })
    )

    setLoading(false)
  }

  // ── Refinement loop ──────────────────────────────────────────────────────

  const refine = async (qId) => {
    const q        = QDEFS.find(d => d.id === qId)
    const lastData = iterations[qId]?.at(-1)
    if (!lastData || lastData.error) return

    // Cancel any existing refine for this quadrant
    if (abortControllersRef.current[qId]) {
      abortControllersRef.current[qId].abort()
    }

    const ac = new AbortController()
    abortControllersRef.current[qId] = ac

    setRefiningQ(prev => ({ ...prev, [qId]: true }))

    try {
      const system      = buildPrompt(q, n, m, p)
      const userContent = buildRefinementUserContent(
        lastData,
        nodeFeedback[qId] ?? {},
        nodeComments[qId] ?? {},
        problem.trim(),
        solution.trim(),
      )
      const text   = await callClaude({ system, userContent, maxTokens: 1400, signal: ac.signal, quadrantId: qId })
      const parsed = parseResponse(text)
      if (parsed) {
        setIterations(prev => ({ ...prev, [qId]: [...(prev[qId] || []), parsed] }))
        setNodeFeedback(prev => ({ ...prev, [qId]: {} }))
        setNodeComments(prev => ({ ...prev, [qId]: {} }))
      } else {
        setIterations(prev => ({
          ...prev,
          [qId]: [...(prev[qId] || []), { error: true, message: 'Could not parse refinement response.' }],
        }))
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setIterations(prev => ({
          ...prev,
          [qId]: [...(prev[qId] || []), { error: true, message: e.message }],
        }))
      }
    } finally {
      delete abortControllersRef.current[qId]
      setRefiningQ(prev => ({ ...prev, [qId]: false }))
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  const reset = () => {
    setIterations({})
    setNodeFeedback({})
    setNodeComments({})
    setRefiningQ({})
    setConvergedQ({})
    setError('')
  }

  const hasResults = Object.keys(iterations).length > 0
  const done       = hasResults && !loading

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 60px' }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
            Observer — 4-direction analysis
          </h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setMockMode(m => !m)}
              style={{
                fontSize: 11, padding: '4px 10px',
                border: '0.5px solid var(--color-border)',
                borderRadius: 4,
                background: mockMode ? '#22c55e20' : 'var(--color-surface)',
                cursor: 'pointer',
                opacity: 0.9,
                color: mockMode ? '#22c55e' : 'inherit',
              }}
              title={mockMode ? 'Mock mode ON' : 'Mock mode OFF'}
            >
              {mockMode ? '🧪' : '🌐'}
            </button>
            <button
              onClick={() => setShowApiKeyInput(v => !v)}
              style={{
                fontSize: 11, padding: '4px 10px',
                border: '0.5px solid var(--color-border)',
                borderRadius: 4,
                background: 'var(--color-surface)',
                cursor: 'pointer',
                opacity: 0.7,
              }}
              title="Set OpenRouter API key"
            >
              🔑
            </button>
            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              style={{
                fontSize: 11, padding: '4px 10px',
                border: '0.5px solid var(--color-border)',
                borderRadius: 4,
                background: 'var(--color-surface)',
                cursor: 'pointer',
                opacity: 0.7,
              }}
              title="Toggle light/dark mode"
            >
              {theme === 'light' ? '🌙' : theme === 'dark' ? '☀️' : '◐'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Independent observer across problem clarity, solution fit, blind spots, and alternatives.
        </p>
      </header>

      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label htmlFor="obs-problem" style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              display: 'block', marginBottom: 5,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>Problem</label>
            <textarea
              id="obs-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What problem are you trying to solve?"
              rows={4}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="obs-solution" style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              display: 'block', marginBottom: 5,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>Proposed solution</label>
            <textarea
              id="obs-solution"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="What approach are you considering?"
              rows={4}
              disabled={loading}
            />
          </div>
        </div>

        <DepthControls n={n} m={m} p={p} setN={setN} setM={setM} setP={setP} />

        {/* API Key Configuration */}
        {showApiKeyInput && (
          <div style={{
            marginTop: 12,
            padding: 10,
            background: 'var(--color-surface)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 6,
          }}>
            <label htmlFor="api-key" style={{
              fontSize: 10, color: 'var(--color-text-secondary)',
              display: 'block', marginBottom: 5,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>OpenRouter API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-or-v1-..."
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: 12,
                border: '0.5px solid var(--color-border-strong)',
                borderRadius: 4,
                background: 'var(--color-bg)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 6, marginBottom: 0 }}>
              Get a free key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-primary)', textDecoration: 'underline' }}>openrouter.ai/keys</a>
            </p>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>{error}</p>
        )}
        {tokenWarning && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 10 }}>{tokenWarning}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={analyze}
            disabled={loading}
            style={{ padding: '8px 22px', fontSize: 13 }}
          >
            {loading ? 'Analyzing…' : 'Analyze →'}
          </button>
          {hasResults && (
            <button onClick={reset} style={{ padding: '8px 16px', fontSize: 13 }}>
              Reset
            </button>
          )}
        </div>
      </section>

      {/* Convergence bar */}
      {done && (
        <ConvergenceBar
          iterations={iterations}
          nodeFeedback={nodeFeedback}
          convergedQ={convergedQ}
        />
      )}

      {/* Quadrant grid */}
      {(hasResults || loading) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
          alignItems: 'start',
        }}>
          {QDEFS.map((q) => (
            <QuadrantCard
              key={q.id}
              q={q}
              data={iterations[q.id]?.at(-1)}
              loading={loading && !iterations[q.id]}
              feedback={nodeFeedback[q.id] ?? {}}
              comments={nodeComments[q.id] ?? {}}
              onFeedback={(nodeKey, val, text) => {
                setNodeFeedback(prev => ({
                  ...prev,
                  [q.id]: { ...prev[q.id], [nodeKey]: val },
                }))
                if (text) {
                  setNodeComments(prev => ({
                    ...prev,
                    [q.id]: { ...prev[q.id], [nodeKey]: text },
                  }))
                }
              }}
              iterationCount={iterations[q.id]?.length ?? 0}
              refining={!!refiningQ[q.id]}
              onRefine={() => refine(q.id)}
              converged={!!convergedQ[q.id]}
              onConverge={() => setConvergedQ(prev => ({ ...prev, [q.id]: true }))}
              resetKey={resetKeys[q.id] ?? 0}
            />
          ))}
        </div>
      )}

      {done && !QDEFS.every(q => convergedQ[q.id]) && (
        <div style={{
          marginTop: 16, padding: '10px 14px',
          background: 'var(--color-surface)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12, color: 'var(--color-text-secondary)',
        }}>
          Expand nodes → hover to review → ✓ accept or ↺ correct → refine until converged.
        </div>
      )}
    </div>
  )
}
