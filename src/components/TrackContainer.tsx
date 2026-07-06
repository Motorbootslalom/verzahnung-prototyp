import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ClassId, TrackItem } from '../types'
import { itemDragId } from '../lib/verzahnung'
import { ClassChip } from './ClassChip'
import { PauseChip } from './PauseChip'

interface TrackContainerProps {
  id: string
  index: number
  items: TrackItem[]
  counts: Map<ClassId, number>
  total: number
  onAddPause: () => void
  onPauseLength: (pauseId: string, length: number) => void
  onPauseRemove: (pauseId: string) => void
}

/** Eine Spur der Verzahnung – Ablagefläche für Klassen- und Pausen-Blöcke. */
export function TrackContainer({
  id,
  index,
  items,
  counts,
  total,
  onAddPause,
  onPauseLength,
  onPauseRemove,
}: TrackContainerProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const hasClasses = items.some((i) => i.kind === 'class')

  return (
    <div ref={setNodeRef} className={`track ${isOver ? 'over' : ''}`}>
      <div className="track-label">
        <span>Spur {String.fromCharCode(65 + index)}</span>
        <span>
          {total} Starter
          <button className="add-pause" onClick={onAddPause} title="Pause zu dieser Spur hinzufügen">
            + Pause
          </button>
        </span>
      </div>
      <SortableContext items={items.map(itemDragId)} strategy={rectSortingStrategy}>
        <div className="track-blocks">
          {!hasClasses && items.length === 0 ? (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Klasse hierher ziehen…</span>
          ) : (
            items.map((item) =>
              item.kind === 'class' ? (
                <ClassChip key={item.klasse} classId={item.klasse} count={counts.get(item.klasse) ?? 0} />
              ) : (
                <PauseChip
                  key={item.id}
                  item={item}
                  onLength={(len) => onPauseLength(item.id, len)}
                  onRemove={() => onPauseRemove(item.id)}
                />
              ),
            )
          )}
        </div>
      </SortableContext>
    </div>
  )
}
