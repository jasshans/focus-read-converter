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

function removeExth(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const recordCount = view.getUint16(76, false)
  const record0Offset = view.getUint32(78, false)
  const mobiHeaderLength = view.getUint32(record0Offset + 20, false)
  const exthOffset = record0Offset + 16 + mobiHeaderLength
  const exthLength = view.getUint32(exthOffset + 4, false)
  const legacy = new Uint8Array(bytes.length - exthLength)
  legacy.set(bytes.slice(0, exthOffset), 0)
  legacy.set(bytes.slice(exthOffset + exthLength), exthOffset)
  const legacyView = new DataView(legacy.buffer)
  for (let index = 0; index < recordCount; index += 1) {
    const tableOffset = 78 + index * 8
    const oldOffset = view.getUint32(tableOffset, false)
    legacyView.setUint32(tableOffset, oldOffset > exthOffset ? oldOffset - exthLength : oldOffset, false)
  }
  legacyView.setUint32(record0Offset + 84, view.getUint32(record0Offset + 84, false) - exthLength, false)
  legacyView.setUint32(record0Offset + 128, view.getUint32(record0Offset + 128, false) & ~0x40, false)
  return legacy
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

  it('repairs a legacy MOBI that has no EXTH metadata block', async () => {
    const source = createMobi(['<html><body><p>Legacy summer reading.</p></body></html>'], { title: 'Legacy book' })
    const input = removeExth(await readBlob(source))
    input.name = 'legacy-no-exth.mobi'
    const result = await convertBook(input, 'keep', 'bookerly', () => {})
    const output = await readBlob(result.blob)
    const outputView = new DataView(output.buffer)
    const record0Offset = outputView.getUint32(78, false)
    expect(result.words).toBe(3)
    expect(outputView.getUint32(record0Offset + 128, false) & 0x40).toBe(0x40)
    expect(new TextDecoder().decode(output)).toContain('data-focus="true"')
  })
})
