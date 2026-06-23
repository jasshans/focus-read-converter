import JSZip from 'jszip'
import { focusFontCss, getFont } from './fonts.js'

const HTML_EXTENSIONS = /\.(x?html?|xht)$/i
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TITLE', 'HEAD', 'PRE', 'CODE', 'SVG', 'MATH', 'STRONG', 'B'])

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

export async function convertBook(file, requestedFormat, fontId, onProgress) {
  if (!file?.name?.toLowerCase().endsWith('.epub')) {
    throw new Error('Only EPUB input is supported. Choose an .epub file.')
  }
  if (requestedFormat && requestedFormat !== 'epub') {
    throw new Error('Kindle MOBI/AZW3 output is not supported in this browser tool. Choose EPUB focus mode and send the EPUB to Kindle.')
  }

  const { blob, words, chapters } = await processEpub(file, fontId, onProgress)
  onProgress(100, 'Your focus EPUB is ready.')
  const name = outputName(file.name, 'epub')
  return { blob, name, words, chapters, format: 'epub', download: () => downloadBlob(blob, name) }
}
