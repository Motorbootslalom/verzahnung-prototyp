import type { AppState, BoatConfig, BoatType, ClassId, Parcours, Participant } from '../types'
import { boatTypeOf } from './classes'
import {
  buildSequenceSteps,
  computeVerzahnung,
  participantsByClass,
  type SeqStep,
} from './verzahnung'

/** Bedarf an Booten je Typ. */
export interface BoatDemand {
  klein: number
  gross: number
}

/** Puffer (in Startern), bevor ein frei gewordenes Boot die Spur wechseln darf. */
export const BOAT_SWITCH_BUFFER = 1

type Interval = { start: number; end: number }

/** Maximale gleichzeitige Überlappung von Intervallen (Sweep-Line). */
function maxOverlap(intervals: Interval[]): number {
  const events: { at: number; delta: number }[] = []
  for (const iv of intervals) {
    events.push({ at: iv.start, delta: 1 })
    events.push({ at: iv.end + 1, delta: -1 })
  }
  // Enden (-1) vor Anfängen (+1) an derselben Position: berührende Intervalle
  // überlappen nicht.
  events.sort((a, b) => a.at - b.at || a.delta - b.delta)
  let cur = 0
  let peak = 0
  for (const e of events) {
    cur += e.delta
    if (cur > peak) peak = cur
  }
  return peak
}

/**
 * Bootbedarf einer verzahnten Startreihenfolge. Modell: jede Spur hält ein Boot
 * ihres aktuellen Klassentyps. Solange eine Spur einen Typ fährt, belegt sie ein
 * Boot dieses Typs (Intervall über die globalen Positionen ihrer Starter). Ein
 * Boot darf erst nach `buffer` Startern die Spur wechseln – deshalb wird jedes
 * Intervall um den Puffer verlängert. Der Bedarf je Typ ist die maximale
 * Überlappung dieser (verlängerten) Intervalle.
 */
export function computeBoatDemand(
  steps: SeqStep[],
  typeOf: (klasse: ClassId) => BoatType,
  buffer: number = BOAT_SWITCH_BUFFER,
): BoatDemand {
  // Je Spur die Starter in globaler Reihenfolge mit ihrem Boot-Typ sammeln.
  const perTrack = new Map<number, { idx: number; type: BoatType }[]>()
  steps.forEach((s, idx) => {
    const list = perTrack.get(s.track) ?? []
    list.push({ idx, type: typeOf(s.p.klasse) })
    perTrack.set(s.track, list)
  })

  const byType: Record<BoatType, Interval[]> = { klein: [], gross: [] }
  for (const list of perTrack.values()) {
    // Aufeinanderfolgende Starter gleichen Typs innerhalb einer Spur = ein Belegungs-Block.
    let i = 0
    while (i < list.length) {
      const type = list[i].type
      const start = list[i].idx
      let end = list[i].idx
      i++
      while (i < list.length && list[i].type === type) {
        end = list[i].idx
        i++
      }
      byType[type].push({ start, end: end + buffer })
    }
  }

  return {
    klein: maxOverlap(byType.klein),
    gross: maxOverlap(byType.gross),
  }
}

/** Bootbedarf eines einzelnen Parcours in seiner aktuellen (auto oder manuellen) Verzahnung. */
export function parcoursBoatDemand(
  parcours: Parcours,
  allParticipants: Participant[],
  class4Small: boolean,
): BoatDemand {
  const participants = allParticipants.filter((p) => parcours.classIds.includes(p.klasse))
  const byClass = participantsByClass(participants)
  const { tracks } = computeVerzahnung(parcours, allParticipants)
  const steps = buildSequenceSteps(tracks, byClass)
  return computeBoatDemand(steps, (k) => boatTypeOf(k, class4Small))
}

/** Gesamtbedarf der Veranstaltung: Parcours laufen parallel, der Bedarf addiert sich. */
export function eventBoatDemand(state: AppState): BoatDemand {
  return state.parcoursList.reduce<BoatDemand>(
    (sum, p) => {
      const d = parcoursBoatDemand(p, state.participants, state.class4Small)
      return { klein: sum.klein + d.klein, gross: sum.gross + d.gross }
    },
    { klein: 0, gross: 0 },
  )
}

export interface BoatShortfall {
  demand: BoatDemand
  available: BoatConfig
  klein: number
  gross: number
  /** true, wenn mindestens ein Typ fehlt. */
  any: boolean
}

/** Fehlbedarf gegenüber den vorhandenen Booten (0 = ausreichend). */
export function boatShortfall(state: AppState): BoatShortfall {
  const demand = eventBoatDemand(state)
  const klein = Math.max(0, demand.klein - state.boats.klein)
  const gross = Math.max(0, demand.gross - state.boats.gross)
  return { demand, available: state.boats, klein, gross, any: klein > 0 || gross > 0 }
}
