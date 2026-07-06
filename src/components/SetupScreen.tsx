import { useState } from 'react'
import { useStore } from '../state/store'
import { CLASSES, ageHint } from '../lib/classes'
import type { ClassId, OriginMode } from '../types'

export function SetupScreen() {
  const { state, dispatch } = useStore()
  const [eventName, setEventName] = useState(state.eventName)
  const [eventJahr, setEventJahr] = useState(state.eventJahr)
  const [originMode, setOriginMode] = useState<OriginMode>(state.originMode)
  const [counts, setCounts] = useState<Record<ClassId, number>>(() =>
    Object.fromEntries(CLASSES.map((c) => [c.id, 6])) as Record<ClassId, number>,
  )

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  function setCount(id: ClassId, value: number) {
    setCounts((prev) => ({ ...prev, [id]: Math.max(0, Math.min(99, value || 0)) }))
  }

  function start() {
    dispatch({ type: 'INIT_SETUP', eventName, eventJahr, originMode, counts })
  }

  return (
    <div className="setup-wrap">
      <div className="panel">
        <h2>Starterfeld generieren</h2>
        <p className="hint">
          Dieser öffentliche Prototyp erzeugt zunächst zufällige Teilnehmer, damit die Darstellung und
          Verwaltung der Starterlisten mit den Fachteams besprochen werden kann. Alle Daten bleiben
          lokal im Browser (localStorage) gespeichert.
        </p>

        <div className="row" style={{ marginBottom: 16 }}>
          <div className="field" style={{ flex: 2, minWidth: 220 }}>
            <label>Veranstaltung</label>
            <input
              className="input"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="z. B. 30. Möwepokal"
            />
          </div>
          <div className="field" style={{ width: 130 }}>
            <label>Veranstaltungsjahr</label>
            <input
              className="input"
              type="number"
              value={eventJahr}
              onChange={(e) => setEventJahr(parseInt(e.target.value, 10) || new Date().getFullYear())}
            />
          </div>
          <div className="field">
            <label>Herkunft</label>
            <div className="segmented">
              <button
                className={originMode === 'verein' ? 'active' : ''}
                onClick={() => setOriginMode('verein')}
                type="button"
              >
                Vereine
              </button>
              <button
                className={originMode === 'bundesland' ? 'active' : ''}
                onClick={() => setOriginMode('bundesland')}
                type="button"
              >
                Bundesländer
              </button>
            </div>
          </div>
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
          Anzahl Teilnehmer pro Klasse
        </label>
        <div className="setup-grid">
          {CLASSES.map((c) => (
            <div className="class-count" key={c.id}>
              <span className="dot" style={{ background: c.color }} />
              <div className="meta">
                <div className="name">{c.label}</div>
                <div className="age">{ageHint(c.id, eventJahr)}</div>
              </div>
              <input
                type="number"
                min={0}
                max={99}
                value={counts[c.id]}
                onChange={(e) => setCount(c.id, parseInt(e.target.value, 10))}
              />
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="hint" style={{ margin: 0 }}>
            Gesamt: <b>{total}</b> Starter · Geburtsjahrgänge werden aus dem Veranstaltungsjahr berechnet
            (Altersklasse = Jahr − Geburtsjahr).
          </span>
          <button className="btn primary" onClick={start} disabled={total === 0}>
            Starterfeld erzeugen →
          </button>
        </div>
      </div>
    </div>
  )
}
