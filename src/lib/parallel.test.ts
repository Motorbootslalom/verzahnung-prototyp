import { describe, it, expect } from 'vitest'
import {
  buildParallelPlan,
  parallelActiveClasses,
  slotShort,
  type ParallelHeat,
  type ParallelSlot,
} from './parallel'
import type { ClassId, Participant } from '../types'

function make(klasse: ClassId, n: number, startFrom = 1): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${klasse}-${i + startFrom}`,
    startNr: klasse + String(i + startFrom).padStart(2, '0'),
    vorname: 'V',
    nachname: 'N',
    verein: 'C',
    bundesland: 'B',
    geburtsdatum: '2015-01-01',
    groesse: '',
    klasse,
  }))
}

/** Kompakte Heat-Darstellung „A↔B" für Vergleiche. */
const nr = (slot: ParallelSlot) => slotShort(slot)
const row = (h: ParallelHeat) => `${nr(h.a)}|${nr(h.b)}`
const rows = (heats: ParallelHeat[]) => heats.map(row)

const OPTS = { international: true, class4Small: false }

describe('parallelActiveClasses', () => {
  it('international schließt Klassen 6 und 7 aus', () => {
    expect(parallelActiveClasses(true)).toEqual(['E', '1', '2', '3', '4', '5'])
  })
  it('national enthält alle Klassen', () => {
    expect(parallelActiveClasses(false)).toEqual(['E', '1', '2', '3', '4', '5', '6', '7'])
  })
})

describe('buildParallelPlan – Grundmuster aus der Aufgabenstellung', () => {
  it('E01/E02 (klein) + 401/402 (groß): ein Block mit Bootstyp-Wechsel und Tausch', () => {
    const ps = [...make('E', 2), ...make('4', 2)]
    const plan = buildParallelPlan(ps, OPTS)
    expect(rows(plan.heats)).toEqual([
      'E01|E02', // klein, Lauf 1
      '401|402', // groß, Lauf 1 (Verzahnungswechsel)
      'E02|E01', // klein, Lauf 2 (getauscht)
      '402|401', // groß, Lauf 2
    ])
    expect(plan.heats.map((h) => h.boat)).toEqual(['klein', 'gross', 'klein', 'gross'])
    expect(plan.heats.map((h) => h.run)).toEqual([1, 1, 2, 2])
    expect(plan.blocks).toBe(1)
  })

  it('4 kleine + 2 große: zweiter Block enthält nur das übrige kleine Paar', () => {
    const ps = [...make('E', 4), ...make('4', 2)]
    const plan = buildParallelPlan(ps, OPTS)
    expect(rows(plan.heats)).toEqual([
      'E01|E02',
      '401|402',
      'E02|E01',
      '402|401',
      // neuer Block:
      'E03|E04',
      'E04|E03',
    ])
    expect(plan.blocks).toBe(2)
    // Blockwechsel wird am 5. Heat markiert (für die Trennlinie).
    expect(plan.heats.find((h) => h.pos === 5)!.blockStart).toBe(true)
    expect(plan.heats.find((h) => h.pos === 2)!.blockStart).toBe(false)
  })

  it('mehrere Restpaare eines Bootstyps laufen als 2er-Blöcke (keine Verzahnung gleicher Boote)', () => {
    // 6 klein (3 Paare) + 2 groß (1 Paar): 1 gemischter 4er-Block, dann die
    // beiden übrigen klein-Paare je als eigener 2er-Block – Paar komplett.
    const ps = [...make('E', 6), ...make('4', 2)]
    const plan = buildParallelPlan(ps, OPTS)
    expect(rows(plan.heats)).toEqual([
      // gemischter Block (klein + groß)
      'E01|E02',
      '401|402',
      'E02|E01',
      '402|401',
      // 2er-Block: Paar E03/E04 komplett
      'E03|E04',
      'E04|E03',
      // 2er-Block: Paar E05/E06 komplett
      'E05|E06',
      'E06|E05',
    ])
    expect(plan.heats.map((h) => h.boat)).toEqual(
      ['klein', 'gross', 'klein', 'gross', 'klein', 'klein', 'klein', 'klein'],
    )
    expect(plan.blocks).toBe(3)
    // jeder 2er-Block beginnt mit einer Trennlinie
    expect(plan.heats.find((h) => h.pos === 5)!.blockStart).toBe(true)
    expect(plan.heats.find((h) => h.pos === 7)!.blockStart).toBe(true)
    expect(plan.heats.find((h) => h.pos === 6)!.blockStart).toBe(false)
  })

  it('Reihenfolge nach Startnummer sortiert den Pool nach klassischer Nummer (statt Klasse)', () => {
    // Feld nur klein: Klasse E und Klasse 3. Standard (nach Klasse) → Dolphin zuerst.
    const ps = [...make('E', 2), ...make('3', 2)]
    expect(rows(buildParallelPlan(ps, OPTS).heats)[0]).toBe('E01|E02')

    // Manövrieren hat Klasse 3 zuerst gesetzt (Bibs 1,2), Dolphin danach (3,4).
    const running = new Map([
      ['3-1', 1],
      ['3-2', 2],
      ['E-1', 3],
      ['E-2', 4],
    ])
    const heats = buildParallelPlan(ps, { ...OPTS, orderByStartNr: true }, running).heats
    // Jetzt startet Klasse 3 (301) statt Dolphin, Bootstyp-Trennung bleibt.
    expect(rows(heats)[0]).toBe('301|302')
    expect(heats.every((h) => h.boat === 'klein')).toBe(true)
  })

  it('nur ein Bootstyp im Feld → ausschließlich 2er-Blöcke', () => {
    const plan = buildParallelPlan(make('E', 4), OPTS)
    expect(rows(plan.heats)).toEqual(['E01|E02', 'E02|E01', 'E03|E04', 'E04|E03'])
    expect(plan.blocks).toBe(2)
    expect(plan.heats.every((h) => h.boat === 'klein')).toBe(true)
  })
})

describe('Paarung nach Bootstyp, nicht Klasse', () => {
  it('Klasse E kann gegen Klasse 3 fahren (beide klein)', () => {
    const ps = [...make('E', 1), ...make('3', 1)]
    const plan = buildParallelPlan(ps, OPTS)
    // ein klein-Paar (E01, 301), zweimal gefahren
    expect(rows(plan.heats)).toEqual(['E01|301', '301|E01'])
    expect(plan.kleinDummy).toBe(false)
  })

  it('kleine und große Klassen bilden getrennte Pools', () => {
    const ps = [...make('2', 2), ...make('4', 2)]
    const plan = buildParallelPlan(ps, OPTS)
    // 2 = klein, 4 = groß → kein gemischtes Paar
    for (const h of plan.heats) {
      expect(nr(h.a).slice(0, 1)).toBe(nr(h.b).slice(0, 1))
    }
  })
})

describe('Dummy bei ungerader Anzahl je Bootstyp', () => {
  it('ungerade kleine Anzahl → genau ein Dummy klein', () => {
    const ps = make('E', 3)
    const plan = buildParallelPlan(ps, OPTS)
    expect(plan.kleinDummy).toBe(true)
    const dummies = plan.heats.flatMap((h) => [h.a, h.b]).filter((s) => s.kind === 'dummy')
    // Dummy taucht in beiden Läufen seines Paares auf (A und B) → 2 Slots
    expect(dummies.length).toBe(2)
    expect(dummies.every((s) => s.kind === 'dummy' && s.boat === 'klein')).toBe(true)
  })

  it('gerade Anzahl → kein Dummy', () => {
    const plan = buildParallelPlan(make('E', 4), OPTS)
    expect(plan.kleinDummy).toBe(false)
    expect(plan.heats.some((h) => h.a.kind === 'dummy' || h.b.kind === 'dummy')).toBe(false)
  })
})

describe('internationaler Modus', () => {
  it('ignoriert Klassen 6 und 7', () => {
    const ps = [...make('E', 2), ...make('6', 2), ...make('7', 2)]
    const intl = buildParallelPlan(ps, { international: true, class4Small: false })
    // nur die beiden E-Starter zählen
    expect(intl.kleinStarter).toBe(2)
    expect(intl.grossStarter).toBe(0)

    const national = buildParallelPlan(ps, { international: false, class4Small: false })
    expect(national.grossStarter).toBe(4) // 6 und 7 sind groß
  })
})

describe('Fairness & Vollständigkeit', () => {
  it('jeder Starter fährt genau zweimal – je einmal auf A und auf B', () => {
    const ps = [...make('E', 4), ...make('1', 2), ...make('4', 6)]
    const plan = buildParallelPlan(ps, OPTS)
    const onA = new Map<string, number>()
    const onB = new Map<string, number>()
    for (const h of plan.heats) {
      if (h.a.kind === 'starter') onA.set(h.a.p.id, (onA.get(h.a.p.id) ?? 0) + 1)
      if (h.b.kind === 'starter') onB.set(h.b.p.id, (onB.get(h.b.p.id) ?? 0) + 1)
    }
    for (const p of ps) {
      expect(onA.get(p.id)).toBe(1)
      expect(onB.get(p.id)).toBe(1)
    }
  })

  it('class4Small verschiebt Klasse 4 in den kleinen Pool', () => {
    const ps = [...make('E', 2), ...make('4', 2)]
    const plan = buildParallelPlan(ps, { international: true, class4Small: true })
    // alles klein → 2 Paare klein, keine großen
    expect(plan.kleinStarter).toBe(4)
    expect(plan.grossStarter).toBe(0)
    expect(plan.heats.every((h) => h.boat === 'klein')).toBe(true)
  })
})
