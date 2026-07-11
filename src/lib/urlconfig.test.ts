import { describe, it, expect } from 'vitest'
import { parseUrlConfig, buildConfigQuery, buildConfigUrl } from './urlconfig'
import { analyzeSequence, computeVerzahnung } from './verzahnung'
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

const state: AppState = {
  eventName: 'Möwepokal & Co',
  eventJahr: 2027,
  originMode: 'bundesland',
  initialized: true,
  participants: [...make('E', 6), ...make('1', 8), ...make('3', 9)],
  parcoursList: [
    { id: 'p1', name: 'Parcours 1', classIds: ['E', '1'], wechselFaktor: 2 },
    { id: 'p2', name: 'Parcours 2', classIds: ['3'], wechselFaktor: 3 },
  ],
  boats: { klein: 3, gross: 2 },
  class4Small: false,
  parallelInternational: true,
  parallelOrderByStartNr: false,
  runningNumbers: { enabled: false, source: 'manoever', start: 1, skipText: '' },
}

describe('parseUrlConfig', () => {
  it('liest Klassenverteilung positionsbasiert (E,1..7)', () => {
    const cfg = parseUrlConfig('?counts=6.8.0.9.0.0.0.0')
    expect(cfg?.counts).toEqual({ E: 6, '1': 8, '3': 9 })
  })

  it('liest Parcours mit Klassen und Faktor', () => {
    const cfg = parseUrlConfig('?counts=1.0.0.0.0.0.0.0&p=E1*2_4567*3')
    expect(cfg?.parcours).toEqual([
      { classIds: ['E', '1'], wechselFaktor: 2 },
      { classIds: ['4', '5', '6', '7'], wechselFaktor: 3 },
    ])
  })

  it('liest Boote und den Klasse-4-Umschalter', () => {
    const cfg = parseUrlConfig('?counts=1.0.0.0.0.0.0.0&boats=4.2&c4=1')
    expect(cfg?.boats).toEqual({ klein: 4, gross: 2 })
    expect(cfg?.class4Small).toBe(true)
  })

  it('Round-Trip: Boote und class4Small bleiben erhalten', () => {
    const cfg = parseUrlConfig('?' + buildConfigQuery(state))
    expect(cfg?.boats).toEqual({ klein: 3, gross: 2 })
    expect(cfg?.class4Small).toBeUndefined() // false ⇒ nicht kodiert
  })

  it('übernimmt event, jahr und origin', () => {
    const cfg = parseUrlConfig('?counts=1.0.0.0.0.0.0.0&event=Test%20Cup&jahr=2030&origin=bundesland')
    expect(cfg?.eventName).toBe('Test Cup')
    expect(cfg?.eventJahr).toBe(2030)
    expect(cfg?.originMode).toBe('bundesland')
  })

  it('gibt null zurück ohne counts-Parameter', () => {
    expect(parseUrlConfig('?p=E1*2')).toBeNull()
    expect(parseUrlConfig('')).toBeNull()
  })

  it('begrenzt ungültige Faktoren auf einen gültigen Wert', () => {
    const cfg = parseUrlConfig('?counts=1.0.0.0.0.0.0.0&p=E*9')
    expect(cfg?.parcours[0].wechselFaktor).toBe(2)
  })

  it('ignoriert unbekannte Klassenzeichen und Duplikate in Parcours', () => {
    const cfg = parseUrlConfig('?counts=1.0.0.0.0.0.0.0&p=EEX1*2')
    expect(cfg?.parcours[0].classIds).toEqual(['E', '1'])
  })
})

describe('buildConfigQuery / Round-Trip', () => {
  it('kodiert den aktuellen Zustand', () => {
    const q = buildConfigQuery(state)
    expect(q).toContain('counts=6.8.0.9.0.0.0.0')
    expect(q).toContain('p=E1*2_3*3')
    expect(q).toContain('jahr=2027')
    expect(q).toContain('origin=bundesland')
  })

  it('Round-Trip: build → parse ergibt gleiche Verteilung, Parcours und Meta', () => {
    const cfg = parseUrlConfig('?' + buildConfigQuery(state))
    expect(cfg?.counts).toEqual({ E: 6, '1': 8, '3': 9 })
    expect(cfg?.parcours).toEqual([
      { classIds: ['E', '1'], wechselFaktor: 2 },
      { classIds: ['3'], wechselFaktor: 3 },
    ])
    expect(cfg?.eventName).toBe('Möwepokal & Co')
    expect(cfg?.eventJahr).toBe(2027)
    expect(cfg?.originMode).toBe('bundesland')
  })

  it('buildConfigUrl hängt an Basis ohne bestehende Query/Hash an', () => {
    const url = buildConfigUrl(state, 'https://example.org/app/?alt=1#x')
    expect(url.startsWith('https://example.org/app/?counts=')).toBe(true)
    expect(url).not.toContain('#x')
    expect(url).not.toContain('alt=1')
  })
})

describe('manuelle Spur-Anordnung (Layout) im Link', () => {
  const manualState: AppState = {
    eventName: 'Manuell',
    eventJahr: 2026,
    originMode: 'verein',
    initialized: true,
    participants: [...make('E', 1), ...make('1', 4), ...make('2', 8), ...make('3', 9)],
    parcoursList: [
      {
        id: 'p1',
        name: 'Parcours 1',
        classIds: ['E', '1', '2', '3'],
        wechselFaktor: 2,
        tracks: [
          [
            { kind: 'class', klasse: '3' },
            { kind: 'class', klasse: 'E' },
            { kind: 'pause', id: 'x', length: 2 },
            { kind: 'class', klasse: '1' },
          ],
          [{ kind: 'class', klasse: '2' }],
        ],
      },
    ],
    boats: { klein: 2, gross: 2 },
    class4Small: false,
    parallelInternational: true,
    parallelOrderByStartNr: false,
    runningNumbers: { enabled: false, source: 'manoever', start: 1, skipText: '' },
  }

  it('kodiert die Anordnung inkl. Pause als Layout-Feld', () => {
    const q = buildConfigQuery(manualState)
    expect(q).toContain('p=E123*2*3.E.q2.1-2')
  })

  it('kodiert kein Layout, wenn die Anordnung automatisch ist', () => {
    const auto: AppState = {
      ...manualState,
      parcoursList: [{ id: 'p1', name: 'P1', classIds: ['E', '1', '2', '3'], wechselFaktor: 2 }],
    }
    const q = buildConfigQuery(auto)
    expect(q).toContain('p=E123*2&')
  })

  it('Round-Trip: Reihenfolge je Spur und Pause bleiben erhalten', () => {
    const cfg = parseUrlConfig('?' + buildConfigQuery(manualState))
    expect(cfg?.parcours[0].tracks).toEqual([
      [
        { kind: 'class', klasse: '3' },
        { kind: 'class', klasse: 'E' },
        { kind: 'pause', id: 'pause_p0_t0_2', length: 2 },
        { kind: 'class', klasse: '1' },
      ],
      [{ kind: 'class', klasse: '2' }],
    ])
  })

  it('reproduziert das 56-Starter-Szenario (2 Starter am Ende, Klasse 6)', () => {
    // Reales Beispiel des Nutzers: Spur A 3,E,1,2,6 · Spur B 4,5,7.
    const participants = [
      ...make('E', 1),
      ...make('1', 4),
      ...make('2', 8),
      ...make('3', 9),
      ...make('4', 6),
      ...make('5', 10),
      ...make('6', 7),
      ...make('7', 11),
    ]
    const parcours: Parcours = {
      id: 'p1',
      name: 'Parcours 1',
      classIds: ['E', '1', '2', '3', '4', '5', '6', '7'],
      wechselFaktor: 2,
      tracks: [
        ['3', 'E', '1', '2', '6'].map((k) => ({ kind: 'class', klasse: k as ClassId })),
        ['4', '5', '7'].map((k) => ({ kind: 'class', klasse: k as ClassId })),
      ],
    }
    const src: AppState = { ...manualState, participants, parcoursList: [parcours] }

    // Link erzeugen und wieder einlesen …
    const cfg = parseUrlConfig('?' + buildConfigQuery(src))!
    const restored: Parcours = {
      id: 'r',
      name: 'R',
      classIds: cfg.parcours[0].classIds,
      wechselFaktor: cfg.parcours[0].wechselFaktor,
      tracks: cfg.parcours[0].tracks,
    }

    // … muss dieselbe (manuelle) Verzahnung ergeben wie das Original.
    const before = computeVerzahnung(parcours, participants)
    const after = computeVerzahnung(restored, participants)
    expect(after.manual).toBe(true)
    expect(after.sequence.map((p) => p.klasse)).toEqual(before.sequence.map((p) => p.klasse))

    const a = analyzeSequence(after.sequence)
    expect(a.total).toBe(56)
    expect(a.trailingKlasse).toBe('6')
    expect(a.trailingRun).toBe(2)
  })
})
