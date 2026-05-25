import React from 'react'
import { useApp } from '../App'

const GOLD = '#C8A84B'

export default function SettingsPanel({ onInteract }) {
  const { theme, themeKey, setThemeKey, THEMES, fontIndex, setFontIndex, FONT_FAMILIES, fontSize, setFontSize, FONT_SIZES } = useApp()

  function wrap(fn) {
    return (...args) => {
      onInteract?.()
      fn(...args)
    }
  }

  return (
    <div style={s.panel}>
      <div style={s.divider} />

      {/* Themes */}
      <div style={s.section}>
        <div style={s.sectionLabel}>Page Theme</div>
        <div style={s.themeRow}>
          {Object.values(THEMES).map(t => (
            <button
              key={t.key}
              title={t.label}
              style={{
                ...s.themeSwatch,
                background: t.bg,
                border: themeKey === t.key ? `2px solid ${GOLD}` : '2px solid rgba(255,255,255,0.12)',
              }}
              onClick={wrap(() => setThemeKey(t.key))}
            >
              {themeKey === t.key && <span style={s.swatchCheck}>✓</span>}
              <span style={{ ...s.swatchLabel, color: t.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div style={s.section}>
        <div style={s.sectionLabel}>Font Family</div>
        <div style={s.fontRow}>
          {FONT_FAMILIES.map((f, i) => (
            <button
              key={f.name}
              style={{
                ...s.fontBtn,
                fontFamily: f.value,
                ...(i === fontIndex ? s.fontBtnActive : {}),
              }}
              onClick={wrap(() => setFontIndex(i))}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div style={s.section}>
        <div style={s.sectionLabel}>Font Size</div>
        <div style={s.sizeRow}>
          {FONT_SIZES.map((size, i) => (
            <button
              key={size}
              style={{
                ...s.sizeBtn,
                ...(fontSize === size ? s.sizeBtnActive : {}),
              }}
              onClick={wrap(() => setFontSize(size))}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    animation: 'slideUp 0.2s ease',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.1)',
    margin: '0 -4px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  themeRow: {
    display: 'flex',
    gap: 6,
  },
  themeSwatch: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    transition: 'border-color 0.15s',
  },
  swatchCheck: {
    fontSize: 10,
    color: GOLD,
    position: 'absolute',
    top: 3,
    right: 5,
  },
  swatchLabel: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  fontRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  fontBtn: {
    flex: '1 0 auto',
    minWidth: 80,
    padding: '7px 8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid transparent',
    borderRadius: 10,
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'all 0.15s',
  },
  fontBtnActive: {
    background: 'rgba(200,168,75,0.15)',
    borderColor: GOLD,
    color: GOLD,
  },
  sizeRow: {
    display: 'flex',
    gap: 6,
  },
  sizeBtn: {
    flex: 1,
    padding: '7px 0',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid transparent',
    borderRadius: 10,
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  sizeBtnActive: {
    background: 'rgba(200,168,75,0.15)',
    borderColor: GOLD,
    color: GOLD,
  },
}
