import React, { useState, useEffect, useRef } from 'react'
import BookCard from './BookCard'
import { getAllBooks, saveBook, removeBook } from '../utils/storage'
import { getBookEmoji, getBookGradient, generateBookId } from '../utils/bookUtils'
import { parseEPUB } from '../utils/epubParser'

const GOLD = '#C8A84B'

export default function Library({ onOpenBook }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const bookCount = useRef(0)

  useEffect(() => {
    getAllBooks().then(list => {
      setBooks(list.sort((a, b) => b.addedAt - a.addedAt))
      bookCount.current = list.length
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function importFile(file) {
    if (!file) return
    const type = file.name.toLowerCase().endsWith('.epub') ? 'epub'
      : file.name.toLowerCase().endsWith('.pdf') ? 'pdf'
      : null

    if (!type) { alert('Please select a PDF or EPUB file.'); return }

    setImporting(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const idx = bookCount.current++
      let title = file.name.replace(/\.(pdf|epub)$/i, '')

      if (type === 'epub') {
        try {
          const { title: epubTitle } = await parseEPUB(arrayBuffer.slice(0))
          if (epubTitle && epubTitle !== 'Unknown Title') title = epubTitle
        } catch (_) {}
      }

      const book = {
        id: generateBookId(),
        title,
        type,
        fileData: arrayBuffer,
        progress: 0,
        chapterIndex: 0,
        emoji: getBookEmoji(idx),
        gradient: getBookGradient(idx),
        addedAt: Date.now(),
      }

      await saveBook(book)
      setBooks(prev => [book, ...prev])
    } catch (err) {
      alert('Failed to import file: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  function handleFileInput(e) {
    importFile(e.target.files[0])
    e.target.value = ''
  }

  async function handleDelete(id) {
    await removeBook(id)
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    importFile(file)
  }

  return (
    <div
      style={{ ...s.root, ...(dragOver ? s.dragOver : {}) }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <div>
            <div style={s.headerLabel}>MY LIBRARY</div>
            <div style={s.headerTitle}>Scroll Reader</div>
          </div>
          <button style={s.addBtn} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <span style={s.spinner} /> : '+'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.epub"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* Content */}
      <div style={s.scrollArea}>
        {loading ? (
          <div style={s.empty}>
            <span style={s.spinner} />
          </div>
        ) : books.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyEmoji}>📚</div>
            <div style={s.emptyTitle}>Your library is empty</div>
            <div style={s.emptyHint}>Tap + to import a PDF or EPUB</div>
            <div style={s.emptyHint} />
            <button style={s.importBtn} onClick={() => fileInputRef.current?.click()}>
              Import Book
            </button>
          </div>
        ) : (
          <div style={s.grid}>
            {books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={onOpenBook}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {dragOver && (
        <div style={s.dropOverlay}>
          <div style={s.dropText}>📂 Drop to import</div>
        </div>
      )}
    </div>
  )
}

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#111214',
    position: 'relative',
    transition: 'background 0.2s',
  },
  dragOver: {
    background: 'rgba(200,168,75,0.06)',
  },
  header: {
    paddingTop: 52,
    paddingBottom: 12,
    paddingLeft: 20,
    paddingRight: 20,
    background: 'linear-gradient(180deg, #111214 0%, #111214 80%, transparent 100%)',
    zIndex: 5,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: GOLD,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: GOLD,
    color: '#111',
    border: 'none',
    fontSize: 22,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 4px 14px rgba(200,168,75,0.4)`,
    transition: 'transform 0.15s ease, opacity 0.15s',
    flexShrink: 0,
    lineHeight: 1,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 16px 40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
    gap: 12,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 400,
    gap: 10,
    textAlign: 'center',
  },
  emptyEmoji: { fontSize: 54, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: '#FFFFFF' },
  emptyHint: { fontSize: 13, color: '#636366' },
  importBtn: {
    marginTop: 12,
    padding: '12px 28px',
    background: GOLD,
    color: '#111',
    border: 'none',
    borderRadius: 24,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: `0 4px 16px rgba(200,168,75,0.35)`,
  },
  spinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2px solid rgba(200,168,75,0.3)',
    borderTopColor: GOLD,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  dropOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(200,168,75,0.12)',
    border: `2px dashed ${GOLD}`,
    borderRadius: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backdropFilter: 'blur(2px)',
  },
  dropText: {
    fontSize: 20,
    fontWeight: 600,
    color: GOLD,
  },
}
