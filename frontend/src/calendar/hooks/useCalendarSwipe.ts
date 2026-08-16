import { useCallback, useEffect, useRef, type CSSProperties, type RefObject } from 'react'

type Axis = 'x' | 'y' | null

const LOCK_PX = 12
const COMMIT_PX = 64
const COMMIT_VELOCITY = 0.55
const MAX_DRAG = 160
const SNAP_MS = 280
const IGNORE_SELECTOR =
  'input, textarea, select, [data-cal-event="1"], [data-no-swipe="1"], [draggable="true"]'

function rubber(dx: number): number {
  const sign = dx < 0 ? -1 : 1
  const mag = Math.min(Math.abs(dx), MAX_DRAG * 2)
  if (mag <= MAX_DRAG) return sign * mag
  const extra = mag - MAX_DRAG
  return sign * (MAX_DRAG + extra * 0.22)
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return !!target.closest(IGNORE_SELECTOR)
}

type Opts = {
  enabled: boolean
  resetKey?: string
  onPrev: () => void
  onNext: () => void
}

export function useCalendarSwipe({ enabled, resetKey, onPrev, onNext }: Opts): {
  surfaceRef: RefObject<HTMLDivElement | null>
  style: CSSProperties
} {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const axisRef = useRef<Axis>(null)
  const startRef = useRef({ x: 0, y: 0, t: 0 })
  const dxRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const incomingRef = useRef<0 | 1 | -1>(0)
  const suppressClickRef = useRef(false)
  const onPrevRef = useRef(onPrev)
  const onNextRef = useRef(onNext)

  onPrevRef.current = onPrev
  onNextRef.current = onNext

  const setShift = useCallback((dx: number, animate: boolean) => {
    const el = surfaceRef.current
    if (!el) return
    el.style.transition = animate
      ? `transform ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease`
      : 'none'
    el.style.transform = dx ? `translate3d(${dx}px, 0, 0)` : ''
  }, [])

  const clearPanStyles = (el: HTMLDivElement) => {
    el.classList.remove('is-panning-x')
    el.style.touchAction = 'pan-y'
    el.style.userSelect = ''
  }

  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const dir = incomingRef.current
    incomingRef.current = 0
    el.style.transition = 'none'
    if (dir !== 0) {
      el.style.opacity = '0.55'
      el.style.transform = `translate3d(${dir * 32}px, 0, 0)`
      requestAnimationFrame(() => {
        el.style.transition = `transform ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease`
        el.style.transform = ''
        el.style.opacity = '1'
      })
      return
    }
    el.style.transform = ''
    el.style.opacity = '1'
  }, [resetKey])

  useEffect(() => {
    const el = surfaceRef.current
    if (!el || !enabled) return

    const reset = (animate: boolean) => {
      dxRef.current = 0
      axisRef.current = null
      pointerIdRef.current = null
      clearPanStyles(el)
      setShift(0, animate)
    }

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (isIgnoredTarget(e.target)) return
      pointerIdRef.current = e.pointerId
      axisRef.current = null
      const now = performance.now()
      startRef.current = { x: e.clientX, y: e.clientY, t: now }
      dxRef.current = 0
    }

    const onMove = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y

      if (axisRef.current === null) {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return
        if (Math.abs(dy) > Math.abs(dx)) {
          axisRef.current = 'y'
          return
        }
        axisRef.current = 'x'
        el.classList.add('is-panning-x')
        el.style.touchAction = 'none'
        el.style.userSelect = 'none'
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          /* capture is best-effort */
        }
      }

      if (axisRef.current !== 'x') return
      e.preventDefault()
      dxRef.current = rubber(dx)
      setShift(dxRef.current, false)
    }

    const onUp = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return
      const axis = axisRef.current
      const dx = dxRef.current
      const dt = Math.max(1, performance.now() - startRef.current.t)
      const vx = (e.clientX - startRef.current.x) / dt
      pointerIdRef.current = null
      axisRef.current = null
      clearPanStyles(el)

      if (axis !== 'x') {
        reset(false)
        return
      }

      suppressClickRef.current = true
      const goNext = dx < -COMMIT_PX || vx < -COMMIT_VELOCITY
      const goPrev = dx > COMMIT_PX || vx > COMMIT_VELOCITY
      if (goNext) {
        incomingRef.current = 1
        onNextRef.current()
        return
      }
      if (goPrev) {
        incomingRef.current = -1
        onPrevRef.current()
        return
      }
      reset(true)
    }

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClickRef.current) return
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove, { passive: false })
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('click', onClickCapture, true)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('click', onClickCapture, true)
    }
  }, [enabled, setShift])

  return {
    surfaceRef,
    style: {
      touchAction: 'pan-y',
      willChange: 'transform',
      overscrollBehaviorX: 'none',
    },
  }
}
