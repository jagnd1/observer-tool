import React, { useState } from 'react'
import QuadrantCard from './QuadrantCard.jsx'
import DepthControls from './DepthControls.jsx'
import { QDEFS, buildPrompt, parseResponse } from './quadrants.js'
import { callClaude } from './api.js'

export default function App() {
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [n, setN] = useState(2)
  const [m, setM] = useState(2)
  const [p, setP] = useState(2)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    if (!problem.trim() || !solution.trim()) {
      setError('Both fields are required.')
      return
    }
    setError('')
    setDone(false)
    setResults({})
    setLoading(true)

    const ctx = `PROBLEM:\n${problem.trim()}\n\nPROPOSED SOLUTION:\n${solution.trim()}`

    await Promise.all(
      QDEFS.map(async (q) => {
        try {
          const text = await callClaude({ system: buildPrompt(q, n, m, p), userContent: ctx })
          const parsed = parseResponse(text)
          setResults((prev) => ({ ...prev, [q.id]: parsed || { error: true, message: 'Could not parse response.' } }))
        } catch (e) {
          setResults((prev) => ({ ...prev, [q.id]: { error: true, message: e.message } }))
        }
      })
    )

    setLoading(false)
    setDone(true)
  }

  const reset = () => {
    setResults({})
    setDone(false)
    setError('')
  }

  const hasResults = Object.keys(results).length > 0

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
            <label style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              display: 'block', marginBottom: 5,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>Problem</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What problem are you trying to solve?"
              rows={4}
              disabled={loading}
            />
          </div>
          <div>
            <label style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              display: 'block', marginBottom: 5,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>Proposed solution</label>
            <textarea
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

      {(hasResults || loading) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
          alignItems: 'start',
        }}>
          {QDEFS.map((q) => (
            <QuadrantCard key={q.id} q={q} data={results[q.id]} loading={loading} />
          ))}
        </div>
      )}

      {done && (
        <div style={{
          marginTop: 16, padding: '10px 14px',
          background: 'var(--color-surface)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12, color: 'var(--color-text-secondary)',
        }}>
          Analysis complete — n={n} abstract · m={m} detail · p={p} lateral views per quadrant.
          Each lens ran independently with no awareness of the others.
        </div>
      )}
    </div>
  )
}
