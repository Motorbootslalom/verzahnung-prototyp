import { useState } from 'react'
import { useStore } from './state/store'
import { SetupScreen } from './components/SetupScreen'
import { ParticipantsView } from './components/ParticipantsView'
import { VerzahnungView } from './components/VerzahnungView'

type Tab = 'teilnehmer' | 'verzahnung'

export function App() {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState<Tab>('teilnehmer')

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
