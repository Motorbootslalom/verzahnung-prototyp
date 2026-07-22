/**
 * Konfektionsgrößen der Starter. Die Größe bestimmt die Reihenfolge der
 * klassenbasierten Startnummern innerhalb einer Klasse: kleine Größen bekommen
 * die vorderen Nummern, große (XXL/XXXL) die hinteren.
 */
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

export type Groesse = (typeof SIZES)[number]

const SIZE_RANK = new Map<string, number>(SIZES.map((s, i) => [s, i]))

/**
 * Normalisiert eine (evtl. aus Excel stammende) Größenangabe auf die kanonische
 * Schreibweise. Toleriert Kleinschreibung, Leerzeichen und die Varianten
 * "2XL"/"3XL". Unbekannte Werte werden unverändert (getrimmt) zurückgegeben.
 */
export function normalizeSize(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!s) return ''
  const map: Record<string, Groesse> = {
    '2XL': 'XXL',
    '3XL': 'XXXL',
    XXXL: 'XXXL',
    XXL: 'XXL',
    XL: 'XL',
    L: 'L',
    M: 'M',
    S: 'S',
    XS: 'XS',
  }
  return map[s] ?? raw.trim()
}

/**
 * Sortierrang einer Größe (klein → groß). Bekannte Größen liefern ihren Index in
 * {@link SIZES}; unbekannte/leere Größen werden ans Ende sortiert.
 */
export function sizeRank(raw: string): number {
  const rank = SIZE_RANK.get(normalizeSize(raw))
  return rank === undefined ? SIZES.length : rank
}

export function isKnownSize(raw: string): boolean {
  return SIZE_RANK.has(normalizeSize(raw))
}
