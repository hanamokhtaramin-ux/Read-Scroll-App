import React, { useState } from 'react'
import { formatProgress } from '../utils/bookUtils'

const GOLD = '#C8A84B'

export default function BookCard({ book, onOpen, onDelete }) {
  const [pressing, setPressing] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const [g1, g2] = book.gradient
  const progress = book.progress || 0

  function handleLongPress() {
    setShowDelete(true)
  }

  let pressTimer = null
  function handlePointerDown() {
    setPressing(true)
    pressTimer = setTimeout(handleLongPress, 600)
  }
  function handlePointerUp() {
    setPressing(false)
    clearTimeout(pressTimer)
    if (!showDelete) onOpen(book)
  }
  function handlePointerLeave() {
    setPressing(false)
    clearTimeout(pressTimer)
  }

  return (
    <div style={{ ...s.wrap, transform: pressing ? 'scale(0.96)' : 'scale(1)' }}>
      {showDelete && (
        <button
          style={s.deleteBadge}
          onPointerDown={e => { e.stopPropagation(); onDelete(book.id); setShowDelete(false) }}
        >
          ✕
        </button>
      )}

      <div
        style={s.card}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={() => showDelete && setShowDelete(false)}
      >
        {/* Cover */}
        <div style={{ ...s.cover, background: `linear-gradient(145deg, ${g1}, ${g2})` }}>
          <span style={s.emoji}>{book.emoji}</span>
          <span style={s.typeBadge}>{book.type.toUpperCase()}</span>
        </div>

        {/* Info */}
        <div style={s.info}>
          <div style={s.title} title={book.title}>{book.title}</div>
          <div style={s.progressText}>{formatProgress(progress)}</div>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressBar, width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  wrap: {
    transition: 'transform 0.15s ease',
    position: 'relative',
    borderRadius: 14,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.06)',
    cursor: 'pointer',
    userSelect: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  cover: {
    height: 130,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  emoji: {
    fontSize: 38,
    lineHeight: 1,
  },
  typeBadge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.85)',
    background: 'rgba(0,0,0,0.3)',
    padding: '2px 7px',
    borderRadius: 6,
  },
  info: {
    padding: '10px 10px 12px',
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#FFFFFF',
    lineHeight: 1.3,
    marginBottom: 5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  progressText: {
    fontSize: 10,
    color: GOLD,
    marginBottom: 5,
    fontWeight: 500,
  },
  progressTrack: {
    height: 2,
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: GOLD,
    borderRadius: 1,
    transition: 'width 0.3s ease',
  },
  deleteBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#FF3B30',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
}
