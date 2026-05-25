import React, { useEffect, useState, useRef, forwardRef } from 'react'
import { parseEPUB, loadChapter } from '../utils/epubParser'
import { useApp } from '../App'
import HighlightPicker from './HighlightPicker'

const GOLD = '#C8A84B'

const EPUBReader = forwardRef(function EPUBReader(
  { fileData, chapterIndex, onChapterChange, initialProgress, onProgress, onPageInfo },
  scrollRef
) {
  const { theme, fontIndex, FONT_FAMILIES, fontSize } = useApp()

  const [epubData, setEpubData]   = useState(null)
  const [allHTML, setAllHTML]     = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')
  const [status, setStatus]       = useState('loading')
  const [highlight, setHighlight] = useState(null)

  const contentRef = useRef(null)
  const wrapperRef = useRef(null)

  const fontFamily = FONT_FAMILIES[fontIndex]?.value || FONT_FAMILIES[4].value

  // ── Parse EPUB once ───────────────────────────────────────────────────────
  useEffect(() => {
    parseEPUB(fileData.slice(0))
      .then(data => { setEpubData(data); setStatus('idle') })
      .catch(err => { console.error(err); setStatus('error') })
  }, [fileData])

  // ── Load all chapters ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!epubData) return
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
  }, [epubData])

  // ── Jump to chapter when chapterIndex prop changes ────────────────────────
  useEffect(() => {
    if (status !== 'ready' || !contentRef.current || !scrollRef?.current) return
    if (chapterIndex === 0) return  // 0 handled by initialProgress / natural top
    const chDiv = contentRef.current.querySelector(`[data-chapter="${chapterIndex}"]`)
    if (!chDiv) return
    const parentTop = scrollRef.current.getBoundingClientRect().top
    const chTop = chDiv.getBoundingClientRect().top
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollTop + chTop - parentTop,
      behavior: 'smooth',
    })
  }, [chapterIndex, status])

  // ── Scroll → progress ────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef?.current
    if (!el) return
    const fn = () => { const max = el.scrollHeight - el.clientHeight; if (max > 0) onProgress?.(el.scrollTop / max) }
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [scrollRef, onProgress])

  // ── Text highlight ────────────────────────────────────────────────────────
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
  }, [allHTML])

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

  const contentStyle = { fontFamily, fontSize: `${fontSize}px`, lineHeight: 1.85, color: theme.text, letterSpacing: '0.01em' }

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
  loadOverlay: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 },
  spinner:     { display: 'inline-block', width: 28, height: 28, border: '3px solid rgba(200,168,75,0.2)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadMsg:     { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  content:     { padding: '0 22px 24px', minHeight: 300, wordBreak: 'break-word', overflowWrap: 'break-word' },
}
