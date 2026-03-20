import React, { useState } from 'react'
import QuadrantCard from './QuadrantCard.jsx'
import DepthControls from './DepthControls.jsx'
import { QDEFS, buildPrompt, buildRefinementUserContent, parseResponse } from './quadrants.js'
import { callClaude } from './api.js'

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

  // ── Fresh analysis ───────────────────────────────────────────────────────

  const analyze = async () => {
    if (!problem.trim() || !solution.trim()) {
      setError('Both fields are required.')
      return
    }
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

    const ctx = `PROBLEM:\n${problem.trim()}\n\nPROPOSED SOLUTION:\n${solution.trim()}`

    await Promise.all(
      QDEFS.map(async (q) => {
        try {
          const text   = await callClaude({ system: buildPrompt(q, n, m, p), userContent: ctx })
          const parsed = parseResponse(text)
          setIterations(prev => ({
            ...prev,
            [q.id]: [parsed || { error: true, message: 'Could not parse response.' }],
          }))
        } catch (e) {
          setIterations(prev => ({
            ...prev,
            [q.id]: [{ error: true, message: e.message }],
          }))
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
      const text   = await callClaude({ system, userContent, maxTokens: 1400 })
      const parsed = parseResponse(text)
      if (parsed) {
        setIterations(prev => ({ ...prev, [qId]: [...(prev[qId] || []), parsed] }))
        setNodeFeedback(prev => ({ ...prev, [qId]: {} }))
        setNodeComments(prev => ({ ...prev, [qId]: {} }))
      }
    } catch (e) {
      console.error('Refinement failed:', e)
    }

    setRefiningQ(prev => ({ ...prev, [qId]: false }))
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
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
          Observer — 4-direction analysis
        </h1>
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

        {error && (
          <p style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>{error}</p>
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
