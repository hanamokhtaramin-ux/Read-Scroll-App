import React, { useEffect, useRef, useState } from 'react'
import { SPEEDS, SPEED_LABELS } from '../hooks/useAutoScroll'
import SettingsPanel from './SettingsPanel'

const GOLD = '#C8A84B'
const CARD_W = 300
const CARD_DISMISS_SECS = 5

export default function TapCard({ x, y, isPlaying, onPlay, speedIndex, onSpeed, onRestart, onClose }) {
  const [showSettings, setShowSettings] = useState(false)
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

  // Constrain position within phone screen
  const left = Math.min(Math.max(x - CARD_W / 2, 10), 393 - CARD_W - 10)
  const top = Math.min(Math.max(y - 20, 54), 852 - (showSettings ? 360 : 200))

  return (
    <div
      style={{ ...s.card, left, top }}
      onPointerDown={e => { e.stopPropagation(); resetTimer() }}
    >
      {/* Speed selector */}
      <div style={s.speedRow}>
        {SPEED_LABELS.map((label, i) => (
          <button
            key={i}
            style={{ ...s.speedBtn, ...(i === speedIndex ? s.speedBtnActive : {}) }}
            onClick={wrap(() => onSpeed(i))}
          >
            {label}
          </button>
        ))}
      </div>

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
        <button style={s.iconBtn} onClick={wrap(onRestart)} title="Restart">
          <span style={s.iconBtnIcon}>⟳</span>
          <span style={s.iconBtnLabel}>Restart</span>
        </button>
        <button
          style={{ ...s.iconBtn, ...(showSettings ? s.iconBtnActive : {}) }}
          onClick={wrap(() => setShowSettings(v => !v))}
          title="Settings"
        >
          <span style={s.iconBtnIcon}>⚙</span>
          <span style={s.iconBtnLabel}>Settings</span>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && <SettingsPanel onInteract={resetTimer} />}
    </div>
  )
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
  speedRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
  },
  speedBtn: {
    flex: 1,
    padding: '7px 0',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
    border: 'none',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  speedBtnActive: {
    background: GOLD,
    color: '#111',
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
  playStyle: {
    background: GOLD,
    color: '#111',
    boxShadow: `0 4px 16px rgba(200,168,75,0.4)`,
  },
  pauseStyle: {
    background: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
  },
  playIcon: {
    fontSize: 14,
    marginLeft: 2,
  },
  pauseIcon: {
    display: 'flex',
    gap: 3,
    alignItems: 'center',
  },
  pauseBar: {
    display: 'inline-block',
    width: 3,
    height: 14,
    background: 'currentColor',
    borderRadius: 2,
  },
  playLabel: {
    fontSize: 15,
    fontWeight: 700,
  },
  bottomRow: {
    display: 'flex',
    gap: 8,
  },
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
  iconBtnActive: {
    background: 'rgba(200,168,75,0.18)',
    color: GOLD,
  },
  iconBtnIcon: { fontSize: 18, lineHeight: 1 },
  iconBtnLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' },
}
