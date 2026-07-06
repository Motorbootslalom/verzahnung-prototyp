import type { ClassId, OriginMode, Participant } from '../types'
import { birthYearRange } from './classes'
import { CLUBS, BUNDESLAENDER } from '../data/clubs'
import { VORNAMEN_M, VORNAMEN_W, NACHNAMEN } from '../data/names'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function uid(): string {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Startnummern-Präfix je Klasse: E → "E", numerische Klassen → die Ziffer selbst. */
function startNrPrefix(klasse: ClassId): string {
  return klasse
}

/**
 * Ermittelt die nächste freie laufende Nummer für eine Klasse anhand der
 * bereits vergebenen Startnummern (Format Präfix + zweistellige Zahl).
 */
function nextStartNr(klasse: ClassId, existing: Participant[]): string {
  const prefix = startNrPrefix(klasse)
  let max = 0
  for (const p of existing) {
    if (p.klasse !== klasse) continue
    const num = parseInt(p.startNr.slice(prefix.length), 10)
    if (!Number.isNaN(num) && num > max) max = num
  }
  return prefix + pad2(max + 1)
}

/** Zufälliges gültiges Geburtsdatum (ISO) im Jahrgangsbereich der Klasse. */
function randomGeburtsdatum(klasse: ClassId, eventJahr: number): string {
  const [fromYear, toYear] = birthYearRange(klasse, eventJahr)
  const year = randInt(fromYear, toYear)
  const month = randInt(1, 12)
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = randInt(1, daysInMonth)
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Generiert einen einzelnen Teilnehmer. `existing` dient der Startnummern-Vergabe. */
export function generateParticipant(
  klasse: ClassId,
  eventJahr: number,
  originMode: OriginMode,
  existing: Participant[],
): Participant {
  const female = Math.random() < 0.5
  const vorname = pick(female ? VORNAMEN_W : VORNAMEN_M)
  const nachname = pick(NACHNAMEN)

  let verein: string
  let bundesland: string
  if (originMode === 'bundesland') {
    // Reiner Bundesland-Modus: kein konkreter Verein, nur das Bundesland.
    bundesland = pick(BUNDESLAENDER)
    verein = ''
  } else {
    const club = pick(CLUBS)
    verein = club.name
    bundesland = club.bundesland
  }

  return {
    id: uid(),
    startNr: nextStartNr(klasse, existing),
    vorname,
    nachname,
    verein,
    bundesland,
    geburtsdatum: randomGeburtsdatum(klasse, eventJahr),
    klasse,
  }
}

/**
 * Generiert `count` Teilnehmer für eine Klasse. Die Startnummern werden fortlaufend
 * unter Berücksichtigung bereits vorhandener Teilnehmer vergeben.
 */
export function generateParticipants(
  klasse: ClassId,
  count: number,
  eventJahr: number,
  originMode: OriginMode,
  existing: Participant[],
): Participant[] {
  const result: Participant[] = []
  const pool = [...existing]
  for (let i = 0; i < count; i++) {
    const p = generateParticipant(klasse, eventJahr, originMode, pool)
    result.push(p)
    pool.push(p)
  }
  return result
}
