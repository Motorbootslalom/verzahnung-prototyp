import { describe, it, expect } from 'vitest'
import { normalizeSize, sizeRank, isKnownSize, SIZES } from './sizes'

describe('sizes', () => {
  it('normalisiert Schreibweisen und Varianten', () => {
    expect(normalizeSize(' m ')).toBe('M')
    expect(normalizeSize('xxl')).toBe('XXL')
    expect(normalizeSize('2XL')).toBe('XXL')
    expect(normalizeSize('3xl')).toBe('XXXL')
    expect(normalizeSize('')).toBe('')
  })

  it('lässt unbekannte Größen unverändert (getrimmt)', () => {
    expect(normalizeSize(' 128 ')).toBe('128')
  })

  it('sortiert klein → groß, Unbekanntes ans Ende', () => {
    expect(sizeRank('XS')).toBeLessThan(sizeRank('XXL'))
    expect(sizeRank('M')).toBeLessThan(sizeRank('XL'))
    expect(sizeRank('unbekannt')).toBe(SIZES.length)
    expect(sizeRank('')).toBe(SIZES.length)
  })

  it('erkennt bekannte Größen', () => {
    expect(isKnownSize('L')).toBe(true)
    expect(isKnownSize('2xl')).toBe(true)
    expect(isKnownSize('42')).toBe(false)
  })
})
