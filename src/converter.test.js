// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyBionicReading, createMobi } from './converter.js'

describe('applyBionicReading', () => {
  it('emphasizes the first half of each word without changing punctuation', () => {
    const result = applyBionicReading('<html><body><p>Hello, world!</p></body></html>')
    expect(result.markup).toContain('<strong data-bionic="true">Hel</strong>lo, <strong data-bionic="true">wor</strong>ld!')
    expect(result.wordCount).toBe(2)
  })

  it('does not process existing bold or code content twice', () => {
    const result = applyBionicReading('<html><body><strong>Already</strong><code>const value</code><p>Ready</p></body></html>')
    expect(result.wordCount).toBe(1)
    expect(result.markup).toContain('<code>const value</code>')
  })
})

describe('createMobi', () => {
  it('creates a Palm database MOBI container', async () => {
    const blob = createMobi(['<html><body><p><strong data-bionic="true">Hel</strong>lo</p></body></html>'], { title: 'Test book' })
    const buffer = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(blob)
    })
    const bytes = new Uint8Array(buffer)
    expect(new TextDecoder().decode(bytes.slice(60, 68))).toBe('BOOKMOBI')
    expect(bytes.length).toBeGreaterThan(300)
  })
})
