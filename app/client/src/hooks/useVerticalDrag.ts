import { useDrag } from '@use-gesture/react'
import type { Handler, UserDragConfig } from '@use-gesture/react'

type VerticalDragHandler = Handler<'drag', PointerEvent>

export const useVerticalDrag = (onDrag: VerticalDragHandler, config: UserDragConfig = {}) =>
  useDrag(
    (state) => {
      const { event, cancel } = state
      if (!('pointerType' in event) || event.pointerType !== 'touch') return cancel()
      onDrag({ ...state, event })
    },
    { axis: 'y', from: () => [0, 0], filterTaps: true, ...config }
  )
