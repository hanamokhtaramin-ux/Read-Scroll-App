import React, { useEffect, useRef, useState } from 'react'
import SettingsPanel from './SettingsPanel'
import { useApp } from '../App'

const GOLD = '#C8A84B'
const CARD_W = 300
const CARD_DISMISS_SECS = 5
const SPEED_MIN = 2    // px/s
const SPEED_MAX = 200  // px/s

// Log scale so slow speeds feel usable — slider maps 0→1 to SPEED_MIN→SPEED_MAX exponentially
const toSpeed = pct => Math.round(SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, pct) * 10) / 10
const toPct   = spd => Math.log(Math.max(SPEED_MIN, spd) / SPEED_MIN) / Math.log(SPEED_MAX / SPEED_MIN)

function speedLabel(speed) {
  return (speed / 40).toFixed(1) + '×'
}

function SpeedSlider({ speed, onChange, onInteract }) {
  const trackRef = useRef(null)

  function updateFromPointer(e) {
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    onChange(toSpeed(x / rect.width))
    onInteract?.()
  }

  const pct = toPct(speed) * 100

  return (
    <div style={sl.wrap}>
      <div style={sl.header}>
        <span style={sl.label}>Speed</span>
        <span style={sl.value}>{speedLabel(speed)}</span>
      </div>
      <div
        ref={trackRef}
        style={sl.track}
        onPointerDown={e => {
          e.stopPropagation()
          trackRef.current.setPointerCapture(e.pointerId)
          updateFromPointer(e)
        }}
        onPointerMove={e => { if (e.buttons > 0) updateFromPointer(e) }}
      >
        <div style={sl.trackBg} />
        <div style={{ ...sl.fill, width: `${pct}%` }} />
        <div style={{ ...sl.thumb, left: `calc(${pct}% - 10px)` }} />
      </div>
      <div style={sl.endLabels}>
        <span>Slow</span>
        <span>Fast</span>
      </div>
    </div>
  )
}

function JumpPanel({ bookType, pageInfo, onJump, onInteract }) {
  const [val, setVal] = useState(pageInfo.current || 1)

  if (bookType === 'epub') {
    return (
      <div style={jp.listScroll}>
        {Array.from({ length: pageInfo.total }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            style={jp.chBtn}
            onClick={() => { onJump(n); onInteract?.() }}
          >
            Ch.{n}
          </button>
        ))}
      </div>
    )
  }

  // PDF: number input + stepper
  return (
    <div style={jp.pdfRow}>
      <button
        style={jp.stepBtn}
        onClick={() => { setVal(v => Math.max(1, v - 1)); onInteract?.() }}
      >−</button>
      <div style={jp.pdfMid}>
        <input
          type="number"
          min={1}
          max={pageInfo.total}
          value={val}
          onChange={e => setVal(Math.max(1, Math.min(pageInfo.total, parseInt(e.target.value) || 1)))}
          style={jp.numInput}
        />
        <span style={jp.ofTotal}>/ {pageInfo.total}</span>
      </div>
      <button
        style={jp.stepBtn}
        onClick={() => { setVal(v => Math.min(pageInfo.total, v + 1)); onInteract?.() }}
      >+</button>
      <button
        style={jp.goBtn}
        onClick={() => { onJump(val); onInteract?.() }}
      >Go</button>
    </div>
  )
}

export default function TapCard({ x, y, isPlaying, onPlay, speed, onSpeed, bookType, pageInfo, onJumpTo, onRestart, onClose }) {
  const { frameW, frameH } = useApp()
  const [showSettings, setShowSettings] = useState(false)
  const [showJump, setShowJump]         = useState(false)
  const timerRef = useRef(null)

  function resetTimer() {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onClose, CARD_DISMISS_SECS * 1000)
  }

  useEffect(() => {
    resetTimer()
    return () => clearTimeout(timerRef.current)
  }, [])

  function wrap(fn) {
    return (...args) => {
      resetTimer()
      fn?.(...args)
    }
  }

  function openJump() {
    setShowSettings(false)
    setShowJump(v => !v)
    resetTimer()
  }

  function openSettings() {
    setShowJump(false)
    setShowSettings(v => !v)
    resetTimer()
  }

  const panelH = showSettings ? 390 : (showJump ? (bookType === 'epub' ? 400 : 280) : 230)
  const left = Math.min(Math.max(x - CARD_W / 2, 10), frameW - CARD_W - 10)
  const top  = Math.min(Math.max(y - 20, 54), frameH - panelH)

  return (
    <div
      style={{ ...s.card, left, top }}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); resetTimer() }}
    >
      {/* Speed bar */}
      <SpeedSlider speed={speed} onChange={onSpeed} onInteract={resetTimer} />

      {/* Play/Pause */}
      <button style={{ ...s.playBtn, ...(isPlaying ? s.pauseStyle : s.playStyle) }} onClick={wrap(onPlay)}>
        {isPlaying ? (
          <span style={s.pauseIcon}>
            <span style={s.pauseBar} />
            <span style={s.pauseBar} />
          </span>
        ) : (
          <span style={s.playIcon}>▶</span>
        )}
        <span style={s.playLabel}>{isPlaying ? 'Pause' : 'Play'}</span>
      </button>

      {/* Bottom row */}
      <div style={s.bottomRow}>
        <button style={s.iconBtn} onClick={wrap(onRestart)}>
          <span style={s.iconBtnIcon}>⟳</span>
          <span style={s.iconBtnLabel}>Restart</span>
        </button>
        <button
          style={{ ...s.iconBtn, ...(showJump ? s.iconBtnActive : {}) }}
          onClick={openJump}
        >
          <span style={s.iconBtnIcon}>≡</span>
          <span style={s.iconBtnLabel}>{bookType === 'epub' ? 'Chapter' : 'Page'}</span>
        </button>
        <button
          style={{ ...s.iconBtn, ...(showSettings ? s.iconBtnActive : {}) }}
          onClick={openSettings}
        >
          <span style={s.iconBtnIcon}>⚙</span>
          <span style={s.iconBtnLabel}>Settings</span>
        </button>
      </div>

      {showJump && (
        <JumpPanel
          bookType={bookType}
          pageInfo={pageInfo}
          onJump={onJumpTo}
          onInteract={resetTimer}
        />
      )}
      {showSettings && <SettingsPanel onInteract={resetTimer} />}
    </div>
  )
}

const sl = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  value: { fontSize: 14, fontWeight: 700, color: GOLD },
  track: { position: 'relative', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  fill: { position: 'absolute', left: 0, height: 4, background: `linear-gradient(90deg, ${GOLD}88, ${GOLD})`, borderRadius: 2, transition: 'width 0.05s' },
  thumb: { position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: GOLD, boxShadow: `0 2px 8px rgba(200,168,75,0.5)`, transition: 'left 0.05s', pointerEvents: 'none' },
  endLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 500, marginTop: -2 },
}

const jp = {
  listScroll: {
    maxHeight: 160,
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 5,
    paddingTop: 4,
  },
  chBtn: {
    padding: '8px 4px',
    background: 'rgba(255,255,255,0.07)',
    border: 'none',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  pdfRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    paddingTop: 4,
  },
  pdfMid: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  numInput: {
    width: 58,
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#FFF',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    MozAppearance: 'textfield',
  },
  ofTotal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    whiteSpace: 'nowrap',
  },
  stepBtn: {
    width: 32, height: 32,
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  goBtn: {
    padding: '6px 12px',
    background: GOLD,
    border: 'none',
    borderRadius: 8,
    color: '#111',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
}

const s = {
  card: {
    position: 'absolute',
    width: CARD_W,
    background: 'rgba(28, 28, 30, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 20,
    padding: 16,
    zIndex: 80,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.12)',
    animation: 'fadeIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  playBtn: {
    width: '100%',
    padding: '13px 0',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.15s',
  },
  playStyle:  { background: GOLD, color: '#111', boxShadow: `0 4px 16px rgba(200,168,75,0.4)` },
  pauseStyle: { background: 'rgba(255,255,255,0.12)', color: '#FFFFFF' },
  playIcon:   { fontSize: 14, marginLeft: 2 },
  pauseIcon:  { display: 'flex', gap: 3, alignItems: 'center' },
  pauseBar:   { display: 'inline-block', width: 3, height: 14, background: 'currentColor', borderRadius: 2 },
  playLabel:  { fontSize: 15, fontWeight: 700 },
  bottomRow:  { display: 'flex', gap: 8 },
  iconBtn: {
    flex: 1,
    padding: '10px 0',
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: 12,
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s',
  },
  iconBtnActive: { background: 'rgba(200,168,75,0.18)', color: GOLD },
  iconBtnIcon:   { fontSize: 18, lineHeight: 1 },
  iconBtnLabel:  { fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' },
}
