import { describe, it, expect } from 'vitest'
import {
  parseParticipantsTsv,
  formatParticipantsTsv,
  formatStartlistTsv,
} from './tsv'
import type { AppState } from '../types'

const TAB = '\t'
const row = (...cells: string[]) => cells.join(TAB)

describe('parseParticipantsTsv', () => {
  it('erkennt eine Kopfzeile (Reihenfolge egal)', () => {
    const text = [
      row('Klasse', 'Nachname', 'Vorname', 'Größe', 'Verein', 'Geburtsdatum', 'Startnummer'),
      row('3', 'Müller', 'Lena', 'M', 'WSV Köln', '01.05.2013', '305'),
      row('E', 'Meier', 'Tom', 'XS', 'SC Ost', '2019-03-10', 'E01'),
    ].join('\n')
    const res = parseParticipantsTsv(text)
    expect(res.usedHeader).toBe(true)
    expect(res.imported).toBe(2)
    const lena = res.participants.find((p) => p.nachname === 'Müller')!
    expect(lena.klasse).toBe('3')
    expect(lena.groesse).toBe('M')
    expect(lena.verein).toBe('WSV Köln')
    expect(lena.geburtsdatum).toBe('2013-05-01')
    expect(lena.startNr).toBe('305')
  })

  it('nutzt die feste Reihenfolge ohne Kopfzeile', () => {
    // Startnummer, Klasse, Nachname, Vorname, Verein, Bundesland, Geburtsdatum, Größe
    const text = row('305', '3', 'Müller', 'Lena', 'WSV Köln', 'NRW', '2013-05-01', 'M')
    const res = parseParticipantsTsv(text)
    expect(res.usedHeader).toBe(false)
    expect(res.imported).toBe(1)
    expect(res.participants[0].nachname).toBe('Müller')
    expect(res.participants[0].bundesland).toBe('NRW')
  })

  it('überspringt ungültige Klassen und meldet sie', () => {
    const text = [
      row('Klasse', 'Nachname', 'Vorname'),
      row('9', 'Falsch', 'X'),
      row('E', 'Gut', 'Y'),
    ].join('\n')
    const res = parseParticipantsTsv(text)
    expect(res.imported).toBe(1)
    expect(res.skipped).toHaveLength(1)
    expect(res.skipped[0].line).toBe(2)
  })

  it('vergibt fehlende Startnummern je Klasse nach Größe', () => {
    const text = [
      row('Klasse', 'Nachname', 'Größe'),
      row('E', 'Groß', 'XL'),
      row('E', 'Klein', 'XS'),
      row('E', 'Mittel', 'M'),
    ].join('\n')
    const res = parseParticipantsTsv(text)
    const byName = (n: string) => res.participants.find((p) => p.nachname === n)!
    expect(byName('Klein').startNr).toBe('E01')
    expect(byName('Mittel').startNr).toBe('E02')
    expect(byName('Groß').startNr).toBe('E03')
  })

  it('behandelt Dolphin/D als Klasse E', () => {
    const text = [row('Klasse', 'Nachname'), row('Dolphin', 'A'), row('D', 'B')].join('\n')
    const res = parseParticipantsTsv(text)
    expect(res.participants.every((p) => p.klasse === 'E')).toBe(true)
  })
})

function baseState(): AppState {
  return {
    eventName: 'Test',
    eventJahr: 2026,
    originMode: 'verein',
    participants: [],
    parcoursList: [{ id: 'p1', name: 'Parcours 1', classIds: ['E', '3'], wechselFaktor: 2 }],
    boats: { klein: 4, gross: 4 },
    class4Small: false,
    parallelInternational: true,
    parallelOrderByStartNr: false,
    runningNumbers: { enabled: false, source: 'manoever', start: 1, skipText: '' },
    initialized: true,
  }
}

describe('TSV export', () => {
  it('Teilnehmerliste ist round-trip-fähig', () => {
    const state = baseState()
    const imported = parseParticipantsTsv(
      [
        row('Klasse', 'Nachname', 'Vorname', 'Größe', 'Startnummer'),
        row('3', 'Müller', 'Lena', 'M', '305'),
        row('E', 'Meier', 'Tom', 'XS', 'E01'),
      ].join('\n'),
    ).participants
    state.participants = imported

    const tsv = formatParticipantsTsv(state)
    const reparsed = parseParticipantsTsv(tsv)
    expect(reparsed.imported).toBe(2)
    const lena = reparsed.participants.find((p) => p.nachname === 'Müller')!
    expect(lena.startNr).toBe('305')
    expect(lena.groesse).toBe('M')
  })

  it('Startliste enthält eine Kopfzeile und je Starter eine Zeile', () => {
    const state = baseState()
    state.participants = parseParticipantsTsv(
      [
        row('Klasse', 'Nachname', 'Größe'),
        row('E', 'A', 'S'),
        row('E', 'B', 'M'),
        row('3', 'C', 'L'),
      ].join('\n'),
    ).participants

    const lines = formatStartlistTsv(state).split('\n')
    expect(lines[0].split(TAB)[0]).toBe('Pos')
    expect(lines).toHaveLength(1 + 3)
  })
})
