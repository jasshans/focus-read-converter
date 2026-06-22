import JSZip from 'jszip'
import { focusFontCss, getFont } from './fonts.js'

const HTML_EXTENSIONS = /\.(x?html?|xht)$/i
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TITLE', 'HEAD', 'PRE', 'CODE', 'SVG', 'MATH', 'STRONG', 'B'])
const encoder = new TextEncoder()

function splitWord(word) {
  const characters = Array.from(word)
  const cut = Math.max(1, Math.ceil(characters.length / 2))
  return [characters.slice(0, cut).join(''), characters.slice(cut).join('')]
}

function shouldSkipNode(node) {
  let parent = node.parentElement
  while (parent) {
    if (SKIP_TAGS.has(parent.tagName) || parent.dataset?.focus === 'true') return true
    parent = parent.parentElement
  }
  return false
}

export function applyFocusReading(markup, fontId = 'bookerly', forceHtml = false) {
  const font = getFont(fontId)
  const isXml = !forceHtml && /^\s*<\?xml|xmlns=["']http:\/\/www\.w3\.org\/1999\/xhtml/i.test(markup)
  const mime = isXml ? 'application/xhtml+xml' : 'text/html'
  const document = new DOMParser().parseFromString(markup, mime)
  if (isXml && document.getElementsByTagName('parsererror').length) {
    return applyFocusReading(markup.replace(/^\s*<\?xml[^>]*\?>/i, ''), fontId, true)
  }

  const root = document.body || document.documentElement
  document.querySelectorAll('[data-bionic="true"]').forEach((mark) => {
    mark.removeAttribute('data-bionic')
    mark.setAttribute('data-focus', 'true')
  })
  const existingFocusCount = document.querySelectorAll('[data-focus="true"]').length
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (!existingFocusCount && walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeValue?.trim() && !shouldSkipNode(node)) nodes.push(node)
  }

  let wordCount = existingFocusCount
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'word' })
    : null

  for (const node of nodes) {
    const text = node.nodeValue
    const fragment = document.createDocumentFragment()
    let cursor = 0
    const segments = segmenter
      ? Array.from(segmenter.segment(text)).filter((part) => part.isWordLike)
      : Array.from(text.matchAll(/[\p{L}\p{N}]+/gu), (match) => ({ segment: match[0], index: match.index }))

    for (const part of segments) {
      const start = part.index
      const word = part.segment
      if (start > cursor) fragment.append(text.slice(cursor, start))
      const [focus, rest] = splitWord(word)
      const namespace = isXml ? (node.parentElement?.namespaceURI || document.documentElement.namespaceURI) : null
      const strong = namespace ? document.createElementNS(namespace, 'strong') : document.createElement('strong')
      strong.setAttribute('data-focus', 'true')
      strong.textContent = focus
      fragment.append(strong, rest)
      cursor = start + word.length
      wordCount += 1
    }
    if (cursor < text.length) fragment.append(text.slice(cursor))
    if (segments.length) node.replaceWith(fragment)
  }

  const head = document.head || document.getElementsByTagName('head')[0]
  if (head) {
    const previousStyle = document.getElementById('focus-read-style')
    previousStyle?.remove()
    const namespace = isXml ? (head.namespaceURI || document.documentElement.namespaceURI) : null
    const style = namespace ? document.createElementNS(namespace, 'style') : document.createElement('style')
    style.setAttribute('id', 'focus-read-style')
    style.textContent = `body{${focusFontCss(font)}}strong[data-focus="true"]{font-weight:800}`
    head.append(style)
  }

  const output = isXml
    ? new XMLSerializer().serializeToString(document)
    : `<!doctype html>\n${document.documentElement.outerHTML}`
  return { markup: output, wordCount }
}

function cleanFilename(filename) {
  return filename.replace(/\.epub$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'book'
}

function outputName(inputName, extension) {
  return `${cleanFilename(inputName)}-focus.${extension}`
}

function escapeXml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function processEpub(file, fontId, onProgress) {
  onProgress(4, 'Opening the EPUB package…')
  const zip = await JSZip.loadAsync(file)
  const contentFiles = Object.values(zip.files).filter((entry) => !entry.dir && HTML_EXTENSIONS.test(entry.name))
  if (!contentFiles.length) throw new Error('No readable HTML chapters were found. The book may be DRM-protected or damaged.')

  let words = 0
  for (let index = 0; index < contentFiles.length; index += 1) {
    const entry = contentFiles[index]
    onProgress(12 + Math.round((index / contentFiles.length) * 58), `Adding reading cues to chapter ${index + 1} of ${contentFiles.length}…`)
    const original = await entry.async('string')
    const result = applyFocusReading(original, fontId)
    words += result.wordCount
    zip.file(entry.name, result.markup)
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (zip.file('mimetype')) zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  onProgress(72, 'Packing your new EPUB…')
  const blob = await zip.generateAsync(
    { type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    ({ percent }) => onProgress(72 + Math.round(percent * 0.26), 'Packing your new EPUB…'),
  )
  return { blob, words, chapters: contentFiles.length }
}

function writeUint16(view, offset, value) { view.setUint16(offset, value, false) }
function writeUint32(view, offset, value) { view.setUint32(offset, value >>> 0, false) }
function writeAscii(bytes, offset, text, max = text.length) {
  for (let index = 0; index < Math.min(text.length, max); index += 1) bytes[offset + index] = text.charCodeAt(index)
}

export function createMobi(chapters, metadata = {}, fontId = 'bookerly') {
  const font = getFont(fontId)
  const title = metadata.title || 'Focus edition'
  const body = chapters.map((chapter) => {
    const bodyMatch = chapter.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    return bodyMatch?.[1] || chapter
  }).join('<mbp:pagebreak/>')
  const html = `<html><head><meta charset="utf-8"><title>${escapeXml(title)}</title><style>body{${focusFontCss(font)}}strong[data-focus="true"]{font-weight:800}</style></head><body><font face="${escapeXml(font.mobiFace)}">${body}</font></body></html>`
  const text = encoder.encode(html)
  const textRecords = []
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + 4096, text.length)
    while (end < text.length && (text[end] & 0xc0) === 0x80) end -= 1
    textRecords.push(text.slice(start, end))
    start = end
  }

  const titleBytes = encoder.encode(title)
  const exthPayloadLength = 8 + titleBytes.length
  const exthUnpaddedLength = 12 + exthPayloadLength
  const exthLength = exthUnpaddedLength + ((4 - (exthUnpaddedLength % 4)) % 4)
  const exth = new Uint8Array(exthLength)
  const exthView = new DataView(exth.buffer)
  writeAscii(exth, 0, 'EXTH')
  writeUint32(exthView, 4, exthLength)
  writeUint32(exthView, 8, 1)
  writeUint32(exthView, 12, 503)
  writeUint32(exthView, 16, exthPayloadLength)
  exth.set(titleBytes, 20)

  const titleOffset = 16 + 232 + exthLength
  const record0 = new Uint8Array(titleOffset + titleBytes.length)
  const r0 = new DataView(record0.buffer)
  writeUint16(r0, 0, 1)
  writeUint32(r0, 4, text.length)
  writeUint16(r0, 8, textRecords.length)
  writeUint16(r0, 10, 4096)
  writeAscii(record0, 16, 'MOBI')
  writeUint32(r0, 20, 232)
  writeUint32(r0, 24, 2)
  writeUint32(r0, 28, 65001)
  writeUint32(r0, 32, Math.floor(Math.random() * 0xffffffff))
  writeUint32(r0, 36, 6)
  for (let offset = 40; offset <= 76; offset += 4) writeUint32(r0, offset, 0xffffffff)
  writeUint32(r0, 80, textRecords.length + 1)
  writeUint32(r0, 84, titleOffset)
  writeUint32(r0, 88, titleBytes.length)
  writeUint32(r0, 92, 9)
  writeUint32(r0, 104, 6)
  writeUint32(r0, 108, textRecords.length + 1)
  writeUint32(r0, 128, 0x40)
  for (let offset = 140; offset <= 152; offset += 4) writeUint32(r0, offset, 0xffffffff)
  record0.set(exth, 248)
  record0.set(titleBytes, titleOffset)

  const eof = new Uint8Array([0xe9, 0x8e, 0x0d, 0x0a])
  const records = [record0, ...textRecords, eof]
  const headerLength = 78 + records.length * 8 + 2
  const totalLength = headerLength + records.reduce((sum, record) => sum + record.length, 0)
  const output = new Uint8Array(totalLength)
  const view = new DataView(output.buffer)
  writeAscii(output, 0, title, 31)
  const palmEpoch = Math.floor(Date.now() / 1000) + 2082844800
  writeUint32(view, 36, palmEpoch)
  writeUint32(view, 40, palmEpoch)
  writeAscii(output, 60, 'BOOK')
  writeAscii(output, 64, 'MOBI')
  writeUint32(view, 68, records.length + 1)
  writeUint16(view, 76, records.length)
  let recordOffset = headerLength
  records.forEach((record, index) => {
    writeUint32(view, 78 + index * 8, recordOffset)
    writeUint32(view, 82 + index * 8, index * 2)
    output.set(record, recordOffset)
    recordOffset += record.length
  })
  return new Blob([output], { type: 'application/x-mobipocket-ebook' })
}

export async function convertBook(file, requestedFormat, fontId, onProgress) {
  if (!file?.name?.toLowerCase().endsWith('.epub')) {
    throw new Error('Only EPUB input is supported. Choose an .epub file.')
  }
  const outputFormat = requestedFormat === 'mobi' ? 'mobi' : 'epub'
  let blob
  let words
  let chapters

  if (outputFormat === 'epub') {
    const result = await processEpub(file, fontId, onProgress)
    ;({ blob, words, chapters } = result)
  } else {
    onProgress(6, 'Reading the EPUB structure…')
    const zip = await JSZip.loadAsync(file)
    const entries = Object.values(zip.files).filter((entry) => !entry.dir && HTML_EXTENSIONS.test(entry.name))
    if (!entries.length) throw new Error('No readable HTML chapters were found. The book may be DRM-protected or damaged.')
    const transformed = []
    words = 0
    for (let index = 0; index < entries.length; index += 1) {
      onProgress(15 + Math.round((index / entries.length) * 52), `Adding reading cues to chapter ${index + 1} of ${entries.length}…`)
      const result = applyFocusReading(await entries[index].async('string'), fontId)
      transformed.push(result.markup)
      words += result.wordCount
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    chapters = transformed.length
    onProgress(78, 'Building a compatible MOBI edition…')
    blob = createMobi(transformed, { title: cleanFilename(file.name) }, fontId)
    onProgress(98, 'Finishing your MOBI edition…')
  }

  onProgress(100, 'Your focus edition is ready.')
  const name = outputName(file.name, outputFormat)
  return { blob, name, words, chapters, format: outputFormat, download: () => downloadBlob(blob, name) }
}
