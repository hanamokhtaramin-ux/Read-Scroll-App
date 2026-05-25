import React, { useEffect, useState, useRef, forwardRef } from 'react'
import { parseEPUB, loadChapter } from '../utils/epubParser'
import { useApp } from '../App'
import HighlightPicker from './HighlightPicker'

const GOLD = '#C8A84B'
const ANIM_MS = 360

const EPUBReader = forwardRef(function EPUBReader(
  { fileData, viewMode, chapterIndex, onChapterChange, initialProgress, onProgress, onPageInfo },
  scrollRef
) {
  const { theme, fontIndex, FONT_FAMILIES, fontSize } = useApp()

  const [epubData, setEpubData]       = useState(null)
  const [chapterHTML, setChapterHTML] = useState('')
  const [prevHTML, setPrevHTML]       = useState('')   // outgoing chapter during animation
  const [allHTML, setAllHTML]         = useState('')
  const [loadingMsg, setLoadingMsg]   = useState('')
  const [status, setStatus]           = useState('loading')
  const [animDir, setAnimDir]         = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [highlight, setHighlight]     = useState(null)

  const contentRef    = useRef(null)
  const wrapperRef    = useRef(null)
  const prevIdxRef    = useRef(null)   // null = first load
  const animTimerRef  = useRef(null)

  const fontFamily = FONT_FAMILIES[fontIndex]?.value || FONT_FAMILIES[4].value

  // ── Parse EPUB once ───────────────────────────────────────────────────────
  useEffect(() => {
    parseEPUB(fileData.slice(0))
      .then(data => { setEpubData(data); setStatus('idle') })
      .catch(err => { console.error(err); setStatus('error') })
  }, [fileData])

  // ── Paged mode: load one chapter + animate ────────────────────────────────
  useEffect(() => {
    if (!epubData || viewMode !== 'paged') return

    const isFirst = prevIdxRef.current === null
    const dir = !isFirst && chapterIndex > prevIdxRef.current ? 'next' : 'prev'
    prevIdxRef.current = chapterIndex

    // Start exit animation with the OLD HTML before loading new chapter
    if (!isFirst && chapterHTML) {
      setPrevHTML(chapterHTML)
      clearTimeout(animTimerRef.current)
      setAnimDir(dir)
      setIsAnimating(true)
      animTimerRef.current = setTimeout(() => {
        setPrevHTML('')
        setIsAnimating(false)
        setAnimDir(null)
      }, ANIM_MS)
    }

    setStatus('loading')
    const { zip, opfDir, spine } = epubData
    const item = spine[chapterIndex]
    if (!item) return

    loadChapter(zip, opfDir, item.href)
      .then(html => {
        setChapterHTML(html)
        setStatus('ready')
        onPageInfo?.(chapterIndex + 1, spine.length)

        if (isFirst && initialProgress > 0 && scrollRef?.current) {
          requestAnimationFrame(() => {
            const el = scrollRef.current
            if (el) el.scrollTop = initialProgress * (el.scrollHeight - el.clientHeight)
          })
        } else if (!isFirst && scrollRef?.current) {
          scrollRef.current.scrollTop = 0
        }
      })
      .catch(err => {
        setChapterHTML(`<p style="color:#FF3B30">Chapter error: ${err.message}</p>`)
        setStatus('ready')
      })
  }, [epubData, chapterIndex, viewMode])

  // ── Continuous mode: load ALL chapters ───────────────────────────────────
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
      onPageInfo?.(1, spine.length)
      if (initialProgress > 0 && scrollRef?.current) {
        requestAnimationFrame(() => {
          const el = scrollRef.current
          if (el) el.scrollTop = initialProgress * (el.scrollHeight - el.clientHeight)
        })
      }
    })()
    return () => { cancelled = true }
  }, [epubData, viewMode])

  // ── Scroll → progress ────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef?.current
    if (!el) return
    const fn = () => { const max = el.scrollHeight - el.clientHeight; if (max > 0) onProgress?.(el.scrollTop / max) }
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [scrollRef, onProgress])

  // ── Text highlight picker ─────────────────────────────────────────────────
  useEffect(() => {
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
  }, [chapterHTML, allHTML])

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

  const totalChapters = epubData?.spine.length || 1
  const contentStyle = { fontFamily, fontSize: `${fontSize}px`, lineHeight: 1.85, color: theme.text, letterSpacing: '0.01em' }

  const exitAnim  = `pageExit${animDir === 'next' ? 'Next' : 'Prev'} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`
  const enterAnim = `pageEnter${animDir === 'next' ? 'Next' : 'Prev'} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`

  return (
    <div ref={wrapperRef} style={s.wrapper}>
      {/* Loading */}
      {status === 'loading' && (
        <div style={s.loadOverlay}>
          <span style={s.spinner} />
          {loadingMsg && <span style={s.loadMsg}>{loadingMsg}</span>}
        </div>
      )}

      {/* Paged mode: outgoing chapter (animating out) + incoming chapter */}
      {viewMode === 'paged' ? (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {prevHTML && (
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                pointerEvents: 'none', zIndex: 2,
                animation: isAnimating && animDir ? exitAnim : undefined,
                ...s.content, ...contentStyle,
              }}
              dangerouslySetInnerHTML={{ __html: prevHTML }}
            />
          )}
          <div
            ref={contentRef}
            style={{
              ...s.content, ...contentStyle,
              animation: isAnimating && animDir ? enterAnim : undefined,
              position: 'relative', zIndex: 1,
            }}
            dangerouslySetInnerHTML={{ __html: chapterHTML }}
          />
        </div>
      ) : (
        /* Continuous mode: all chapters */
        <div
          ref={contentRef}
          style={{ ...s.content, ...contentStyle }}
          dangerouslySetInnerHTML={{ __html: allHTML }}
        />
      )}

      {/* Paged chapter navigation */}
      {viewMode === 'paged' && epubData && (
        <div style={s.navRow}>
          <button
            style={{ ...s.navBtn, opacity: chapterIndex === 0 || isAnimating ? 0.3 : 1 }}
            onClick={() => !isAnimating && onChapterChange(Math.max(0, chapterIndex - 1))}
            disabled={chapterIndex === 0 || isAnimating}
          >← Prev</button>
          <span style={s.pageLabel}>{chapterIndex + 1} / {totalChapters}</span>
          <button
            style={{ ...s.navBtn, opacity: chapterIndex >= totalChapters - 1 || isAnimating ? 0.3 : 1 }}
            onClick={() => !isAnimating && onChapterChange(Math.min(totalChapters - 1, chapterIndex + 1))}
            disabled={chapterIndex >= totalChapters - 1 || isAnimating}
          >Next →</button>
        </div>
      )}

      {highlight && (
        <HighlightPicker position={highlight} onColor={applyHighlight} onClose={() => setHighlight(null)} />
      )}
    </div>
  )
})

export default EPUBReader

const s = {
  wrapper: { width: '100%', position: 'relative' },
  loadOverlay: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 },
  spinner: { display: 'inline-block', width: 28, height: 28, border: '3px solid rgba(200,168,75,0.2)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadMsg: { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  content: { padding: '0 22px 24px', minHeight: 300, wordBreak: 'break-word', overflowWrap: 'break-word' },
  navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 40px', borderTop: '1px solid rgba(128,128,128,0.15)' },
  navBtn: { background: 'none', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  pageLabel: { fontSize: 12, color: 'rgba(128,128,128,0.6)', fontWeight: 500 },
}
