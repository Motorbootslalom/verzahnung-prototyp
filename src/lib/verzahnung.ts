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

/**
 * Verteilt die vorhandenen Klassen möglichst gleichmäßig (nach Starterzahl) auf N Spuren.
 * Greedy: größte Klassen zuerst, jeweils in die aktuell kleinste Spur.
 * Innerhalb einer Spur werden die Klassen in kanonischer Reihenfolge abgearbeitet.
 */
export function autoDistribute(
  classes: ClassId[],
  counts: Map<ClassId, number>,
  n: number,
): TrackItem[][] {
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

  return buckets.map((b) =>
    b.sort((a, c) => classOrderIndex(a) - classOrderIndex(c)).map((klasse) => ({
      kind: 'class' as const,
      klasse,
    })),
  )
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
