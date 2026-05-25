import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../App'
import { useAutoScroll, SPEED_LABELS } from '../hooks/useAutoScroll'
import { updateBook } from '../utils/storage'
import PDFReader from './PDFReader'
import EPUBReader from './EPUBReader'
import TapCard from './TapCard'

const GOLD = '#C8A84B'

export default function Reader({ book, onBack, onUpdateBook }) {
  const { theme } = useApp()

  const scrollRef = useRef(null)
  const rootRef = useRef(null)
  const lastScrollRef = useRef(0)
  const manualScrollTimer = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(1)
  const [tapCard, setTapCard] = useState(null) // { x, y }
  const [progress, setProgress] = useState(book.progress || 0)
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 })
  const [chapterIndex, setChapterIndex] = useState(book.chapterIndex || 0)

  // Pause on manual scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function handleScroll() {
      const currentTop = el.scrollTop
      if (Math.abs(currentTop - lastScrollRef.current) > 2) {
        // Likely manual scroll
        clearTimeout(manualScrollTimer.current)
        if (isPlaying) {
          // Temporarily detected, pause via flag approach - we don't stop, just debounce
        }
        lastScrollRef.current = currentTop
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [isPlaying])

  const handleEnd = useCallback(() => {
    setIsPlaying(false)
  }, [])

  useAutoScroll(scrollRef, isPlaying, speedIndex, handleEnd)

  // Save progress debounced
  const saveTimer = useRef(null)
  function handleProgress(p) {
    setProgress(p)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateBook(book.id, { progress: p })
    }, 1500)
  }

  function handlePageInfo(current, total) {
    setPageInfo({ current, total })
  }

  function handleChapterChange(idx) {
    setChapterIndex(idx)
    updateBook(book.id, { chapterIndex: idx })
  }

  // Tap handling
  function handleContentTap(e) {
    // Don't trigger on button clicks
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return

    if (tapCard) {
      setTapCard(null)
      return
    }

    const rootRect = rootRef.current?.getBoundingClientRect() || e.currentTarget.getBoundingClientRect()
    setTapCard({ x: e.clientX - rootRect.left, y: e.clientY - rootRect.top })
  }

  function handleRestart() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setProgress(0)
    if (book.type === 'epub') setChapterIndex(0)
  }

  const isDark = theme.dark
  const barBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  // Format current time
  const [time, setTime] = useState(() => formatTime())
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={rootRef} style={{ ...s.root, background: theme.bg }}>
      {/* Status bar */}
      <div style={{ ...s.statusBar, background: theme.bg }}>
        <span style={{ ...s.statusTime, color: theme.text }}>{time}</span>
        <span style={{ ...s.statusPage, color: theme.subtext }}>
          {book.type === 'epub'
            ? `Ch. ${pageInfo.current} / ${pageInfo.total}`
            : `${pageInfo.current} / ${pageInfo.total}`}
        </span>
      </div>

      {/* Back button */}
      <button style={{ ...s.backBtn, color: GOLD }} onClick={onBack}>
        ‹ Library
      </button>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        data-scroll="true"
        style={s.scrollArea}
        onClick={handleContentTap}
      >
        {book.type === 'pdf' ? (
          <PDFReader
            ref={scrollRef}
            fileData={book.fileData}
            initialProgress={book.progress || 0}
            onProgress={handleProgress}
            onPageInfo={handlePageInfo}
          />
        ) : (
          <EPUBReader
            ref={scrollRef}
            fileData={book.fileData}
            initialChapter={book.chapterIndex || 0}
            initialProgress={book.progress || 0}
            onProgress={handleProgress}
            onPageInfo={handlePageInfo}
            onChapterChange={handleChapterChange}
          />
        )}

        {/* Bottom spacer */}
        <div style={{ height: 20 }} />
      </div>

      {/* Progress bar */}
      <div style={{ ...s.progressTrack, background: barBg }}>
        <div style={{ ...s.progressBar, width: `${progress * 100}%` }} />
      </div>

      {/* Tap card overlay */}
      {tapCard && (
        <div style={s.tapOverlay} onPointerDown={() => setTapCard(null)}>
          <TapCard
            x={tapCard.x}
            y={tapCard.y}
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(v => !v)}
            speedIndex={speedIndex}
            onSpeed={setSpeedIndex}
            onRestart={() => { handleRestart(); setTapCard(null) }}
            onClose={() => setTapCard(null)}
          />
        </div>
      )}
    </div>
  )
}

function formatTime() {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes().toString().padStart(2, '0')
  return `${h > 12 ? h - 12 : h || 12}:${m}`
}

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    transition: 'background 0.35s ease',
  },
  statusBar: {
    height: 44,
    paddingTop: 14,
    paddingLeft: 20,
    paddingRight: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'relative',
    zIndex: 5,
    transition: 'background 0.35s ease',
  },
  statusTime: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },
  statusPage: {
    fontSize: 12,
    fontWeight: 500,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 14,
    zIndex: 10,
    background: 'none',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 8,
    letterSpacing: '-0.01em',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingTop: 28,
    position: 'relative',
    WebkitOverflowScrolling: 'touch',
  },
  progressTrack: {
    height: 3,
    flexShrink: 0,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    background: GOLD,
    transition: 'width 0.3s ease',
    borderRadius: '0 2px 2px 0',
  },
  tapOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 70,
  },
}
