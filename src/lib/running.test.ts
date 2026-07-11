import { describe, it, expect } from 'vitest'
import {
  assignRunningNumbers,
  canonicalRunningNumbers,
  makeNumberSequence,
  parseSkipList,
  runningNumbersFrom,
} from './running'
import type { AppState, ClassId, Participant } from '../types'

function mk(klasse: ClassId, n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${klasse}-${i + 1}`,
    startNr: klasse + String(i + 1).padStart(2, '0'),
    vorname: 'V',
    nachname: 'N',
    verein: 'C',
    bundesland: 'B',
    geburtsdatum: '2015-01-01',
    klasse,
  }))
}

function stateWith(runningPatch: Partial<AppState['runningNumbers']>): AppState {
  return {
    eventName: 'T',
    eventJahr: 2026,
    originMode: 'verein',
    participants: [...mk('E', 2), ...mk('7', 3)],
    parcoursList: [{ id: 'p', name: 'P', classIds: ['E', '7'], wechselFaktor: 1 }],
    boats: { klein: 9, gross: 9 },
    class4Small: false,
    parallelInternational: true,
    parallelOrderByStartNr: false,
    runningNumbers: { enabled: true, source: 'manoever', start: 1, skipText: '', ...runningPatch },
    initialized: true,
  }
}

describe('parseSkipList', () => {
  it('trennt an beliebigen Nicht-Ziffern und entfernt Duplikate', () => {
    expect(parseSkipList('7, 13; 20  7')).toEqual([7, 13, 20])
  })
  it('leerer/ungültiger Text → leere Liste', () => {
    expect(parseSkipList('')).toEqual([])
    expect(parseSkipList('abc')).toEqual([])
  })
})

describe('makeNumberSequence', () => {
  it('liefert fortlaufende Nummern ab Startwert', () => {
    const next = makeNumberSequence(1, [])
    expect([next(), next(), next()]).toEqual([1, 2, 3])
  })
  it('überspringt fehlende Nummern', () => {
    const next = makeNumberSequence(1, [3, 4])
    expect([next(), next(), next(), next()]).toEqual([1, 2, 5, 6])
  })
  it('respektiert den Startwert und Skips davor/danach', () => {
    const next = makeNumberSequence(10, [11])
    expect([next(), next(), next()]).toEqual([10, 12, 13])
  })
})

describe('assignRunningNumbers', () => {
  it('nummeriert in Reihenfolge, jede ID beim ersten Auftreten', () => {
    const map = assignRunningNumbers(['a', 'b', 'c'], { start: 1, skip: [] })
    expect([...map.entries()]).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
  })

  it('Doppel-Auftreten (Parallel-Slalom) behält dieselbe Nummer', () => {
    // Emit-Reihenfolge eines Blocks: a,b (Lauf1) … b,a (Lauf2)
    const map = assignRunningNumbers(['a', 'b', 'b', 'a'], { start: 1, skip: [] })
    expect(map.get('a')).toBe(1)
    expect(map.get('b')).toBe(2)
    expect(map.size).toBe(2)
  })

  it('lässt übersprungene Nummern aus und ignoriert leere IDs (Dummy)', () => {
    const map = assignRunningNumbers(['a', null, 'b', undefined, 'c'], { start: 1, skip: [2] })
    expect(map.get('a')).toBe(1)
    expect(map.get('b')).toBe(3)
    expect(map.get('c')).toBe(4)
  })
})

describe('runningNumbersFrom', () => {
  it('nutzt Startwert und skipText aus der Konfiguration', () => {
    const map = runningNumbersFrom(['a', 'b', 'c'], {
      enabled: true,
      source: 'manoever',
      start: 5,
      skipText: '6',
    })
    expect(map.get('a')).toBe(5)
    expect(map.get('b')).toBe(7)
    expect(map.get('c')).toBe(8)
  })
})

describe('canonicalRunningNumbers (einheitliche Quelle: Manövrier-Verzahnung)', () => {
  it('deaktiviert → null', () => {
    expect(canonicalRunningNumbers(stateWith({ enabled: false }))).toBeNull()
  })

  it('nummeriert in Manövrier-Reihenfolge (Faktor 1: E-Block, dann 7-Block)', () => {
    const map = canonicalRunningNumbers(stateWith({}))!
    expect(map.get('E-1')).toBe(1)
    expect(map.get('E-2')).toBe(2)
    expect(map.get('7-1')).toBe(3)
    expect(map.get('7-2')).toBe(4)
    expect(map.get('7-3')).toBe(5)
  })

  it('berücksichtigt Startwert und übersprungene Nummern', () => {
    const map = canonicalRunningNumbers(stateWith({ start: 10, skipText: '11' }))!
    expect(map.get('E-1')).toBe(10)
    expect(map.get('E-2')).toBe(12)
    expect(map.get('7-1')).toBe(13)
  })

  it('umschaltbar: source "parallel" nummeriert in Parallel-Reihenfolge', () => {
    // international (Standard) → Klasse 7 zählt im Parallel-Slalom nicht mit.
    const map = canonicalRunningNumbers(stateWith({ source: 'parallel' }))!
    expect(map.get('E-1')).toBe(1)
    expect(map.get('E-2')).toBe(2)
    expect(map.get('7-1')).toBeUndefined()
  })
})
