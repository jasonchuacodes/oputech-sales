import { useEffect, useRef, useState } from 'react'

interface UsePullToRefreshOptions {
  threshold?: number
  maxPull?: number
  enabled?: boolean
}

const DIRECTION_LOCK_THRESHOLD = 10

const startsInExcludedElement = (
  target: EventTarget | null,
  boundary: HTMLElement
): boolean => {
  let node = target instanceof Element ? target : null
  while (node && node !== boundary) {
    const style = getComputedStyle(node)
    if (style.position === 'fixed') return true

    const scrollsHorizontally =
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      node.scrollWidth > node.clientWidth
    const scrollsVertically =
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    if (scrollsHorizontally || scrollsVertically) return true
    node = node.parentElement
  }
  return false
}

const findTouch = (touches: TouchList, identifier: number): Touch | null => {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index)
    if (touch?.identifier === identifier) return touch
  }
  return null
}

export const usePullToRefresh = (
  containerRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => void | Promise<void>,
  { threshold = 56, maxPull = 90, enabled = true }: UsePullToRefreshOptions = {}
) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullDistanceRef = useRef(0)
  const isRefreshingRef = useRef(false)
  const isMountedRef = useRef(false)
  const refreshIdRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const touchIdRef = useRef<number | null>(null)
  const directionRef = useRef<'vertical' | 'horizontal' | null>(null)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      refreshIdRef.current += 1
      isRefreshingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const el = containerRef.current
    if (!el) return

    const updatePullDistance = (distance: number) => {
      pullDistanceRef.current = distance
      setPullDistance(distance)
    }

    const clearGesture = (resetDistance = true) => {
      startXRef.current = null
      startYRef.current = null
      touchIdRef.current = null
      directionRef.current = null
      setIsPulling(false)
      if (resetDistance) updatePullDistance(0)
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return
      if (e.touches.length !== 1 || startsInExcludedElement(e.target, el)) {
        clearGesture()
        return
      }

      const touch = e.touches.item(0)
      if (!touch || el.scrollTop > 0) return

      directionRef.current = null
      touchIdRef.current = touch.identifier
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (
        isRefreshingRef.current ||
        startYRef.current === null ||
        touchIdRef.current === null
      )
        return

      if (e.touches.length !== 1) {
        clearGesture()
        return
      }

      const touch = findTouch(e.touches, touchIdRef.current)
      if (!touch) {
        clearGesture()
        return
      }

      const deltaX = touch.clientX - (startXRef.current ?? touch.clientX)
      const deltaY = touch.clientY - startYRef.current

      if (directionRef.current === null) {
        if (
          Math.max(Math.abs(deltaX), Math.abs(deltaY)) <
          DIRECTION_LOCK_THRESHOLD
        )
          return
        directionRef.current =
          Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
      }

      if (directionRef.current === 'horizontal') {
        clearGesture()
        return
      }

      if (el.scrollTop > 0 || deltaY <= 0) {
        clearGesture()
        return
      }

      if (e.cancelable) e.preventDefault()
      setIsPulling(true)
      updatePullDistance(Math.min(maxPull, deltaY))
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (
        isRefreshingRef.current ||
        startYRef.current === null ||
        touchIdRef.current === null ||
        !findTouch(e.changedTouches, touchIdRef.current)
      )
        return

      const shouldRefresh = pullDistanceRef.current >= threshold
      clearGesture(!shouldRefresh)
      if (!shouldRefresh) return

      isRefreshingRef.current = true
      setIsRefreshing(true)
      updatePullDistance(threshold)
      const refreshId = ++refreshIdRef.current

      void (async () => {
        try {
          await onRefreshRef.current()
        } catch {
          // Existing sync status UI is responsible for communicating refresh failures.
        } finally {
          if (!isMountedRef.current || refreshIdRef.current !== refreshId)
            return
          isRefreshingRef.current = false
          setIsRefreshing(false)
          updatePullDistance(0)
        }
      })()
    }

    const handleTouchCancel = () => clearGesture()

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [containerRef, enabled, threshold, maxPull])

  return { pullDistance, isPulling, isRefreshing }
}
