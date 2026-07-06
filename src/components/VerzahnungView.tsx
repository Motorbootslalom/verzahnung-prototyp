import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useStore } from '../state/store'
import { CLASSES, classColor, getClass } from '../lib/classes'
import { classCounts, computeVerzahnung, itemDragId } from '../lib/verzahnung'
import type { ClassId, Parcours, TrackItem, WechselFaktor } from '../types'
import { TrackContainer } from './TrackContainer'
import { ClassChipPresentation } from './ClassChip'
import { PauseChipPresentation } from './PauseChip'

const FACTOR_HINTS: Record<WechselFaktor, string> = {
  1: 'Keine Verzahnung – Klassen laufen in Blöcken nacheinander.',
  2: 'Zwei Spuren im Wechsel: A, B, A, B …',
  3: 'Drei Spuren im Wechsel: A, B, C, A, B, C …',
  4: 'Vier Spuren im Wechsel: A, B, C, D, A, B, C, D …',
}

function newPause(): TrackItem {
  return { kind: 'pause', id: 'pause_' + Math.random().toString(36).slice(2, 9), length: 1 }
}

export function VerzahnungView() {
  const { state, dispatch } = useStore()

  const assignedClasses = new Set(state.parcoursList.flatMap((p) => p.classIds))
  const unassigned = CLASSES.filter(
    (c) => !assignedClasses.has(c.id) && state.participants.some((p) => p.klasse === c.id),
  )

  return (
    <>
      <div className="panel">
        <h2>Verzahnung der Parcours</h2>
        <p className="hint">
          Klassen werden nach Starterzahl möglichst gleichmäßig auf die Spuren verteilt, sodass immer
          ein Boots-Wechsel stattfindet. Ziehe Klassen-Blöcke per Drag&amp;Drop zwischen den Spuren
          oder ändere ihre Reihenfolge. Mit <b>+ Pause</b> fügst du einen Versatz ein – die Spur setzt
          dort die angegebene Anzahl Starts aus, sodass die nächste Klasse später einsetzt (keine
          Leerzeile in der Startliste).
        </p>
        {unassigned.length > 0 && (
          <p className="note" style={{ color: 'var(--danger)' }}>
            Nicht zugeordnet (fahren auf keinem Parcours):{' '}
            {unassigned.map((c) => `Klasse ${c.id}`).join(', ')}
          </p>
        )}
      </div>

      {state.parcoursList.map((p) => (
        <ParcoursCard key={p.id} parcours={p} />
      ))}

      <button className="btn" onClick={() => dispatch({ type: 'ADD_PARCOURS' })}>
        + Parcours hinzufügen
      </button>
    </>
  )
}

function ParcoursCard({ parcours }: { parcours: Parcours }) {
  const { state, dispatch } = useStore()
  const TRACK_PREFIX = `${parcours.id}::track::`

  const filtered = useMemo(
    () => state.participants.filter((p) => parcours.classIds.includes(p.klasse)),
    [state.participants, parcours.classIds],
  )
  const counts = useMemo(() => classCounts(filtered), [filtered])
  const verz = useMemo(() => computeVerzahnung(parcours, state.participants), [parcours, state.participants])

  const signature = JSON.stringify(verz.tracks)
  const [containers, setContainers] = useState<TrackItem[][]>(verz.tracks)
  const [activeItem, setActiveItem] = useState<TrackItem | null>(null)

  // Bei Änderung von Klassen/Faktor/Startern/Pausen die Spuren neu übernehmen.
  useEffect(() => {
    setContainers(verz.tracks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const isTrackId = (id: string) => id.startsWith(TRACK_PREFIX)
  const findContainer = (id: string): number => {
    if (isTrackId(id)) return parseInt(id.slice(TRACK_PREFIX.length), 10)
    return containers.findIndex((track) => track.some((it) => itemDragId(it) === id))
  }

  function persist(next: TrackItem[][]) {
    setContainers(next)
    dispatch({ type: 'SET_PARCOURS_TRACKS', id: parcours.id, tracks: next })
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id)
    for (const track of containers) {
      const it = track.find((i) => itemDragId(i) === id)
      if (it) {
        setActiveItem(it)
        return
      }
    }
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeC = findContainer(activeId)
    const overC = findContainer(overId)
    if (activeC === -1 || overC === -1 || activeC === overC) return

    setContainers((prev) => {
      const next = prev.map((t) => [...t])
      const item = next[activeC].find((it) => itemDragId(it) === activeId)
      if (!item) return prev
      next[activeC] = next[activeC].filter((it) => itemDragId(it) !== activeId)
      let insertAt = next[overC].length
      if (!isTrackId(overId)) {
        const oi = next[overC].findIndex((it) => itemDragId(it) === overId)
        if (oi >= 0) insertAt = oi
      }
      next[overC].splice(insertAt, 0, item)
      return next
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    let final = containers
    if (over) {
      const activeId = String(active.id)
      const overId = String(over.id)
      const activeC = findContainer(activeId)
      const overC = findContainer(overId)
      if (activeC !== -1 && overC === activeC && !isTrackId(overId)) {
        const items = containers[activeC]
        const oldI = items.findIndex((it) => itemDragId(it) === activeId)
        const newI = items.findIndex((it) => itemDragId(it) === overId)
        if (oldI !== -1 && newI !== -1 && oldI !== newI) {
          final = containers.map((t) => [...t])
          final[activeC] = arrayMove(final[activeC], oldI, newI)
        }
      }
    }
    persist(final)
    setActiveItem(null)
  }

  function addPause(trackIndex: number) {
    const next = containers.map((t) => [...t])
    next[trackIndex].push(newPause())
    persist(next)
  }

  function setPauseLength(pauseId: string, length: number) {
    const next = containers.map((track) =>
      track.map((it) => (it.kind === 'pause' && it.id === pauseId ? { ...it, length } : it)),
    )
    persist(next)
  }

  function removePause(pauseId: string) {
    const next = containers.map((track) =>
      track.filter((it) => !(it.kind === 'pause' && it.id === pauseId)),
    )
    persist(next)
  }

  function toggleClass(id: ClassId) {
    const has = parcours.classIds.includes(id)
    const next = has ? parcours.classIds.filter((c) => c !== id) : [...parcours.classIds, id]
    dispatch({ type: 'SET_PARCOURS_CLASSES', id: parcours.id, classIds: next })
  }

  const trackTotal = (track: TrackItem[]) =>
    track.reduce((s, it) => s + (it.kind === 'class' ? counts.get(it.klasse) ?? 0 : 0), 0)

  const hasPauses = containers.some((t) => t.some((i) => i.kind === 'pause'))

  return (
    <div className="parcours">
      <div className="parcours-head">
        <input
          className="pname"
          value={parcours.name}
          onChange={(e) => dispatch({ type: 'RENAME_PARCOURS', id: parcours.id, name: e.target.value })}
        />
        <div className="field" style={{ width: 'auto' }}>
          <div className="segmented">
            {([1, 2, 3, 4] as WechselFaktor[]).map((f) => (
              <button
                key={f}
                className={parcours.wechselFaktor === f ? 'active' : ''}
                onClick={() => dispatch({ type: 'SET_PARCOURS_FACTOR', id: parcours.id, wechselFaktor: f })}
                title={FACTOR_HINTS[f]}
              >
                {f}er
              </button>
            ))}
          </div>
        </div>
        <span className="spacer" style={{ flex: 1 }} />
        {(verz.manual || hasPauses) && (
          <button
            className="btn sm ghost"
            onClick={() => dispatch({ type: 'RESET_TRACKS', id: parcours.id })}
            title="Automatische Verteilung wiederherstellen (entfernt auch Pausen)"
          >
            ↺ Auto
          </button>
        )}
        <button
          className="btn sm danger"
          onClick={() => {
            if (confirm(`Parcours „${parcours.name}“ entfernen?`))
              dispatch({ type: 'REMOVE_PARCOURS', id: parcours.id })
          }}
        >
          Entfernen
        </button>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div className="subhead">Klassen auf diesem Parcours · Wechsel {parcours.wechselFaktor}er</div>
        <div className="classes-picker">
          {CLASSES.map((c) => {
            const on = parcours.classIds.includes(c.id)
            const n = state.participants.filter((p) => p.klasse === c.id).length
            return (
              <button
                key={c.id}
                className={`class-toggle ${on ? 'on' : ''}`}
                style={on ? { background: c.color, borderColor: c.color } : undefined}
                onClick={() => toggleClass(c.id)}
                title={`${c.label} · ${n} Starter`}
              >
                {c.id} <span style={{ opacity: 0.8, fontWeight: 600 }}>· {n}</span>
              </button>
            )
          })}
        </div>
        <p className="note">{FACTOR_HINTS[parcours.wechselFaktor]}</p>
      </div>

      <div className="parcours-body">
        <div className="tracks-area">
          <div className="subhead">Spuren (Drag&amp;Drop · Klassen &amp; Pausen)</div>
          {filtered.length === 0 ? (
            <div className="empty">Keine Starter – Klassen oben auswählen bzw. Teilnehmer anlegen.</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveItem(null)}
            >
              {containers.map((track, i) => (
                <TrackContainer
                  key={`${TRACK_PREFIX}${i}`}
                  id={`${TRACK_PREFIX}${i}`}
                  index={i}
                  items={track}
                  counts={counts}
                  total={trackTotal(track)}
                  onAddPause={() => addPause(i)}
                  onPauseLength={setPauseLength}
                  onPauseRemove={removePause}
                />
              ))}
              <DragOverlay>
                {activeItem ? (
                  activeItem.kind === 'class' ? (
                    <ClassChipPresentation
                      classId={activeItem.klasse}
                      count={counts.get(activeItem.klasse) ?? 0}
                    />
                  ) : (
                    <PauseChipPresentation item={activeItem} />
                  )
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
          <FlowPreview parcours={parcours} />
        </div>

        <div className="sequence-area">
          <div className="subhead">Verzahnte Startreihenfolge · {verz.sequence.length} Starter</div>
          <SequenceTable parcoursId={parcours.id} />
        </div>
      </div>
    </div>
  )
}

function FlowPreview({ parcours }: { parcours: Parcours }) {
  const { state } = useStore()
  const verz = computeVerzahnung(parcours, state.participants)
  const preview = verz.sequence.slice(0, 60)
  if (preview.length === 0) return null
  return (
    <>
      <div className="subhead" style={{ marginTop: 14 }}>
        Wechsel-Vorschau {verz.sequence.length > 60 ? '(erste 60)' : ''}
      </div>
      <div className="flow-preview">
        {preview.map((p, i) => (
          <span key={i} className="fp" style={{ background: classColor(p.klasse) }} title={p.startNr}>
            {p.klasse}
          </span>
        ))}
      </div>
    </>
  )
}

function SequenceTable({ parcoursId }: { parcoursId: string }) {
  const { state } = useStore()
  const parcours = state.parcoursList.find((p) => p.id === parcoursId)!
  const verz = computeVerzahnung(parcours, state.participants)

  if (verz.sequence.length === 0) {
    return <div className="empty">Noch keine Starter auf diesem Parcours.</div>
  }

  return (
    <div className="sequence">
      <table>
        <thead>
          <tr>
            <th className="pos">#</th>
            <th style={{ width: 44 }}>Kl.</th>
            <th style={{ width: 56 }}>S-Nr.</th>
            <th>Name, Vorname</th>
            <th>{state.originMode === 'bundesland' ? 'Bundesland' : 'Verein'}</th>
          </tr>
        </thead>
        <tbody>
          {verz.sequence.map((p, i) => {
            const def = getClass(p.klasse)
            return (
              <tr key={p.id}>
                <td className="pos">{i + 1}</td>
                <td>
                  <span className="class-badge" style={{ background: def.color, minWidth: 22, height: 20 }}>
                    {p.klasse}
                  </span>
                </td>
                <td className="num">{p.startNr}</td>
                <td>
                  {p.nachname}, {p.vorname}
                </td>
                <td>{state.originMode === 'bundesland' ? p.bundesland : p.verein || p.bundesland}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
