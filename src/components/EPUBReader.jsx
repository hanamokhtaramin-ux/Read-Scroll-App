import React, { useEffect, useState, useRef, forwardRef } from 'react'
import { parseEPUB, loadChapter } from '../utils/epubParser'
import { useApp } from '../App'
import HighlightPicker from './HighlightPicker'

const GOLD = '#C8A84B'

const EPUBReader = forwardRef(function EPUBReader(
  { fileData, viewMode, chapterIndex, onChapterChange, initialProgress, onProgress, onPageInfo },
  scrollRef
) {
  const { theme, fontIndex, FONT_FAMILIES, fontSize } = useApp()

  const [epubData, setEpubData]             = useState(null)
  const [allHTML, setAllHTML]               = useState('')
  const [pagedChapters, setPagedChapters]   = useState([])
  const [loadingMsg, setLoadingMsg]         = useState('')
  const [status, setStatus]                 = useState('loading')
  const [highlight, setHighlight]           = useState(null)

  const contentRef   = useRef(null)
  const wrapperRef   = useRef(null)
  const hScrollRef   = useRef(null)
  const isProgramRef = useRef(false)

  const fontFamily = FONT_FAMILIES[fontIndex]?.value || FONT_FAMILIES[4].value

  // ── Parse EPUB once ───────────────────────────────────────────────────────
  useEffect(() => {
    parseEPUB(fileData.slice(0))
      .then(data => { setEpubData(data); setStatus('idle') })
      .catch(err => { console.error(err); setStatus('error') })
  }, [fileData])

  // ── Paged mode: load all chapters into horizontal panels ──────────────────
  useEffect(() => {
    if (!epubData || viewMode !== 'paged') return
    let cancelled = false
    const { zip, opfDir, spine } = epubData
    setStatus('loading')
    setPagedChapters([])
    setLoadingMsg('')

    ;(async () => {
      const parts = []
      for (let i = 0; i < spine.length; i++) {
        if (cancelled) return
        setLoadingMsg(`Loading chapter ${i + 1} of ${spine.length}…`)
        const html = await loadChapter(zip, opfDir, spine[i].href)
        parts.push(html)
      }
      if (cancelled) return
      setPagedChapters(parts)
      setStatus('ready')
      setLoadingMsg('')
      onPageInfo?.(chapterIndex + 1, spine.length)
    })()
    return () => { cancelled = true }
  }, [epubData, viewMode])

  // ── After chapters load, snap to current chapter without animation ─────────
  useEffect(() => {
    if (pagedChapters.length === 0) return
    requestAnimationFrame(() => {
      const el = hScrollRef.current
      if (!el) return
      isProgramRef.current = true
      el.scrollLeft = chapterIndex * el.clientWidth
      setTimeout(() => { isProgramRef.current = false }, 150)
    })
  }, [pagedChapters])

  // ── Scroll to chapterIndex when it changes ────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'paged' || pagedChapters.length === 0) return
    const el = hScrollRef.current
    if (!el) return
    const target = chapterIndex * el.clientWidth
    if (Math.abs(el.scrollLeft - target) < 5) return
    isProgramRef.current = true
    el.scrollTo({ left: target, behavior: 'smooth' })
    setTimeout(() => { isProgramRef.current = false }, 700)
  }, [chapterIndex, viewMode])

  // ── Continuous mode: load all chapters ───────────────────────────────────
  useEffect(() => {
    if (!epubData || viewMode !== 'continuous') return
    let cancelled = false
    setStatus('loading'); setAllHTML('')

    ;(async () => {
      const { zip, opfDir, spine } = epubData
      const parts = []
      for (let i = 0; i < spine.length; i++) {
        if (cancelled) return
        setLoadingMsg(`Loading chapter ${i + 1} of ${spine.length}…`)
        const html = await loadChapter(zip, opfDir, spine[i].href)
        parts.push(`<div data-chapter="${i}" style="${i > 0 ? 'border-top:1px solid rgba(128,128,128,0.15);margin-top:36px;padding-top:32px;' : ''}">${html}</div>`)
      }
      if (cancelled) return
      setAllHTML(parts.join(''))
      setStatus('ready'); setLoadingMsg('')
      onPageInfo?.(1, epubData.spine.length)
      if (initialProgress > 0 && scrollRef?.current) {
        requestAnimationFrame(() => {
          const el = scrollRef.current
          if (el) el.scrollTop = initialProgress * (el.scrollHeight - el.clientHeight)
        })
      }
    })()
    return () => { cancelled = true }
  }, [epubData, viewMode])

  // ── Scroll → progress (continuous only) ──────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'continuous') return
    const el = scrollRef?.current
    if (!el) return
    const fn = () => { const max = el.scrollHeight - el.clientHeight; if (max > 0) onProgress?.(el.scrollTop / max) }
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [scrollRef, onProgress, viewMode])

  // ── Text highlight (continuous only) ─────────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'continuous') return
    const el = contentRef.current
    if (!el) return
    function handlePointerUp() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) { setHighlight(null); return }
      const range = sel.getRangeAt(0)
      const sr = range.getBoundingClientRect()
      const wr = wrapperRef.current?.getBoundingClientRect() || { top: 0, left: 0 }
      const scrollTop = scrollRef?.current?.scrollTop || 0
      setHighlight({ x: sr.left + sr.width / 2 - wr.left, y: sr.top - wr.top + scrollTop })
    }
    el.addEventListener('pointerup', handlePointerUp)
    return () => el.removeEventListener('pointerup', handlePointerUp)
  }, [allHTML, viewMode])

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

  function handlePagedScroll() {
    if (isProgramRef.current || !epubData) return
    const el = hScrollRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    const i = Math.max(0, Math.min(idx, epubData.spine.length - 1))
    if (i !== chapterIndex) {
      onChapterChange(i)
      onPageInfo?.(i + 1, epubData.spine.length)
    }
  }

  const contentStyle = { fontFamily, fontSize: `${fontSize}px`, lineHeight: 1.85, color: theme.text, letterSpacing: '0.01em' }

  // ── Paged view ────────────────────────────────────────────────────────────
  if (viewMode === 'paged') {
    return (
      <div ref={wrapperRef} style={s.pagedWrapper}>
        {status === 'loading' && (
          <div style={s.pagedLoadOverlay}>
            <span style={s.spinner} />
            {loadingMsg && <span style={s.loadMsg}>{loadingMsg}</span>}
          </div>
        )}
        {pagedChapters.length > 0 && (
          <div ref={hScrollRef} style={s.hScroll} onScroll={handlePagedScroll}>
            {pagedChapters.map((html, i) => (
              <div
                key={i}
                style={{ ...s.chapterPanel, ...contentStyle }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ))}
          </div>
        )}
        {status === 'ready' && epubData && (
          <div style={s.navRow}>
            <button
              style={{ ...s.navBtn, opacity: chapterIndex === 0 ? 0.3 : 1 }}
              onClick={() => chapterIndex > 0 && onChapterChange(chapterIndex - 1)}
              disabled={chapterIndex === 0}
            >← Prev</button>
            <span style={s.pageLabel}>{chapterIndex + 1} / {epubData.spine.length}</span>
            <button
              style={{ ...s.navBtn, opacity: chapterIndex >= epubData.spine.length - 1 ? 0.3 : 1 }}
              onClick={() => chapterIndex < epubData.spine.length - 1 && onChapterChange(chapterIndex + 1)}
              disabled={chapterIndex >= epubData.spine.length - 1}
            >Next →</button>
          </div>
        )}
      </div>
    )
  }

  // ── Continuous view ───────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} style={s.wrapper}>
      {status === 'loading' && (
        <div style={s.loadOverlay}>
          <span style={s.spinner} />
          {loadingMsg && <span style={s.loadMsg}>{loadingMsg}</span>}
        </div>
      )}
      <div
        ref={contentRef}
        style={{ ...s.content, ...contentStyle }}
        dangerouslySetInnerHTML={{ __html: allHTML }}
      />
      {highlight && (
        <HighlightPicker position={highlight} onColor={applyHighlight} onClose={() => setHighlight(null)} />
      )}
    </div>
  )
})

export default EPUBReader

const s = {
  wrapper:     { width: '100%', position: 'relative' },
  pagedWrapper: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' },
  loadOverlay: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 },
  pagedLoadOverlay: {
    flex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12,
  },
  spinner: { display: 'inline-block', width: 28, height: 28, border: '3px solid rgba(200,168,75,0.2)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadMsg: { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  content: { padding: '0 22px 24px', minHeight: 300, wordBreak: 'break-word', overflowWrap: 'break-word' },
  hScroll: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  chapterPanel: {
    flexShrink: 0,
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollSnapAlign: 'start',
    padding: '8px 22px 24px',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    boxSizing: 'border-box',
  },
  navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 40px', borderTop: '1px solid rgba(128,128,128,0.15)', flexShrink: 0 },
  navBtn: { background: 'none', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  pageLabel: { fontSize: 12, color: 'rgba(128,128,128,0.6)', fontWeight: 500 },
}
