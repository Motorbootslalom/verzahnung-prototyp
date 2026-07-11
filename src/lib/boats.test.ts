import { describe, it, expect } from 'vitest'
import { computeBoatDemand, parcoursBoatDemand, eventBoatDemand, boatShortfall } from './boats'
import { boatTypeOf } from './classes'
import type { AppState, BoatType, ClassId, Parcours, Participant } from '../types'
import type { SeqStep } from './verzahnung'

function make(klasse: ClassId, n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${klasse}-${i}`,
    startNr: klasse + String(i + 1).padStart(2, '0'),
    vorname: 'V',
    nachname: 'N',
    verein: 'C',
    bundesland: 'B',
    geburtsdatum: '2015-01-01',
    klasse,
  }))
}

const typeOf = (k: ClassId): BoatType => boatTypeOf(k, false)

describe('computeBoatDemand – Grundfälle', () => {
  it('zwei Spuren unterschiedlichen Typs → je 1 Boot', () => {
    const s: SeqStep[] = [
      { track: 0, p: make('E', 1)[0] },
      { track: 1, p: make('5', 1)[0] },
      { track: 0, p: make('E', 1)[0] },
      { track: 1, p: make('5', 1)[0] },
    ]
    expect(computeBoatDemand(s, typeOf)).toEqual({ klein: 1, gross: 1 })
  })

  it('zwei Spuren gleichen Typs gleichzeitig → 2 Boote', () => {
    const s: SeqStep[] = [
      { track: 0, p: make('E', 1)[0] },
      { track: 1, p: make('1', 1)[0] },
      { track: 0, p: make('E', 1)[0] },
      { track: 1, p: make('1', 1)[0] },
    ]
    expect(computeBoatDemand(s, typeOf)).toEqual({ klein: 2, gross: 0 })
  })
})

describe('computeBoatDemand – Umsetz-Puffer', () => {
  // Spur 0 fährt klein an Positionen 0,1,2; danach Spur 1 klein.
  it('direkter Anschluss (kein Puffer) → 2 Boote nötig', () => {
    const s: SeqStep[] = [
      { track: 0, p: make('E', 1)[0] },
      { track: 0, p: make('E', 1)[0] },
      { track: 0, p: make('E', 1)[0] },
      { track: 1, p: make('1', 1)[0] }, // Position 3: unmittelbar nach Spur 0
      { track: 1, p: make('1', 1)[0] },
    ]
    expect(computeBoatDemand(s, typeOf).klein).toBe(2)
  })

  it('mit 1 Starter Puffer dazwischen → 1 Boot reicht (Wechsel erlaubt)', () => {
    const s: SeqStep[] = [
      { track: 0, p: make('E', 1)[0] },
      { track: 0, p: make('E', 1)[0] },
      { track: 0, p: make('E', 1)[0] },
      { track: 2, p: make('2', 1)[0] }, // Position 3: 1 Starter Puffer (andere Spur)
      { track: 1, p: make('1', 1)[0] }, // Position 4: Spur 1 übernimmt das Boot
      { track: 1, p: make('1', 1)[0] },
    ]
    // klein: Spur 0 (0..2) und Spur 1 (4..5) durch Puffer trennbar → 1;
    // Spur 2 (Pos 3) ist ein eigener kurzer Block, überlappt aber mit Spur 0s Puffer.
    const d = computeBoatDemand(s, typeOf)
    expect(d.klein).toBe(2) // Spur 0 (Ende+Puffer bis 3) trifft Spur 2 bei Position 3
  })
})

describe('parcoursBoatDemand & Klasse-4-Umschaltung', () => {
  it('Klasse 4 zählt standardmäßig als großes Boot', () => {
    const ps = make('4', 5)
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['4'], wechselFaktor: 2 }
    expect(parcoursBoatDemand(parc, ps, false)).toEqual({ klein: 0, gross: 1 })
  })

  it('mit class4Small fährt Klasse 4 klein', () => {
    const ps = make('4', 5)
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['4'], wechselFaktor: 2 }
    expect(parcoursBoatDemand(parc, ps, true)).toEqual({ klein: 1, gross: 0 })
  })

  it('Split-Aufteilung: kleine Spuren links, große rechts', () => {
    const ps = [
      ...make('E', 2),
      ...make('1', 4),
      ...make('2', 4),
      ...make('3', 4),
      ...make('4', 6),
      ...make('5', 6),
      ...make('6', 6),
      ...make('7', 6),
    ]
    const p1: Parcours = { id: 'p1', name: 'P1', classIds: ['E', '1', '2', '3'], wechselFaktor: 2 }
    const p2: Parcours = { id: 'p2', name: 'P2', classIds: ['4', '5', '6', '7'], wechselFaktor: 2 }
    expect(parcoursBoatDemand(p1, ps, false)).toEqual({ klein: 2, gross: 0 })
    expect(parcoursBoatDemand(p2, ps, false)).toEqual({ klein: 0, gross: 2 })
  })
})

describe('eventBoatDemand & boatShortfall', () => {
  const ps = [
    ...make('E', 2),
    ...make('1', 4),
    ...make('2', 4),
    ...make('3', 4),
    ...make('4', 6),
    ...make('5', 6),
    ...make('6', 6),
    ...make('7', 6),
  ]
  const base: AppState = {
    eventName: 'T',
    eventJahr: 2026,
    originMode: 'verein',
    initialized: true,
    class4Small: false,
    parallelInternational: true,
    parallelOrderByStartNr: false,
    runningNumbers: { enabled: false, source: 'manoever', start: 1, skipText: '' },
    boats: { klein: 2, gross: 2 },
    participants: ps,
    parcoursList: [
      { id: 'p1', name: 'P1', classIds: ['E', '1', '2', '3'], wechselFaktor: 2 },
      { id: 'p2', name: 'P2', classIds: ['4', '5', '6', '7'], wechselFaktor: 2 },
    ],
  }

  it('summiert den Bedarf beider Parcours (parallel)', () => {
    expect(eventBoatDemand(base)).toEqual({ klein: 2, gross: 2 })
  })

  it('kein Fehlbedarf bei ausreichend Booten', () => {
    expect(boatShortfall(base).any).toBe(false)
  })

  it('meldet Fehlbedarf, wenn Boote fehlen', () => {
    const tight: AppState = { ...base, boats: { klein: 2, gross: 1 } }
    const sf = boatShortfall(tight)
    expect(sf.gross).toBe(1)
    expect(sf.klein).toBe(0)
    expect(sf.any).toBe(true)
  })
})
