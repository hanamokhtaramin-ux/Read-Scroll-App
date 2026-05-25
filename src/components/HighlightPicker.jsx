import React, { useEffect, useRef } from 'react'

const COLORS = [
  { id: 'yellow', bg: 'rgba(255, 214, 0, 0.45)',   label: '🟡' },
  { id: 'green',  bg: 'rgba(52, 199, 89, 0.4)',    label: '🟢' },
  { id: 'pink',   bg: 'rgba(255, 45, 85, 0.35)',   label: '🔴' },
  { id: 'blue',   bg: 'rgba(10, 132, 255, 0.35)',  label: '🔵' },
  { id: 'purple', bg: 'rgba(175, 82, 222, 0.4)',   label: '🟣' },
]

export default function HighlightPicker({ position, onColor, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose])

  const { x, y } = position
  const left = Math.min(Math.max(x - 120, 8), 393 - 248)
  const top = Math.max(y - 52, 50)

  return (
    <div ref={ref} style={{ ...s.picker, left, top }}>
      {COLORS.map(c => (
        <button
          key={c.id}
          style={{ ...s.colorBtn, background: c.bg }}
          onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onColor(c.bg) }}
          title={c.id}
        />
      ))}
      <div style={s.divider} />
      <button style={s.closeBtn} onPointerDown={e => { e.stopPropagation(); onClose() }}>✕</button>
    </div>
  )
}

const s = {
  picker: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(28, 28, 30, 0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 14,
    padding: '8px 10px',
    zIndex: 90,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.12)',
    animation: 'fadeIn 0.15s ease',
  },
  colorBtn: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1.5px solid rgba(255,255,255,0.25)',
    cursor: 'pointer',
    transition: 'transform 0.12s ease',
    flexShrink: 0,
  },
  divider: {
    width: 1,
    height: 20,
    background: 'rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
