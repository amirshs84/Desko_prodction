import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generateEventId } from '../lib/id'
import { nextEventColor } from '../lib/eventColors'
import type { JalaliDate } from '../lib/jalaliUtils'
import { addDays, isSameJalali, weekDaysFromDate } from '../lib/jalaliUtils'
import type {
  CalendarEventRecord,
  EventEditScope,
  EventRepeatScope,
} from '../types/calendar'
import { STORAGE_KEY } from '../types/calendar'
import { calendarAPI } from '../../api/client'

const EVENTS_QUERY_KEY = ['calendar_events']
const isLoggedIn = () => !!localStorage.getItem('isLoggedIn')

interface ServerEvent {
  client_id: string
  group_id?: string
  jy: number
  jm: number
  jd: number
  title: string
  description: string
  start_minutes: number
  end_minutes: number
  color: string
  all_day: boolean
  created_at: string
  kind?: 'mutable' | 'immutable'
  origin?: string
  version?: number
}

function fromServer(e: ServerEvent): CalendarEventRecord {
  return {
    id: e.client_id,
    groupId: e.group_id || undefined,
    jy: e.jy,
    jm: e.jm,
    jd: e.jd,
    title: e.title,
    description: e.description,
    startMinutes: e.start_minutes,
    endMinutes: e.end_minutes,
    color: e.color,
    allDay: e.all_day,
    createdAt: e.created_at,
    kind: e.kind,
    origin: e.origin,
    version: e.version,
  }
}

function isImmutable(e?: CalendarEventRecord | null): boolean {
  return e?.kind === 'immutable'
}

function toServer(e: CalendarEventRecord): ServerEvent {
  return {
    client_id: e.id,
    group_id: e.groupId ?? '',
    jy: e.jy,
    jm: e.jm,
    jd: e.jd,
    title: e.title,
    description: e.description,
    start_minutes: e.startMinutes,
    end_minutes: e.endMinutes,
    color: e.color,
    all_day: e.allDay,
    created_at: e.createdAt,
  }
}

function patchToServer(patch: Partial<CalendarEventRecord>): Partial<ServerEvent> {
  const sp: Partial<ServerEvent> = {}
  if (patch.title !== undefined) sp.title = patch.title
  if (patch.description !== undefined) sp.description = patch.description
  if (patch.startMinutes !== undefined) sp.start_minutes = patch.startMinutes
  if (patch.endMinutes !== undefined) sp.end_minutes = patch.endMinutes
  if (patch.color !== undefined) sp.color = patch.color
  if (patch.allDay !== undefined) sp.all_day = patch.allDay
  if (patch.jy !== undefined) sp.jy = patch.jy
  if (patch.jm !== undefined) sp.jm = patch.jm
  if (patch.jd !== undefined) sp.jd = patch.jd
  return sp
}

function groupPatchToServer(patch: Partial<CalendarEventRecord>): Partial<ServerEvent> {
  const sp: Partial<ServerEvent> = {}
  if (patch.title !== undefined) sp.title = patch.title
  if (patch.description !== undefined) sp.description = patch.description
  if (patch.startMinutes !== undefined) sp.start_minutes = patch.startMinutes
  if (patch.endMinutes !== undefined) sp.end_minutes = patch.endMinutes
  if (patch.color !== undefined) sp.color = patch.color
  if (patch.allDay !== undefined) sp.all_day = patch.allDay
  return sp
}

function loadInitial(): CalendarEventRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CalendarEventRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(list: CalendarEventRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* noop */
  }
}

function expandRepeatDates(date: JalaliDate, repeat: EventRepeatScope): JalaliDate[] {
  const week = weekDaysFromDate(date.jy, date.jm, date.jd)
  switch (repeat) {
    case 'full_week':
      return week
    case 'odd_days':
      return week.filter((d) => d.jd % 2 === 1)
    case 'even_days':
      return week.filter((d) => d.jd % 2 === 0)
    case 'all_weeks': {
      const dates: JalaliDate[] = []
      let cur: JalaliDate = { ...date }
      for (let i = 0; i < 52; i++) {
        dates.push({ ...cur })
        cur = addDays(cur.jy, cur.jm, cur.jd, 7)
      }
      return dates
    }
    default:
      return [date]
  }
}

type EventsContextValue = {
  events: CalendarEventRecord[]
  addEvent: (input: {
    date: JalaliDate
    title: string
    description: string
    startMinutes: number
    endMinutes: number
    allDay: boolean
    color?: string
    repeat?: EventRepeatScope
  }) => CalendarEventRecord
  addEventsBatch: (
    inputs: {
      date: JalaliDate
      title: string
      description: string
      startMinutes: number
      endMinutes: number
      allDay: boolean
      color?: string
    }[],
  ) => Promise<CalendarEventRecord[]>
  updateEvent: (
    id: string,
    patch: Partial<CalendarEventRecord>,
    scope?: EventEditScope,
  ) => void
  removeEvent: (id: string, scope?: EventEditScope) => void
  countInGroup: (groupId: string) => number
  eventsForDay: (d: JalaliDate) => CalendarEventRecord[]
  eventsForRange: (start: JalaliDate, days: number) => CalendarEventRecord[]
}

const EventsContext = createContext<EventsContextValue | null>(null)

export function EventsProvider({
  children,
  ownerUserId,
}: {
  children: ReactNode
  /** اگر ست شود، رویدادهای همان کاربر با `?user=` بارگذاری می‌شود (پنل مشاور). */
  ownerUserId?: number | string | null
}) {
  const queryClient = useQueryClient()
  const ownerKey = ownerUserId != null && ownerUserId !== '' ? String(ownerUserId) : 'me'
  const queryKey = useMemo(() => [...EVENTS_QUERY_KEY, ownerKey], [ownerKey])
  const apiParams = useMemo(
    () => (ownerKey === 'me' ? undefined : { user: ownerKey }),
    [ownerKey],
  )
  const persistLocal = ownerKey === 'me'

  const { data: events = persistLocal ? loadInitial() : [] } = useQuery<CalendarEventRecord[]>({
    queryKey,
    queryFn: async () => {
      const res = await calendarAPI.getEvents(apiParams)
      const records = (res.data as ServerEvent[]).map(fromServer)
      if (persistLocal) persist(records)
      return records
    },
    enabled: isLoggedIn(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: persistLocal ? loadInitial : [],
  })

  const mutate = useCallback(
    (updater: (prev: CalendarEventRecord[]) => CalendarEventRecord[]) => {
      queryClient.setQueryData<CalendarEventRecord[]>(queryKey, (prev = []) => {
        const next = updater(prev)
        if (persistLocal) persist(next)
        return next
      })
    },
    [queryClient, queryKey, persistLocal],
  )

  const countInGroup = useCallback(
    (groupId: string) => events.filter((e) => e.groupId === groupId).length,
    [events],
  )

  const addEvent = useCallback<EventsContextValue['addEvent']>(
    ({ date, title, description, startMinutes, endMinutes, allDay, color, repeat }) => {
      const scope = repeat ?? 'none'
      const dates = expandRepeatDates(date, scope)
      const pickedColor = color ?? nextEventColor()
      const trimmedTitle = title.trim() || '(بدون عنوان)'
      const trimmedDesc = description.trim()
      const groupId = dates.length > 1 ? generateEventId() : undefined

      const newRecs: CalendarEventRecord[] = dates.map((d) => ({
        id: generateEventId(),
        groupId,
        jy: d.jy,
        jm: d.jm,
        jd: d.jd,
        title: trimmedTitle,
        description: trimmedDesc,
        startMinutes: allDay ? 0 : startMinutes,
        endMinutes: allDay ? 1440 : Math.max(endMinutes, startMinutes + 15),
        color: pickedColor,
        allDay,
        createdAt: new Date().toISOString(),
      }))

      mutate((prev) => [...prev, ...newRecs])

      if (isLoggedIn()) {
        calendarAPI
          .createEvents(newRecs.map(toServer), apiParams)
          .catch((err: unknown) => {
            console.error('calendar createEvents failed:', err)
            mutate((prev) => prev.filter((e) => !newRecs.some((r) => r.id === e.id)))
            const status = (err as { response?: { status?: number } })?.response?.status
            const code = (err as { response?: { data?: { error?: { code?: string } } } })
              ?.response?.data?.error?.code
            if (status === 404) {
              alert('API تقویم روی سرور فعال نیست. لطفاً بک‌اند را rebuild و migrate کنید.')
            } else if (code === 'DAILY_CAPACITY_FULL') {
              alert('ظرفیت بیداری روز پر است (۰۶ تا ۲۳).')
            } else {
              alert('خطا در ذخیره رویداد روی سرور.')
            }
          })
      }

      return newRecs[newRecs.length - 1]!
    },
    [mutate, apiParams],
  )

  const addEventsBatch = useCallback<EventsContextValue['addEventsBatch']>(
    async (inputs) => {
      if (inputs.length === 0) return []

      const newRecs: CalendarEventRecord[] = inputs.map((input) => {
        const allDay = input.allDay
        return {
          id: generateEventId(),
          jy: input.date.jy,
          jm: input.date.jm,
          jd: input.date.jd,
          title: input.title.trim() || '(بدون عنوان)',
          description: input.description.trim(),
          startMinutes: allDay ? 0 : input.startMinutes,
          endMinutes: allDay ? 1440 : Math.max(input.endMinutes, input.startMinutes + 15),
          color: input.color ?? nextEventColor(),
          allDay,
          createdAt: new Date().toISOString(),
        }
      })

      const backup = queryClient.getQueryData<CalendarEventRecord[]>(queryKey)

      mutate((prev) => [...prev, ...newRecs])

      if (!isLoggedIn()) return newRecs

      try {
        await calendarAPI.createEvents(newRecs.map(toServer), apiParams)
        return newRecs
      } catch (err: unknown) {
        console.error('calendar createEvents batch failed:', err)
        if (backup) {
          queryClient.setQueryData(queryKey, backup)
          if (persistLocal) persist(backup)
        } else {
          mutate((prev) => prev.filter((e) => !newRecs.some((r) => r.id === e.id)))
        }
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          throw new Error('API تقویم روی سرور فعال نیست. لطفاً بک‌اند را rebuild و migrate کنید.')
        }
        throw new Error('خطا در ذخیره رویدادها روی سرور.')
      }
    },
    [mutate, queryClient, queryKey, apiParams, persistLocal],
  )

  const updateEvent = useCallback<EventsContextValue['updateEvent']>(
    (id, patch, scope = 'single') => {
      const current = queryClient
        .getQueryData<CalendarEventRecord[]>(queryKey)
        ?.find((e) => e.id === id)
      if (isImmutable(current)) {
        alert('این رویداد ثابت مدرسه است و قابل ویرایش نیست.')
        return
      }
      const backup = queryClient.getQueryData<CalendarEventRecord[]>(queryKey)

      const applyGroup =
        scope === 'group' && current?.groupId && countInGroup(current.groupId) > 1

      if (applyGroup && current?.groupId) {
        const gid = current.groupId
        const shared = groupPatchToServer(patch)
        mutate((prev) =>
          prev.map((e) => (e.groupId === gid ? { ...e, ...patch, jy: e.jy, jm: e.jm, jd: e.jd } : e)),
        )
        if (isLoggedIn()) {
          calendarAPI.updateGroup(gid, shared, apiParams).catch(() => {
            if (backup) {
              queryClient.setQueryData(queryKey, backup)
              if (persistLocal) persist(backup)
            }
          })
        }
        return
      }

      mutate((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
      if (isLoggedIn()) {
        calendarAPI.updateEvent(id, patchToServer(patch), apiParams).catch((err: unknown) => {
          if (backup) {
            queryClient.setQueryData(queryKey, backup)
            if (persistLocal) persist(backup)
          }
          const code = (err as { response?: { data?: { error?: { code?: string } } } })
            ?.response?.data?.error?.code
          if (code === 'IMMUTABLE_EVENT_VIOLATION') {
            alert('این رویداد ثابت مدرسه است و قابل ویرایش نیست.')
          }
        })
      }
    },
    [mutate, queryClient, countInGroup, queryKey, apiParams, persistLocal],
  )

  const removeEvent = useCallback<EventsContextValue['removeEvent']>(
    (id, scope = 'single') => {
      const backup = queryClient.getQueryData<CalendarEventRecord[]>(queryKey)
      const target = backup?.find((e) => e.id === id)
      if (isImmutable(target)) {
        alert('این رویداد ثابت مدرسه است و قابل حذف نیست.')
        return
      }

      const applyGroup =
        scope === 'group' && target?.groupId && countInGroup(target.groupId) > 1

      if (applyGroup && target?.groupId) {
        const gid = target.groupId
        mutate((prev) => prev.filter((e) => e.groupId !== gid))
        if (isLoggedIn()) {
          calendarAPI.deleteGroup(gid, apiParams).catch(() => {
            if (backup) {
              queryClient.setQueryData(queryKey, backup)
              if (persistLocal) persist(backup)
            }
          })
        }
        return
      }

      mutate((prev) => prev.filter((e) => e.id !== id))
      if (isLoggedIn()) {
        calendarAPI.deleteEvent(id, apiParams).catch((err: unknown) => {
          if (backup) {
            queryClient.setQueryData(queryKey, backup)
            if (persistLocal) persist(backup)
          }
          const code = (err as { response?: { data?: { error?: { code?: string } } } })
            ?.response?.data?.error?.code
          if (code === 'IMMUTABLE_EVENT_VIOLATION') {
            alert('این رویداد ثابت مدرسه است و قابل حذف نیست.')
          }
        })
      }
    },
    [mutate, queryClient, countInGroup, queryKey, apiParams, persistLocal],
  )

  const eventsForDay = useCallback(
    (d: JalaliDate) =>
      events.filter((e) => isSameJalali({ jy: e.jy, jm: e.jm, jd: e.jd }, d)),
    [events],
  )

  const eventsForRange = useCallback(
    (start: JalaliDate, dayCount: number) => {
      const keys = new Set<string>()
      let cur = { ...start }
      for (let i = 0; i < dayCount; i++) {
        keys.add(`${cur.jy}-${cur.jm}-${cur.jd}`)
        cur = addDays(cur.jy, cur.jm, cur.jd, 1)
      }
      return events.filter((e) => keys.has(`${e.jy}-${e.jm}-${e.jd}`))
    },
    [events],
  )

  const value = useMemo(
    () => ({
      events,
      addEvent,
      addEventsBatch,
      updateEvent,
      removeEvent,
      countInGroup,
      eventsForDay,
      eventsForRange,
    }),
    [events, addEvent, addEventsBatch, updateEvent, removeEvent, countInGroup, eventsForDay, eventsForRange],
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext)
  if (!ctx) throw new Error('useEvents must be used within EventsProvider')
  return ctx
}
