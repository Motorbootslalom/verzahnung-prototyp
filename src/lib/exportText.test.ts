import { describe, it, expect } from 'vitest'
import { analyzeSequence, computeVerzahnung } from './verzahnung'
import { formatParcoursExport, formatVerzahnungExport } from './exportText'
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

describe('analyzeSequence', () => {
  it('zählt Wechsel und den un-verzahnten End-Block', () => {
    // 3,1,3,1,3,1,3,2,3,2,3,3,3  → am Ende drei Mal Klasse 3
    const ps = [...make('3', 8), ...make('1', 3), ...make('2', 2)]
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['1', '2', '3'], wechselFaktor: 2 }
    const a = analyzeSequence(computeVerzahnung(parc, ps).sequence)
    expect(a.total).toBe(13)
    expect(a.trailingKlasse).toBe('3')
    expect(a.trailingRun).toBe(3)
    expect(a.wechsel + a.nonWechsel).toBe(12)
  })

  it('leere Reihenfolge liefert Nullwerte', () => {
    expect(analyzeSequence([])).toEqual({
      total: 0,
      wechsel: 0,
      nonWechsel: 0,
      trailingKlasse: null,
      trailingRun: 0,
    })
  })
})

const state: AppState = {
  eventName: 'Testcup',
  eventJahr: 2026,
  originMode: 'verein',
  initialized: true,
  participants: [...make('3', 8), ...make('1', 3), ...make('2', 2)],
  parcoursList: [{ id: 'p', name: 'Parcours 1', classIds: ['1', '2', '3'], wechselFaktor: 2 }],
}

describe('formatParcoursExport', () => {
  const text = formatParcoursExport(state.parcoursList[0], state)

  it('enthält Klassenverteilung, Startreihenfolge und Diagnose', () => {
    expect(text).toContain('Klassen (Starter): 1:3, 2:2, 3:8')
    expect(text).toContain('Startreihenfolge (Klassen): 3 1 3 1 3 1 3 2 3 2 3 3 3')
    expect(text).toContain('3 Starter am Ende ohne Verzahnung (Klasse 3)')
  })

  it('listet die Startnummern je Klasse auf', () => {
    expect(text).toContain('3: 301, 302, 303, 304, 305, 306, 307, 308')
  })
})

describe('formatVerzahnungExport', () => {
  it('umfasst Kopf und alle Parcours', () => {
    const text = formatVerzahnungExport(state)
    expect(text).toContain('# Verzahnung-Export · Testcup · 2026')
    expect(text).toContain('13 Starter gesamt')
    expect(text).toContain('## Parcours 1 · Wechselfaktor 2')
  })
})
