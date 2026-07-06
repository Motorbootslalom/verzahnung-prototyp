import { describe, it, expect } from 'vitest'
import { generateParticipant, generateParticipants } from './generate'
import { birthYearRange } from './classes'
import { CLUBS } from '../data/clubs'
import type { ClassId } from '../types'

const ALL: ClassId[] = ['E', '1', '2', '3', '4', '5', '6', '7']

describe('generateParticipants', () => {
  it('erzeugt die gewünschte Anzahl', () => {
    const list = generateParticipants('3', 12, 2026, 'verein', [])
    expect(list).toHaveLength(12)
  })

  it('Geburtsjahr liegt immer im Jahrgangsbereich der Klasse', () => {
    for (const klasse of ALL) {
      const [von, bis] = birthYearRange(klasse, 2026)
      const list = generateParticipants(klasse, 40, 2026, 'verein', [])
      for (const p of list) {
        const jahr = Number(p.geburtsdatum.slice(0, 4))
        expect(jahr).toBeGreaterThanOrEqual(von)
        expect(jahr).toBeLessThanOrEqual(bis)
      }
    }
  })

  it('erzeugt gültige ISO-Datumswerte (kein 31.02.)', () => {
    const list = generateParticipants('5', 60, 2026, 'verein', [])
    for (const p of list) {
      expect(p.geburtsdatum).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const [y, m, d] = p.geburtsdatum.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      expect(dt.getFullYear()).toBe(y)
      expect(dt.getMonth()).toBe(m - 1)
      expect(dt.getDate()).toBe(d)
    }
  })

  it('Startnummern haben Klassen-Präfix und laufen fortlaufend hoch', () => {
    const list = generateParticipants('3', 5, 2026, 'verein', [])
    expect(list.map((p) => p.startNr)).toEqual(['301', '302', '303', '304', '305'])
  })

  it('Klasse E nutzt E-Präfix', () => {
    const list = generateParticipants('E', 3, 2026, 'verein', [])
    expect(list.map((p) => p.startNr)).toEqual(['E01', 'E02', 'E03'])
  })

  it('setzt Startnummern auf Basis bereits vorhandener Teilnehmer fort', () => {
    const first = generateParticipants('2', 3, 2026, 'verein', [])
    const second = generateParticipants('2', 2, 2026, 'verein', first)
    expect(second.map((p) => p.startNr)).toEqual(['204', '205'])
  })

  it('Vereins-Modus: Verein gesetzt und passendes Bundesland', () => {
    const p = generateParticipant('4', 2026, 'verein', [])
    expect(p.verein).not.toBe('')
    const club = CLUBS.find((c) => c.name === p.verein)
    expect(club).toBeDefined()
    expect(p.bundesland).toBe(club!.bundesland)
  })

  it('Bundesland-Modus: kein Verein, aber Bundesland', () => {
    const p = generateParticipant('4', 2026, 'bundesland', [])
    expect(p.verein).toBe('')
    expect(p.bundesland).not.toBe('')
  })

  it('vergibt eindeutige IDs', () => {
    const list = generateParticipants('6', 30, 2026, 'verein', [])
    const ids = new Set(list.map((p) => p.id))
    expect(ids.size).toBe(list.length)
  })
})
