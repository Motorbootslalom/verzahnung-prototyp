import type { AppState, BoatConfig, ClassId, OriginMode, TrackItem, WechselFaktor } from '../types'
import { CLASS_IDS } from './classes'
import { classCounts, computeVerzahnung } from './verzahnung'

/**
 * Kompakte, teilbare Konfiguration in URL-Parametern. Damit lassen sich
 * Klassenverteilung, Parcours-Anzahl, Wechselfaktoren UND die manuelle
 * Spur-Anordnung (Reihenfolge je Spur + Pausen) direkt übergeben oder als
 * Link speichern. Die zufälligen Teilnehmer werden beim Öffnen anhand der
 * Verteilung neu erzeugt.
 *
 * Parameter:
 *   counts = Starter je Klasse in Reihenfolge E,1,2,3,4,5,6,7, punktgetrennt
 *            z. B. counts=6.8.7.9.0.0.0.0
 *   p      = Parcours, per "_" getrennt. Je Parcours: <Klassen>*<Faktor> und
 *            optional *<Layout> für die manuelle Anordnung. Ohne Layout wird
 *            automatisch verteilt.
 *              <Klassen> = zugeordnete Klassen-IDs, z. B. E1234567
 *              <Layout>  = Spuren per "-" getrennt, Elemente je Spur per ".";
 *                          Klasse = ID, Pause = "q<Länge>".
 *            Beispiel: p=E1234567*2*3.E.1.2.6-4.5.7
 *                      (Faktor 2, Spur A: 3,E,1,2,6 · Spur B: 4,5,7)
 *   boats  = vorhandene Boote "klein.gross", z. B. boats=4.2 (optional)
 *   c4     = "1", wenn Klasse 4 mit kleinem Boot fährt (optional)
 *   event  = Veranstaltungsname (optional)
 *   jahr   = Veranstaltungsjahr (optional)
 *   origin = "verein" | "bundesland" (optional)
 */
export interface UrlParcours {
  classIds: ClassId[]
  wechselFaktor: WechselFaktor
  /** Manuelle Spur-Anordnung (Reihenfolge + Pausen); fehlt = automatisch. */
  tracks?: TrackItem[][]
}

export interface UrlConfig {
  counts: Partial<Record<ClassId, number>>
  parcours: UrlParcours[]
  boats?: BoatConfig
  class4Small?: boolean
  eventName?: string
  eventJahr?: number
  originMode?: OriginMode
}

const CLASS_SET = new Set<string>(CLASS_IDS)

function isClassId(s: string): s is ClassId {
  return CLASS_SET.has(s)
}

function toFactor(n: number): WechselFaktor {
  return (n >= 1 && n <= 4 ? n : 2) as WechselFaktor
}

/** Zerlegt eine Kette von Klassen-IDs ("E123") in einzelne ClassIds. */
function parseClassIds(raw: string): ClassId[] {
  const out: ClassId[] = []
  for (const ch of raw) if (isClassId(ch) && !out.includes(ch)) out.push(ch)
  return out
}

/** Spur-Anordnung → Layout-String: Spuren per "-", Elemente per ".", Pause = "q<Länge>". */
function encodeTracks(tracks: TrackItem[][]): string {
  return tracks
    .map((track) =>
      track
        .map((it) => (it.kind === 'class' ? it.klasse : `q${Math.max(1, it.length)}`))
        .join('.'),
    )
    .join('-')
}

/** Layout-String → Spur-Anordnung. Pause-IDs werden deterministisch aus den Indizes gebildet. */
function decodeTracks(layout: string, parcoursIdx: number): TrackItem[][] {
  return layout.split('-').map((trackStr, ti) => {
    const items: TrackItem[] = []
    for (const tok of trackStr.split('.')) {
      if (!tok) continue
      if (tok[0] === 'q') {
        const len = parseInt(tok.slice(1), 10)
        items.push({
          kind: 'pause',
          id: `pause_p${parcoursIdx}_t${ti}_${items.length}`,
          length: Number.isFinite(len) && len > 0 ? len : 1,
        })
      } else if (isClassId(tok)) {
        items.push({ kind: 'class', klasse: tok })
      }
    }
    return items
  })
}

/**
 * Liest eine Konfiguration aus einem Query-String (mit oder ohne führendes "?").
 * Gibt null zurück, wenn keine Klassenverteilung (`counts`) enthalten ist –
 * ohne Starterzahlen gibt es nichts einzurichten.
 */
export function parseUrlConfig(search: string): UrlConfig | null {
  const params = new URLSearchParams(search)

  const countsRaw = params.get('counts')
  if (!countsRaw) return null

  const counts: Partial<Record<ClassId, number>> = {}
  const values = countsRaw.split('.')
  CLASS_IDS.forEach((id, i) => {
    const n = parseInt(values[i] ?? '', 10)
    if (Number.isFinite(n) && n > 0) counts[id] = Math.min(999, n)
  })

  const parcours: UrlParcours[] = []
  const pRaw = params.get('p')
  if (pRaw) {
    pRaw.split('_').forEach((token) => {
      if (!token) return
      const [classPart, factorPart, layoutPart] = token.split('*')
      const classIds = parseClassIds(classPart ?? '')
      if (classIds.length === 0) return
      const entry: UrlParcours = {
        classIds,
        wechselFaktor: toFactor(parseInt(factorPart ?? '', 10)),
      }
      if (layoutPart != null && layoutPart !== '') {
        entry.tracks = decodeTracks(layoutPart, parcours.length)
      }
      parcours.push(entry)
    })
  }

  const config: UrlConfig = { counts, parcours }

  const boatsRaw = params.get('boats')
  if (boatsRaw) {
    const [k, g] = boatsRaw.split('.')
    const klein = parseInt(k ?? '', 10)
    const gross = parseInt(g ?? '', 10)
    if (Number.isFinite(klein) || Number.isFinite(gross)) {
      config.boats = {
        klein: Number.isFinite(klein) ? Math.max(0, klein) : 0,
        gross: Number.isFinite(gross) ? Math.max(0, gross) : 0,
      }
    }
  }
  if (params.get('c4') === '1') config.class4Small = true

  const event = params.get('event')
  if (event) config.eventName = event
  const jahr = parseInt(params.get('jahr') ?? '', 10)
  if (Number.isFinite(jahr)) config.eventJahr = jahr
  const origin = params.get('origin')
  if (origin === 'verein' || origin === 'bundesland') config.originMode = origin

  return config
}

/**
 * Baut den Query-String (ohne führendes "?") aus dem aktuellen App-Zustand.
 * Nur URL-sichere Zeichen werden roh verwendet; der Eventname wird kodiert.
 */
export function buildConfigQuery(state: AppState): string {
  const counts = classCounts(state.participants)
  const countsStr = CLASS_IDS.map((id) => counts.get(id) ?? 0).join('.')

  const pStr = state.parcoursList
    .filter((p) => p.classIds.length > 0)
    .map((p) => {
      const base = `${p.classIds.join('')}*${p.wechselFaktor}`
      // Manuelle Anordnung (Reihenfolge/Pausen) mitkodieren, sonst auto lassen.
      const verz = computeVerzahnung(p, state.participants)
      return verz.manual ? `${base}*${encodeTracks(verz.tracks)}` : base
    })
    .join('_')

  const parts = [`counts=${countsStr}`]
  if (pStr) parts.push(`p=${pStr}`)
  parts.push(`boats=${state.boats.klein}.${state.boats.gross}`)
  if (state.class4Small) parts.push(`c4=1`)
  if (state.eventName) parts.push(`event=${encodeURIComponent(state.eventName)}`)
  parts.push(`jahr=${state.eventJahr}`)
  parts.push(`origin=${state.originMode}`)

  return parts.join('&')
}

/** Vollständige teilbare URL auf Basis von origin+pathname. */
export function buildConfigUrl(state: AppState, base: string): string {
  const clean = base.split('?')[0].split('#')[0]
  return `${clean}?${buildConfigQuery(state)}`
}
