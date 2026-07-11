import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type {
  AppState,
  BoatConfig,
  ClassId,
  OriginMode,
  Parcours,
  Participant,
  RunningNumberConfig,
  TrackItem,
  WechselFaktor,
} from '../types'
import { generateParticipants } from '../lib/generate'
import { loadState, saveState, clearState } from '../lib/storage'

function uid(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

function defaultParcours(): Parcours[] {
  return [
    { id: uid('par'), name: 'Parcours 1', classIds: ['E', '1', '2', '3'], wechselFaktor: 2 },
    { id: uid('par'), name: 'Parcours 2', classIds: ['4', '5', '6', '7'], wechselFaktor: 2 },
  ]
}

const emptyState: AppState = {
  eventName: 'Schlauchbootslalom 2026',
  eventJahr: 2026,
  originMode: 'verein',
  participants: [],
  parcoursList: defaultParcours(),
  boats: { klein: 2, gross: 2 },
  class4Small: false,
  parallelInternational: true,
  runningNumbers: { enabled: false, source: 'manoever', start: 1, skipText: '' },
  initialized: false,
}

export type Action =
  | {
      type: 'INIT_SETUP'
      eventName: string
      eventJahr: number
      originMode: OriginMode
      counts: Partial<Record<ClassId, number>>
      /** Optionale Parcours-Vorgabe (z. B. aus URL-Parametern); sonst Standard. */
      parcoursConfig?: { classIds: ClassId[]; wechselFaktor: WechselFaktor; tracks?: TrackItem[][] }[]
      boats?: BoatConfig
      class4Small?: boolean
    }
  | { type: 'SET_EVENT'; eventName: string; eventJahr: number }
  | { type: 'SET_ORIGIN_MODE'; originMode: OriginMode }
  | { type: 'SET_BOATS'; boats: BoatConfig }
  | { type: 'SET_CLASS4_SMALL'; class4Small: boolean }
  | { type: 'SET_PARALLEL_INTERNATIONAL'; parallelInternational: boolean }
  | { type: 'SET_RUNNING_NUMBERS'; patch: Partial<RunningNumberConfig> }
  | { type: 'GENERATE'; klasse: ClassId; count: number }
  | { type: 'ADD_PARTICIPANT'; participant: Participant }
  | { type: 'UPDATE_PARTICIPANT'; id: string; patch: Partial<Participant> }
  | { type: 'REMOVE_PARTICIPANT'; id: string }
  | { type: 'CLEAR_CLASS'; klasse: ClassId }
  | { type: 'ADD_PARCOURS' }
  | { type: 'SET_PARCOURS_PRESET'; groups: ClassId[][]; wechselFaktor?: WechselFaktor }
  | { type: 'REMOVE_PARCOURS'; id: string }
  | { type: 'RENAME_PARCOURS'; id: string; name: string }
  | { type: 'SET_PARCOURS_CLASSES'; id: string; classIds: ClassId[] }
  | { type: 'SET_PARCOURS_FACTOR'; id: string; wechselFaktor: WechselFaktor }
  | { type: 'SET_PARCOURS_TRACKS'; id: string; tracks: TrackItem[][] }
  | { type: 'RESET_TRACKS'; id: string }
  | { type: 'RESET_ALL' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT_SETUP': {
      let participants: Participant[] = []
      for (const [klasse, count] of Object.entries(action.counts) as [ClassId, number][]) {
        if (count > 0) {
          participants = participants.concat(
            generateParticipants(klasse, count, action.eventJahr, action.originMode, participants),
          )
        }
      }
      const parcoursList =
        action.parcoursConfig && action.parcoursConfig.length > 0
          ? action.parcoursConfig.map((pc, i) => ({
              id: uid('par'),
              name: `Parcours ${i + 1}`,
              classIds: pc.classIds,
              wechselFaktor: pc.wechselFaktor,
              tracks: pc.tracks,
            }))
          : defaultParcours()
      return {
        ...state,
        eventName: action.eventName,
        eventJahr: action.eventJahr,
        originMode: action.originMode,
        participants,
        parcoursList,
        boats: action.boats ?? state.boats,
        class4Small: action.class4Small ?? state.class4Small,
        initialized: true,
      }
    }

    case 'SET_EVENT':
      return { ...state, eventName: action.eventName, eventJahr: action.eventJahr }

    case 'SET_ORIGIN_MODE':
      return { ...state, originMode: action.originMode }

    case 'SET_BOATS':
      return { ...state, boats: action.boats }

    case 'SET_CLASS4_SMALL':
      return { ...state, class4Small: action.class4Small }

    case 'SET_PARALLEL_INTERNATIONAL':
      return { ...state, parallelInternational: action.parallelInternational }

    case 'SET_RUNNING_NUMBERS':
      return { ...state, runningNumbers: { ...state.runningNumbers, ...action.patch } }

    case 'GENERATE': {
      const neu = generateParticipants(
        action.klasse,
        action.count,
        state.eventJahr,
        state.originMode,
        state.participants,
      )
      return { ...state, participants: state.participants.concat(neu) }
    }

    case 'ADD_PARTICIPANT':
      return { ...state, participants: state.participants.concat(action.participant) }

    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      }

    case 'REMOVE_PARTICIPANT':
      return { ...state, participants: state.participants.filter((p) => p.id !== action.id) }

    case 'CLEAR_CLASS':
      return { ...state, participants: state.participants.filter((p) => p.klasse !== action.klasse) }

    case 'ADD_PARCOURS':
      return {
        ...state,
        parcoursList: state.parcoursList.concat({
          id: uid('par'),
          name: `Parcours ${state.parcoursList.length + 1}`,
          classIds: [],
          wechselFaktor: 2,
        }),
      }

    case 'SET_PARCOURS_PRESET':
      return {
        ...state,
        parcoursList: action.groups.map((classIds, i) => ({
          id: uid('par'),
          name: `Parcours ${i + 1}`,
          classIds,
          wechselFaktor: action.wechselFaktor ?? 2,
        })),
      }

    case 'REMOVE_PARCOURS':
      return { ...state, parcoursList: state.parcoursList.filter((p) => p.id !== action.id) }

    case 'RENAME_PARCOURS':
      return {
        ...state,
        parcoursList: state.parcoursList.map((p) =>
          p.id === action.id ? { ...p, name: action.name } : p,
        ),
      }

    case 'SET_PARCOURS_CLASSES':
      // Klassenänderung invalidiert die manuelle Spur-Anordnung.
      return {
        ...state,
        parcoursList: state.parcoursList.map((p) =>
          p.id === action.id ? { ...p, classIds: action.classIds, tracks: undefined } : p,
        ),
      }

    case 'SET_PARCOURS_FACTOR':
      // Faktoränderung invalidiert die manuelle Spur-Anordnung.
      return {
        ...state,
        parcoursList: state.parcoursList.map((p) =>
          p.id === action.id ? { ...p, wechselFaktor: action.wechselFaktor, tracks: undefined } : p,
        ),
      }

    case 'SET_PARCOURS_TRACKS':
      return {
        ...state,
        parcoursList: state.parcoursList.map((p) =>
          p.id === action.id ? { ...p, tracks: action.tracks } : p,
        ),
      }

    case 'RESET_TRACKS':
      return {
        ...state,
        parcoursList: state.parcoursList.map((p) =>
          p.id === action.id ? { ...p, tracks: undefined } : p,
        ),
      }

    case 'RESET_ALL':
      clearState()
      return { ...emptyState, parcoursList: defaultParcours() }

    default:
      return state
  }
}

function init(): AppState {
  const loaded = loadState()
  if (loaded) return { ...emptyState, ...loaded }
  return emptyState
}

interface StoreContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  useEffect(() => {
    saveState(state)
  }, [state])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider verwendet werden')
  return ctx
}
