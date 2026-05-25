import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../App'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { updateBook } from '../utils/storage'
import PDFReader from './PDFReader'
import EPUBReader from './EPUBReader'
import TapCard from './TapCard'

const GOLD = '#C8A84B'

export default function Reader({ book, onBack }) {
  const { theme } = useApp()

  const scrollRef = useRef(null)
  const rootRef   = useRef(null)

  const [isPlaying, setIsPlaying]         = useState(false)
  const [speed, setSpeed]                 = useState(40)
  const [viewMode, setViewMode]           = useState('continuous')
  const [tapCard, setTapCard]             = useState(null)
  const [progress, setProgress]           = useState(book.progress || 0)
  const [pageInfo, setPageInfo]           = useState({ current: 1, total: 1 })
  // PDF paged: track current page in Reader so timer can advance it
  const [currentPdfPage, setCurrentPdfPage] = useState(1)
  // EPUB: controlled chapter index
  const [chapterIndex, setChapterIndex]   = useState(book.chapterIndex || 0)
  const [time, setTime]                   = useState(() => formatTime())

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 30000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll via pixel scrolling:
  //   • always in continuous mode
  //   • in EPUB paged mode (scroll within chapter, handleScrollEnd advances chapter)
  const pixelScrollActive = isPlaying && (
    viewMode === 'continuous' || (viewMode === 'paged' && book.type === 'epub')
  )

  const handleScrollEnd = useCallback(() => {
    if (viewMode === 'paged' && book.type === 'epub') {
      // Advance to next chapter, or stop at end of book
      setChapterIndex(prev => {
        const next = prev + 1
        if (next >= pageInfo.total) { setIsPlaying(false); return prev }
        if (scrollRef.current) scrollRef.current.scrollTop = 0
        return next
      })
    } else {
      setIsPlaying(false)
    }
  }, [viewMode, book.type, pageInfo.total])

  useAutoScroll(scrollRef, pixelScrollActive, speed, handleScrollEnd)

  // PDF paged mode: timer auto-advances pages
  // interval = 30000 / speed ms  (speed=2→15s, speed=40→0.75s, speed=150→0.2s)
  // Clamp to 500ms min so it's not instant
  useEffect(() => {
    if (!isPlaying || viewMode !== 'paged' || book.type !== 'pdf') return
    const ms = Math.max(500, Math.round(30000 / Math.max(speed, 1)))
    const timer = setInterval(() => {
      setCurrentPdfPage(p => {
        if (p >= pageInfo.total) { setIsPlaying(false); return p }
        return p + 1
      })
    }, ms)
    return () => clearInterval(timer)
  }, [isPlaying, viewMode, speed, pageInfo.total, book.type])

  // Save progress (debounced)
  const saveTimer = useRef(null)
  function handleProgress(p) {
    setProgress(p)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => updateBook(book.id, { progress: p }), 1500)
  }

  function handlePageInfo(current, total) {
    setPageInfo({ current, total })
  }

  function handleChapterChange(idx) {
    setChapterIndex(idx)
    updateBook(book.id, { chapterIndex: idx })
  }

  function handleViewModeChange(newMode) {
    setIsPlaying(false)
    // When switching PDF continuous→paged, start at the current visible page
    if (newMode === 'paged' && book.type === 'pdf') {
      setCurrentPdfPage(pageInfo.current || 1)
    }
    setViewMode(newMode)
  }

  function handleRestart() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setProgress(0)
    setCurrentPdfPage(1)
    setChapterIndex(0)
  }

  // Tap to show / hide TapCard
  function handleContentTap(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return
    if (tapCard) { setTapCard(null); return }
    const rootRect = rootRef.current?.getBoundingClientRect() || e.currentTarget.getBoundingClientRect()
    setTapCard({ x: e.clientX - rootRect.left, y: e.clientY - rootRect.top })
  }

  const barBg = theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  return (
    <div ref={rootRef} style={{ ...s.root, background: theme.bg }}>
      {/* Status bar */}
      <div style={{ ...s.statusBar, background: theme.bg }}>
        <span style={{ ...s.statusTime, color: theme.text }}>{time}</span>
        <span style={{ ...s.statusPage, color: theme.subtext }}>
          {book.type === 'epub' ? `Ch. ${chapterIndex + 1} / ${pageInfo.total}` : `${pageInfo.current} / ${pageInfo.total}`}
        </span>
      </div>

      {/* Back */}
      <button style={{ ...s.backBtn, color: GOLD }} onClick={onBack}>‹ Library</button>

      {/* Scrollable content */}
      <div ref={scrollRef} data-scroll="true" style={s.scrollArea} onClick={handleContentTap}>
        {book.type === 'pdf' ? (
          <PDFReader
            ref={scrollRef}
            fileData={book.fileData}
            viewMode={viewMode}
            currentPage={currentPdfPage}
            onPageChange={setCurrentPdfPage}
            initialProgress={book.progress || 0}
            onProgress={handleProgress}
            onPageInfo={handlePageInfo}
          />
        ) : (
          <EPUBReader
            ref={scrollRef}
            fileData={book.fileData}
            viewMode={viewMode}
            chapterIndex={chapterIndex}
            onChapterChange={handleChapterChange}
            initialProgress={book.progress || 0}
            onProgress={handleProgress}
            onPageInfo={handlePageInfo}
          />
        )}
        <div style={{ height: 20 }} />
      </div>

      {/* Progress bar */}
      <div style={{ ...s.progressTrack, background: barBg }}>
        <div style={{ ...s.progressBar, width: `${progress * 100}%` }} />
      </div>

      {/* TapCard overlay */}
      {tapCard && (
        <div style={s.tapOverlay} onClick={e => { e.stopPropagation(); setTapCard(null) }}>
          <TapCard
            x={tapCard.x}
            y={tapCard.y}
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(v => !v)}
            speed={speed}
            onSpeed={setSpeed}
            viewMode={viewMode}
            onViewMode={handleViewModeChange}
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
  root: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', transition: 'background 0.35s ease' },
  statusBar: { height: 44, paddingTop: 14, paddingLeft: 20, paddingRight: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 5, transition: 'background 0.35s ease' },
  statusTime: { fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' },
  statusPage: { fontSize: 12, fontWeight: 500 },
  backBtn: { position: 'absolute', top: 50, left: 14, zIndex: 10, background: 'none', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, letterSpacing: '-0.01em' },
  scrollArea: { flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 28, position: 'relative', WebkitOverflowScrolling: 'touch' },
  progressTrack: { height: 3, flexShrink: 0 },
  progressBar: { height: '100%', background: GOLD, transition: 'width 0.3s ease', borderRadius: '0 2px 2px 0' },
  tapOverlay: { position: 'absolute', inset: 0, zIndex: 70 },
}
