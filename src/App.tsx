import { useEffect, useRef, useState } from 'react'
import { useStore } from './state/store'
import { SetupScreen } from './components/SetupScreen'
import { ParticipantsView } from './components/ParticipantsView'
import { VerzahnungView } from './components/VerzahnungView'
import { parseUrlConfig } from './lib/urlconfig'

type Tab = 'teilnehmer' | 'verzahnung'

export function App() {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState<Tab>('teilnehmer')
  const urlApplied = useRef(false)

  // Konfiguration aus URL-Parametern übernehmen (Klassenverteilung, Parcours,
  // Faktoren). Erzeugt das Starterfeld neu und entfernt danach die Parameter,
  // damit ein Reload nicht erneut würfelt.
  useEffect(() => {
    if (urlApplied.current) return
    const cfg = parseUrlConfig(window.location.search)
    if (!cfg) return
    urlApplied.current = true
    dispatch({
      type: 'INIT_SETUP',
      eventName: cfg.eventName ?? state.eventName,
      eventJahr: cfg.eventJahr ?? state.eventJahr,
      originMode: cfg.originMode ?? state.originMode,
      counts: cfg.counts,
      parcoursConfig: cfg.parcours.length > 0 ? cfg.parcours : undefined,
    })
    setTab('verzahnung')
    window.history.replaceState(null, '', window.location.pathname)
    // Nur einmal beim Mounten anwenden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!state.initialized) {
    return (
      <div className="app">
        <TopBar />
        <SetupScreen />
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar />
      <div className="tabs">
        <button
          className={`tab ${tab === 'teilnehmer' ? 'active' : ''}`}
          onClick={() => setTab('teilnehmer')}
        >
          Teilnehmer
        </button>
        <button
          className={`tab ${tab === 'verzahnung' ? 'active' : ''}`}
          onClick={() => setTab('verzahnung')}
        >
          Verzahnung
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="btn ghost sm"
          onClick={() => {
            if (confirm('Alle Teilnehmer und Einstellungen zurücksetzen?')) dispatch({ type: 'RESET_ALL' })
          }}
        >
          Zurücksetzen
        </button>
      </div>

      {tab === 'teilnehmer' ? <ParticipantsView /> : <VerzahnungView />}
    </div>
  )
}

function TopBar() {
  const { state } = useStore()
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <h1>⚓ Verzahnung</h1>
          <span className="sub">Schlauchbootslalom · Prototyp</span>
        </div>
        <div className="topbar-spacer" />
        {state.initialized && (
          <div className="event-line">
            {state.eventName} · {state.eventJahr} · {state.participants.length} Starter
          </div>
        )}
      </div>
    </div>
  )
}
