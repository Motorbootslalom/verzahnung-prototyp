import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import {
  FIXED_ORDER_LABEL,
  formatParticipantsTsv,
  formatStartlistTsv,
  parseParticipantsTsv,
  type ImportResult,
} from '../lib/tsv'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Datenaustausch mit Excel per Copy&Paste (TSV): Teilnehmerliste importieren
 * sowie die verzahnte Startliste bzw. die Teilnehmerliste exportieren.
 */
export function ExcelPanel() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [copied, setCopied] = useState<'startlist' | 'participants' | null>(null)

  const preview = useMemo(() => (raw.trim() ? parseParticipantsTsv(raw) : null), [raw])

  function doImport(mode: 'replace' | 'merge') {
    const res = parseParticipantsTsv(raw)
    if (res.imported === 0) {
      setResult(res)
      return
    }
    dispatch({ type: 'IMPORT_PARTICIPANTS', participants: res.participants, mode })
    setResult(res)
    setRaw('')
  }

  async function copy(which: 'startlist' | 'participants') {
    const text = which === 'startlist' ? formatStartlistTsv(state) : formatParticipantsTsv(state)
    if (await copyText(text)) {
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  return (
    <div className="panel">
      <div className="export-head">
        <button className="btn ghost sm" onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▸'} Excel-Datenaustausch (Import / Export)
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button
          className="btn sm"
          onClick={() => copy('participants')}
          title="Teilnehmerliste als TSV in die Zwischenablage – in Excel einfügbar"
        >
          {copied === 'participants' ? '✓ Kopiert' : '📋 Teilnehmerliste'}
        </button>
        <button
          className="btn sm primary"
          onClick={() => copy('startlist')}
          title="Verzahnte Startliste als TSV in die Zwischenablage – in Excel einfügbar"
        >
          {copied === 'startlist' ? '✓ Kopiert' : '📊 Startliste (verzahnt)'}
        </button>
      </div>
      <p className="hint" style={{ margin: '8px 0 0' }}>
        Kopiere Zellen aus Excel und füge sie unten ein, um die Teilnehmerliste zu importieren. Die
        Ergebnisse (Startliste bzw. Teilnehmerliste) kopierst du mit den Buttons oben zurück nach Excel.
      </p>

      {open && (
        <div style={{ marginTop: 12 }}>
          <label className="subhead" style={{ display: 'block', marginBottom: 6 }}>
            Teilnehmerliste importieren (TSV / Excel-Zellen)
          </label>
          <textarea
            className="export-text"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              setResult(null)
            }}
            rows={8}
            placeholder={
              'Zellen aus Excel hier einfügen …\n\n' +
              'Mit Kopfzeile (Reihenfolge egal): Klasse\tNachname\tVorname\tGröße\tVerein\tGeburtsdatum\tStartnummer\n' +
              'Ohne Kopfzeile (feste Reihenfolge): ' +
              FIXED_ORDER_LABEL
            }
          />
          <p className="note" style={{ marginTop: 6 }}>
            Erkannte Spalten (mit Kopfzeile, Reihenfolge egal): <b>Klasse</b>, Nachname, Vorname, Verein,
            Bundesland, Geburtsdatum (TT.MM.JJJJ oder ISO), Größe, Startnummer. Ohne Kopfzeile gilt die
            feste Reihenfolge: {FIXED_ORDER_LABEL}. Fehlende Startnummern werden je Klasse nach Größe
            vergeben.
          </p>

          {preview && (
            <p className="note">
              Vorschau: {preview.imported} Starter{preview.usedHeader ? ' · Kopfzeile erkannt' : ' · feste Reihenfolge'}
              {preview.skipped.length > 0 ? ` · ${preview.skipped.length} Zeile(n) übersprungen` : ''}
            </p>
          )}

          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <button
              className="btn primary"
              disabled={!preview || preview.imported === 0}
              onClick={() => doImport('replace')}
              title="Ersetzt die gesamte aktuelle Teilnehmerliste durch den Import"
            >
              Alle ersetzen
            </button>
            <button
              className="btn"
              disabled={!preview || preview.imported === 0}
              onClick={() => doImport('merge')}
              title="Fügt die importierten Starter hinzu (Duplikate nach Name+Klasse werden übersprungen)"
            >
              Ergänzen
            </button>
          </div>

          {result && (
            <div
              className={`boat-banner ${result.imported > 0 ? 'ok' : 'warn'}`}
              style={{ marginTop: 12 }}
            >
              {result.imported > 0 ? (
                <>✓ {result.imported} Starter importiert.</>
              ) : (
                <>⚠ Keine Starter erkannt – bitte Format prüfen.</>
              )}
              {result.skipped.length > 0 && (
                <>
                  {' '}
                  {result.skipped.length} Zeile(n) übersprungen:
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {result.skipped.slice(0, 6).map((s) => (
                      <li key={s.line}>
                        Zeile {s.line}: {s.reason}
                      </li>
                    ))}
                    {result.skipped.length > 6 && <li>… {result.skipped.length - 6} weitere</li>}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
