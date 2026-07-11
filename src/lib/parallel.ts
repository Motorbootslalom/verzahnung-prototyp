import type { BoatType, ClassId, Participant } from '../types'
import { boatTypeOf, CLASS_IDS } from './classes'

const classOrderIndex = (id: ClassId) => CLASS_IDS.indexOf(id)

/** Klassen, die im internationalen Modus (nur bis Klasse 5) entfallen. */
export const INTL_EXCLUDED: ClassId[] = ['6', '7']

/**
 * Ein Startplatz in einem Heat: entweder ein realer Starter oder ein Dummy
 * (eine Person außerhalb der Wertung, die im gleichen Bootstyp mitfährt, um bei
 * ungerader Anzahl das Paar zu vervollständigen).
 */
export type ParallelSlot =
  | { kind: 'starter'; p: Participant }
  | { kind: 'dummy'; boat: BoatType }

/** Ein Paar gleichen Bootstyps, das zweimal (mit Parcours-Tausch) gegeneinander fährt. */
export interface ParallelPair {
  boat: BoatType
  a: ParallelSlot
  b: ParallelSlot
}

/** Ein einzelner Lauf (beide Parcours gleichzeitig belegt). */
export interface ParallelHeat {
  /** globale Startposition, 1-basiert */
  pos: number
  /** 0-basierter Block-Index (ein voller Block = 4 Starter = 2 Paare) */
  block: number
  /** true beim ersten Heat eines Blocks – dort wird die Trennlinie gezogen */
  blockStart: boolean
  /** 1. oder 2. Lauf des Paares (im 2. Lauf sind die Parcours getauscht) */
  run: 1 | 2
  boat: BoatType
  /** Starter auf Parcours A */
  a: ParallelSlot
  /** Starter auf Parcours B */
  b: ParallelSlot
}

export interface ParallelPlan {
  heats: ParallelHeat[]
  /** reale Starter je Bootstyp (ohne Dummy) */
  kleinStarter: number
  grossStarter: number
  /** wurde je Bootstyp ein Dummy eingesetzt (ungerade Anzahl)? */
  kleinDummy: boolean
  grossDummy: boolean
  /** Anzahl Paare gesamt (inkl. der mit Dummy) */
  pairs: number
  /** Anzahl Blöcke (voll = 2 Paare, letzter evtl. mit nur 1 Paar) */
  blocks: number
}

export interface ParallelOptions {
  /** international: nur bis Klasse 5, Klasse E = „Dolphin". */
  international: boolean
  /** Klasse 4 fährt ausnahmsweise mit kleinem Boot (beeinflusst die Paarung). */
  class4Small: boolean
}

/** Für den Parallel-Slalom berücksichtigte Klassen (international ohne 6/7). */
export function parallelActiveClasses(international: boolean): ClassId[] {
  const excluded = new Set(international ? INTL_EXCLUDED : [])
  return CLASS_IDS.filter((c) => !excluded.has(c))
}

/** Starter in Startreihenfolge: kanonische Klassenreihenfolge, dann Startnummer. */
function orderStarters(list: Participant[]): Participant[] {
  return [...list].sort((a, b) => {
    const d = classOrderIndex(a.klasse) - classOrderIndex(b.klasse)
    if (d !== 0) return d
    return a.startNr.localeCompare(b.startNr, 'de', { numeric: true })
  })
}

/**
 * Bildet aus einem geordneten Bootstyp-Pool die Paare (je 2 aufeinanderfolgende
 * Starter). Bei ungerader Anzahl wird ein Dummy angehängt, damit das letzte Paar
 * vollständig ist.
 */
function toPairs(list: Participant[], boat: BoatType): { pairs: ParallelPair[]; dummy: boolean } {
  const slots: ParallelSlot[] = list.map((p) => ({ kind: 'starter' as const, p }))
  const dummy = slots.length % 2 === 1
  if (dummy) slots.push({ kind: 'dummy', boat })

  const pairs: ParallelPair[] = []
  for (let i = 0; i < slots.length; i += 2) {
    pairs.push({ boat, a: slots[i], b: slots[i + 1] })
  }
  return { pairs, dummy }
}

/**
 * Baut den kompletten Parallel-Slalom-Startplan.
 *
 * Regeln:
 * - Zwei parallele Parcours (A und B); je Heat fährt auf beiden ein Starter
 *   gleichen Bootstyps gegeneinander.
 * - Paare entstehen innerhalb eines Bootstyps (klein: E–3; groß: 4–7; Klasse 4
 *   optional klein) strikt in Startreihenfolge – Klasse spielt für die Paarung
 *   keine Rolle (E kann gegen 3 fahren), nur der Bootstyp.
 * - Jedes Paar fährt zweimal, im 2. Lauf mit getauschten Parcours (fair).
 * - Verzahnung: **Bootstyp abwechselnd**. Ein voller Block sind ein kleines und
 *   ein großes Paar (4 Starter): klein Lauf 1, groß Lauf 1, klein Lauf 2, groß
 *   Lauf 2. So bekommt jeder Starter zwischen seinen beiden Läufen eine Pause.
 * - Sobald ein Bootstyp aufgebraucht ist, ist keine Bootstyp-übergreifende
 *   Verzahnung mehr möglich. Die übrigen Paare laufen dann als **2er-Blöcke**
 *   (Paar komplett: Lauf 1, Lauf 2) – zwei gleichartige Paare werden nicht
 *   miteinander verzahnt.
 */
export function buildParallelPlan(participants: Participant[], opts: ParallelOptions): ParallelPlan {
  const active = new Set(parallelActiveClasses(opts.international))
  const inField = participants.filter((p) => active.has(p.klasse))

  const kleinList = orderStarters(
    inField.filter((p) => boatTypeOf(p.klasse, opts.class4Small) === 'klein'),
  )
  const grossList = orderStarters(
    inField.filter((p) => boatTypeOf(p.klasse, opts.class4Small) === 'gross'),
  )

  const klein = toPairs(kleinList, 'klein')
  const gross = toPairs(grossList, 'gross')

  const heats: ParallelHeat[] = []
  let pos = 0
  let block = 0

  const emit = (pair: ParallelPair, run: 1 | 2, first: boolean) => {
    heats.push({
      pos: ++pos,
      block,
      blockStart: first,
      run,
      boat: pair.boat,
      a: run === 1 ? pair.a : pair.b,
      b: run === 1 ? pair.b : pair.a,
    })
  }

  // Solange beide Bootstypen ein Paar liefern: 4er-Block mit Bootstyp-Wechsel
  // (klein L1, groß L1, klein L2, groß L2).
  const mixed = Math.min(klein.pairs.length, gross.pairs.length)
  for (let i = 0; i < mixed; i++) {
    const k = klein.pairs[i]
    const g = gross.pairs[i]
    emit(k, 1, true)
    emit(g, 1, false)
    emit(k, 2, false)
    emit(g, 2, false)
    block++
  }

  // Überzählige Paare des längeren Bootstyps (nur einer kann übrig sein):
  // je Paar ein 2er-Block (Lauf 1, Lauf 2) – keine Verzahnung mehr möglich.
  const leftover = klein.pairs.slice(mixed).concat(gross.pairs.slice(mixed))
  for (const pair of leftover) {
    emit(pair, 1, true)
    emit(pair, 2, false)
    block++
  }

  return {
    heats,
    kleinStarter: kleinList.length,
    grossStarter: grossList.length,
    kleinDummy: klein.dummy,
    grossDummy: gross.dummy,
    pairs: klein.pairs.length + gross.pairs.length,
    blocks: block,
  }
}

/** Kurzbeschreibung eines Startplatzes (Startnummer bzw. „Dummy") für Text-Export. */
export function slotShort(slot: ParallelSlot): string {
  return slot.kind === 'dummy' ? 'Dummy' : slot.p.startNr
}

/** Menschlich lesbarer Text-Export des Startplans (zum Kopieren/Teilen). */
export function formatParallelExport(
  plan: ParallelPlan,
  opts: ParallelOptions,
  eventName: string,
  eventJahr: number,
): string {
  const dummyNote = (label: string, on: boolean) => (on ? ` (inkl. 1 Dummy ${label})` : '')
  const lines: string[] = [
    `# Parallel-Slalom · ${eventName} · ${eventJahr}`,
    opts.international ? 'Modus: international (bis Klasse 5, E = Dolphin)' : 'Modus: national (alle Klassen)',
    `Kleine Boote: ${plan.kleinStarter} Starter${dummyNote('klein', plan.kleinDummy)} · ` +
      `Große Boote: ${plan.grossStarter} Starter${dummyNote('groß', plan.grossDummy)}`,
    `${plan.heats.length} Läufe · ${plan.pairs} Paare · ${plan.blocks} Blöcke`,
    '',
    '#  | Boot  | Parcours A → B',
  ]
  for (const h of plan.heats) {
    if (h.blockStart && h.pos > 1) lines.push('   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈')
    const kl = h.boat === 'klein' ? 'klein' : 'groß '
    lines.push(
      `${String(h.pos).padStart(2, ' ')} | ${kl} | ${slotShort(h.a)}  ↔  ${slotShort(h.b)}` +
        (h.run === 2 ? '  (Tausch)' : ''),
    )
  }
  return lines.join('\n') + '\n'
}
