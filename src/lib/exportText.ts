import type { AppState, Parcours, TrackItem } from '../types'
import { analyzeSequence, classCounts, presentClasses } from './verzahnung'
import { planEvent, type ParcoursPlan } from './plan'
import { canonicalRunningNumbers } from './running'

/** Ein Spur-Element als kurzes Textsymbol: Klasse = ID, Pause = "⏸n". */
function itemToText(item: TrackItem): string {
  return item.kind === 'class' ? item.klasse : `⏸${item.length}`
}

/** Startnummern je Klasse, damit aus dem Export eine konkrete Startliste ableitbar ist. */
function startNumbersByClass(parcours: Parcours, state: AppState): string[] {
  const participants = state.participants.filter((p) => parcours.classIds.includes(p.klasse))
  const classes = presentClasses(parcours, participants)
  const lines: string[] = []
  for (const c of classes) {
    const nrs = participants
      .filter((p) => p.klasse === c)
      .map((p) => p.startNr)
      .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
    lines.push(`  ${c}: ${nrs.join(', ')}`)
  }
  return lines
}

/** Export eines Parcours aus seinem (boot-beschränkten) Plan. */
function formatParcoursFromPlan(plan: ParcoursPlan, parcours: Parcours, state: AppState): string {
  const filtered = state.participants.filter((p) => parcours.classIds.includes(p.klasse))
  const counts = classCounts(filtered)
  const classes = presentClasses(parcours, filtered)
  const analysis = analyzeSequence(plan.sequence)

  const classLine = classes.map((c) => `${c}:${counts.get(c) ?? 0}`).join(', ')

  const spurLines = plan.tracks.map((track, i) => {
    const label = `Spur ${String.fromCharCode(65 + i)}`
    const body = track.map(itemToText).join(' ') || '(leer)'
    const starter = track.reduce((s, it) => s + (it.kind === 'class' ? counts.get(it.klasse) ?? 0 : 0), 0)
    return `  ${label}: ${body}   → ${starter} Starter`
  })

  const seqStr = plan.sequence.map((p) => p.klasse).join(' ')

  const diag =
    analysis.total === 0
      ? 'keine Starter'
      : analysis.nonWechsel === 0
        ? `${analysis.wechsel} Wechsel · vollständig verzahnt (kein un-verzahnter End-Block)`
        : `${analysis.wechsel} Wechsel · ${analysis.nonWechsel} ohne Wechsel · ` +
          `${analysis.trailingRun} Starter am Ende ohne Verzahnung` +
          (analysis.trailingKlasse ? ` (Klasse ${analysis.trailingKlasse})` : '')

  const mode = plan.manual
    ? 'manuell angepasst'
    : plan.constrained
      ? `automatisch · auf Boote begrenzt (${plan.effectiveTracks} Spur${plan.effectiveTracks === 1 ? '' : 'en'})`
      : 'automatisch'

  return [
    `## ${parcours.name} · Wechselfaktor ${parcours.wechselFaktor} · ${mode}`,
    `Klassen (Starter): ${classLine || '(keine)'}  (Summe ${filtered.length})`,
    `Spuren (⏸n = Pause über n Takte):`,
    ...spurLines,
    `Startreihenfolge (Klassen): ${seqStr || '(leer)'}`,
    `Diagnose: ${diag}`,
    `Bootbedarf: ${plan.demand.klein}× klein · ${plan.demand.gross}× groß`,
    `Startnummern je Klasse:`,
    ...startNumbersByClass(parcours, state),
  ].join('\n')
}

/** Menschlich lesbarer Export eines einzelnen Parcours (für die Optimierung durch Claude). */
export function formatParcoursExport(parcours: Parcours, state: AppState): string {
  const plan = planEvent(state).plans.find((p) => p.parcoursId === parcours.id)
  if (!plan) return ''
  return formatParcoursFromPlan(plan, parcours, state)
}

/** Gesamter Export über alle Parcours – als ein zusammenhängender Text zum Kopieren. */
export function formatVerzahnungExport(state: AppState): string {
  const plan = planEvent(state)
  const boatLine =
    `Boote: vorhanden ${state.boats.klein} klein / ${state.boats.gross} groß · ` +
    `Bedarf ${plan.demand.klein} klein / ${plan.demand.gross} groß` +
    (plan.extra.klein > 0 || plan.extra.gross > 0
      ? ` · optimal ${plan.optimalDemand.klein}/${plan.optimalDemand.gross} (auf Boote begrenzt)`
      : '') +
    (state.class4Small ? ' · Klasse 4 fährt klein' : '')

  const header = [
    `# Verzahnung-Export · ${state.eventName} · ${state.eventJahr}`,
    `Herkunft: ${state.originMode === 'bundesland' ? 'Bundesländer' : 'Vereine'} · ${state.participants.length} Starter gesamt`,
    boatLine,
    '',
    'Ziel: Reihenfolge/Spur-Aufteilung so optimieren, dass der End-Block ohne',
    'Verzahnung (letzte Starter derselben Klasse) möglichst kurz ist.',
    '',
  ].join('\n')

  const byId = new Map(plan.plans.map((p) => [p.parcoursId, p]))
  const bodies = state.parcoursList.map((p) => formatParcoursFromPlan(byId.get(p.id)!, p, state))

  let running = ''
  const map = canonicalRunningNumbers(state)
  if (map) {
    // Klassische Nummern fortlaufend über alle Parcours (Verzahnungs-Reihenfolge).
    const ordered = state.parcoursList.flatMap((p) => byId.get(p.id)?.sequence ?? [])
    const list = ordered.map((p) => `${map.get(p.id)}→${p.startNr}`).join(', ')
    running =
      `\n\n## Klassische Startnummern (fortlaufend über alle Parcours, Verzahnungs-Reihenfolge)\n` +
      `${list}\n`
  }

  return header + bodies.join('\n\n') + running + '\n'
}
