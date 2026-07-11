import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { classColor, parallelClassBadge, parallelClassLabel } from '../lib/classes'
import {
  buildParallelPlan,
  formatParallelExport,
  type ParallelHeat,
  type ParallelOptions,
  type ParallelSlot,
} from '../lib/parallel'
import type { AppState } from '../types'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ParallelView() {
  const { state, dispatch } = useStore()

  const opts: ParallelOptions = {
    international: state.parallelInternational,
    class4Small: state.class4Small,
  }
  const plan = useMemo(
    () => buildParallelPlan(state.participants, opts),
    // opts hängt nur an diesen beiden Feldern
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.participants, opts.international, opts.class4Small],
  )

  const kleinLine =
    `${plan.kleinStarter} Starter` + (plan.kleinDummy ? ' + 1 Dummy' : '')
  const grossLine =
    `${plan.grossStarter} Starter` + (plan.grossDummy ? ' + 1 Dummy' : '')

  return (
    <>
      <div className="panel">
        <h2>Parallel-Slalom</h2>
        <p className="hint">
          Zwei parallele Parcours (A und B). Je Lauf fahren zwei Starter <b>gleichen Bootstyps</b>{' '}
          gegeneinander auf Zeit. Die Klasse bestimmt nur den Bootstyp und zählt fürs Ergebnis –
          ansonsten kann z.&nbsp;B. Klasse&nbsp;E gegen Klasse&nbsp;3 fahren (beide kleines Boot).
          Paare werden in Startreihenfolge gebildet, jedes Paar fährt zweimal (2.&nbsp;Lauf mit
          getauschten Parcours). Verzahnung: Bootstyp abwechselnd – ein Block umfasst 4 Starter.
        </p>

        <div className="parallel-controls">
          <label className="boat-check">
            <input
              type="checkbox"
              checked={state.parallelInternational}
              onChange={(e) =>
                dispatch({ type: 'SET_PARALLEL_INTERNATIONAL', parallelInternational: e.target.checked })
              }
            />
            International (nur bis Klasse&nbsp;5, Klasse&nbsp;E = „Dolphin")
          </label>
          <label className="boat-check">
            <input
              type="checkbox"
              checked={state.class4Small}
              onChange={(e) => dispatch({ type: 'SET_CLASS4_SMALL', class4Small: e.target.checked })}
            />
            Klasse&nbsp;4 fährt mit kleinem Boot
          </label>
        </div>

        <div className="parallel-stats">
          <span className="pstat">
            <span className="dot" style={{ background: '#0ea5e9' }} /> Kleine Boote: <b>{kleinLine}</b>
          </span>
          <span className="pstat">
            <span className="dot" style={{ background: '#f97316' }} /> Große Boote: <b>{grossLine}</b>
          </span>
          <span className="pstat">
            {plan.heats.length} Läufe · {plan.pairs} Paare · {plan.blocks} Blöcke
          </span>
        </div>
      </div>

      <ExportPanel state={state} plan={plan} opts={opts} />

      <div className="panel">
        <HeatTable heats={plan.heats} international={opts.international} />
      </div>
    </>
  )
}

function ExportPanel({
  state,
  plan,
  opts,
}: {
  state: AppState
  plan: ReturnType<typeof buildParallelPlan>
  opts: ParallelOptions
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const text = useMemo(
    () => formatParallelExport(plan, opts, state.eventName, state.eventJahr),
    [plan, opts, state.eventName, state.eventJahr],
  )

  async function copy() {
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="panel">
      <div className="export-head">
        <button className="btn ghost sm" onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▸'} Startplan als Text
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn sm primary" onClick={copy}>
          {copied ? '✓ Kopiert' : '📋 Startplan kopieren'}
        </button>
      </div>
      {open && <textarea className="export-text" readOnly value={text} rows={16} />}
    </div>
  )
}

/** Ein Startplatz (Starter oder Dummy) als farbiges Badge + Startnummer/Name. */
function SlotCell({
  slot,
  international,
}: {
  slot: ParallelSlot
  international: boolean
}) {
  if (slot.kind === 'dummy') {
    return (
      <div className="slot dummy-slot">
        <span className="class-badge dummy-badge">DU</span>
        <span className="slot-main">
          <span className="slot-nr">Dummy</span>
          <span className="slot-name">außer Wertung · {slot.boat === 'klein' ? 'klein' : 'groß'}</span>
        </span>
      </div>
    )
  }
  const p = slot.p
  return (
    <div className="slot">
      <span
        className="class-badge"
        style={{ background: classColor(p.klasse) }}
        title={parallelClassLabel(p.klasse, international)}
      >
        {parallelClassBadge(p.klasse, international)}
      </span>
      <span className="slot-main">
        <span className="slot-nr">{p.startNr}</span>
        <span className="slot-name">
          {p.nachname}, {p.vorname}
        </span>
      </span>
    </div>
  )
}

function HeatTable({
  heats,
  international,
}: {
  heats: ParallelHeat[]
  international: boolean
}) {
  if (heats.length === 0) {
    return (
      <div className="empty">
        Keine Starter im gewählten Modus. Lege im Tab „Teilnehmer" Starter an
        {international ? ' (international zählen nur Klassen bis 5).' : '.'}
      </div>
    )
  }

  return (
    <>
      <div className="subhead">
        Startreihenfolge · {heats.length} Läufe (Blöcke à 4 Starter durch farbige Linie getrennt)
      </div>
      <div className="sequence parallel-sequence">
        <table>
          <thead>
            <tr>
              <th className="pos">#</th>
              <th style={{ width: 60 }}>Boot</th>
              <th>Parcours A</th>
              <th>Parcours B</th>
            </tr>
          </thead>
          <tbody>
            {heats.map((h) => (
              <tr key={h.pos} className={h.blockStart && h.pos > 1 ? 'block-start' : ''}>
                <td className="pos">{h.pos}</td>
                <td>
                  <span className={`boat-tag ${h.boat}`}>{h.boat === 'klein' ? 'klein' : 'groß'}</span>
                  {h.run === 2 && (
                    <span className="run-tag" title="2. Lauf – Parcours getauscht">
                      ⇄
                    </span>
                  )}
                </td>
                <td>
                  <SlotCell slot={h.a} international={international} />
                </td>
                <td>
                  <SlotCell slot={h.b} international={international} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
