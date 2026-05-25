import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../App'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { updateBook } from '../utils/storage'
import PDFReader from './PDFReader'
import EPUBReader from './EPUBReader'
import TapCard from './TapCard'

const GOLD = '#C8A84B'

export default function Reader({ book, onBack }) {
  const { theme, isTablet } = useApp()

  const scrollRef = useRef(null)
  const rootRef   = useRef(null)

  const [isPlaying, setIsPlaying]       = useState(false)
  const [speed, setSpeed]               = useState(40)
  const [tapCard, setTapCard]           = useState(null)
  const [progress, setProgress]         = useState(book.progress || 0)
  const [pageInfo, setPageInfo]         = useState({ current: 1, total: 1 })
  const [chapterIndex, setChapterIndex] = useState(book.chapterIndex || 0)
  const [jumpToPdfPage, setJumpToPdfPage] = useState(0)
  const [time, setTime]                 = useState(() => formatTime())

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 30000)
    return () => clearInterval(id)
  }, [])

  const handleScrollEnd = useCallback(() => setIsPlaying(false), [])
  useAutoScroll(scrollRef, isPlaying, speed, handleScrollEnd)

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

  function handleRestart() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setProgress(0)
    setJumpToPdfPage(0)
    setChapterIndex(0)
  }

  function handleJump(value) {
    if (book.type === 'epub') {
      handleChapterChange(value - 1)
    } else {
      setJumpToPdfPage(value)
    }
  }

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
          {book.type === 'epub'
            ? `Ch. ${chapterIndex + 1} / ${pageInfo.total}`
            : `${pageInfo.current} / ${pageInfo.total}`}
        </span>
      </div>

      {/* Back */}
      <button style={{ ...s.backBtn, color: GOLD }} onClick={onBack}>‹ Library</button>

      {/* Scrollable content */}
      <div ref={scrollRef} data-scroll="true" style={s.scrollArea} onClick={handleContentTap}>
        <div style={isTablet && book.type === 'epub' ? s.tabletInner : s.fullInner}>
          {book.type === 'pdf' ? (
            <PDFReader
              ref={scrollRef}
              fileData={book.fileData}
              scrollToPage={jumpToPdfPage}
              initialProgress={book.progress || 0}
              onProgress={handleProgress}
              onPageInfo={handlePageInfo}
            />
          ) : (
            <EPUBReader
              ref={scrollRef}
              fileData={book.fileData}
              chapterIndex={chapterIndex}
              onChapterChange={handleChapterChange}
              initialProgress={book.progress || 0}
              onProgress={handleProgress}
              onPageInfo={handlePageInfo}
            />
          )}
          <div style={{ height: 20 }} />
        </div>
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
            bookType={book.type}
            pageInfo={pageInfo}
            onJumpTo={handleJump}
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
  fullInner:   { width: '100%' },
  tabletInner: { width: '100%', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' },
}
