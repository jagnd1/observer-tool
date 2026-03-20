import React from 'react'

function DepthPicker({ symbol, label, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontWeight: 500, fontSize: 13, color,
        width: 16, textAlign: 'center', flexShrink: 0,
      }}>{symbol}</span>
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', minWidth: 160 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3].map(v => (
          <button key={v} onClick={() => onChange(v)} style={{
            width: 28, height: 28, padding: 0, fontSize: 12,
            fontWeight: value === v ? 500 : 400,
            background: value === v ? `${color}18` : 'transparent',
            color: value === v ? color : 'var(--color-text-tertiary)',
            border: value === v
              ? `0.5px solid ${color}70`
              : '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function DepthDiagram({ n, m, p }) {
  const rows = []
  for (let i = n; i >= 1; i--)
    rows.push({ type: 'top', label: `↑${i}`, opacity: 0.35 + 0.4 * ((n - i) / Math.max(n - 1, 1)) })
  rows.push({ type: 'core', label: 'core' })
  for (let i = 1; i <= m; i++)
    rows.push({ type: 'bot', label: `↓${i}`, opacity: 0.75 - 0.3 * ((i - 1) / Math.max(m - 1, 1)) })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '8px 14px', minWidth: 70,
      background: 'var(--color-surface)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {i > 0 && (
            <div style={{ width: 1, height: 6, background: 'var(--color-border-strong)', margin: '1px 0' }} />
          )}
          <div style={{
            fontSize: 10, opacity: r.type === 'core' ? 1 : r.opacity,
            padding: r.type === 'core' ? '2px 7px' : '1px 5px',
            border: r.type === 'core'
              ? '0.5px solid var(--color-border-strong)'
              : '0.5px solid var(--color-border)',
            borderRadius: 4,
            color: 'var(--color-text-primary)',
            fontWeight: r.type === 'core' ? 500 : 400,
          }}>{r.label}</div>
        </div>
      ))}
      <div style={{
        display: 'flex', gap: 3, marginTop: 6,
        borderTop: '0.5px solid var(--color-border)',
        paddingTop: 5, width: '100%', justifyContent: 'center',
      }}>
        {Array.from({ length: p }, (_, i) => (
          <div key={i} style={{
            fontSize: 9, padding: '1px 4px',
            border: '0.5px solid var(--color-border)',
            borderRadius: 10,
            color: 'var(--color-text-tertiary)',
          }}>↔{i + 1}</div>
        ))}
      </div>
    </div>
  )
}

export default function DepthControls({ n, m, p, setN, setM, setP }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
      padding: '10px 14px',
      background: 'var(--color-bg)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    }}>
      <DepthDiagram n={n} m={m} p={p} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <DepthPicker symbol="n" label="top levels — abstract / why" value={n} onChange={setN} color="#1D6FB8" />
        <DepthPicker symbol="m" label="bottom levels — detail / how" value={m} onChange={setM} color="#0A7A5A" />
        <DepthPicker symbol="p" label="side levels — lateral / adjacent" value={p} onChange={setP} color="#B45309" />
      </div>
    </div>
  )
}
