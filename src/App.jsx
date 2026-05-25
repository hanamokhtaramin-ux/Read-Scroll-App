import React, { useState, useEffect, createContext, useContext } from 'react'
import Library from './components/Library'
import Reader from './components/Reader'

export const THEMES = {
  paper:  { key: 'paper',  bg: '#F9F4EC', text: '#2C2C2E', subtext: '#6C6C70', swatch: '#F9F4EC', label: 'Paper',  dark: false },
  white:  { key: 'white',  bg: '#FFFFFF', text: '#000000', subtext: '#636366', swatch: '#FFFFFF', label: 'White',  dark: false },
  sepia:  { key: 'sepia',  bg: '#EFE4CE', text: '#5C4033', subtext: '#8D6E63', swatch: '#EFE4CE', label: 'Sepia',  dark: false },
  night:  { key: 'night',  bg: '#111214', text: '#E8E8E8', subtext: '#8E8E93', swatch: '#111214', label: 'Night',  dark: true  },
  forest: { key: 'forest', bg: '#0D1A0F', text: '#C8E6C9', subtext: '#81C784', swatch: '#0D1A0F', label: 'Forest', dark: true  },
}

export const FONT_FAMILIES = [
  { name: 'Georgia',  value: 'Georgia, serif' },
  { name: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
  { name: 'Courier',  value: '"Courier New", Courier, monospace' },
  { name: 'Optima',   value: 'Optima, Candara, "Noto Sans", sans-serif' },
  { name: 'Garamond', value: '"EB Garamond", Garamond, serif' },
]

export const FONT_SIZES = [13, 15, 17, 19, 22, 26]

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

// Below this viewport width we assume we're running on a real device (no frame)
const FRAME_BREAKPOINT = 1100

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const fn = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return size
}

export default function App() {
  const vp = useWindowSize()
  const [currentBook, setCurrentBook] = useState(null)
  const [themeKey, setThemeKey]       = useState('paper')
  const [fontIndex, setFontIndex]     = useState(4)
  const [fontSize, setFontSize]       = useState(17)

  const theme = THEMES[themeKey]

  // On a real device (iPhone or iPad running in Capacitor, or any narrow browser)
  // we fill the screen. On a wide desktop we show a device mockup for preview.
  const useFrame = vp.w >= FRAME_BREAKPOINT
  const frameW   = useFrame ? 393 : vp.w
  const frameH   = useFrame ? 852 : vp.h
  const isTablet = frameW >= 600   // tablet layout threshold

  const ctx = {
    theme, themeKey, setThemeKey, THEMES,
    fontIndex, setFontIndex, FONT_FAMILIES,
    fontSize, setFontSize, FONT_SIZES,
    frameW, frameH, isTablet,
  }

  const screenContent = currentBook
    ? <Reader book={currentBook} onBack={() => setCurrentBook(null)} />
    : <Library onOpenBook={setCurrentBook} />

  // ── Full-screen mode (real device) ───────────────────────────────────────
  if (!useFrame) {
    return (
      <AppContext.Provider value={ctx}>
        <div style={{ width: vp.w, height: vp.h, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: theme.bg }}>
          {screenContent}
        </div>
      </AppContext.Provider>
    )
  }

  // ── iPhone mockup (desktop web preview) ──────────────────────────────────
  return (
    <AppContext.Provider value={ctx}>
      <div style={s.page}>
        {/* Left side buttons */}
        <div style={{ ...s.sideBtn, left: -3, top: 140, height: 34 }} />
        <div style={{ ...s.sideBtn, left: -3, top: 188, height: 64 }} />
        <div style={{ ...s.sideBtn, left: -3, top: 266, height: 64 }} />
        {/* Right side button */}
        <div style={{ ...s.sideBtn, right: -3, top: 200, height: 84 }} />

        {/* Notch */}
        <div style={s.notch}>
          <div style={s.notchPill} />
        </div>

        {/* Screen */}
        <div style={{ ...s.screen, background: theme.bg }}>
          {screenContent}
        </div>

        {/* Home indicator */}
        <div style={s.homeBar}>
          <div style={s.homeIndicator} />
        </div>
      </div>
    </AppContext.Provider>
  )
}

const GOLD = '#C8A84B'

const s = {
  page: {
    width: 393,
    height: 852,
    background: '#1C1C1E',
    borderRadius: 52,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: `0 0 0 1px #3A3A3C, 0 0 0 3px #1C1C1E, 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(${GOLD.slice(1).match(/../g).map(x => parseInt(x,16)).join(',')},0.05)`,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sideBtn: {
    position: 'absolute',
    width: 4,
    background: '#2C2C2E',
    borderRadius: 2,
    zIndex: 200,
  },
  notch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 126,
    height: 38,
    background: '#1C1C1E',
    borderRadius: '0 0 22px 22px',
    zIndex: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notchPill: {
    width: 120,
    height: 36,
    background: '#0A0A0A',
    borderRadius: '0 0 20px 20px',
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    transition: 'background 0.35s ease',
  },
  homeBar: {
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1C1C1E',
  },
  homeIndicator: {
    width: 134,
    height: 5,
    background: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
  },
}
