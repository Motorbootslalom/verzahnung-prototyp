import type { ClassId, Participant } from '../types'
import { sizeRank } from './sizes'

/** Startnummern-Präfix je Klasse: E → "E", numerische Klassen → die Ziffer. */
export function startNrPrefix(klasse: ClassId): string {
  return klasse
}

/** Zweistellig auffüllen (E → E01), größere Zahlen bleiben unverändert. */
function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Baut eine klassenbasierte Startnummer aus Klasse und laufender Nummer. */
export function makeStartNr(klasse: ClassId, n: number): string {
  return startNrPrefix(klasse) + pad2(n)
}

/**
 * Liest die laufende Nummer aus einer klassenbasierten Startnummer (Präfix +
 * Zahl). Liefert `null`, wenn kein numerischer Teil vorhanden ist.
 */
export function parseClassNumber(startNr: string, klasse: ClassId): number | null {
  const num = parseInt(startNr.slice(startNrPrefix(klasse).length), 10)
  return Number.isNaN(num) ? null : num
}

/**
 * Vergleichsschlüssel für die Sortierung innerhalb einer Klasse: nach laufender
 * Nummer (fehlt sie, ans Ende), dann alphabetisch als stabiler Tiebreak.
 */
function byNumber(a: Participant, b: Participant): number {
  const na = parseClassNumber(a.startNr, a.klasse)
  const nb = parseClassNumber(b.startNr, b.klasse)
  const va = na ?? Number.MAX_SAFE_INTEGER
  const vb = nb ?? Number.MAX_SAFE_INTEGER
  if (va !== vb) return va - vb
  return a.startNr.localeCompare(b.startNr, 'de', { numeric: true })
}

/** Teilnehmer einer Klasse in der aktuellen Startnummern-Reihenfolge. */
export function sortedByStartNr(list: Participant[]): Participant[] {
  return [...list].sort(byNumber)
}

/**
 * Reihenfolge nach Konfektionsgröße (klein → groß). Bei gleicher Größe bleibt die
 * bisherige Startnummern-Reihenfolge erhalten (stabiler Tiebreak).
 */
export function orderBySize(list: Participant[]): Participant[] {
  return [...list].sort((a, b) => {
    const ra = sizeRank(a.groesse)
    const rb = sizeRank(b.groesse)
    if (ra !== rb) return ra - rb
    return byNumber(a, b)
  })
}

/**
 * Weist einer geordneten Starter-Liste fortlaufende klassenbasierte Startnummern
 * (1, 2, 3 …) zu und liefert die aktualisierten Teilnehmer in Eingangsreihenfolge.
 */
export function renumberSequential(ordered: Participant[]): Participant[] {
  return ordered.map((p, i) => ({ ...p, startNr: makeStartNr(p.klasse, i + 1) }))
}

/**
 * Verschiebt den Starter `id` innerhalb seiner (bereits geordneten) Liste an den
 * Anfang, ans Ende oder um eine Position und liefert die neue Reihenfolge.
 */
export function moveInOrder(
  ordered: Participant[],
  id: string,
  target: 'first' | 'last' | 'up' | 'down',
): Participant[] {
  const from = ordered.findIndex((p) => p.id === id)
  if (from < 0) return ordered
  const next = [...ordered]
  const [item] = next.splice(from, 1)
  let to: number
  switch (target) {
    case 'first':
      to = 0
      break
    case 'last':
      to = next.length
      break
    case 'up':
      to = Math.max(0, from - 1)
      break
    case 'down':
      to = Math.min(next.length, from + 1)
      break
  }
  next.splice(to, 0, item)
  return next
}
