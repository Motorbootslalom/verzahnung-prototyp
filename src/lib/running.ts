import type { AppState, RunningNumberConfig } from '../types'
import { planEvent } from './plan'
import { buildParallelPlan } from './parallel'

/**
 * Parst die Liste zu überspringender (fehlender) Startnummern aus freiem Text.
 * Trennt an allem, was keine Ziffer ist ("7, 13; 20" → [7, 13, 20]), verwirft
 * Ungültiges und Duplikate.
 */
export function parseSkipList(text: string): number[] {
  const nums = text
    .split(/[^0-9]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  return [...new Set(nums)]
}

/**
 * Erzeugt einen Generator, der ab `start` fortlaufende Nummern liefert und dabei
 * alle Nummern aus `skip` auslässt (fehlt 7, folgt auf 6 die 8).
 */
export function makeNumberSequence(start: number, skip: number[]): () => number {
  const skipSet = new Set(skip)
  let next = Math.max(1, Math.floor(start) || 1)
  return () => {
    while (skipSet.has(next)) next++
    return next++
  }
}

/**
 * Weist einer nach der Verzahnung geordneten Liste von Starter-IDs klassische
 * Startnummern zu. Jede ID erhält bei ihrem **ersten** Auftreten eine Nummer
 * (im Parallel-Slalom kommt ein Starter zweimal vor – er behält dieselbe
 * Nummer). Übersprungene Nummern werden ausgelassen.
 */
export function assignRunningNumbers(
  orderedIds: (string | null | undefined)[],
  cfg: { start: number; skip: number[] },
): Map<string, number> {
  const next = makeNumberSequence(cfg.start, cfg.skip)
  const map = new Map<string, number>()
  for (const id of orderedIds) {
    if (!id || map.has(id)) continue
    map.set(id, next())
  }
  return map
}

/** Bequemer Aufruf direkt aus der Konfiguration. */
export function runningNumbersFrom(
  orderedIds: (string | null | undefined)[],
  cfg: RunningNumberConfig,
): Map<string, number> {
  return assignRunningNumbers(orderedIds, { start: cfg.start, skip: parseSkipList(cfg.skipText) })
}

/** Starter-IDs in der Reihenfolge der Manövrier-Verzahnung (über alle Parcours). */
function manoeverOrderIds(state: AppState): string[] {
  const plan = planEvent(state)
  const byId = new Map(plan.plans.map((p) => [p.parcoursId, p]))
  return state.parcoursList.flatMap(
    (p) => byId.get(p.id)?.sequence.map((part) => part.id) ?? [],
  )
}

/** Starter-IDs in Parallel-Slalom-Reihenfolge (je Heat A vor B); Dummys als null. */
function parallelOrderIds(state: AppState): (string | null)[] {
  const plan = buildParallelPlan(state.participants, {
    international: state.parallelInternational,
    class4Small: state.class4Small,
  })
  return plan.heats.flatMap((h) => [
    h.a.kind === 'starter' ? h.a.p.id : null,
    h.b.kind === 'starter' ? h.b.p.id : null,
  ])
}

/**
 * Die **kanonischen** klassischen Startnummern: eine je Starter, einheitlich für
 * die Teilnehmer-Liste und **beide** Disziplinen. Als Reihenfolge gilt die per
 * `source` gewählte Verzahnung (Standard: Manövrieren, fortlaufend über alle
 * Parcours) – die jeweils andere Ansicht zeigt dieselben Nummern nur an, zählt
 * also nicht eigenständig. Liefert `null`, wenn die Nummerierung deaktiviert ist.
 */
export function canonicalRunningNumbers(state: AppState): Map<string, number> | null {
  if (!state.runningNumbers.enabled) return null
  const orderedIds =
    state.runningNumbers.source === 'parallel'
      ? parallelOrderIds(state)
      : manoeverOrderIds(state)
  return runningNumbersFrom(orderedIds, state.runningNumbers)
}
