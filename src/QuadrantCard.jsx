import React, { useState, useEffect } from 'react'

// ─── Layout constants ────────────────────────────────────────────────────────
const CW    = 420   // canvas width px
const NW    = 160   // vertical-axis node width
const LW    = 110   // lateral pill width
const NH    = 52    // node height estimate (for SVG line anchoring)
const VS    = 80    // vertical step between node centers
const HO    = 155   // horizontal offset from cx to lateral center
const LVG   = 62    // vertical gap between stacked laterals on same side
const PAD_T = 36    // top padding (leaves room above topmost node)
const PAD_B = 28    // bottom padding
const cx    = CW / 2  // 210

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the SVG line segment between two node centers,
 * trimmed inward by (radius + gap) from each endpoint.
 */
function trimLine(x1, y1, r1, x2, y2, r2, gap = 4) {
  const dx = x2 - x1, dy = y2 - y1
  const d  = Math.hypot(dx, dy)
  if (d < 1) return null
  const ux = dx / d, uy = dy / d
  return {
    x1: x1 + ux * (r1 + gap), y1: y1 + uy * (r1 + gap),
    x2: x2 - ux * (r2 + gap), y2: y2 - uy * (r2 + gap),
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Pulsing({ accent }) {
  return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: accent, opacity: 0.5,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function ExpandDot({ accent }) {
  return (
    <div style={{
      width: 5, height: 5, borderRadius: '50%',
      background: accent, opacity: 0.65,
      animation: 'pulse 1.8s ease-in-out infinite',
      flexShrink: 0,
    }} />
  )
}

// ─── SVG connector line builder ──────────────────────────────────────────────

function buildConnectorLines({ nTop, nBot, topShown, botShown, lateralsShown,
  coreY, rightSides, leftSides, latRightY, latLeftY, accent }) {
  const lines = []
  const lineStyle = (visible) => ({
    stroke: accent, strokeWidth: 1,
    strokeOpacity: visible ? 0.2 : 0,
    transition: 'stroke-opacity 0.3s ease',
  })

  for (let k = 1; k <= nTop; k++) {
    const y1     = coreY - k * VS
    const y2     = k === 1 ? coreY : coreY - (k - 1) * VS
    const coords = trimLine(cx, y1, NH / 2, cx, y2, NH / 2)
    if (coords) lines.push(<line key={`tl${k}`} {...coords} style={lineStyle(topShown >= k)} />)
  }

  for (let k = 1; k <= nBot; k++) {
    const y1     = k === 1 ? coreY : coreY + (k - 1) * VS
    const y2     = coreY + k * VS
    const coords = trimLine(cx, y1, NH / 2, cx, y2, NH / 2)
    if (coords) lines.push(<line key={`bl${k}`} {...coords} style={lineStyle(botShown >= k)} />)
  }

  rightSides.forEach((_, i) => {
    const coords = trimLine(cx, coreY, NW / 2, cx + HO, latRightY(i), LW / 2)
    if (coords) lines.push(<line key={`rl${i}`} {...coords} style={lineStyle(lateralsShown)} />)
  })

  leftSides.forEach((_, i) => {
    const coords = trimLine(cx, coreY, NW / 2, cx - HO, latLeftY(i), LW / 2)
    if (coords) lines.push(<line key={`ll${i}`} {...coords} style={lineStyle(lateralsShown)} />)
  })

  return lines
}

// ─── Axis node (top / bottom) ─────────────────────────────────────────────────

function AxisNode({ text, badge, x, y, visible, opacity, canExpand, onExpand, accent, dotPosition }) {
  const baseStyle = {
    position: 'absolute',
    width: NW, minHeight: NH,
    padding: '8px 10px',
    border: `0.5px solid ${accent}38`,
    borderRadius: 8,
    background: `${accent}07`,
    fontSize: 11, lineHeight: 1.55,
    color: 'var(--color-text-primary)',
    textAlign: 'center',
    cursor: canExpand ? 'pointer' : 'default',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 4, zIndex: 1,
    transition: 'opacity 0.28s ease, transform 0.28s ease',
    opacity:       visible ? opacity : 0,
    transform:     visible ? 'scale(1)' : 'scale(0.88)',
    pointerEvents: visible ? 'auto' : 'none',
    left: x - NW / 2,
    top:  y - NH / 2,
  }
  const badgeEl = (
    <span style={{ fontSize: 9, color: accent, fontWeight: 500, letterSpacing: '0.04em', opacity: 0.6 }}>
      {badge}
    </span>
  )
  const dotEl = canExpand && (
    <div style={{
      position: 'absolute',
      [dotPosition]: -14,
      left: '50%', transform: 'translateX(-50%)',
    }}>
      <ExpandDot accent={accent} />
    </div>
  )

  return (
    <button type="button" onClick={canExpand ? onExpand : undefined} disabled={!canExpand} style={baseStyle}>
      {dotPosition === 'top' && dotEl}
      {dotPosition === 'top' && badgeEl}
      {text}
      {dotPosition === 'bottom' && badgeEl}
      {dotPosition === 'bottom' && dotEl}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuadrantCard({ q, data, loading }) {
  const { accent } = q

  // Expansion state — reset whenever fresh data arrives
  const [topShown,      setTopShown]      = useState(0)
  const [botShown,      setBotShown]      = useState(0)
  const [lateralsShown, setLateralsShown] = useState(false)

  useEffect(() => {
    setTopShown(0)
    setBotShown(0)
    setLateralsShown(false)
  }, [data])

  // ── Derive arrays ────────────────────────────────────────────────────────
  // topArr[0] = ↑nTop (most abstract), topArr[nTop-1] = ↑1 (closest to core)
  const topArr    = data?.top     ? [...data.top].reverse() : []
  const botArr    = data?.bottom  || []
  const sideArr   = data?.sides   || []
  const rightSides = sideArr.filter((_, i) => i % 2 === 0)   // ↔1, ↔3 …
  const leftSides  = sideArr.filter((_, i) => i % 2 === 1)   // ↔2, ↔4 …

  const nTop   = topArr.length
  const nBot   = botArr.length
  const nRight = rightSides.length
  const nLeft  = leftSides.length

  // ── Geometry ─────────────────────────────────────────────────────────────
  const coreY     = PAD_T + nTop * VS
  const latRightY = (i) => coreY + (i - (nRight - 1) / 2) * LVG
  const latLeftY  = (i) => coreY + (i - (nLeft  - 1) / 2) * LVG

  const latMaxBottom = Math.max(
    nRight > 0 ? latRightY(nRight - 1) + NH / 2 : 0,
    nLeft  > 0 ? latLeftY(nLeft  - 1) + NH / 2  : 0,
  )
  const canvasH = Math.max(
    coreY + nBot * VS + NH / 2 + PAD_B,
    latMaxBottom + PAD_B,
  )

  // ── Opacity functions ─────────────────────────────────────────────────────
  // ↑k: k=1 closest (0.85 = bright), k=nTop most abstract (0.38 = faded)
  const topOpacity = (k) => 0.38 + 0.47 * ((nTop - k) / Math.max(nTop - 1, 1))
  // ↓k: k=1 closest (0.85), k=nBot deepest (0.50)
  const botOpacity = (k) => 0.85 - 0.35 * ((k - 1) / Math.max(nBot - 1, 1))

  // ── Interaction ───────────────────────────────────────────────────────────
  const coreNotExpanded = topShown === 0 && botShown === 0 && !lateralsShown

  const handleCoreClick = () => {
    if (!coreNotExpanded) return
    if (nTop  > 0)              setTopShown(1)
    if (nBot  > 0)              setBotShown(1)
    if (sideArr.length > 0)     setLateralsShown(true)
  }

  // ── Build SVG connector lines ─────────────────────────────────────────────
  const lines = buildConnectorLines({
    nTop, nBot, topShown, botShown, lateralsShown,
    coreY, rightSides, leftSides, latRightY, latLeftY, accent,
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
    }}>
      {/* ── Card header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 14, paddingBottom: 10,
        borderBottom: '0.5px solid var(--color-border)',
      }}>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{q.label}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, padding: '2px 8px',
          borderRadius: 20, background: `${accent}15`, color: accent,
          letterSpacing: '0.03em',
        }}>{q.tag}</span>
      </div>

      {/* ── Loading ── */}
      {loading && !data && <Pulsing accent={accent} />}

      {/* ── Error ── */}
      {data?.error && (
        <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>
          {data.message || 'Analysis failed — check your API key or retry.'}
        </p>
      )}

      {/* ── Graph canvas ── */}
      {data && !data.error && (
        <div style={{
          position: 'relative',
          width: CW,
          maxWidth: '100%',
          height: canvasH,
          margin: '0 auto',
        }}>

          {/* SVG connector lines (below all nodes) */}
          <svg style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            overflow: 'visible', pointerEvents: 'none',
          }}>
            {lines}
          </svg>

          {/* ── CORE node ── */}
          <button
            type="button"
            onClick={handleCoreClick}
            disabled={!coreNotExpanded}
            style={{
              position: 'absolute',
              left: cx - NW / 2,
              top: coreY - NH / 2,
              width: NW,
              minHeight: NH,
              padding: '10px 12px',
              border: `1.5px solid ${accent}70`,
              borderRadius: 10,
              background: `${accent}12`,
              boxShadow: `0 0 0 ${coreNotExpanded ? 5 : 3}px ${accent}${coreNotExpanded ? '16' : '08'}`,
              fontSize: 12,
              lineHeight: 1.55,
              color: 'var(--color-text-primary)',
              fontWeight: 600,
              textAlign: 'center',
              cursor: coreNotExpanded ? 'pointer' : 'default',
              opacity: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 6,
              transition: 'box-shadow 0.3s ease',
              zIndex: 2,
            }}
          >
            {data.core}
            {coreNotExpanded && <ExpandDot accent={accent} />}
          </button>

          {/* ── TOP nodes (↑k) ── */}
          {topArr.map((text, idx) => {
            const k         = nTop - idx
            const canExpand = k === topShown && topShown < nTop
            return (
              <AxisNode key={`t${k}`}
                text={text} badge={`↑${k}`}
                x={cx} y={coreY - k * VS}
                visible={topShown >= k} opacity={topOpacity(k)}
                canExpand={canExpand}
                onExpand={() => setTopShown(s => s + 1)}
                accent={accent} dotPosition="top"
              />
            )
          })}

          {/* ── BOTTOM nodes (↓k) ── */}
          {botArr.map((text, k0) => {
            const k         = k0 + 1
            const canExpand = k === botShown && botShown < nBot
            return (
              <AxisNode key={`b${k}`}
                text={text} badge={`↓${k}`}
                x={cx} y={coreY + k * VS}
                visible={botShown >= k} opacity={botOpacity(k)}
                canExpand={canExpand}
                onExpand={() => setBotShown(s => s + 1)}
                accent={accent} dotPosition="bottom"
              />
            )
          })}

          {/* ── RIGHT laterals (↔1, ↔3, …) ── */}
          {rightSides.map((text, i) => {
            const sideNum = i * 2 + 1
            const y       = latRightY(i)
            return (
              <div key={`rs${i}`} style={{
                position: 'absolute',
                left: cx + HO - LW / 2,
                top:  y - NH / 2,
                width: LW, minHeight: NH,
                padding: '6px 10px',
                border: `0.5px solid ${accent}30`,
                borderRadius: 20,
                background: 'var(--color-bg)',
                fontSize: 10, lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3,
                zIndex: 1,
                transition: 'opacity 0.28s ease, transform 0.28s ease',
                opacity:       lateralsShown ? 0.72 : 0,
                transform:     lateralsShown ? 'scale(1)' : 'scale(0.88)',
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: 9, color: accent, fontWeight: 500, opacity: 0.55 }}>↔{sideNum}</span>
                {text}
              </div>
            )
          })}

          {/* ── LEFT laterals (↔2, ↔4, …) ── */}
          {leftSides.map((text, i) => {
            const sideNum = i * 2 + 2
            const y       = latLeftY(i)
            return (
              <div key={`ls${i}`} style={{
                position: 'absolute',
                left: cx - HO - LW / 2,
                top:  y - NH / 2,
                width: LW, minHeight: NH,
                padding: '6px 10px',
                border: `0.5px solid ${accent}30`,
                borderRadius: 20,
                background: 'var(--color-bg)',
                fontSize: 10, lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3,
                zIndex: 1,
                transition: 'opacity 0.28s ease, transform 0.28s ease',
                opacity:       lateralsShown ? 0.72 : 0,
                transform:     lateralsShown ? 'scale(1)' : 'scale(0.88)',
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: 9, color: accent, fontWeight: 500, opacity: 0.55 }}>↔{sideNum}</span>
                {text}
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}
