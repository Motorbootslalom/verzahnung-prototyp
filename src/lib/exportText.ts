import type { AppState, Parcours, TrackItem } from '../types'
import { analyzeSequence, classCounts, computeVerzahnung, presentClasses } from './verzahnung'

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

/** Menschlich lesbarer Export eines einzelnen Parcours (für die Optimierung durch Claude). */
export function formatParcoursExport(parcours: Parcours, state: AppState): string {
  const verz = computeVerzahnung(parcours, state.participants)
  const filtered = state.participants.filter((p) => parcours.classIds.includes(p.klasse))
  const counts = classCounts(filtered)
  const classes = presentClasses(parcours, filtered)
  const analysis = analyzeSequence(verz.sequence)

  const classLine = classes.map((c) => `${c}:${counts.get(c) ?? 0}`).join(', ')

  const spurLines = verz.tracks.map((track, i) => {
    const label = `Spur ${String.fromCharCode(65 + i)}`
    const body = track.map(itemToText).join(' ') || '(leer)'
    const starter = track.reduce((s, it) => s + (it.kind === 'class' ? counts.get(it.klasse) ?? 0 : 0), 0)
    return `  ${label}: ${body}   → ${starter} Starter`
  })

  const seqStr = verz.sequence.map((p) => p.klasse).join(' ')

  const diag =
    analysis.total === 0
      ? 'keine Starter'
      : analysis.nonWechsel === 0
        ? `${analysis.wechsel} Wechsel · vollständig verzahnt (kein un-verzahnter End-Block)`
        : `${analysis.wechsel} Wechsel · ${analysis.nonWechsel} ohne Wechsel · ` +
          `${analysis.trailingRun} Starter am Ende ohne Verzahnung` +
          (analysis.trailingKlasse ? ` (Klasse ${analysis.trailingKlasse})` : '')

  return [
    `## ${parcours.name} · Wechselfaktor ${parcours.wechselFaktor} · ${verz.manual ? 'manuell angepasst' : 'automatisch'}`,
    `Klassen (Starter): ${classLine || '(keine)'}  (Summe ${filtered.length})`,
    `Spuren (⏸n = Pause über n Takte):`,
    ...spurLines,
    `Startreihenfolge (Klassen): ${seqStr || '(leer)'}`,
    `Diagnose: ${diag}`,
    `Startnummern je Klasse:`,
    ...startNumbersByClass(parcours, state),
  ].join('\n')
}

/** Gesamter Export über alle Parcours – als ein zusammenhängender Text zum Kopieren. */
export function formatVerzahnungExport(state: AppState): string {
  const header = [
    `# Verzahnung-Export · ${state.eventName} · ${state.eventJahr}`,
    `Herkunft: ${state.originMode === 'bundesland' ? 'Bundesländer' : 'Vereine'} · ${state.participants.length} Starter gesamt`,
    '',
    'Ziel: Reihenfolge/Spur-Aufteilung so optimieren, dass der End-Block ohne',
    'Verzahnung (letzte Starter derselben Klasse) möglichst kurz ist.',
    '',
  ].join('\n')

  const bodies = state.parcoursList.map((p) => formatParcoursExport(p, state))
  return header + bodies.join('\n\n') + '\n'
}
