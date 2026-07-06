import { describe, it, expect } from 'vitest'
import { CLASSES, CLASS_IDS, birthYearRange, ageHint, getClass } from './classes'

describe('Klassen-Definitionen', () => {
  it('enthält genau E und 1–7 in Reihenfolge', () => {
    expect(CLASS_IDS).toEqual(['E', '1', '2', '3', '4', '5', '6', '7'])
  })

  it('jede Klasse hat gültige Altersgrenzen (min <= max)', () => {
    for (const c of CLASSES) expect(c.minAge).toBeLessThanOrEqual(c.maxAge)
  })
})

describe('birthYearRange (Jahrgang aus Veranstaltungsjahr)', () => {
  it('Klasse E im Jahr 2026 → Jahrgänge 2019–2020 (6–7 Jahre)', () => {
    expect(birthYearRange('E', 2026)).toEqual([2019, 2020])
  })

  it('Klasse 7 im Jahr 2026 → Jahrgänge 1999–2004 (22–27 Jahre)', () => {
    expect(birthYearRange('7', 2026)).toEqual([1999, 2004])
  })

  it('Altersklasse = Veranstaltungsjahr − Geburtsjahr für alle Klassen', () => {
    const jahr = 2030
    for (const c of CLASSES) {
      const [von, bis] = birthYearRange(c.id, jahr)
      // ältester Jahrgang entspricht maxAge, jüngster minAge
      expect(jahr - von).toBe(c.maxAge)
      expect(jahr - bis).toBe(c.minAge)
    }
  })

  it('verschiebt sich korrekt mit dem Veranstaltungsjahr', () => {
    expect(birthYearRange('E', 2027)).toEqual([2020, 2021])
  })
})

describe('ageHint / getClass', () => {
  it('ageHint nennt Alter und Jahrgänge', () => {
    expect(ageHint('E', 2026)).toContain('6–7')
    expect(ageHint('E', 2026)).toContain('2019–2020')
  })

  it('getClass wirft bei unbekannter Klasse', () => {
    // @ts-expect-error absichtlich ungültig
    expect(() => getClass('X')).toThrow()
  })
})
