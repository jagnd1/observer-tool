import React, { useState, useEffect } from 'react'

// ─── Layout constants ────────────────────────────────────────────────────────
const CW    = 420   // canvas width px
const NW    = 160   // vertical-axis node width
const LW    = 110   // lateral pill width
const NH    = 52    // node height estimate (for SVG line anchoring)
const VS    = 80    // vertical step between node centers
const HO    = 155   // horizontal offset from cx to lateral center
const LVG   = 62    // vertical gap between stacked laterals on same side
const PAD_T = 36    // top padding
const PAD_B = 28    // bottom padding
const cx    = CW / 2  // 210

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const tinyBtn = (color) => ({
  fontSize: 8, padding: '1px 5px', borderRadius: 3,
  border: `0.5px solid ${color}50`, background: 'transparent',
  color, cursor: 'pointer', lineHeight: 1.5, flexShrink: 0,
})

// ─── Sub-components ──────────────────────────────────────────────────────────

function Pulsing({ accent }) {
  return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map((val) => (
          <div key={`d${val}`} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: accent, opacity: 0.5,
            animation: `pulse 1.2s ease-in-out ${val * 0.2}s infinite`,
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

// ─── Feedback row (shared by all node types) ─────────────────────────────────

function FeedbackRow({ fbStatus, fbComment, accent, onAccept, onStartCorrect }) {
  if (fbStatus === 'accept') {
    return <span style={{ fontSize: 8, color: '#22c55e', opacity: 0.7, marginTop: 2 }}>✓</span>
  }
  if (fbStatus === 'correct') {
    return (
      <span style={{
        fontSize: 8, color: accent, opacity: 0.55, marginTop: 2,
        display: 'block', wordBreak: 'break-word', maxWidth: '100%',
      }}>
        ↺ {fbComment || '…'}
      </span>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 3, opacity: 0.38 }}>
      <button onClick={onAccept} style={tinyBtn('#22c55e')}>✓</button>
      <button onClick={onStartCorrect} style={tinyBtn(accent)}>↺</button>
    </div>
  )
}

// ─── Axis node (top / bottom) ─────────────────────────────────────────────────

function AxisNode({
  text, badge, x, y, visible, opacity, canExpand, onExpand,
  accent, dotPosition, nodeKey, fbStatus, fbComment, onFeedback,
}) {
  const [correcting, setCorrecting] = useState(false)
  const [corrText,   setCorrText]   = useState('')

  // Reset correcting state if feedback is already set (e.g. after refine resets)
  useEffect(() => {
    if (!fbStatus) { setCorrecting(false); setCorrText('') }
  }, [fbStatus])

  const submitCorr = (e) => {
    e.stopPropagation()
    const t = corrText.trim()
    if (t) { onFeedback(nodeKey, 'correct', t); setCorrecting(false); setCorrText('') }
  }

  const baseStyle = {
    position: 'absolute',
    width: NW,
    padding: '8px 10px',
    border: `0.5px solid ${fbStatus === 'accept' ? '#22c55e' : accent}${fbStatus === 'accept' ? '40' : '38'}`,
    borderRadius: 8,
    background: fbStatus === 'accept' ? '#22c55e08' : `${accent}07`,
    fontSize: 11, lineHeight: 1.55,
    color: 'var(--color-text-primary)',
    textAlign: 'center',
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
    <div style={baseStyle}>
      {dotPosition === 'top' && dotEl}
      {dotPosition === 'top' && badgeEl}

      {/* text — click to expand */}
      {canExpand ? (
        <button
          onClick={onExpand}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            width: '100%', padding: 0,
            color: 'inherit', font: 'inherit', textAlign: 'center',
          }}
        >
          {text}
        </button>
      ) : (
        <span style={{ display: 'block', width: '100%' }}>{text}</span>
      )}

      {dotPosition === 'bottom' && badgeEl}
      {dotPosition === 'bottom' && dotEl}

      {/* feedback affordances */}
      {visible && !correcting && (
        <FeedbackRow
          fbStatus={fbStatus}
          fbComment={fbComment}
          accent={accent}
          onAccept={(e) => { e.stopPropagation(); onFeedback(nodeKey, 'accept') }}
          onStartCorrect={(e) => { e.stopPropagation(); setCorrecting(true) }}
        />
      )}
      {visible && correcting && (
        <input
          autoFocus
          value={corrText}
          onChange={(e) => setCorrText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  submitCorr(e)
            if (e.key === 'Escape') { e.stopPropagation(); setCorrecting(false); setCorrText('') }
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="correct this…"
          style={{
            fontSize: 9, width: '100%', marginTop: 3,
            padding: '2px 5px', borderRadius: 3,
            border: `0.5px solid ${accent}50`,
            background: `${accent}0a`,
            color: 'var(--color-text-primary)', outline: 'none',
          }}
        />
      )}
    </div>
  )
}

// ─── Lateral node ─────────────────────────────────────────────────────────────

function LateralNode({ text, sideNum, x, y, shown, accent, nodeKey, fbStatus, fbComment, onFeedback }) {
  const [correcting, setCorrecting] = useState(false)
  const [corrText,   setCorrText]   = useState('')

  useEffect(() => {
    if (!fbStatus) { setCorrecting(false); setCorrText('') }
  }, [fbStatus])

  const submitCorr = () => {
    const t = corrText.trim()
    if (t) { onFeedback(nodeKey, 'correct', t); setCorrecting(false); setCorrText('') }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x - LW / 2,
        top:  y - NH / 2,
        width: LW, minHeight: NH,
        padding: '6px 10px',
        border: `0.5px solid ${fbStatus === 'accept' ? '#22c55e' : accent}${fbStatus === 'accept' ? '40' : '30'}`,
        borderRadius: 20,
        background: fbStatus === 'accept' ? '#22c55e05' : 'var(--color-bg)',
        fontSize: 10, lineHeight: 1.5,
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 3, zIndex: 1,
        transition: 'opacity 0.28s ease, transform 0.28s ease',
        opacity:       shown ? 0.72 : 0,
        transform:     shown ? 'scale(1)' : 'scale(0.88)',
        pointerEvents: shown ? 'auto' : 'none',
      }}
    >
      <span style={{ fontSize: 9, color: accent, fontWeight: 500, opacity: 0.55 }}>↔{sideNum}</span>
      {text}
      {!correcting && (
        <FeedbackRow
          fbStatus={fbStatus}
          fbComment={fbComment}
          accent={accent}
          onAccept={() => onFeedback(nodeKey, 'accept')}
          onStartCorrect={() => setCorrecting(true)}
        />
      )}
      {correcting && (
        <input
          autoFocus
          value={corrText}
          onChange={(e) => setCorrText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  submitCorr()
            if (e.key === 'Escape') { setCorrecting(false); setCorrText('') }
          }}
          placeholder="correct…"
          style={{
            fontSize: 8, width: '100%', marginTop: 2,
            padding: '2px 4px', borderRadius: 3,
            border: `0.5px solid ${accent}40`,
            background: 'transparent',
            color: 'var(--color-text-primary)', outline: 'none',
          }}
        />
      )}
    </div>
  )
}

// ─── Card footer ─────────────────────────────────────────────────────────────

function CardFooter({
  converged, allAccepted, allFeedbackGiven, correctedCount,
  feedbackGiven, visibleTotal, iterationCount, acceptedCount,
  onConverge, onRefine, accent,
}) {
  const hasAnyFeedback = acceptedCount > 0 || correctedCount > 0
  let primary
  if (converged) {
    primary = <span style={{ fontSize: 10, color: '#22c55e' }}>✓ Converged</span>
  } else if (allAccepted) {
    primary = (
      <button onClick={onConverge} style={{
        fontSize: 10, padding: '3px 10px',
        border: '0.5px solid #22c55e50', borderRadius: 4,
        background: '#22c55e0a', color: '#22c55e', cursor: 'pointer',
      }}>
        Mark converged ✓
      </button>
    )
  } else if (hasAnyFeedback) {
    primary = (
      <button onClick={onRefine} style={{
        fontSize: 10, padding: '3px 10px',
        border: `0.5px solid ${accent}50`, borderRadius: 4,
        background: `${accent}0a`, color: accent, cursor: 'pointer',
      }}>
        ↺ Refine · Round {iterationCount + 1}
      </button>
    )
  } else {
    primary = (
      <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', opacity: 0.5 }}>
        {feedbackGiven}/{visibleTotal} reviewed
      </span>
    )
  }

  return (
    <div style={{
      marginTop: 14, paddingTop: 10,
      borderTop: '0.5px solid var(--color-border)',
      display: 'flex', alignItems: 'center', gap: 8,
      minHeight: 28,
    }}>
      {primary}
      {(acceptedCount > 0 || correctedCount > 0) && (
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--color-text-secondary)', opacity: 0.45 }}>
          {acceptedCount > 0 && `${acceptedCount}✓`}
          {acceptedCount > 0 && correctedCount > 0 && ' · '}
          {correctedCount > 0 && `${correctedCount}↺`}
        </span>
      )}
    </div>
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

  rightSides.forEach((text, i) => {
    const coords = trimLine(cx, coreY, NW / 2, cx + HO, latRightY(i), LW / 2)
    if (coords) lines.push(<line key={`r-${i * 2 + 1}-${text.slice(0, 8)}`} {...coords} style={lineStyle(lateralsShown)} />)
  })

  leftSides.forEach((text, i) => {
    const coords = trimLine(cx, coreY, NW / 2, cx - HO, latLeftY(i), LW / 2)
    if (coords) lines.push(<line key={`l-${i * 2 + 2}-${text.slice(0, 8)}`} {...coords} style={lineStyle(lateralsShown)} />)
  })

  return lines
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuadrantCard({
  q, data, loading,
  feedback, comments, onFeedback,
  iterationCount, refining, onRefine,
  converged, onConverge,
  resetKey,
}) {
  const { accent } = q

  const [topShown,      setTopShown]      = useState(0)
  const [botShown,      setBotShown]      = useState(0)
  const [lateralsShown, setLateralsShown] = useState(false)
  const [coreCorrecting, setCoreCorrecting] = useState(false)
  const [coreText,       setCoreText]       = useState('')

  // Reset expansion only on fresh analyze (resetKey change), NOT on refinement
  useEffect(() => {
    setTopShown(0)
    setBotShown(0)
    setLateralsShown(false)
  }, [resetKey])

  // Auto-expand all on refinement (round 2+) so user sees new content immediately
  useEffect(() => {
    if (iterationCount > 1 && data && !data.error) {
      setTopShown(topArr.length)
      setBotShown((data.bottom || []).length)
      setLateralsShown((data.sides || []).length > 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iterationCount])

  // ── Derive arrays ─────────────────────────────────────────────────────────
  const topArr     = data?.top     ? [...data.top].reverse() : []
  const botArr     = data?.bottom  || []
  const sideArr    = data?.sides   || []
  const rightSides = sideArr.filter((_, i) => i % 2 === 0)
  const leftSides  = sideArr.filter((_, i) => i % 2 === 1)

  const nTop   = topArr.length
  const nBot   = botArr.length
  const nRight = rightSides.length
  const nLeft  = leftSides.length

  // ── Geometry ──────────────────────────────────────────────────────────────
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

  // ── Opacity helpers ───────────────────────────────────────────────────────
  const topOpacity = (k) => 0.38 + 0.47 * ((nTop - k) / Math.max(nTop - 1, 1))
  const botOpacity = (k) => 0.85 - 0.35 * ((k - 1) / Math.max(nBot - 1, 1))

  // ── Core interaction ──────────────────────────────────────────────────────
  const coreNotExpanded = topShown === 0 && botShown === 0 && !lateralsShown

  const handleCoreClick = () => {
    if (!coreNotExpanded) return
    if (nTop  > 0)          setTopShown(1)
    if (nBot  > 0)          setBotShown(1)
    if (sideArr.length > 0) setLateralsShown(true)
  }

  // ── Visible keys (for footer logic) ──────────────────────────────────────
  const visibleKeys = data && !data.error ? [
    ...(coreNotExpanded ? [] : ['core']),
    ...Array.from({ length: topShown },      (_, i) => `top_${i + 1}`),
    ...Array.from({ length: botShown },      (_, i) => `bot_${i + 1}`),
    ...(lateralsShown ? sideArr.map((_, i) => `side_${i + 1}`) : []),
  ] : []

  const feedbackGiven  = visibleKeys.filter(k => feedback[k]).length
  const acceptedCount  = visibleKeys.filter(k => feedback[k] === 'accept').length
  const correctedCount = visibleKeys.filter(k => feedback[k] === 'correct').length
  const allFeedbackGiven = visibleKeys.length > 0 && feedbackGiven === visibleKeys.length
  const allAccepted      = visibleKeys.length > 0 && acceptedCount === visibleKeys.length

  // ── SVG connector lines ───────────────────────────────────────────────────
  const lines = buildConnectorLines({
    nTop, nBot, topShown, botShown, lateralsShown,
    coreY, rightSides, leftSides, latRightY, latLeftY, accent,
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: `0.5px solid ${converged ? '#22c55e40' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      transition: 'border-color 0.4s ease',
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
        {iterationCount > 1 && (
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 20,
            background: 'var(--color-bg)', color: 'var(--color-text-secondary)',
            border: '0.5px solid var(--color-border)',
            letterSpacing: '0.03em',
          }}>R{iterationCount}</span>
        )}
        {converged && (
          <span style={{ fontSize: 9, color: '#22c55e', opacity: 0.8 }}>✓</span>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && !data && <Pulsing accent={accent} />}
      {refining && <Pulsing accent={accent} />}

      {/* ── Error ── */}
      {data?.error && !refining && (
        <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>
          {data.message || 'Analysis failed — check your API key or retry.'}
        </p>
      )}

      {/* ── Graph canvas ── */}
      {data && !data.error && !refining && (
        <div style={{
          position: 'relative',
          width: CW,
          maxWidth: '100%',
          height: canvasH,
          margin: '0 auto',
          overflow: 'auto',
          maxHeight: nTop >= 3 || nBot >= 3 ? 520 : 'none',
        }}>

          {/* SVG connector lines */}
          <svg style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            overflow: 'visible', pointerEvents: 'none',
          }}>
            {lines}
          </svg>

          {/* ── CORE node ── */}
          {(() => {
            const coreStyle = {
              position: 'absolute',
              left: cx - NW / 2, top: coreY - NH / 2,
              width: NW, minHeight: NH,
              padding: '10px 12px',
              border: `1.5px solid ${accent}70`,
              borderRadius: 10,
              background: `${accent}12`,
              boxShadow: `0 0 0 ${coreNotExpanded ? 5 : 3}px ${accent}${coreNotExpanded ? '16' : '08'}`,
              fontSize: 12, lineHeight: 1.55,
              color: 'var(--color-text-primary)',
              fontWeight: 600, textAlign: 'center',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 6, transition: 'box-shadow 0.3s ease',
              zIndex: 2,
            }
            if (coreNotExpanded) {
              return (
                <button onClick={handleCoreClick} style={{ ...coreStyle, cursor: 'pointer' }}>
                  {data.core}
                  <ExpandDot accent={accent} />
                </button>
              )
            }
            return (
              <div style={{ ...coreStyle, cursor: 'default' }}>
                {data.core}
                {!coreCorrecting && (
                  <FeedbackRow
                    fbStatus={feedback['core']}
                    fbComment={comments['core']}
                    accent={accent}
                    onAccept={() => onFeedback('core', 'accept')}
                    onStartCorrect={() => setCoreCorrecting(true)}
                  />
                )}
                {coreCorrecting && (
                  <input
                    autoFocus
                    value={coreText}
                    onChange={(e) => setCoreText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const t = coreText.trim()
                        if (t) { onFeedback('core', 'correct', t); setCoreCorrecting(false); setCoreText('') }
                      }
                      if (e.key === 'Escape') { setCoreCorrecting(false); setCoreText('') }
                    }}
                    placeholder="correct this…"
                    style={{
                      fontSize: 9, width: '100%', marginTop: 3,
                      padding: '2px 5px', borderRadius: 3,
                      border: `0.5px solid ${accent}50`,
                      background: `${accent}0a`,
                      color: 'var(--color-text-primary)', outline: 'none',
                    }}
                  />
                )}
              </div>
            )
          })()}

          {/* ── TOP nodes ── */}
          {topArr.map((text, idx) => {
            const k         = nTop - idx
            const nodeKey   = `top_${k}`
            const canExpand = k === topShown && topShown < nTop
            return (
              <AxisNode key={nodeKey}
                text={text} badge={`↑${k}`}
                x={cx} y={coreY - k * VS}
                visible={topShown >= k} opacity={topOpacity(k)}
                canExpand={canExpand}
                onExpand={() => setTopShown(s => s + 1)}
                accent={accent} dotPosition="top"
                nodeKey={nodeKey}
                fbStatus={feedback[nodeKey]}
                fbComment={comments[nodeKey]}
                onFeedback={onFeedback}
              />
            )
          })}

          {/* ── BOTTOM nodes ── */}
          {botArr.map((text, k0) => {
            const k         = k0 + 1
            const nodeKey   = `bot_${k}`
            const canExpand = k === botShown && botShown < nBot
            return (
              <AxisNode key={nodeKey}
                text={text} badge={`↓${k}`}
                x={cx} y={coreY + k * VS}
                visible={botShown >= k} opacity={botOpacity(k)}
                canExpand={canExpand}
                onExpand={() => setBotShown(s => s + 1)}
                accent={accent} dotPosition="bottom"
                nodeKey={nodeKey}
                fbStatus={feedback[nodeKey]}
                fbComment={comments[nodeKey]}
                onFeedback={onFeedback}
              />
            )
          })}

          {/* ── RIGHT laterals ── */}
          {rightSides.map((text, ri) => {
            const sideNum = ri * 2 + 1
            const nodeKey = `side_${sideNum}`
            return (
              <LateralNode key={nodeKey}
                text={text} sideNum={sideNum}
                x={cx + HO} y={latRightY(ri)}
                shown={lateralsShown}
                accent={accent}
                nodeKey={nodeKey}
                fbStatus={feedback[nodeKey]}
                fbComment={comments[nodeKey]}
                onFeedback={onFeedback}
              />
            )
          })}

          {/* ── LEFT laterals ── */}
          {leftSides.map((text, li) => {
            const sideNum = li * 2 + 2
            const nodeKey = `side_${sideNum}`
            return (
              <LateralNode key={nodeKey}
                text={text} sideNum={sideNum}
                x={cx - HO} y={latLeftY(li)}
                shown={lateralsShown}
                accent={accent}
                nodeKey={nodeKey}
                fbStatus={feedback[nodeKey]}
                fbComment={comments[nodeKey]}
                onFeedback={onFeedback}
              />
            )
          })}
        </div>
      )}

      {/* ── Footer: feedback progress + refine/converge actions ── */}
      {data && !data.error && !refining && visibleKeys.length > 0 && (
        <CardFooter
          converged={converged}
          allAccepted={allAccepted}
          allFeedbackGiven={allFeedbackGiven}
          correctedCount={correctedCount}
          feedbackGiven={feedbackGiven}
          visibleTotal={visibleKeys.length}
          iterationCount={iterationCount}
          acceptedCount={acceptedCount}
          onConverge={onConverge}
          onRefine={onRefine}
          accent={accent}
        />
      )}
    </div>
  )
}
