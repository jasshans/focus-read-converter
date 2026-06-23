// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { applyFocusReading, convertBook } from './converter.js'

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function makeEpub(name = 'source.epub') {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file('chapter.xhtml', '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Test</title></head><body><p>Hello focused world.</p></body></html>')
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  bytes.name = name
  return bytes
}

describe('applyFocusReading', () => {
  it('emphasizes the first half of each word without changing punctuation', () => {
    const result = applyFocusReading('<html><head></head><body><p>Hello, world!</p></body></html>', 'georgia')
    expect(result.markup).toContain('<strong data-focus="true">Hel</strong>lo, <strong data-focus="true">wor</strong>ld!')
    expect(result.markup).toContain('font-family:Georgia, serif')
    expect(result.wordCount).toBe(2)
  })

  it('does not process existing bold or code content twice', () => {
    const result = applyFocusReading('<html><body><strong>Already</strong><code>const value</code><p>Ready</p></body></html>')
    expect(result.wordCount).toBe(1)
    expect(result.markup).toContain('<code>const value</code>')
  })

  it('does not split an already focused document a second time', () => {
    const source = '<html><body><p><strong data-focus="true">Hel</strong>lo</p></body></html>'
    const result = applyFocusReading(source, 'verdana')
    expect(result.wordCount).toBe(1)
    expect(result.markup).not.toContain('data-focus="true">l</strong>o')
    expect(result.markup).toContain('font-family:Verdana')
  })

  it('migrates legacy focus markers without emphasizing the word again', () => {
    const source = '<html><body><p><strong data-bionic="true">Hel</strong>lo</p></body></html>'
    const result = applyFocusReading(source)
    expect(result.wordCount).toBe(1)
    expect(result.markup).not.toContain('data-bionic')
    expect(result.markup).toContain('<strong data-focus="true">Hel</strong>lo')
  })

  it('keeps focus marks inside the XHTML namespace', () => {
    const result = applyFocusReading('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head/><body><p>Focus</p></body></html>')
    expect(result.markup).not.toContain('xmlns=""')
    expect(result.markup).toContain('data-focus="true"')
  })
})

describe('convertBook', () => {
  it('converts EPUB to a focused EPUB while preserving the package', async () => {
    const result = await convertBook(await makeEpub(), 'epub', 'bookerly', () => {})
    const outputZip = await JSZip.loadAsync(await readBlob(result.blob))
    const chapter = await outputZip.file('chapter.xhtml').async('string')
    expect(result.format).toBe('epub')
    expect(result.name).toBe('source-focus.epub')
    expect(result.words).toBe(3)
    expect(chapter).toContain('data-focus="true"')
    expect(await outputZip.file('mimetype').async('string')).toBe('application/epub+zip')
  })

  it('rejects non-EPUB output requests with a clear Kindle message', async () => {
    await expect(convertBook(await makeEpub(), 'azw3', 'bookerly', () => {})).rejects.toThrow('MOBI/AZW3 output is not supported')
  })

  it('rejects MOBI input with a clear message', async () => {
    const input = new Uint8Array([1, 2, 3])
    input.name = 'source.mobi'
    await expect(convertBook(input, 'mobi', 'bookerly', () => {})).rejects.toThrow('Only EPUB input is supported')
  })
})
