import type { BoatType, ClassId } from '../types'

export interface ClassDef {
  id: ClassId
  label: string
  /** minimales Alter (Jahrgang) in der Klasse */
  minAge: number
  /** maximales Alter (Jahrgang) in der Klasse */
  maxAge: number
  /** Farbe für die visuelle Kennzeichnung in der Verzahnung */
  color: string
}

// Altersklasse = Veranstaltungsjahr − Geburtsjahr (jahrgangsbezogen).
// Die Jahrgänge werden daher immer aus dem Eventjahr berechnet, nicht hart kodiert.
export const CLASSES: ClassDef[] = [
  { id: 'E', label: 'Klasse E', minAge: 6, maxAge: 7, color: '#8b5cf6' },
  { id: '1', label: 'Klasse 1', minAge: 8, maxAge: 9, color: '#3b82f6' },
  { id: '2', label: 'Klasse 2', minAge: 10, maxAge: 11, color: '#06b6d4' },
  { id: '3', label: 'Klasse 3', minAge: 12, maxAge: 13, color: '#10b981' },
  { id: '4', label: 'Klasse 4', minAge: 14, maxAge: 15, color: '#eab308' },
  { id: '5', label: 'Klasse 5', minAge: 16, maxAge: 18, color: '#f97316' },
  { id: '6', label: 'Klasse 6', minAge: 19, maxAge: 21, color: '#ef4444' },
  { id: '7', label: 'Klasse 7', minAge: 22, maxAge: 27, color: '#ec4899' },
]

export const CLASS_IDS: ClassId[] = CLASSES.map((c) => c.id)

const CLASS_MAP = new Map<ClassId, ClassDef>(CLASSES.map((c) => [c.id, c]))

export function getClass(id: ClassId): ClassDef {
  const c = CLASS_MAP.get(id)
  if (!c) throw new Error(`Unbekannte Klasse: ${id}`)
  return c
}

export function classColor(id: ClassId): string {
  return getClass(id).color
}

/** Klassen, die (normalerweise) mit einem kleinen Boot fahren. */
const KLEIN_BOOT_CLASSES = new Set<ClassId>(['E', '1', '2', '3'])

/**
 * Boot-Typ einer Klasse. Klasse 4 fährt normalerweise groß, mit `class4Small`
 * aber ausnahmsweise klein.
 */
export function boatTypeOf(id: ClassId, class4Small: boolean): BoatType {
  if (KLEIN_BOOT_CLASSES.has(id)) return 'klein'
  if (id === '4' && class4Small) return 'klein'
  return 'gross'
}

export const BOAT_LABEL: Record<BoatType, string> = {
  klein: 'kleines Boot',
  gross: 'großes Boot',
}

/** Geburtsjahr-Bereich [von, bis] (beide inklusive) für eine Klasse im gegebenen Eventjahr. */
export function birthYearRange(id: ClassId, eventJahr: number): [number, number] {
  const c = getClass(id)
  // Ältester Jahrgang = eventJahr - maxAge, jüngster = eventJahr - minAge
  return [eventJahr - c.maxAge, eventJahr - c.minAge]
}

/** Menschlich lesbarer Alters-/Jahrgangs-Hinweis, z. B. "6–7 J. · Jg. 2019–2020". */
export function ageHint(id: ClassId, eventJahr: number): string {
  const c = getClass(id)
  const [from, to] = birthYearRange(id, eventJahr)
  return `${c.minAge}–${c.maxAge} J. · Jg. ${from}–${to}`
}
