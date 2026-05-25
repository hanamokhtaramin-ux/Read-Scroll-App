const BOOK_EMOJIS = ['📖', '📚', '📕', '📗', '📘', '📙', '🔖', '📜', '🗺️', '🌍', '🌌', '🏛️', '🔮', '🌺', '🦋', '🌿', '⚡', '🌊', '🔥', '🌙']

const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#a1c4fd', '#c2e9fb'],
  ['#fd7043', '#ff8a65'],
  ['#26a69a', '#80cbc4'],
  ['#ef5350', '#e57373'],
  ['#ab47bc', '#ce93d8'],
  ['#42a5f5', '#90caf9'],
  ['#66bb6a', '#a5d6a7'],
  ['#ffa726', '#ffcc80'],
]

export function getBookEmoji(index) {
  return BOOK_EMOJIS[index % BOOK_EMOJIS.length]
}

export function getBookGradient(index) {
  return GRADIENTS[index % GRADIENTS.length]
}

export function generateBookId() {
  return `book_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function formatProgress(progress) {
  if (!progress || progress === 0) return 'Not started'
  const pct = Math.round(progress * 100)
  return `${pct}% read`
}
