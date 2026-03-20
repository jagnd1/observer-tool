import React from 'react'

function Connector({ accent }) {
  return (
    <div style={{
      width: 1, height: 12,
      background: accent, opacity: 0.2,
      marginLeft: 7, flexShrink: 0,
    }} />
  )
}

function LevelNode({ text, opacity, accent, badge }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: accent, flexShrink: 0, marginTop: 7,
      }} />
      <div style={{ flex: 1, fontSize: 12, lineHeight: '1.65', color: 'var(--color-text-primary)' }}>
        {text}
      </div>
      <span style={{
        fontSize: 10, color: accent, flexShrink: 0,
        marginTop: 4, opacity: 0.55, fontWeight: 500,
      }}>{badge}</span>
    </div>
  )
}

function CoreNode({ text, accent, sides }) {
  return (
    <div>
      <div style={{
        padding: '10px 12px',
        border: `1px solid ${accent}55`,
        borderRadius: 'var(--radius-md)',
        background: `${accent}0D`,
        fontSize: 13, lineHeight: '1.65',
        color: 'var(--color-text-primary)', fontWeight: 500,
      }}>
        {text}
      </div>
      {sides?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
          {sides.map((s, i) => (
            <span key={i} style={{
              fontSize: 11, padding: '2px 9px',
              borderRadius: 20,
              border: '0.5px solid var(--color-border-strong)',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-bg)',
            }}>↔ {s}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Pulsing({ accent }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '20px 0 16px', justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: accent, opacity: 0.5,
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

export default function QuadrantCard({ q, data, loading }) {
  const topArr = data?.top ? [...data.top].reverse() : []
  const botArr = data?.bottom || []
  const sideArr = data?.sides || []
  const nTop = topArr.length
  const nBot = botArr.length

  const topOpacity = (i) => 0.35 + 0.4 * (i / Math.max(nTop - 1, 1))
  const botOpacity = (i) => 0.75 - 0.3 * (i / Math.max(nBot - 1, 1))

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12, paddingBottom: 10,
        borderBottom: '0.5px solid var(--color-border)',
      }}>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{q.label}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, padding: '2px 8px',
          borderRadius: 20, background: `${q.accent}15`, color: q.accent,
          letterSpacing: '0.03em',
        }}>{q.tag}</span>
      </div>

      {loading && !data && <Pulsing accent={q.accent} />}

      {data?.error && (
        <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>
          {data.message || 'Analysis failed — check your API key or retry.'}
        </p>
      )}

      {data && !data.error && (
        <div>
          {topArr.map((text, i) => (
            <div key={`t${i}`}>
              <LevelNode text={text} opacity={topOpacity(i)} accent={q.accent} badge={`↑${nTop - i}`} />
              <Connector accent={q.accent} />
            </div>
          ))}

          <CoreNode text={data.core} accent={q.accent} sides={sideArr} />

          {botArr.map((text, i) => (
            <div key={`b${i}`}>
              <Connector accent={q.accent} />
              <LevelNode text={text} opacity={botOpacity(i)} accent={q.accent} badge={`↓${i + 1}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
