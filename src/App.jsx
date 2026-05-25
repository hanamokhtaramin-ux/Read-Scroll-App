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

// Viewport widths below this are treated as real devices (full-screen, no frame)
const FRAME_BREAKPOINT = 768

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
  // Desktop preview: which device frame to show
  const [desktopDevice, setDesktopDevice]     = useState('iphone')
  const [ipadOrientation, setIpadOrientation] = useState('portrait')

  const theme = THEMES[themeKey]

  const useFrame = vp.w >= FRAME_BREAKPOINT

  // Portrait iPad: fits viewport height, 3:4 ratio
  const ipadPortH = Math.min(1024, vp.h - 80)
  const ipadPortW = Math.round(ipadPortH * 3 / 4)
  // Landscape iPad: 4:3 ratio, constrained by both viewport width and height
  const ipadLandW = Math.min(1200, vp.w - 80, Math.round((vp.h - 80) * 4 / 3))
  const ipadLandH = Math.round(ipadLandW * 3 / 4)

  const ipadW = ipadOrientation === 'landscape' ? ipadLandW : ipadPortW
  const ipadH = ipadOrientation === 'landscape' ? ipadLandH : ipadPortH

  const frameW = useFrame ? (desktopDevice === 'ipad' ? ipadW : 393) : vp.w
  const frameH = useFrame ? (desktopDevice === 'ipad' ? ipadH : 852) : vp.h
  const isTablet = frameW >= 600

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

  // ── Desktop preview with device mockup ───────────────────────────────────
  return (
    <AppContext.Provider value={ctx}>
      <div style={s.desktopWrap}>

        {/* Device picker */}
        <div style={s.picker}>
          <button
            style={{ ...s.pickerBtn, ...(desktopDevice === 'iphone' ? s.pickerBtnActive : {}) }}
            onClick={() => setDesktopDevice('iphone')}
          >
            iPhone
          </button>
          <button
            style={{ ...s.pickerBtn, ...(desktopDevice === 'ipad' ? s.pickerBtnActive : {}) }}
            onClick={() => setDesktopDevice('ipad')}
          >
            iPad
          </button>
        </div>

        {/* Orientation picker — iPad only */}
        {desktopDevice === 'ipad' && (
          <div style={{ ...s.picker, marginTop: -6 }}>
            <button
              style={{ ...s.pickerBtn, ...s.pickerBtnSm, ...(ipadOrientation === 'portrait' ? s.pickerBtnActive : {}) }}
              onClick={() => setIpadOrientation('portrait')}
            >
              Portrait
            </button>
            <button
              style={{ ...s.pickerBtn, ...s.pickerBtnSm, ...(ipadOrientation === 'landscape' ? s.pickerBtnActive : {}) }}
              onClick={() => setIpadOrientation('landscape')}
            >
              Landscape
            </button>
          </div>
        )}

        {/* iPhone frame */}
        {desktopDevice === 'iphone' && (
          <div style={s.iphone}>
            <div style={{ ...s.sideBtn, left: -3, top: 140, height: 34 }} />
            <div style={{ ...s.sideBtn, left: -3, top: 188, height: 64 }} />
            <div style={{ ...s.sideBtn, left: -3, top: 266, height: 64 }} />
            <div style={{ ...s.sideBtn, right: -3, top: 200, height: 84 }} />
            <div style={s.notch}><div style={s.notchPill} /></div>
            <div style={{ ...s.screen, background: theme.bg }}>{screenContent}</div>
            <div style={s.homeBar}><div style={s.homeIndicator} /></div>
          </div>
        )}

        {/* iPad frame */}
        {desktopDevice === 'ipad' && (
          <div style={{ ...s.ipad, width: ipadW, height: ipadH }}>
            <div style={ipadOrientation === 'landscape' ? s.ipadCameraLand : s.ipadCamera} />
            <div style={{ ...s.screen, background: theme.bg }}>{screenContent}</div>
            <div style={s.homeBar}><div style={s.homeIndicator} /></div>
          </div>
        )}

      </div>
    </AppContext.Provider>
  )
}

const GOLD = '#C8A84B'

const s = {
  desktopWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: '24px 0 32px',
    width: '100%',
  },
  picker: {
    display: 'flex',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  pickerBtn: {
    padding: '6px 20px',
    borderRadius: 17,
    border: 'none',
    background: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '-0.01em',
  },
  pickerBtnActive: {
    background: GOLD,
    color: '#111',
    boxShadow: '0 2px 8px rgba(200,168,75,0.4)',
  },
  // iPhone frame
  iphone: {
    width: 393,
    height: 852,
    background: '#1C1C1E',
    borderRadius: 52,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: `0 0 0 1px #3A3A3C, 0 0 0 3px #1C1C1E, 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(${GOLD.slice(1).match(/../g).map(x=>parseInt(x,16)).join(',')},0.05)`,
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
    top: 0, left: '50%',
    transform: 'translateX(-50%)',
    width: 126, height: 38,
    background: '#1C1C1E',
    borderRadius: '0 0 22px 22px',
    zIndex: 150,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  notchPill: {
    width: 120, height: 36,
    background: '#0A0A0A',
    borderRadius: '0 0 20px 20px',
  },
  // iPad frame
  ipad: {
    background: '#1C1C1E',
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: `0 0 0 1px #3A3A3C, 0 0 0 3px #1C1C1E, 0 30px 80px rgba(0,0,0,0.7)`,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  ipadCamera: {
    position: 'absolute',
    top: 10, left: '50%',
    transform: 'translateX(-50%)',
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#0A0A0A',
    border: '1.5px solid #2C2C2E',
    zIndex: 150,
  },
  ipadCameraLand: {
    position: 'absolute',
    left: 10, top: '50%',
    transform: 'translateY(-50%)',
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#0A0A0A',
    border: '1.5px solid #2C2C2E',
    zIndex: 150,
  },
  pickerBtnSm: {
    padding: '5px 14px',
    fontSize: 12,
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    transition: 'background 0.35s ease',
  },
  homeBar: {
    height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#1C1C1E',
    flexShrink: 0,
  },
  homeIndicator: {
    width: 134, height: 5,
    background: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
  },
}
