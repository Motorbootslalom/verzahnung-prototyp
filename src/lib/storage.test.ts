import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, clearState } from './storage'
import type { AppState } from '../types'

const KEY = 'verzahnung-prototyp:v1'

function stubStorage(initial: Record<string, string> = {}): Record<string, string> {
  const store = { ...initial }
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
    key: () => null,
    length: 0,
  } as Storage
  return store
}

const sample: AppState = {
  eventName: 'Test',
  eventJahr: 2026,
  originMode: 'verein',
  initialized: true,
  participants: [],
  parcoursList: [],
  boats: { klein: 2, gross: 2 },
  class4Small: false,
}

describe('storage', () => {
  beforeEach(() => stubStorage())

  it('lädt einen gespeicherten Stand unter dem aktuellen Schlüssel', () => {
    saveState(sample)
    expect(loadState()?.eventName).toBe('Test')
  })

  it('gibt null zurück, wenn nichts gespeichert ist', () => {
    expect(loadState()).toBeNull()
  })

  it('gibt null bei defektem JSON zurück', () => {
    stubStorage({ [KEY]: '{kaputt' })
    expect(loadState()).toBeNull()
  })

  it('clearState entfernt den gespeicherten Stand', () => {
    saveState(sample)
    clearState()
    expect(loadState()).toBeNull()
  })
})
