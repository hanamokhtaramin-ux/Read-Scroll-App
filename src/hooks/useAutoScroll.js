import { useEffect, useRef, useCallback } from 'react'

// Speed levels in pixels per second
export const SPEEDS = [20, 40, 65, 95, 150]
export const SPEED_LABELS = ['0.5×', '1×', '1.5×', '2×', '3×']

export function useAutoScroll(containerRef, isPlaying, speedIndex, onEnd) {
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

    const speed = SPEEDS[speedIndex] ?? SPEEDS[1]

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
  }, [isPlaying, speedIndex, containerRef, stop, onEnd])

  return { stop }
}
