import React, { useEffect, useRef, useState, forwardRef } from 'react'

let pdfjsLib = null

async function getPDFJS() {
  if (pdfjsLib) return pdfjsLib
  const lib = await import('pdfjs-dist')
  const workerUrl = /* @vite-ignore */ new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  lib.GlobalWorkerOptions.workerSrc = workerUrl
  pdfjsLib = lib
  return lib
}

const PDFReader = forwardRef(function PDFReader({ fileData, initialProgress, onProgress, onPageInfo }, scrollRef) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const totalPagesRef = useRef(0)
  const visiblePageRef = useRef(1)
  const observerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        setStatus('loading')
        const lib = await getPDFJS()
        const pdf = await lib.getDocument({ data: fileData.slice(0) }).promise
        if (cancelled) return

        const total = pdf.numPages
        totalPagesRef.current = total
        onPageInfo?.(1, total)

        const container = containerRef.current
        if (!container) return

        container.innerHTML = ''

        const containerWidth = 393

        for (let i = 1; i <= total; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const baseViewport = page.getViewport({ scale: 1.0 })
          const scale = (containerWidth / baseViewport.width) * window.devicePixelRatio
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.display = 'block'
          canvas.dataset.page = i

          const ctx = canvas.getContext('2d')
          await page.render({ canvasContext: ctx, viewport }).promise
          if (cancelled) return

          container.appendChild(canvas)
        }

        // Restore scroll position
        if (initialProgress > 0 && scrollRef?.current) {
          const el = scrollRef.current
          el.scrollTop = initialProgress * (el.scrollHeight - el.clientHeight)
        }

        setStatus('ready')
        setupObserver()
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setStatus('error')
        }
      }
    }

    function setupObserver() {
      const el = scrollRef?.current
      const container = containerRef.current
      if (!el || !container) return

      observerRef.current?.disconnect()

      observerRef.current = new IntersectionObserver(entries => {
        let topmost = null
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const page = parseInt(entry.target.dataset.page)
            if (topmost === null || page < topmost) topmost = page
          }
        }
        if (topmost !== null && topmost !== visiblePageRef.current) {
          visiblePageRef.current = topmost
          onPageInfo?.(topmost, totalPagesRef.current)
        }
      }, { root: el, threshold: 0.1 })

      container.querySelectorAll('canvas[data-page]').forEach(c => {
        observerRef.current.observe(c)
      })
    }

    render()
    return () => {
      cancelled = true
      observerRef.current?.disconnect()
    }
  }, [fileData])

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

  return (
    <div style={s.wrapper}>
      {status === 'loading' && (
        <div style={s.center}>
          <span style={s.spinner} />
          <span style={s.loadingText}>Loading PDF…</span>
        </div>
      )}
      {status === 'error' && (
        <div style={s.center}>
          <div style={s.errorText}>Failed to load PDF</div>
          <div style={s.errorDetail}>{error}</div>
        </div>
      )}
      <div ref={containerRef} style={s.pages} />
    </div>
  )
})

export default PDFReader

const s = {
  wrapper: { width: '100%' },
  pages: { width: '100%' },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    gap: 12,
  },
  spinner: {
    display: 'inline-block',
    width: 28,
    height: 28,
    border: '3px solid rgba(200,168,75,0.2)',
    borderTopColor: '#C8A84B',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  errorText: { fontSize: 15, fontWeight: 600, color: '#FF3B30' },
  errorDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '0 20px' },
}
