/**
 * Startnummer-Anzeige. Ist eine klassische (Verzahnungs-)Nummer vorhanden, wird
 * sie als **primäre** Startnummer gezeigt; die klassenbasierte Nummer (E01, 312 …)
 * erscheint klein/sekundär darunter. Ohne klassische Nummer wird die
 * klassenbasierte Nummer normal angezeigt.
 */
export function StartNr({ startNr, runNr }: { startNr: string; runNr?: number }) {
  if (runNr === undefined) return <span className="num">{startNr}</span>
  return (
    <span className="startnr-combo">
      <span className="startnr-main">{runNr}</span>
      <span className="startnr-sub">{startNr}</span>
    </span>
  )
}
