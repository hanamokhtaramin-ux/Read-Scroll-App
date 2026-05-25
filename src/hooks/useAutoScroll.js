import { useEffect, useRef, useCallback } from 'react'

export function useAutoScroll(containerRef, isPlaying, speed, onEnd) {
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    lastTimeRef.current = null
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      stop()
      return
    }

    const tick = (timestamp) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp
      }
      const dt = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      const el = containerRef.current
      if (el) {
        const delta = (speed * dt) / 1000
        el.scrollTop += delta

        const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
        if (atEnd) {
          stop()
          onEnd?.()
          return
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return stop
  }, [isPlaying, speed, containerRef, stop, onEnd])

  return { stop }
}
