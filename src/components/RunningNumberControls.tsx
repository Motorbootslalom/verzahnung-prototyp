import { useStore } from '../state/store'
import type { RunningNumberConfig } from '../types'

/**
 * Bedienung für die klassischen, fortlaufenden Startnummern (nach Verzahnung).
 * Wird in beiden Disziplinen genutzt und teilt sich dieselbe Einstellung.
 */
export function RunningNumberControls() {
  const { state, dispatch } = useStore()
  const rn = state.runningNumbers
  const set = (patch: Partial<RunningNumberConfig>) =>
    dispatch({ type: 'SET_RUNNING_NUMBERS', patch })

  return (
    <div className="panel">
      <div className="running-head">
        <button
          className={`btn sm ${rn.enabled ? 'primary' : ''}`}
          onClick={() => set({ enabled: !rn.enabled })}
        >
          {rn.enabled ? '✓ Klassische Startnummern' : '# Klassische Startnummern'}
        </button>
        <span className="hint" style={{ margin: 0 }}>
          Vergibt jedem Starter eine fortlaufende Nummer (1, 2, 3 …) in der Reihenfolge der{' '}
          {rn.source === 'parallel' ? 'Parallel-Slalom' : 'Manövrier'}-Verzahnung. Diese Nummer gilt
          einheitlich in der Teilnehmer-Liste und in beiden Disziplinen.
        </span>
      </div>

      {rn.enabled && (
        <div className="running-fields">
          <div className="field" style={{ width: 'auto' }}>
            <label>Reihenfolge nach</label>
            <div className="segmented">
              <button
                type="button"
                className={rn.source === 'manoever' ? 'active' : ''}
                onClick={() => set({ source: 'manoever' })}
              >
                Manövrieren
              </button>
              <button
                type="button"
                className={rn.source === 'parallel' ? 'active' : ''}
                onClick={() => set({ source: 'parallel' })}
              >
                Parallel-Slalom
              </button>
            </div>
          </div>
          <div className="field" style={{ width: 120 }}>
            <label>Startwert</label>
            <input
              className="input"
              type="number"
              min={1}
              value={rn.start}
              onChange={(e) => set({ start: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label>Fehlende Nummern überspringen</label>
            <input
              className="input"
              value={rn.skipText}
              placeholder="z. B. 7, 13, 20"
              onChange={(e) => set({ skipText: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
