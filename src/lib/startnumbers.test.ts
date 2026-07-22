import { describe, it, expect } from 'vitest'
import {
  makeStartNr,
  moveInOrder,
  orderBySize,
  parseClassNumber,
  renumberSequential,
  sortedByStartNr,
} from './startnumbers'
import type { ClassId, Participant } from '../types'

function mk(klasse: ClassId, nr: number, groesse = ''): Participant {
  return {
    id: `${klasse}-${nr}`,
    startNr: makeStartNr(klasse, nr),
    vorname: 'V',
    nachname: 'N' + nr,
    verein: 'C',
    bundesland: 'B',
    geburtsdatum: '2015-01-01',
    klasse,
    groesse,
  }
}

describe('startnumbers', () => {
  it('baut und liest klassenbasierte Nummern', () => {
    expect(makeStartNr('E', 3)).toBe('E03')
    expect(makeStartNr('7', 12)).toBe('712')
    expect(parseClassNumber('E03', 'E')).toBe(3)
    expect(parseClassNumber('712', '7')).toBe(12)
    expect(parseClassNumber('Exx', 'E')).toBeNull()
  })

  it('sortiert nach laufender Nummer', () => {
    const list = [mk('3', 10), mk('3', 2), mk('3', 1)]
    expect(sortedByStartNr(list).map((p) => p.startNr)).toEqual(['301', '302', '310'])
  })

  it('ordnet nach Größe (klein → groß), leere Größe ans Ende', () => {
    const list = [mk('3', 1, 'XL'), mk('3', 2, 'XS'), mk('3', 3, ''), mk('3', 4, 'M')]
    expect(orderBySize(list).map((p) => p.groesse)).toEqual(['XS', 'M', 'XL', ''])
  })

  it('vergibt fortlaufende Nummern in Reihenfolge', () => {
    const list = [mk('E', 5), mk('E', 9), mk('E', 2)]
    expect(renumberSequential(list).map((p) => p.startNr)).toEqual(['E01', 'E02', 'E03'])
  })

  it('verschiebt Starter an Anfang/Ende/um-eins', () => {
    const list = [mk('E', 1), mk('E', 2), mk('E', 3)]
    const ids = (l: Participant[]) => l.map((p) => p.id)
    expect(ids(moveInOrder(list, 'E-3', 'first'))).toEqual(['E-3', 'E-1', 'E-2'])
    expect(ids(moveInOrder(list, 'E-1', 'last'))).toEqual(['E-2', 'E-3', 'E-1'])
    expect(ids(moveInOrder(list, 'E-1', 'down'))).toEqual(['E-2', 'E-1', 'E-3'])
    expect(ids(moveInOrder(list, 'E-3', 'up'))).toEqual(['E-1', 'E-3', 'E-2'])
  })
})
