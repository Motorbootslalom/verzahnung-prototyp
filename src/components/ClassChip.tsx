import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ClassId } from '../types'
import { classColor } from '../lib/classes'

interface ClassChipProps {
  classId: ClassId
  count: number
}

/** Sortierbarer Klassen-Block innerhalb einer Spur. */
export function ClassChip({ classId, count }: ClassChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: classId,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: classColor(classId),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`class-chip ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <span>Klasse {classId}</span>
      <span className="cnt">{count}</span>
    </div>
  )
}

/** Statische Darstellung für das DragOverlay. */
export function ClassChipPresentation({ classId, count }: ClassChipProps) {
  return (
    <div className="class-chip overlay" style={{ background: classColor(classId) }}>
      <span>Klasse {classId}</span>
      <span className="cnt">{count}</span>
    </div>
  )
}
