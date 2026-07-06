import type { ClassId, Parcours, Participant, TrackItem } from '../types'
import { CLASS_IDS } from './classes'

const classOrderIndex = (id: ClassId) => CLASS_IDS.indexOf(id)

/** Eindeutige Drag-ID eines Spur-Elements (Klasse: die Klassen-ID, Pause: die Pause-ID). */
export function itemDragId(item: TrackItem): string {
  return item.kind === 'class' ? item.klasse : item.id
}

/** Anzahl Teilnehmer je Klasse (nur Klassen mit >= 1 Teilnehmer). */
export function classCounts(participants: Participant[]): Map<ClassId, number> {
  const m = new Map<ClassId, number>()
  for (const p of participants) m.set(p.klasse, (m.get(p.klasse) ?? 0) + 1)
  return m
}

/** Teilnehmer je Klasse, jeweils nach Startnummer sortiert. */
export function participantsByClass(participants: Participant[]): Map<ClassId, Participant[]> {
  const m = new Map<ClassId, Participant[]>()
  for (const p of participants) {
    const list = m.get(p.klasse) ?? []
    list.push(p)
    m.set(p.klasse, list)
  }
  for (const list of m.values()) {
    list.sort((a, b) => a.startNr.localeCompare(b.startNr, 'de', { numeric: true }))
  }
  return m
}

/** Die Klassen eines Parcours, die tatsächlich Teilnehmer haben, in kanonischer Reihenfolge. */
export function presentClasses(parcours: Parcours, participants: Participant[]): ClassId[] {
  const counts = classCounts(participants)
  return parcours.classIds
    .filter((c) => (counts.get(c) ?? 0) > 0)
    .sort((a, b) => classOrderIndex(a) - classOrderIndex(b))
}

/** Wandelt Klassen-Gruppen (je Spur) in kanonisch sortierte Klassen-Blöcke um. */
function bucketsToTracks(buckets: ClassId[][]): TrackItem[][] {
  return buckets.map((b) =>
    b.sort((a, c) => classOrderIndex(a) - classOrderIndex(c)).map((klasse) => ({
      kind: 'class' as const,
      klasse,
    })),
  )
}

/**
 * Exakt ausgeglichene 2-Spur-Aufteilung (Partition-Problem). Minimiert die
 * Differenz der Starterzahlen beider Spuren – bei Faktor 2 bestimmt genau diese
 * Differenz die Länge des un-verzahnten End-Blocks. Bei ≤ ~20 Klassen werden
 * alle Teilmengen geprüft (hier immer ≤ 8), sonst greift die Greedy-Verteilung.
 */
function twoWayBalanced(classes: ClassId[], counts: Map<ClassId, number>): TrackItem[][] {
  const n = classes.length
  if (n > 20) return greedyDistribute(classes, counts, 2)

  const cnt = (c: ClassId) => counts.get(c) ?? 0
  const total = classes.reduce((s, c) => s + cnt(c), 0)

  let bestMask = 0
  let bestDiff = Infinity
  const full = 1 << n
  for (let mask = 0; mask < full; mask++) {
    let sum = 0
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += cnt(classes[i])
    const diff = Math.abs(total - 2 * sum)
    if (diff < bestDiff) {
      bestDiff = diff
      bestMask = mask
    }
  }

  const groupA: ClassId[] = []
  const groupB: ClassId[] = []
  for (let i = 0; i < n; i++) (bestMask & (1 << i) ? groupA : groupB).push(classes[i])

  // Größere Spur zuerst: ihr eventueller Rest am Ende wird dann von der anderen
  // Spur vom gleichklassigen Vorgänger getrennt und der End-Block bleibt kürzer.
  const sum = (g: ClassId[]) => g.reduce((s, c) => s + cnt(c), 0)
  const groups = [groupA, groupB].sort((a, b) => sum(b) - sum(a))
  return bucketsToTracks(groups)
}

/**
 * Greedy-Verteilung auf N Spuren: größte Klassen zuerst, jeweils in die aktuell
 * kleinste Spur. Innerhalb einer Spur kanonische Reihenfolge.
 */
function greedyDistribute(classes: ClassId[], counts: Map<ClassId, number>, n: number): TrackItem[][] {
  const buckets: ClassId[][] = Array.from({ length: n }, () => [])
  const sums = new Array(n).fill(0)

  const sorted = [...classes].sort((a, b) => {
    const d = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    return d !== 0 ? d : classOrderIndex(a) - classOrderIndex(b)
  })

  for (const c of sorted) {
    let best = 0
    for (let i = 1; i < n; i++) if (sums[i] < sums[best]) best = i
    buckets[best].push(c)
    sums[best] += counts.get(c) ?? 0
  }

  return bucketsToTracks(buckets)
}

/**
 * Verteilt die vorhandenen Klassen möglichst gleichmäßig (nach Starterzahl) auf N Spuren.
 * Für Faktor 2 wird die exakt ausgeglichene Aufteilung gesucht (kürzester End-Block),
 * für mehr Spuren die Greedy-Heuristik genutzt.
 */
export function autoDistribute(
  classes: ClassId[],
  counts: Map<ClassId, number>,
  n: number,
): TrackItem[][] {
  if (n === 2) return twoWayBalanced(classes, counts)
  return greedyDistribute(classes, counts, n)
}

/** Nur die Klassen-Blöcke einer Spur-Anordnung (Pausen ignoriert), als flache Liste. */
function classesInTracks(tracks: TrackItem[][]): ClassId[] {
  return tracks.flatMap((t) => t.filter((i): i is Extract<TrackItem, { kind: 'class' }> => i.kind === 'class').map((i) => i.klasse))
}

/**
 * Wandelt evtl. altes Format (ClassId[][]) oder unbekannte Daten in TrackItem[][] um.
 * Strings werden als Klassen-Blöcke interpretiert.
 */
function normalizeTracks(raw: unknown): TrackItem[][] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: TrackItem[][] = []
  for (const track of raw) {
    if (!Array.isArray(track)) return undefined
    const items: TrackItem[] = []
    for (const it of track) {
      if (typeof it === 'string') items.push({ kind: 'class', klasse: it as ClassId })
      else if (it && typeof it === 'object' && (it as TrackItem).kind === 'class')
        items.push({ kind: 'class', klasse: (it as { klasse: ClassId }).klasse })
      else if (it && typeof it === 'object' && (it as TrackItem).kind === 'pause')
        items.push({
          kind: 'pause',
          id: (it as { id: string }).id,
          length: (it as { length: number }).length,
        })
      else return undefined
    }
    out.push(items)
  }
  return out
}

/** Prüft, ob eine manuelle Spur-Anordnung genau die vorhandenen Klassen abdeckt (Pausen egal). */
export function tracksMatch(tracks: TrackItem[][] | undefined, classes: ClassId[], n: number): boolean {
  if (!tracks || tracks.length !== n) return false
  const flat = classesInTracks(tracks)
  if (flat.length !== classes.length) return false
  const a = new Set(flat)
  if (a.size !== flat.length) return false
  for (const c of classes) if (!a.has(c)) return false
  return true
}

type Step = { kind: 'starter'; p: Participant } | { kind: 'pause' }

/**
 * Baut die verzahnte Startreihenfolge aus einer Spur-Anordnung.
 * Round-Robin über die Spuren; leere Spuren werden übersprungen. Eine Pause
 * verbraucht einen Takt der Spur, ohne einen Starter zu erzeugen – dadurch
 * setzt die nachfolgende Klasse dieser Spur später ein (Versatz, keine Leerzeile).
 */
export function buildSequence(
  tracks: TrackItem[][],
  byClass: Map<ClassId, Participant[]>,
): Participant[] {
  const stepTracks: Step[][] = tracks.map((track) => {
    const steps: Step[] = []
    for (const item of track) {
      if (item.kind === 'pause') {
        for (let i = 0; i < Math.max(0, item.length); i++) steps.push({ kind: 'pause' })
      } else {
        for (const p of byClass.get(item.klasse) ?? []) steps.push({ kind: 'starter', p })
      }
    }
    return steps
  })

  const pos = stepTracks.map(() => 0)
  const remainingStarters = () =>
    stepTracks.reduce(
      (sum, steps, i) => sum + steps.slice(pos[i]).filter((s) => s.kind === 'starter').length,
      0,
    )

  const sequence: Participant[] = []
  const n = stepTracks.length
  let idx = 0

  while (remainingStarters() > 0) {
    // nächste Spur mit noch offenen Schritten finden
    let skipped = 0
    while (skipped < n && pos[idx % n] >= stepTracks[idx % n].length) {
      idx++
      skipped++
    }
    if (skipped >= n) break

    const t = idx % n
    const step = stepTracks[t][pos[t]]
    pos[t]++
    idx++
    if (step.kind === 'starter') sequence.push(step.p)
    // Pause: nichts ausgeben, nur den Takt verbrauchen
  }

  return sequence
}

export interface VerzahnungResult {
  /** Verwendete Spur-Anordnung (Klassen-/Pausen-Blöcke je Spur). */
  tracks: TrackItem[][]
  /** Verzahnte Startreihenfolge. */
  sequence: Participant[]
  /** true, wenn die manuelle Anordnung genutzt wurde (statt Auto-Verteilung). */
  manual: boolean
}

export interface SequenceAnalysis {
  /** Anzahl Starter in der Reihenfolge. */
  total: number
  /** Benachbarte Paare mit Klassenwechsel (echter Bootswechsel möglich). */
  wechsel: number
  /** Benachbarte Paare derselben Klasse (kein Wechsel). */
  nonWechsel: number
  /** Klasse des End-Blocks (letzte Starter derselben Klasse) bzw. null. */
  trailingKlasse: ClassId | null
  /**
   * Länge des zusammenhängenden End-Blocks derselben Klasse. Diese Starter
   * laufen ohne Verzahnung, weil keine andere Klasse mehr zum Wechseln übrig ist.
   */
  trailingRun: number
}

/**
 * Bewertet eine Startreihenfolge: Wie viele echte Wechsel gibt es, und wie
 * lang ist der un-verzahnte End-Block (die Kennzahl, die es zu minimieren gilt)?
 */
export function analyzeSequence(sequence: Participant[]): SequenceAnalysis {
  const total = sequence.length
  let wechsel = 0
  let nonWechsel = 0
  for (let i = 1; i < total; i++) {
    if (sequence[i].klasse === sequence[i - 1].klasse) nonWechsel++
    else wechsel++
  }

  let trailingKlasse: ClassId | null = null
  let trailingRun = 0
  if (total > 0) {
    trailingKlasse = sequence[total - 1].klasse
    trailingRun = 1
    for (let i = total - 2; i >= 0 && sequence[i].klasse === trailingKlasse; i--) trailingRun++
  }

  return { total, wechsel, nonWechsel, trailingKlasse, trailingRun }
}

/**
 * Berechnet die komplette Verzahnung eines Parcours. Nutzt die manuelle
 * Spur-Anordnung, falls sie zur aktuellen Klassen-/Faktor-Situation passt,
 * sonst die automatische Verteilung.
 */
export function computeVerzahnung(parcours: Parcours, allParticipants: Participant[]): VerzahnungResult {
  const participants = allParticipants.filter((p) => parcours.classIds.includes(p.klasse))
  const classes = presentClasses(parcours, participants)
  const counts = classCounts(participants)
  const byClass = participantsByClass(participants)
  const n = parcours.wechselFaktor

  const normalized = normalizeTracks(parcours.tracks)
  const manual = tracksMatch(normalized, classes, n)
  const tracks = manual ? normalized! : autoDistribute(classes, counts, n)

  return { tracks, sequence: buildSequence(tracks, byClass), manual }
}
