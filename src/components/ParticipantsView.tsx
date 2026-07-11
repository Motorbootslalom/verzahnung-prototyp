import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { CLASSES, ageHint, birthYearRange, getClass } from '../lib/classes'
import { canonicalRunningNumbers } from '../lib/running'
import { RunningNumberControls } from './RunningNumberControls'
import { StartNr } from './StartNr'
import type { ClassId, Participant } from '../types'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function ParticipantsView() {
  const { state, dispatch } = useStore()
  const [expanded, setExpanded] = useState<Set<ClassId>>(new Set())

  const byClass = useMemo(() => {
    const m = new Map<ClassId, Participant[]>()
    for (const c of CLASSES) m.set(c.id, [])
    for (const p of state.participants) m.get(p.klasse)!.push(p)
    for (const list of m.values())
      list.sort((a, b) => a.startNr.localeCompare(b.startNr, 'de', { numeric: true }))
    return m
  }, [state.participants])

  function toggle(id: ClassId) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Kanonische klassische Startnummern (aus der Manövrier-Verzahnung), damit die
  // Teilnehmer-Liste dieselben Nummern zeigt wie die Verzahnungs-Ansichten.
  const running = useMemo(() => canonicalRunningNumbers(state), [state])

  return (
    <>
      <SettingsPanel />
      <RunningNumberControls />
      <div className="panel">
        <h2>Teilnehmer verwalten</h2>
        <p className="hint">
          Pro Klasse Teilnehmer generieren, manuell hinzufügen oder entfernen. Herkunft (Verein /
          Bundesland) richtet sich nach der Einstellung oben.
        </p>
        {CLASSES.map((c) => (
          <ClassSection
            key={c.id}
            classId={c.id}
            starters={byClass.get(c.id)!}
            running={running}
            open={expanded.has(c.id)}
            onToggle={() => toggle(c.id)}
            onGenerate={(count) => dispatch({ type: 'GENERATE', klasse: c.id, count })}
            onClear={() => dispatch({ type: 'CLEAR_CLASS', klasse: c.id })}
            onRemove={(id) => dispatch({ type: 'REMOVE_PARTICIPANT', id })}
            onAdd={(p) => dispatch({ type: 'ADD_PARTICIPANT', participant: p })}
          />
        ))}
      </div>
    </>
  )
}

function SettingsPanel() {
  const { state, dispatch } = useStore()
  return (
    <div className="panel">
      <h2>Veranstaltung</h2>
      <div className="row">
        <div className="field" style={{ flex: 2, minWidth: 200 }}>
          <label>Name</label>
          <input
            className="input"
            value={state.eventName}
            onChange={(e) =>
              dispatch({ type: 'SET_EVENT', eventName: e.target.value, eventJahr: state.eventJahr })
            }
          />
        </div>
        <div className="field" style={{ width: 120 }}>
          <label>Jahr</label>
          <input
            className="input"
            type="number"
            value={state.eventJahr}
            onChange={(e) =>
              dispatch({
                type: 'SET_EVENT',
                eventName: state.eventName,
                eventJahr: parseInt(e.target.value, 10) || state.eventJahr,
              })
            }
          />
        </div>
        <div className="field">
          <label>Herkunft neuer Teilnehmer</label>
          <div className="segmented">
            <button
              className={state.originMode === 'verein' ? 'active' : ''}
              onClick={() => dispatch({ type: 'SET_ORIGIN_MODE', originMode: 'verein' })}
              type="button"
            >
              Vereine
            </button>
            <button
              className={state.originMode === 'bundesland' ? 'active' : ''}
              onClick={() => dispatch({ type: 'SET_ORIGIN_MODE', originMode: 'bundesland' })}
              type="button"
            >
              Bundesländer
            </button>
          </div>
        </div>
      </div>
      <p className="note">
        Das Jahr bestimmt die Altersberechnung neu erzeugter Starter. Bereits generierte Geburtsdaten
        bleiben unverändert.
      </p>
    </div>
  )
}

interface ClassSectionProps {
  classId: ClassId
  starters: Participant[]
  running: Map<string, number> | null
  open: boolean
  onToggle: () => void
  onGenerate: (count: number) => void
  onClear: () => void
  onRemove: (id: string) => void
  onAdd: (p: Participant) => void
}

function ClassSection({
  classId,
  starters,
  running,
  open,
  onToggle,
  onGenerate,
  onClear,
  onRemove,
  onAdd,
}: ClassSectionProps) {
  const { state } = useStore()
  const def = getClass(classId)
  const [count, setCount] = useState(3)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="class-section">
      <div className="class-header" onClick={onToggle}>
        <span className="class-badge" style={{ background: def.color }}>
          {classId}
        </span>
        <span className="title">{def.label}</span>
        <span className="count">
          {starters.length} Starter · {ageHint(classId, state.eventJahr)}
        </span>
        <span className="spacer" />
        <div className="class-tools" onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            min={1}
            max={99}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
            title="Anzahl zu generieren"
          />
          <button className="btn sm primary" onClick={() => onGenerate(count)}>
            + Generieren
          </button>
          <button className="btn sm" onClick={() => setShowAdd((s) => !s)}>
            Manuell
          </button>
          <button
            className="btn sm danger"
            disabled={starters.length === 0}
            onClick={() => {
              if (confirm(`Alle ${starters.length} Starter in ${def.label} entfernen?`)) onClear()
            }}
          >
            Leeren
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 12, width: 16, textAlign: 'center' }}>
            {open ? '▾' : '▸'}
          </span>
        </div>
      </div>

      {showAdd && (
        <ManualAddForm classId={classId} existing={starters} onAdd={onAdd} onDone={() => setShowAdd(false)} />
      )}

      {open && (
        <>
          {starters.length === 0 ? (
            <div className="empty">Noch keine Starter in dieser Klasse.</div>
          ) : (
            <table className="starters">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>{running ? 'Start-Nr.' : 'S-Nr.'}</th>
                  <th>Name</th>
                  <th>Vorname</th>
                  <th>{state.originMode === 'bundesland' ? 'Bundesland' : 'Verein'}</th>
                  <th style={{ width: 100 }}>Geb.-Datum</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {starters.map((p) => (
                  <tr key={p.id}>
                    <td className="num">
                      <StartNr startNr={p.startNr} runNr={running?.get(p.id)} />
                    </td>
                    <td>{p.nachname}</td>
                    <td>{p.vorname}</td>
                    <td>{state.originMode === 'bundesland' ? p.bundesland : p.verein || p.bundesland}</td>
                    <td>{formatDate(p.geburtsdatum)}</td>
                    <td>
                      <button className="del" title="Entfernen" onClick={() => onRemove(p.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

function ManualAddForm({
  classId,
  existing,
  onAdd,
  onDone,
}: {
  classId: ClassId
  existing: Participant[]
  onAdd: (p: Participant) => void
  onDone: () => void
}) {
  const { state } = useStore()
  const [from, to] = birthYearRange(classId, state.eventJahr)
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [herkunft, setHerkunft] = useState('')
  const [geb, setGeb] = useState(`${from}-06-15`)

  function nextStartNr(): string {
    let max = 0
    for (const p of existing) {
      const num = parseInt(p.startNr.slice(classId.length), 10)
      if (!Number.isNaN(num) && num > max) max = num
    }
    return classId + (max + 1).toString().padStart(2, '0')
  }

  function submit() {
    if (!vorname.trim() || !nachname.trim()) return
    const isBundesland = state.originMode === 'bundesland'
    onAdd({
      id: 'p_' + Math.random().toString(36).slice(2, 10),
      startNr: nextStartNr(),
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      verein: isBundesland ? '' : herkunft.trim(),
      bundesland: herkunft.trim(),
      geburtsdatum: geb,
      klasse: classId,
    })
    setVorname('')
    setNachname('')
    setHerkunft('')
    onDone()
  }

  return (
    <div className="panel" style={{ margin: '8px 0', background: 'var(--panel-2)' }}>
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label>Vorname</label>
          <input className="input" value={vorname} onChange={(e) => setVorname(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label>Nachname</label>
          <input className="input" value={nachname} onChange={(e) => setNachname(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2, minWidth: 160 }}>
          <label>{state.originMode === 'bundesland' ? 'Bundesland' : 'Verein'}</label>
          <input className="input" value={herkunft} onChange={(e) => setHerkunft(e.target.value)} />
        </div>
        <div className="field" style={{ width: 150 }}>
          <label>
            Geb.-Datum (Jg. {from}–{to})
          </label>
          <input
            className="input"
            type="date"
            min={`${from}-01-01`}
            max={`${to}-12-31`}
            value={geb}
            onChange={(e) => setGeb(e.target.value)}
          />
        </div>
        <button className="btn primary" onClick={submit} disabled={!vorname.trim() || !nachname.trim()}>
          Hinzufügen
        </button>
      </div>
    </div>
  )
}
