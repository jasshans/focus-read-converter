// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyFocusReading, convertBook, createMobi } from './converter.js'

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
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

  it('keeps focus marks inside the XHTML namespace', () => {
    const result = applyFocusReading('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head/><body><p>Focus</p></body></html>')
    expect(result.markup).not.toContain('xmlns=""')
    expect(result.markup).toContain('data-focus="true"')
  })
})

describe('createMobi', () => {
  it('creates a Palm database MOBI container', async () => {
    const blob = createMobi(['<html><body><p><strong data-focus="true">Hel</strong>lo</p></body></html>'], { title: 'Test book' }, 'georgia')
    const bytes = await readBlob(blob)
    expect(new TextDecoder().decode(bytes.slice(60, 68))).toBe('BOOKMOBI')
    expect(bytes.length).toBeGreaterThan(300)
  })

  it('converts MOBI to a new focused MOBI with the chosen font', async () => {
    const source = createMobi(['<html><body><p>Hello focused world.</p></body></html>'], { title: 'Source book' })
    const input = await readBlob(source)
    input.name = 'source.mobi'
    const result = await convertBook(input, 'keep', 'georgia', () => {})
    const output = new TextDecoder().decode(await readBlob(result.blob))
    expect(result.format).toBe('mobi')
    expect(result.words).toBe(3)
    expect(output).toContain('data-focus="true"')
    expect(output).toContain('font face="Georgia"')
  })
})
