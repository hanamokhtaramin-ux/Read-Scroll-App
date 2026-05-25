import JSZip from 'jszip'

function resolvePath(base, relative) {
  if (!base) return relative
  const parts = base.split('/')
  parts.pop()
  for (const seg of relative.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

export async function parseEPUB(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)

  const containerXml = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml')

  const parser = new DOMParser()
  const containerDoc = parser.parseFromString(containerXml, 'application/xml')
  const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path')
  if (!opfPath) throw new Error('Invalid EPUB: missing OPF path')

  const opfDir = opfPath.includes('/') ? opfPath.split('/').slice(0, -1).join('/') : ''
  const opfXml = await zip.file(opfPath)?.async('text')
  if (!opfXml) throw new Error('Invalid EPUB: missing OPF file')

  const opfDoc = parser.parseFromString(opfXml, 'application/xml')

  const manifest = {}
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    manifest[item.getAttribute('id')] = {
      href: item.getAttribute('href'),
      mediaType: item.getAttribute('media-type'),
    }
  })

  const spine = []
  opfDoc.querySelectorAll('spine itemref').forEach(ref => {
    const id = ref.getAttribute('idref')
    if (manifest[id]) spine.push({ id, ...manifest[id] })
  })

  const title =
    opfDoc.querySelector('metadata > title')?.textContent ||
    opfDoc.querySelector('dc\\:title')?.textContent ||
    opfDoc.querySelector('[*|title]')?.getAttribute('dc:title') ||
    'Unknown Title'

  return { zip, opfDir, spine, manifest, title }
}

export async function loadChapter(zip, opfDir, chapterHref) {
  const fullPath = opfDir ? `${opfDir}/${chapterHref}` : chapterHref
  const raw = await zip.file(fullPath)?.async('text')
  if (!raw) return '<p>Chapter not found.</p>'

  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, 'text/html')

  // Inline CSS
  const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]')
  for (const link of styleLinks) {
    const href = link.getAttribute('href')
    if (href) {
      const cssPath = resolvePath(fullPath, href)
      const css = await zip.file(cssPath)?.async('text')
      if (css) {
        const style = doc.createElement('style')
        style.textContent = css
        link.replaceWith(style)
      }
    }
  }

  // Inline images
  const imgs = doc.querySelectorAll('img[src], image[href], image[xlink\\:href]')
  for (const img of imgs) {
    const src = img.getAttribute('src') || img.getAttribute('href') || img.getAttribute('xlink:href')
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      const imgPath = resolvePath(fullPath, src)
      const imgFile = zip.file(imgPath)
      if (imgFile) {
        const b64 = await imgFile.async('base64')
        const ext = src.split('.').pop().toLowerCase().split('?')[0]
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'png' ? 'image/png'
          : ext === 'gif' ? 'image/gif'
          : ext === 'svg' ? 'image/svg+xml'
          : ext === 'webp' ? 'image/webp'
          : 'image/jpeg'
        img.setAttribute('src', `data:${mime};base64,${b64}`)
      }
    }
  }

  return doc.body?.innerHTML || doc.documentElement?.innerHTML || ''
}
