import { type ReactNode, useState } from 'react'
import { useVerticalDrag } from '../../../hooks/useVerticalDrag'

const DISMISS_DISTANCE_THRESHOLD = 120
const DISMISS_VELOCITY_THRESHOLD = 0.5

interface CartSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export const CartSheet = ({
  open,
  onClose,
  children,
}: CartSheetProps) => {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const bind = useVerticalDrag(({ movement: [, my], velocity: [, vy], direction: [, dy], last, first }) => {
    if (first) setIsDragging(true)

    const offset = Math.max(0, my)

    if (!last) {
      setDragOffset(offset)
      return
    }

    const shouldDismiss =
      offset > 0 && dy > 0 && (offset > DISMISS_DISTANCE_THRESHOLD || vy > DISMISS_VELOCITY_THRESHOLD)
    setIsDragging(false)
    setDragOffset(0)
    if (shouldDismiss) onClose()
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden" onPointerDown={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute right-0 bottom-0 left-0 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-xl"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }}
      >
        <div {...bind()} onClick={onClose} className="flex touch-none justify-center pt-3 pb-1 select-none">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
