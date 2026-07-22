import { describe, it, expect } from 'vitest'
import {
  classCounts,
  participantsByClass,
  presentClasses,
  autoDistribute,
  tracksMatch,
  buildSequence,
  computeVerzahnung,
  analyzeSequence,
  itemDragId,
} from './verzahnung'
import type { ClassId, Parcours, Participant, TrackItem } from '../types'

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

const seq = (ps: Participant[]) => ps.map((p) => p.klasse).join(',')

describe('Hilfsfunktionen', () => {
  it('classCounts zählt je Klasse', () => {
    const c = classCounts([...make('3', 8), ...make('1', 3)])
    expect(c.get('3')).toBe(8)
    expect(c.get('1')).toBe(3)
    expect(c.get('2')).toBeUndefined()
  })

  it('participantsByClass sortiert nach Startnummer numerisch', () => {
    const ps = [...make('3', 3, 9), ...make('3', 2, 1)] // 309,310,311,301,302
    const byClass = participantsByClass(ps)
    expect(byClass.get('3')!.map((p) => p.startNr)).toEqual(['301', '302', '309', '310', '311'])
  })

  it('presentClasses liefert nur Klassen mit Startern in kanonischer Reihenfolge', () => {
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['3', '1', '2'], wechselFaktor: 2 }
    const ps = [...make('3', 2), ...make('1', 1)] // Klasse 2 leer
    expect(presentClasses(parc, ps)).toEqual(['1', '3'])
  })

  it('itemDragId: Klasse → Klassen-ID, Pause → Pause-ID', () => {
    expect(itemDragId({ kind: 'class', klasse: '3' })).toBe('3')
    expect(itemDragId({ kind: 'pause', id: 'px', length: 2 })).toBe('px')
  })
})

describe('autoDistribute (gleichmäßige Verteilung nach Starterzahl)', () => {
  it('verteilt die größte Klasse allein gegen mehrere kleine (Faktor 2)', () => {
    const counts = classCounts([...make('3', 8), ...make('1', 3), ...make('2', 2)])
    const tracks = autoDistribute(['1', '2', '3'], counts, 2)
    expect(tracks).toHaveLength(2)
    const sums = tracks.map((t) => t.reduce((s, it) => s + (it.kind === 'class' ? counts.get(it.klasse)! : 0), 0))
    // 8 gegen 3+2=5 → möglichst ausgeglichen; große Klasse allein
    expect(sums.sort((a, b) => a - b)).toEqual([5, 8])
  })

  it('erzeugt genau N Spuren', () => {
    const counts = classCounts([...make('3', 5), ...make('1', 4)])
    expect(autoDistribute(['1', '3'], counts, 4)).toHaveLength(4)
  })

  it('Faktor 2: findet die exakt ausgeglichene Aufteilung, wo Greedy 27/29 liefert', () => {
    // Reales 56-Starter-Feld: perfekte Partition 28/28 existiert (z. B. 5,6,7 | E,1,2,3,4).
    const ps = [
      ...make('E', 1),
      ...make('1', 4),
      ...make('2', 8),
      ...make('3', 9),
      ...make('4', 6),
      ...make('5', 10),
      ...make('6', 7),
      ...make('7', 11),
    ]
    const counts = classCounts(ps)
    const classes: ClassId[] = ['E', '1', '2', '3', '4', '5', '6', '7']
    const tracks = autoDistribute(classes, counts, 2)
    const sums = tracks.map((t) => t.reduce((s, it) => s + (it.kind === 'class' ? counts.get(it.klasse)! : 0), 0))
    expect(sums).toEqual([28, 28])

    // Ausgeglichen ⇒ vollständig durchverzahnt: kein Paar gleicher Klasse hintereinander.
    const parc: Parcours = { id: 'p', name: 'P', classIds: classes, wechselFaktor: 2 }
    const a = analyzeSequence(computeVerzahnung(parc, ps).sequence)
    expect(a.nonWechsel).toBe(0)
    expect(a.trailingRun).toBe(1)
  })
})

describe('buildSequence – Wechsel-Faktoren', () => {
  const ps = [...make('3', 8), ...make('1', 3), ...make('2', 2)]
  const byClass = participantsByClass(ps)

  it('Faktor 1: Klassen laufen in Blöcken (keine Verzahnung)', () => {
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['1', '2', '3'], wechselFaktor: 1 }
    expect(seq(computeVerzahnung(parc, ps).sequence)).toBe('1,1,1,2,2,3,3,3,3,3,3,3,3')
  })

  it('Faktor 2: reproduziert das PDF-Muster (Klasse 3 gegen 1+2)', () => {
    const tracks: TrackItem[][] = [[{ kind: 'class', klasse: '3' }], [{ kind: 'class', klasse: '1' }, { kind: 'class', klasse: '2' }]]
    expect(seq(buildSequence(tracks, byClass))).toBe('3,1,3,1,3,1,3,2,3,2,3,3,3')
  })

  it('Faktor 2 automatisch ergibt dasselbe Wechselmuster', () => {
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['1', '2', '3'], wechselFaktor: 2 }
    expect(seq(computeVerzahnung(parc, ps).sequence)).toBe('3,1,3,1,3,1,3,2,3,2,3,3,3')
  })

  it('Faktor 3: drei Spuren rotieren, Nachrücken wenn eine Klasse leer', () => {
    const ps3 = [...make('3', 6), ...make('1', 3), ...make('2', 4), ...make('4', 2)]
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['1', '2', '3', '4'], wechselFaktor: 3 }
    const s = seq(computeVerzahnung(parc, ps3).sequence)
    // erste Runden echter 3er-Wechsel: keine zwei gleichen Klassen direkt hintereinander am Anfang
    expect(s.split(',').slice(0, 6)).toEqual(['3', '2', '1', '3', '2', '1'])
    // alle Starter enthalten
    expect(s.split(',')).toHaveLength(15)
  })
})

describe('Pausen (Versatz, keine Leerzeile)', () => {
  it('Pause vor einer Klasse verzögert deren Einsatz (E vorne, 7 hinten)', () => {
    const ps = [...make('E', 3), ...make('7', 6)]
    const byClass = participantsByClass(ps)
    const tracks: TrackItem[][] = [
      [{ kind: 'class', klasse: 'E' }],
      [{ kind: 'pause', id: 'p1', length: 3 }, { kind: 'class', klasse: '7' }],
    ]
    expect(seq(buildSequence(tracks, byClass))).toBe('E,E,E,7,7,7,7,7,7')
  })

  it('Pause zwischen zwei Klassen einer Spur verschiebt die zweite Klasse nach hinten', () => {
    const ps = [...make('3', 4), ...make('1', 2), ...make('2', 2)]
    const byClass = participantsByClass(ps)
    const mitPause: TrackItem[][] = [
      [{ kind: 'class', klasse: '3' }],
      [{ kind: 'class', klasse: '1' }, { kind: 'pause', id: 'p', length: 2 }, { kind: 'class', klasse: '2' }],
    ]
    const ohnePause: TrackItem[][] = [
      [{ kind: 'class', klasse: '3' }],
      [{ kind: 'class', klasse: '1' }, { kind: 'class', klasse: '2' }],
    ]
    expect(seq(buildSequence(ohnePause, byClass))).toBe('3,1,3,1,3,2,3,2')
    expect(seq(buildSequence(mitPause, byClass))).toBe('3,1,3,1,3,3,2,2')
  })

  it('Pausen erzeugen keine Leerzeile – Sequenzlänge bleibt = Starterzahl', () => {
    const ps = [...make('3', 4), ...make('1', 2)]
    const byClass = participantsByClass(ps)
    const tracks: TrackItem[][] = [
      [{ kind: 'class', klasse: '3' }],
      [{ kind: 'pause', id: 'p', length: 5 }, { kind: 'class', klasse: '1' }],
    ]
    expect(buildSequence(tracks, byClass)).toHaveLength(6)
  })

  it('nur Pausen (keine Starter) terminieren ohne Endlosschleife', () => {
    const tracks: TrackItem[][] = [
      [{ kind: 'pause', id: 'a', length: 5 }],
      [{ kind: 'pause', id: 'b', length: 5 }],
    ]
    expect(buildSequence(tracks, new Map())).toEqual([])
  })
})

describe('tracksMatch & Normalisierung', () => {
  const present: ClassId[] = ['1', '2', '3']

  it('akzeptiert Anordnung, die genau die Klassen abdeckt (Pausen egal)', () => {
    const tracks: TrackItem[][] = [
      [{ kind: 'class', klasse: '3' }],
      [{ kind: 'class', klasse: '1' }, { kind: 'pause', id: 'p', length: 2 }, { kind: 'class', klasse: '2' }],
    ]
    expect(tracksMatch(tracks, present, 2)).toBe(true)
  })

  it('lehnt ab bei falscher Spurzahl', () => {
    const tracks: TrackItem[][] = [[{ kind: 'class', klasse: '3' }]]
    expect(tracksMatch(tracks, present, 2)).toBe(false)
  })

  it('lehnt ab bei fehlender/zusätzlicher Klasse', () => {
    const tracks: TrackItem[][] = [[{ kind: 'class', klasse: '3' }], [{ kind: 'class', klasse: '1' }]]
    expect(tracksMatch(tracks, present, 2)).toBe(false) // Klasse 2 fehlt
  })

  it('altes Format ClassId[][] wird als manuelle Anordnung erkannt (Rückwärtskompatibilität)', () => {
    const ps = [...make('3', 3), ...make('1', 2)]
    const parc = {
      id: 'o',
      name: 'O',
      classIds: ['1', '3'],
      wechselFaktor: 2,
      tracks: [['3'], ['1']],
    } as unknown as Parcours
    const r = computeVerzahnung(parc, ps)
    expect(r.manual).toBe(true)
    expect(seq(r.sequence)).toBe('3,1,3,1,3')
  })

  it('fällt auf Auto-Verteilung zurück, wenn manuelle Anordnung nicht mehr passt', () => {
    const ps = [...make('3', 3), ...make('1', 2), ...make('2', 2)]
    const parc: Parcours = {
      id: 'p',
      name: 'P',
      classIds: ['1', '2', '3'],
      wechselFaktor: 2,
      tracks: [[{ kind: 'class', klasse: '3' }], [{ kind: 'class', klasse: '1' }]], // Klasse 2 fehlt
    }
    expect(computeVerzahnung(parc, ps).manual).toBe(false)
  })
})

describe('computeVerzahnung – Gesamtverhalten', () => {
  it('enthält jeden Starter genau einmal', () => {
    const ps = [...make('E', 2), ...make('1', 5), ...make('3', 9), ...make('7', 4)]
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['E', '1', '3', '7'], wechselFaktor: 2 }
    const s = computeVerzahnung(parc, ps).sequence
    expect(s).toHaveLength(ps.length)
    expect(new Set(s.map((p) => p.id)).size).toBe(ps.length)
  })

  it('ignoriert Klassen, die nicht auf dem Parcours sind', () => {
    const ps = [...make('3', 3), ...make('5', 3)]
    const parc: Parcours = { id: 'p', name: 'P', classIds: ['3'], wechselFaktor: 2 }
    const s = computeVerzahnung(parc, ps).sequence
    expect(s.every((p) => p.klasse === '3')).toBe(true)
    expect(s).toHaveLength(3)
  })
})
