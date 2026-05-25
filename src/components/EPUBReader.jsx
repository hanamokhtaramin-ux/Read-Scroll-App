import React, { useEffect, useState, useRef, useCallback, forwardRef } from 'react'
import { parseEPUB, loadChapter } from '../utils/epubParser'
import { useApp } from '../App'
import HighlightPicker from './HighlightPicker'

const GOLD = '#C8A84B'

const EPUBReader = forwardRef(function EPUBReader({ fileData, initialChapter, initialProgress, onProgress, onPageInfo, onChapterChange }, scrollRef) {
  const { theme, fontIndex, FONT_FAMILIES, fontSize } = useApp()
  const [epubData, setEpubData] = useState(null)
  const [chapterIndex, setChapterIndex] = useState(initialChapter || 0)
  const [chapterHTML, setChapterHTML] = useState('')
  const [status, setStatus] = useState('loading')
  const [highlight, setHighlight] = useState(null) // { x, y }
  const contentRef = useRef(null)
  const wrapperRef = useRef(null)

  const fontFamily = FONT_FAMILIES[fontIndex]?.value || FONT_FAMILIES[4].value

  // Parse EPUB once
  useEffect(() => {
    parseEPUB(fileData.slice(0))
      .then(data => {
        setEpubData(data)
        setStatus('ready')
        onPageInfo?.(chapterIndex + 1, data.spine.length)
      })
      .catch(err => {
        setStatus('error')
        console.error(err)
      })
  }, [fileData])

  // Load chapter whenever index changes
  useEffect(() => {
    if (!epubData) return
    setStatus('chapter-loading')
    const { zip, opfDir, spine } = epubData
    const item = spine[chapterIndex]
    if (!item) return

    loadChapter(zip, opfDir, item.href)
      .then(html => {
        setChapterHTML(html)
        setStatus('ready')
        onPageInfo?.(chapterIndex + 1, spine.length)
        onChapterChange?.(chapterIndex)
        // Restore scroll for initial chapter only
        if (chapterIndex === (initialChapter || 0) && initialProgress > 0 && scrollRef?.current) {
          requestAnimationFrame(() => {
            const el = scrollRef.current
            if (el) el.scrollTop = initialProgress * (el.scrollHeight - el.clientHeight)
          })
        } else if (scrollRef?.current) {
          scrollRef.current.scrollTop = 0
        }
      })
      .catch(err => {
        setChapterHTML(`<p style="color:#FF3B30">Failed to load chapter: ${err.message}</p>`)
        setStatus('ready')
      })
  }, [epubData, chapterIndex])

  // Track scroll for progress
  useEffect(() => {
    const el = scrollRef?.current
    if (!el) return
    function handleScroll() {
      const max = el.scrollHeight - el.clientHeight
      if (max > 0) onProgress?.(el.scrollTop / max)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [scrollRef, onProgress])

  // Text selection / highlight picker
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    function handlePointerUp() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
        setHighlight(null)
        return
      }
      const range = sel.getRangeAt(0)
      const selRect = range.getBoundingClientRect()
      const wrapperRect = wrapperRef.current?.getBoundingClientRect() || { top: 0, left: 0 }
      const scrollTop = scrollRef?.current?.scrollTop || 0
      setHighlight({
        x: selRect.left + selRect.width / 2 - wrapperRect.left,
        y: selRect.top - wrapperRect.top + scrollTop,
      })
    }
    el.addEventListener('pointerup', handlePointerUp)
    return () => el.removeEventListener('pointerup', handlePointerUp)
  }, [chapterHTML])

  function applyHighlight(bgColor) {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) { setHighlight(null); return }
    try {
      const range = sel.getRangeAt(0)
      const span = document.createElement('span')
      span.style.backgroundColor = bgColor
      span.style.borderRadius = '3px'
      span.style.padding = '1px 0'
      range.surroundContents(span)
      sel.removeAllRanges()
    } catch (_) {}
    setHighlight(null)
  }

  const goNext = useCallback(() => {
    if (!epubData) return
    setChapterIndex(i => Math.min(i + 1, epubData.spine.length - 1))
  }, [epubData])

  const goPrev = useCallback(() => {
    setChapterIndex(i => Math.max(i - 1, 0))
  }, [])

  const chapterStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: 1.85,
    color: theme.text,
    letterSpacing: '0.01em',
  }

  return (
    <div ref={wrapperRef} style={s.wrapper}>
      {(status === 'loading' || status === 'chapter-loading') && (
        <div style={s.loadOverlay}>
          <span style={s.spinner} />
        </div>
      )}

      <div
        ref={contentRef}
        style={{ ...s.content, ...chapterStyle }}
        dangerouslySetInnerHTML={{ __html: chapterHTML }}
      />

      {/* Chapter nav */}
      {epubData && (
        <div style={s.navRow}>
          <button
            style={{ ...s.navBtn, opacity: chapterIndex === 0 ? 0.3 : 1 }}
            onClick={goPrev}
            disabled={chapterIndex === 0}
          >
            ← Prev
          </button>
          <span style={s.chapterLabel}>
            {chapterIndex + 1} / {epubData.spine.length}
          </span>
          <button
            style={{ ...s.navBtn, opacity: chapterIndex === epubData.spine.length - 1 ? 0.3 : 1 }}
            onClick={goNext}
            disabled={chapterIndex === epubData.spine.length - 1}
          >
            Next →
          </button>
        </div>
      )}

      {highlight && (
        <HighlightPicker
          position={highlight}
          onColor={applyHighlight}
          onClose={() => setHighlight(null)}
        />
      )}
    </div>
  )
})

export default EPUBReader

const s = {
  wrapper: {
    width: '100%',
    position: 'relative',
  },
  loadOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    minHeight: 200,
  },
  spinner: {
    display: 'inline-block',
    width: 28,
    height: 28,
    border: '3px solid rgba(200,168,75,0.2)',
    borderTopColor: GOLD,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  content: {
    padding: '0 22px 24px',
    minHeight: 300,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 22px 40px',
    borderTop: '1px solid rgba(128,128,128,0.15)',
  },
  navBtn: {
    background: 'none',
    border: `1px solid ${GOLD}`,
    color: GOLD,
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  chapterLabel: {
    fontSize: 12,
    color: 'rgba(128,128,128,0.6)',
    fontWeight: 500,
  },
}
