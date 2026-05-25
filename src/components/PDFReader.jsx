import React, { useEffect, useRef, useState, forwardRef } from 'react'

const GOLD = '#C8A84B'

let pdfjsLib = null
async function getPDFJS() {
  if (pdfjsLib) return pdfjsLib
  const lib = await import('pdfjs-dist')
  lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.js`
  pdfjsLib = lib
  return lib
}

async function renderPage(pdf, pageNum, canvas, containerWidth) {
  const page = await pdf.getPage(pageNum)
  const base = page.getViewport({ scale: 1.0 })
  const scale = (containerWidth / base.width) * window.devicePixelRatio
  const vp = page.getViewport({ scale })
  canvas.width = vp.width
  canvas.height = vp.height
  canvas.style.width = '100%'
  canvas.style.height = `${vp.height / window.devicePixelRatio}px`
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
}

const PDFReader = forwardRef(function PDFReader(
  { fileData, viewMode, currentPage, onPageChange, initialProgress, onProgress, onPageInfo },
  scrollRef
) {
  const containerRef = useRef(null)  // continuous
  const hScrollRef   = useRef(null)  // paged horizontal
  const pdfRef       = useRef(null)
  const observerRef  = useRef(null)
  const isProgramRef = useRef(false)

  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [totalPages, setTotalPages] = useState(0)
  const [status, setStatus]         = useState('loading')
  const [error, setError]           = useState(null)

  // ── Load PDF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setStatus('loading'); setPdfLoaded(false)
    ;(async () => {
      try {
        const lib = await getPDFJS()
        const pdf = await lib.getDocument({ data: fileData.slice(0) }).promise
        if (cancelled) return
        pdfRef.current = pdf
        setTotalPages(pdf.numPages)
        setPdfLoaded(true)
      } catch (e) {
        if (!cancelled) { setError(e.message); setStatus('error') }
      }
    })()
    return () => { cancelled = true; observerRef.current?.disconnect() }
  }, [fileData])

  // ── Continuous: render all pages vertically ───────────────────────────────
  useEffect(() => {
    if (!pdfLoaded || viewMode !== 'continuous') return
    let cancelled = false
    const pdf = pdfRef.current
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''
    setStatus('loading')
    onPageInfo?.(1, totalPages)

    ;(async () => {
      for (let i = 1; i <= totalPages; i++) {
        if (cancelled) return
        const c = document.createElement('canvas')
        c.style.display = 'block'
        c.dataset.page = i
        await renderPage(pdf, i, c, container.clientWidth || 393)
        if (cancelled) return
        container.appendChild(c)
      }
      if (initialProgress > 0 && scrollRef?.current) {
        const el = scrollRef.current
        el.scrollTop = initialProgress * (el.scrollHeight - el.clientHeight)
      }
      setStatus('ready')

      const el = scrollRef?.current
      if (!el) return
      observerRef.current?.disconnect()
      observerRef.current = new IntersectionObserver(entries => {
        let top = null
        for (const e of entries)
          if (e.isIntersecting) { const p = +e.target.dataset.page; if (top === null || p < top) top = p }
        if (top !== null) onPageInfo?.(top, totalPages)
      }, { root: el, threshold: 0.1 })
      container.querySelectorAll('canvas[data-page]').forEach(c => observerRef.current.observe(c))
    })()
    return () => { cancelled = true; observerRef.current?.disconnect() }
  }, [pdfLoaded, viewMode, totalPages])

  // ── Paged: render all pages in horizontal snap container ──────────────────
  useEffect(() => {
    if (!pdfLoaded || viewMode !== 'paged') return
    const container = hScrollRef.current
    if (!container) return
    let cancelled = false
    const pdf = pdfRef.current
    container.innerHTML = ''
    setStatus('loading')

    ;(async () => {
      const w = container.clientWidth || 393
      for (let i = 1; i <= totalPages; i++) {
        if (cancelled) return
        const panel = document.createElement('div')
        panel.style.cssText = [
          'flex-shrink:0', 'width:100%', 'height:100%',
          'overflow-y:auto', 'overflow-x:hidden',
          'scroll-snap-align:start',
          'display:flex', 'flex-direction:column', 'align-items:center',
          'padding-top:8px',
        ].join(';')
        panel.dataset.page = i
        const c = document.createElement('canvas')
        c.style.cssText = 'display:block;width:100%;flex-shrink:0;'
        await renderPage(pdf, i, c, w)
        if (cancelled) return
        panel.appendChild(c)
        container.appendChild(panel)
      }
      if (cancelled) return
      setStatus('ready')
      onPageInfo?.(currentPage, totalPages)
      isProgramRef.current = true
      container.scrollLeft = (currentPage - 1) * container.clientWidth
      setTimeout(() => { isProgramRef.current = false }, 150)
    })()
    return () => { cancelled = true }
  }, [pdfLoaded, viewMode, totalPages])

  // ── Scroll to currentPage in paged mode ───────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'paged' || status !== 'ready') return
    const el = hScrollRef.current
    if (!el) return
    const target = (currentPage - 1) * el.clientWidth
    if (Math.abs(el.scrollLeft - target) < 5) return
    isProgramRef.current = true
    el.scrollTo({ left: target, behavior: 'smooth' })
    setTimeout(() => { isProgramRef.current = false }, 700)
  }, [currentPage, viewMode, status])

  // ── Scroll → progress (continuous only) ──────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'continuous') return
    const el = scrollRef?.current
    if (!el) return
    const fn = () => { const max = el.scrollHeight - el.clientHeight; if (max > 0) onProgress?.(el.scrollTop / max) }
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [scrollRef, onProgress, viewMode])

  function handlePagedScroll() {
    if (isProgramRef.current) return
    const el = hScrollRef.current
    if (!el) return
    const page = Math.round(el.scrollLeft / el.clientWidth) + 1
    const p = Math.max(1, Math.min(page, totalPages))
    if (p !== currentPage) {
      onPageChange(p)
      onPageInfo?.(p, totalPages)
    }
  }

  if (status === 'error') {
    return <div style={s.center}><div style={s.errorText}>Failed to load PDF</div><div style={s.errorDetail}>{error}</div></div>
  }

  // ── Paged view ────────────────────────────────────────────────────────────
  if (viewMode === 'paged') {
    return (
      <div style={s.pagedWrapper}>
        {status === 'loading' && (
          <div style={s.loadOverlay}>
            <span style={s.spinner} />
            <span style={s.loadingText}>Loading pages…</span>
          </div>
        )}
        <div ref={hScrollRef} style={s.hScroll} onScroll={handlePagedScroll} />
        {status === 'ready' && totalPages > 0 && (
          <div style={s.navRow}>
            <button
              style={{ ...s.navBtn, opacity: currentPage <= 1 ? 0.3 : 1 }}
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >← Prev</button>
            <span style={s.pageLabel}>{currentPage} / {totalPages}</span>
            <button
              style={{ ...s.navBtn, opacity: currentPage >= totalPages ? 0.3 : 1 }}
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >Next →</button>
          </div>
        )}
      </div>
    )
  }

  // ── Continuous view ───────────────────────────────────────────────────────
  return (
    <div style={s.wrapper}>
      {status === 'loading' && (
        <div style={s.center}><span style={s.spinner} /><span style={s.loadingText}>Loading PDF…</span></div>
      )}
      <div ref={containerRef} />
    </div>
  )
})

export default PDFReader

const s = {
  wrapper:      { width: '100%' },
  pagedWrapper: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' },
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
  loadOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, zIndex: 5,
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 },
  spinner: { display: 'inline-block', width: 28, height: 28, border: '3px solid rgba(200,168,75,0.2)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  errorText: { fontSize: 15, fontWeight: 600, color: '#FF3B30' },
  errorDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '0 20px' },
  navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px 16px', borderTop: '1px solid rgba(128,128,128,0.15)', flexShrink: 0 },
  navBtn: { background: 'none', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  pageLabel: { fontSize: 12, color: 'rgba(128,128,128,0.6)', fontWeight: 500 },
}
