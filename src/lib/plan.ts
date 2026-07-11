import type {
  AppState,
  BoatConfig,
  BoatType,
  ClassId,
  Parcours,
  Participant,
  TrackItem,
  WechselFaktor,
} from '../types'
import { boatTypeOf, CLASS_IDS } from './classes'
import {
  analyzeSequence,
  autoDistribute,
  buildSequence,
  buildSequenceSteps,
  classCounts,
  computeVerzahnung,
  participantsByClass,
  presentClasses,
} from './verzahnung'
import { computeBoatDemand, type BoatDemand } from './boats'

export interface ParcoursPlan {
  parcoursId: string
  tracks: TrackItem[][]
  sequence: Participant[]
  manual: boolean
  demand: BoatDemand
  requestedFactor: WechselFaktor
  /** Zahl der tatsächlich genutzten (nicht leeren) Spuren. */
  effectiveTracks: number
  /** Bootbedarf der unbeschränkten Optimal-Verzahnung (für den Mehrbedarf-Hinweis). */
  optimalDemand: BoatDemand
  /** true, wenn die Boote eine schlechtere als die optimale Anordnung erzwungen haben. */
  constrained: boolean
}

const classOrder = (id: ClassId) => CLASS_IDS.indexOf(id)

/** Eine Klassen-Gruppe (eine Spur) als kanonisch sortierte Klassen-Blöcke. */
function groupToTrack(group: ClassId[]): TrackItem[] {
  return [...group]
    .sort((a, b) => classOrder(a) - classOrder(b))
    .map((klasse) => ({ kind: 'class' as const, klasse }))
}

function trackSum(track: TrackItem[], counts: Map<ClassId, number>): number {
  return track.reduce((s, it) => s + (it.kind === 'class' ? counts.get(it.klasse) ?? 0 : 0), 0)
}

/**
 * Bootstyp-getrennte Anordnungen: die Spuren werden auf kleine und große Klassen
 * aufgeteilt (z. B. 1 Spur E–3 · 2 Spuren 4–7). So belegt jede Spur nur ein Boot
 * ihres Typs – wichtig, damit eine Verzahnung auch mit knappen, unterschiedlich
 * verteilten Booten (z. B. 1 klein + 2 groß) fahrbar bleibt.
 */
function boatSeparatedCandidates(
  factor: number,
  classes: ClassId[],
  counts: Map<ClassId, number>,
  typeOf: (k: ClassId) => BoatType,
): TrackItem[][][] {
  const klein = classes.filter((c) => typeOf(c) === 'klein')
  const gross = classes.filter((c) => typeOf(c) === 'gross')
  // Nur sinnvoll, wenn beide Bootstypen vorkommen (sonst deckt Greedy es ab).
  if (klein.length === 0 || gross.length === 0) return []

  const out: TrackItem[][][] = []
  for (let kKlein = 1; kKlein <= factor - 1; kKlein++) {
    const kGross = factor - kKlein
    // Keine leeren Spuren erzeugen: nicht mehr Spuren als Klassen je Bootstyp.
    if (kKlein > klein.length || kGross > gross.length) continue
    out.push([
      ...autoDistribute(klein, counts, kKlein),
      ...autoDistribute(gross, counts, kGross),
    ])
  }
  return out
}

/** Kandidaten-Anordnungen für einen Wechselfaktor. */
function candidatesForFactor(
  factor: number,
  classes: ClassId[],
  counts: Map<ClassId, number>,
  typeOf: (k: ClassId) => BoatType,
): TrackItem[][][] {
  if (factor <= 1) return [[groupToTrack(classes)]]

  if (factor === 2) {
    const out: TrackItem[][][] = []
    const full = 1 << classes.length
    for (let mask = 0; mask < full; mask++) {
      const a: ClassId[] = []
      const b: ClassId[] = []
      classes.forEach((c, i) => (mask & (1 << i) ? a : b).push(c))
      const ta = groupToTrack(a)
      const tb = groupToTrack(b)
      // Größere Spur zuerst (wie autoDistribute) – kürzt den End-Block.
      out.push(trackSum(ta, counts) >= trackSum(tb, counts) ? [ta, tb] : [tb, ta])
    }
    return out
  }

  // Faktor 3/4: Greedy-Verteilung plus bootstyp-getrennte Anordnungen, damit auch
  // bei knappen/unterschiedlich verteilten Booten eine volle Spurzahl fahrbar ist.
  return [
    autoDistribute(classes, counts, factor),
    ...boatSeparatedCandidates(factor, classes, counts, typeOf),
  ]
}

type Quality = { nonWechsel: number; trailingRun: number; imbalance: number }

/** Kleiner = besser: weniger Nicht-Wechsel, kürzerer End-Block, ausgeglichener. */
function betterQuality(a: Quality, b: Quality): boolean {
  if (a.nonWechsel !== b.nonWechsel) return a.nonWechsel < b.nonWechsel
  if (a.trailingRun !== b.trailingRun) return a.trailingRun < b.trailingRun
  return a.imbalance < b.imbalance
}

function sameQuality(a: Quality, b: Quality): boolean {
  return !betterQuality(a, b) && !betterQuality(b, a)
}

interface Candidate {
  tracks: TrackItem[][]
  q: Quality
  demand: BoatDemand
}

function evaluate(
  tracks: TrackItem[][],
  byClass: Map<ClassId, Participant[]>,
  counts: Map<ClassId, number>,
  typeOf: (k: ClassId) => BoatType,
): Candidate {
  const steps = buildSequenceSteps(tracks, byClass)
  const a = analyzeSequence(steps.map((s) => s.p))
  const sums = tracks.map((t) => trackSum(t, counts)).filter((s) => s > 0)
  const imbalance = sums.length ? Math.max(...sums) - Math.min(...sums) : 0
  return {
    tracks,
    q: { nonWechsel: a.nonWechsel, trailingRun: a.trailingRun, imbalance },
    demand: computeBoatDemand(steps, typeOf),
  }
}

/** Beste Anordnung: zuerst Qualität, bei Gleichstand sparsamster Bootbedarf. */
function betterCandidate(a: Candidate, b: Candidate): boolean {
  if (!sameQuality(a.q, b.q)) return betterQuality(a.q, b.q)
  return a.demand.klein + a.demand.gross < b.demand.klein + b.demand.gross
}

function pickBest(cands: Candidate[]): Candidate | null {
  let best: Candidate | null = null
  for (const c of cands) if (!best || betterCandidate(c, best)) best = c
  return best
}

const fits = (d: BoatDemand, budget: BoatConfig) => d.klein <= budget.klein && d.gross <= budget.gross

/**
 * Beste Anordnung eines Parcours unter einem Boot-Budget. Manuelle Anordnungen
 * bleiben unverändert (nur der Bedarf wird ausgewiesen). Für die automatische
 * Verteilung wird – vom gewünschten Faktor abwärts – die beste noch fahrbare
 * Anordnung gewählt; notfalls mit weniger Spuren.
 */
export function bestArrangement(
  parcours: Parcours,
  allParticipants: Participant[],
  class4Small: boolean,
  budget: BoatConfig,
): ParcoursPlan {
  const participants = allParticipants.filter((p) => parcours.classIds.includes(p.klasse))
  const byClass = participantsByClass(participants)
  const counts = classCounts(participants)
  const classes = presentClasses(parcours, participants)
  const typeOf = (k: ClassId) => boatTypeOf(k, class4Small)
  const requestedFactor = parcours.wechselFaktor

  const base = computeVerzahnung(parcours, allParticipants)

  const effectiveTracks = (tracks: TrackItem[][]) =>
    tracks.filter((t) => t.some((i) => i.kind === 'class')).length

  // Manuelle Anordnung: unverändert übernehmen (nur Bedarf ausweisen).
  if (base.manual) {
    const demand = computeBoatDemand(buildSequenceSteps(base.tracks, byClass), typeOf)
    return {
      parcoursId: parcours.id,
      tracks: base.tracks,
      sequence: base.sequence,
      manual: true,
      demand,
      requestedFactor,
      effectiveTracks: effectiveTracks(base.tracks),
      optimalDemand: demand,
      constrained: !fits(demand, budget),
    }
  }

  // Unbeschränktes Optimum beim gewünschten Faktor (bei Gleichstand bootsparend).
  const atRequested = candidatesForFactor(requestedFactor, classes, counts, typeOf).map((t) =>
    evaluate(t, byClass, counts, typeOf),
  )
  const optimal = pickBest(atRequested) ?? evaluate([groupToTrack(classes)], byClass, counts, typeOf)

  const finalize = (chosen: Candidate): ParcoursPlan => ({
    parcoursId: parcours.id,
    tracks: chosen.tracks,
    sequence: buildSequence(chosen.tracks, byClass),
    manual: false,
    demand: chosen.demand,
    requestedFactor,
    effectiveTracks: effectiveTracks(chosen.tracks),
    optimalDemand: optimal.demand,
    constrained: betterQuality(optimal.q, chosen.q),
  })

  // Vom gewünschten Faktor abwärts die beste fahrbare Anordnung suchen.
  for (let f = requestedFactor; f >= 1; f--) {
    const cands = (f === requestedFactor
      ? atRequested
      : candidatesForFactor(f, classes, counts, typeOf).map((t) => evaluate(t, byClass, counts, typeOf))
    ).filter((c) => fits(c.demand, budget))
    const best = pickBest(cands)
    if (best) return finalize(best)
  }

  // Nichts passt (z. B. gar keine Boote eines benötigten Typs): sparsamste Anordnung zeigen.
  return finalize(evaluate([groupToTrack(classes)], byClass, counts, typeOf))
}

export interface EventPlan {
  plans: ParcoursPlan[]
  available: BoatConfig
  /** Bedarf der (beschränkten) angezeigten Verzahnung. */
  demand: BoatDemand
  /** Bedarf der unbeschränkten Optimal-Verzahnung. */
  optimalDemand: BoatDemand
  /** Zusätzlich nötige Boote, um die optimale Verzahnung fahren zu können. */
  extra: BoatDemand
  /** true, wenn mindestens ein Parcours boot-bedingt schlechter verzahnt ist. */
  anyConstrained: boolean
}

const addDemand = (a: BoatDemand, b: BoatDemand): BoatDemand => ({
  klein: a.klein + b.klein,
  gross: a.gross + b.gross,
})

/**
 * Plant alle Parcours. Die Boote werden greedy in Parcours-Reihenfolge verteilt
 * (Parcours laufen parallel, teilen sich den Pool). Liefert die anzuzeigenden
 * Anordnungen plus den Mehrbedarf für die optimale Verzahnung.
 */
export function planEvent(state: AppState): EventPlan {
  let remaining: BoatConfig = { ...state.boats }
  const plans: ParcoursPlan[] = []
  for (const parc of state.parcoursList) {
    const plan = bestArrangement(parc, state.participants, state.class4Small, remaining)
    plans.push(plan)
    remaining = {
      klein: Math.max(0, remaining.klein - plan.demand.klein),
      gross: Math.max(0, remaining.gross - plan.demand.gross),
    }
  }

  const demand = plans.reduce<BoatDemand>((s, p) => addDemand(s, p.demand), { klein: 0, gross: 0 })
  const optimalDemand = plans.reduce<BoatDemand>(
    (s, p) => addDemand(s, p.optimalDemand),
    { klein: 0, gross: 0 },
  )
  const extra: BoatDemand = {
    klein: Math.max(0, optimalDemand.klein - state.boats.klein),
    gross: Math.max(0, optimalDemand.gross - state.boats.gross),
  }
  return {
    plans,
    available: state.boats,
    demand,
    optimalDemand,
    extra,
    anyConstrained: plans.some((p) => p.constrained),
  }
}
