export type ClassId = 'E' | '1' | '2' | '3' | '4' | '5' | '6' | '7'

export type OriginMode = 'verein' | 'bundesland'

export type WechselFaktor = 1 | 2 | 3 | 4

/** Boot-Typ: kleines Boot (Klassen E–3) oder großes Boot (Klassen 4–7). */
export type BoatType = 'klein' | 'gross'

/** Anzahl der vorhandenen Boote je Typ. */
export interface BoatConfig {
  klein: number
  gross: number
}

/** Welche Verzahnung die einheitliche klassische Startnummer festlegt. */
export type RunningNumberSource = 'manoever' | 'parallel'

/**
 * Klassische, fortlaufende Startnummern (1, 2, 3, …), die den Startern in der
 * Reihenfolge der Verzahnung zugewiesen werden – zusätzlich zu den
 * klassenbasierten Startnummern (E01, 312, …).
 */
export interface RunningNumberConfig {
  /** Klassische Nummerierung anzeigen/zuweisen. */
  enabled: boolean
  /** Maßgebliche Verzahnung für die Reihenfolge (Standard: Manövrieren). */
  source: RunningNumberSource
  /** Startwert der Nummerierung (Standard 1). */
  start: number
  /** Rohtext der zu überspringenden (fehlenden) Nummern, z. B. "7, 13, 20". */
  skipText: string
}

export interface Participant {
  id: string
  startNr: string
  vorname: string
  nachname: string
  /** Vereinsname (immer gesetzt, kann als Herkunft angezeigt werden) */
  verein: string
  /** Bundesland des Vereins */
  bundesland: string
  /** Geburtsdatum ISO (YYYY-MM-DD) */
  geburtsdatum: string
  klasse: ClassId
}

/** Ein Element innerhalb einer Spur: entweder ein Klassen-Block oder eine Pause. */
export interface ClassItem {
  kind: 'class'
  klasse: ClassId
}

export interface PauseItem {
  kind: 'pause'
  id: string
  /** Länge der Pause in Takten (die Spur setzt so viele Starts aus). */
  length: number
}

export type TrackItem = ClassItem | PauseItem

export interface Parcours {
  id: string
  name: string
  /** Welche Klassen auf diesem Parcours fahren */
  classIds: ClassId[]
  wechselFaktor: WechselFaktor
  /**
   * Manuelle Spur-Anordnung. Jede innere Liste ist eine Spur mit ihren Klassen-
   * und Pausen-Blöcken in Abarbeitungsreihenfolge. Wenn undefined, wird
   * automatisch verteilt. Länge entspricht dem wechselFaktor.
   */
  tracks?: TrackItem[][]
}

export interface AppState {
  eventName: string
  eventJahr: number
  originMode: OriginMode
  participants: Participant[]
  parcoursList: Parcours[]
  /** Vorhandene Boote je Typ (Ressourcenschranke für die Verzahnung). */
  boats: BoatConfig
  /** Wenn true, fährt Klasse 4 ausnahmsweise mit einem kleinen Boot. */
  class4Small: boolean
  /**
   * Parallel-Slalom im internationalen Modus: nur bis Klasse 5 (6/7 ignoriert),
   * Klasse E heißt „Dolphin". Standard: true.
   */
  parallelInternational: boolean
  /**
   * Parallel-Slalom: Reihenfolge innerhalb der Bootstyp-Pools nach Startnummer
   * (statt nach Klasse). Sinnvoll bei genutzten klassischen Startnummern.
   */
  parallelOrderByStartNr: boolean
  /** Klassische fortlaufende Startnummern (nach Verzahnung vergeben). */
  runningNumbers: RunningNumberConfig
  /** true sobald das initiale Setup abgeschlossen ist */
  initialized: boolean
}
