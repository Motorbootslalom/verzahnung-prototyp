import { describe, it, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StoreProvider } from '../state/store'
import { App } from '../App'
import { VerzahnungView } from './VerzahnungView'
import { ParallelView } from './ParallelView'
import type { AppState, Participant, ClassId } from '../types'

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

/** Minimaler localStorage-Ersatz für die Node-Testumgebung. */
function stubStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
    key: () => null,
    length: 0,
  } as Storage
}

const seed = (tracks: unknown): AppState => ({
  eventName: 'Test',
  eventJahr: 2026,
  originMode: 'verein',
  initialized: true,
  participants: [...make('E', 3), ...make('7', 6)],
  parcoursList: [{ id: 'p1', name: 'P1', classIds: ['E', '7'], wechselFaktor: 2, tracks: tracks as never }],
  boats: { klein: 2, gross: 2 },
  class4Small: false,
  parallelInternational: true,
})

describe('UI-Render (SSR-Smoke)', () => {
  beforeEach(() => stubStorage())

  it('ohne Daten wird der Setup-Screen gerendert', () => {
    const html = renderToStaticMarkup(createElement(StoreProvider, null, createElement(App)))
    expect(html).toContain('Starterfeld generieren')
  })

  it('VerzahnungView rendert Startliste, Spuren und Pause-Chip', () => {
    stubStorage({
      'verzahnung-prototyp:v1': JSON.stringify(
        seed([
          [{ kind: 'class', klasse: 'E' }],
          [{ kind: 'pause', id: 'pp', length: 3 }, { kind: 'class', klasse: '7' }],
        ]),
      ),
    })
    const html = renderToStaticMarkup(createElement(StoreProvider, null, createElement(VerzahnungView)))
    expect(html).toContain('Verzahnte Startreihenfolge')
    expect(html).toContain('Spur A')
    expect(html).toContain('⏸ Pause')
    // Pause(3) vor Klasse 7 → E,E,E,7,7,7,7,7,7
    const badges = [...html.matchAll(/class="class-badge"[^>]*>([E1-7])</g)].map((m) => m[1]).join(',')
    expect(badges).toBe('E,E,E,7,7,7,7,7,7')
  })

  it('ParallelView rendert Läufe, Bootstyp-Wechsel und Block-Trennung', () => {
    const parallelState: AppState = {
      eventName: 'Test',
      eventJahr: 2026,
      originMode: 'verein',
      initialized: true,
      participants: [...make('E', 2), ...make('4', 2)],
      parcoursList: [],
      boats: { klein: 2, gross: 2 },
      class4Small: false,
      parallelInternational: true,
    }
    stubStorage({ 'verzahnung-prototyp:v1': JSON.stringify(parallelState) })
    const html = renderToStaticMarkup(createElement(StoreProvider, null, createElement(ParallelView)))
    expect(html).toContain('Parallel-Slalom')
    expect(html).toContain('Parcours A')
    expect(html).toContain('E01')
    expect(html).toContain('401')
    // ein voller Block (4 Läufe) mit einem klein- und einem groß-Tag
    expect(html).toContain('boat-tag klein')
    expect(html).toContain('boat-tag gross')
  })
})
