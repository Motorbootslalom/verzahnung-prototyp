import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PauseItem } from '../types'

interface PauseChipProps {
  item: PauseItem
  onLength: (length: number) => void
  onRemove: () => void
}

/** Sortierbarer Pausen-Block innerhalb einer Spur (Versatz um `length` Takte). */
export function PauseChip({ item, onLength, onRemove }: PauseChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={`pause-chip ${isDragging ? 'dragging' : ''}`} {...attributes}>
      <span className="handle" {...listeners} title="Pause verschieben">
        ⏸ Pause
      </span>
      <button
        className="len"
        onClick={() => onLength(Math.max(1, item.length - 1))}
        disabled={item.length <= 1}
        title="Kürzer"
      >
        −
      </button>
      <span className="len-val" title="Takte, die die Spur aussetzt">
        {item.length}
      </span>
      <button className="len" onClick={() => onLength(Math.min(20, item.length + 1))} title="Länger">
        +
      </button>
      <button className="rm" onClick={onRemove} title="Pause entfernen">
        ×
      </button>
    </div>
  )
}

/** Statische Darstellung für das DragOverlay. */
export function PauseChipPresentation({ item }: { item: PauseItem }) {
  return (
    <div className="pause-chip overlay">
      <span className="handle">⏸ Pause</span>
      <span className="len-val">{item.length}</span>
    </div>
  )
}
