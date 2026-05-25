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

async function renderPageToCanvas(pdf, pageNum, canvas, containerWidth) {
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
  const containerRef  = useRef(null) // continuous
  const canvasRef     = useRef(null) // paged
  const pdfRef        = useRef(null)
  const observerRef   = useRef(null)

  const [pdfLoaded, setPdfLoaded]   = useState(false)
  const [totalPages, setTotalPages] = useState(0)
  const [status, setStatus]         = useState('loading')
  const [error, setError]           = useState(null)

  // Load PDF once
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setPdfLoaded(false)
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

  // Continuous mode: render all pages
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
      const W = 393
      for (let i = 1; i <= totalPages; i++) {
        if (cancelled) return
        const canvas = document.createElement('canvas')
        canvas.style.display = 'block'
        canvas.dataset.page = i
        await renderPageToCanvas(pdf, i, canvas, W)
        if (cancelled) return
        container.appendChild(canvas)
      }

      if (initialProgress > 0 && scrollRef?.current) {
        const el = scrollRef.current
        el.scrollTop = initialProgress * (el.scrollHeight - el.clientHeight)
      }

      setStatus('ready')

      // IntersectionObserver for current page tracking
      const el = scrollRef?.current
      if (!el) return
      observerRef.current?.disconnect()
      observerRef.current = new IntersectionObserver(entries => {
        let topmost = null
        for (const e of entries) {
          if (e.isIntersecting) {
            const p = parseInt(e.target.dataset.page)
            if (topmost === null || p < topmost) topmost = p
          }
        }
        if (topmost !== null) onPageInfo?.(topmost, totalPages)
      }, { root: el, threshold: 0.1 })
      container.querySelectorAll('canvas[data-page]').forEach(c => observerRef.current.observe(c))
    })()

    return () => { cancelled = true; observerRef.current?.disconnect() }
  }, [pdfLoaded, viewMode, totalPages])

  // Paged mode: render one page
  useEffect(() => {
    if (!pdfLoaded || viewMode !== 'paged') return
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const page = Math.max(1, Math.min(currentPage, totalPages))
    renderPageToCanvas(pdf, page, canvas, 393)
      .then(() => { setStatus('ready'); onPageInfo?.(page, totalPages) })
      .catch(console.error)
  }, [pdfLoaded, viewMode, currentPage, totalPages])

  // Scroll → progress (continuous only)
  useEffect(() => {
    if (viewMode !== 'continuous') return
    const el = scrollRef?.current
    if (!el) return
    const fn = () => {
      const max = el.scrollHeight - el.clientHeight
      if (max > 0) onProgress?.(el.scrollTop / max)
    }
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [scrollRef, onProgress, viewMode])

  if (status === 'error') {
    return (
      <div style={s.center}>
        <div style={s.errorText}>Failed to load PDF</div>
        <div style={s.errorDetail}>{error}</div>
      </div>
    )
  }

  // Paged view
  if (viewMode === 'paged') {
    return (
      <div style={s.pagedWrapper}>
        {!pdfLoaded && <div style={s.center}><span style={s.spinner} /></div>}
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
        {totalPages > 0 && (
          <div style={s.navRow}>
            <button
              style={{ ...s.navBtn, opacity: currentPage <= 1 ? 0.3 : 1 }}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >← Prev</button>
            <span style={s.pageLabel}>{currentPage} / {totalPages}</span>
            <button
              style={{ ...s.navBtn, opacity: currentPage >= totalPages ? 0.3 : 1 }}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >Next →</button>
          </div>
        )}
      </div>
    )
  }

  // Continuous view
  return (
    <div style={s.wrapper}>
      {status === 'loading' && (
        <div style={s.center}>
          <span style={s.spinner} />
          <span style={s.loadingText}>Loading PDF…</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
})

export default PDFReader

const s = {
  wrapper: { width: '100%' },
  pagedWrapper: { width: '100%' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 },
  spinner: { display: 'inline-block', width: 28, height: 28, border: '3px solid rgba(200,168,75,0.2)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  errorText: { fontSize: 15, fontWeight: 600, color: '#FF3B30' },
  errorDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '0 20px' },
  navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 32px' },
  navBtn: { background: 'none', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  pageLabel: { fontSize: 12, color: 'rgba(128,128,128,0.6)', fontWeight: 500 },
}
