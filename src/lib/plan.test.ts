import { describe, it, expect } from 'vitest'
import { bestArrangement, planEvent } from './plan'
import type { AppState, ClassId, Parcours, Participant } from '../types'

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

describe('bestArrangement – Boot-Beschränkung', () => {
  const ps = [...make('4', 6), ...make('5', 6), ...make('6', 6), ...make('7', 6)]
  const parc: Parcours = { id: 'p', name: 'P', classIds: ['4', '5', '6', '7'], wechselFaktor: 2 }

  it('genug Boote → Faktor 2 (2 große Boote), nicht beschränkt', () => {
    const plan = bestArrangement(parc, ps, false, { klein: 0, gross: 2 })
    expect(plan.effectiveTracks).toBe(2)
    expect(plan.demand).toEqual({ klein: 0, gross: 2 })
    expect(plan.constrained).toBe(false)
  })

  it('nur 1 großes Boot → fällt auf 1 Spur zurück, beschränkt', () => {
    const plan = bestArrangement(parc, ps, false, { klein: 0, gross: 1 })
    expect(plan.effectiveTracks).toBe(1)
    expect(plan.demand.gross).toBe(1)
    expect(plan.constrained).toBe(true)
  })
})

describe('bestArrangement – Klasse-4-Umschaltung entlastet große Boote', () => {
  const ps = [...make('4', 4), ...make('5', 4)]
  const parc: Parcours = { id: 'p', name: 'P', classIds: ['4', '5'], wechselFaktor: 2 }

  it('ohne class4Small brauchen 4 und 5 beide große Boote → 1 Boot erzwingt 1 Spur', () => {
    const plan = bestArrangement(parc, ps, false, { klein: 2, gross: 1 })
    expect(plan.effectiveTracks).toBe(1)
    expect(plan.constrained).toBe(true)
  })

  it('mit class4Small fährt 4 klein → Faktor 2 mit je 1 Boot möglich', () => {
    const plan = bestArrangement(parc, ps, true, { klein: 1, gross: 1 })
    expect(plan.effectiveTracks).toBe(2)
    expect(plan.demand).toEqual({ klein: 1, gross: 1 })
    expect(plan.constrained).toBe(false)
  })
})

describe('planEvent – parallele Parcours teilen sich den Pool', () => {
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
    runningNumbers: { enabled: false, source: 'manoever', start: 1, skipText: '' },
    boats: { klein: 2, gross: 2 },
    participants: ps,
    parcoursList: [
      { id: 'p1', name: 'P1', classIds: ['E', '1', '2', '3'], wechselFaktor: 2 },
      { id: 'p2', name: 'P2', classIds: ['4', '5', '6', '7'], wechselFaktor: 2 },
    ],
  }

  it('genug Boote → beide Parcours Faktor 2, kein Mehrbedarf', () => {
    const plan = planEvent(base)
    expect(plan.plans.map((p) => p.effectiveTracks)).toEqual([2, 2])
    expect(plan.anyConstrained).toBe(false)
    expect(plan.extra).toEqual({ klein: 0, gross: 0 })
  })

  it('zu wenige große Boote → P2 beschränkt, Mehrbedarf ausgewiesen', () => {
    const plan = planEvent({ ...base, boats: { klein: 2, gross: 1 } })
    const p2 = plan.plans.find((p) => p.parcoursId === 'p2')!
    expect(p2.effectiveTracks).toBe(1) // auf das Limit reduziert
    expect(plan.demand.gross).toBeLessThanOrEqual(1) // angezeigte Verzahnung hält das Limit ein
    expect(plan.anyConstrained).toBe(true)
    expect(plan.extra.gross).toBe(1) // 1 großes Boot mehr → optimale Verzahnung
  })
})
