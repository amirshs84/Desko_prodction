import { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelectedDay } from '../context/SelectedDayContext'
import { todayJalali } from '../lib/jalaliUtils'
import {
  isCurrentPeriod,
  parsePeriodFromPath,
  periodPath,
  PERIOD_SHIFT_LABEL,
  shiftPeriod,
  type CalendarTab,
} from '../lib/periodNav'

export function usePeriodNavigation(tab: CalendarTab) {
  const nav = useNavigate()
  const loc = useLocation()
  const { selected, setSelected } = useSelectedDay()

  const parsed = useMemo(() => parsePeriodFromPath(loc.pathname), [loc.pathname])
  const anchor = useMemo(() => {
    if (!parsed) return selected
    if (parsed.tab === 'year') {
      return { jy: parsed.date.jy, jm: selected.jm, jd: selected.jd }
    }
    if (parsed.tab === 'month') {
      return { jy: parsed.date.jy, jm: parsed.date.jm, jd: selected.jd }
    }
    return parsed.date
  }, [parsed, selected])
  const labels = PERIOD_SHIFT_LABEL[tab]
  const viewingToday = isCurrentPeriod(tab, anchor)

  const go = useCallback(
    (delta: -1 | 1) => {
      const next = shiftPeriod(anchor, tab, delta)
      setSelected(next)
      nav(periodPath(tab, next))
    },
    [anchor, nav, setSelected, tab],
  )

  const goPrev = useCallback(() => go(-1), [go])
  const goNext = useCallback(() => go(1), [go])

  const goToday = useCallback(() => {
    const t = todayJalali()
    setSelected(t)
    nav(periodPath(tab, t))
  }, [nav, setSelected, tab])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }
      if (document.querySelector('[data-cal-modal="1"]')) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 't' || e.key === 'T' || e.key === 'ن') {
        e.preventDefault()
        goToday()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, goToday])

  return { goPrev, goNext, goToday, labels, viewingToday, anchor }
}
