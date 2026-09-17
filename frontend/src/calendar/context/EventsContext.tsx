import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import {
  DEFAULT_AWAKE_END,
  DEFAULT_AWAKE_START,
  isOutsideAwake as isOutsideAwakeRange,
  isProposedEvent,
} from '../lib/eventAppearance'
import { calendarAPI, planningAPI } from '../../api/client'

function formatJalaliDate(d: JalaliDate): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.jy}-${pad(d.jm)}-${pad(d.jd)}`
}

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
  priority?: number
  movability?: number
  subject_tags?: string[]
  cognitive_load?: number
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
    priority: e.priority,
    movability: e.movability,
    subjectTags: e.subject_tags,
    cognitiveLoad: e.cognitive_load,
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

type ServerProposalBlock = {
  jy: number
  jm: number
  jd: number
  subject: string
  start_minutes: number
  end_minutes: number
  color?: string
}

type ServerProposal = {
  id: number
  status: string
  consultant_id?: number
  block_decisions?: string[]
  blocks: ServerProposalBlock[]
}

type UndoEntry = {
  label: string
  apply: () => Promise<void> | void
}

function overlayFromProposals(list: ServerProposal[]): CalendarEventRecord[] {
  const out: CalendarEventRecord[] = []
  for (const proposal of list) {
    if (proposal.status !== 'pending') continue
    const decisions = proposal.block_decisions ?? []
    proposal.blocks.forEach((block, index) => {
      const decision = decisions[index] ?? 'pending'
      if (decision !== 'pending') return
      out.push({
        id: `proposal:${proposal.id}:${index}`,
        jy: block.jy,
        jm: block.jm,
        jd: block.jd,
        title: block.subject,
        description: 'پیشنهاد مشاور — هنوز قطعی نشده',
        startMinutes: block.start_minutes,
        endMinutes: block.end_minutes,
        color: block.color || '#38bdf8',
        allDay: false,
        createdAt: new Date().toISOString(),
        kind: 'mutable',
        origin: 'plan_proposal',
        proposed: true,
        proposalId: proposal.id,
        blockIndex: index,
        consultantId: proposal.consultant_id,
      })
    })
  }
  return out
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
  /** تقویم خود دانش‌آموز است، نه نمای مشاور از تقویم دیگری. */
  isOwnCalendar: boolean
  ownerUserId: string
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
  /**
   * جابه‌جایی زمانی/روزانه با API snap.
   * اگر جای هدف شلوغ باشد سرور نزدیک‌ترین اسلات آزاد را می‌دهد.
   */
  moveEvent: (
    id: string,
    target: { date: JalaliDate; startMinutes: number },
  ) => Promise<{ snapped: boolean }>
  /** گذاشتن بلوک آماده روی تقویم (با snap) */
  placeTimedBlock: (input: {
    date: JalaliDate
    startMinutes: number
    templateKey?: string
    title?: string
    durationMinutes?: number
    color?: string
  }) => Promise<{ snapped: boolean }>
  removeEvent: (id: string, scope?: EventEditScope) => void
  countInGroup: (groupId: string) => number
  eventsForDay: (d: JalaliDate) => CalendarEventRecord[]
  eventsForRange: (start: JalaliDate, days: number) => CalendarEventRecord[]
  awakeStartMinutes: number
  awakeEndMinutes: number
  isOutsideAwake: (startMinutes: number, endMinutes?: number) => boolean
  canUndo: boolean
  undoLabel: string | null
  undo: () => Promise<void>
  respondProposed: (id: string, accept: boolean, reason?: string) => Promise<void>
}

const EventsContext = createContext<EventsContextValue | null>(null)

export function EventsProvider({
  children,
  ownerUserId,
  draftSeed,
  onDraftEventsChange,
  previewMode = false,
}: {
  children: ReactNode
  /** اگر ست شود، رویدادهای همان کاربر با `?user=` بارگذاری می‌شود (پنل مشاور). */
  ownerUserId?: number | string | null
  /** بلوک‌های پیشنهادی برنامه‌ریزی گروهی که فقط محلی ویرایش می‌شوند. */
  draftSeed?: CalendarEventRecord[] | null
  onDraftEventsChange?: (drafts: CalendarEventRecord[]) => void
  /** در حالت پیش‌نمایش، جابه‌جایی/حذف پیش‌نویس‌ها بدون API است. */
  previewMode?: boolean
}) {
  const queryClient = useQueryClient()
  const ownerKey = ownerUserId != null && ownerUserId !== '' ? String(ownerUserId) : 'me'
  const queryKey = useMemo(() => [...EVENTS_QUERY_KEY, ownerKey], [ownerKey])
  const apiParams = useMemo(
    () => (ownerKey === 'me' ? undefined : { user: ownerKey }),
    [ownerKey],
  )
  const persistLocal = ownerKey === 'me'

  const { data: serverEvents = persistLocal ? loadInitial() : [] } = useQuery<CalendarEventRecord[]>({
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

  const { data: awakeWindow } = useQuery<{ start_minutes: number; end_minutes: number }>({
    queryKey: ['awake-window', ownerKey],
    queryFn: () => planningAPI.getAwakeWindow(apiParams).then((r) => r.data),
    enabled: isLoggedIn(),
    staleTime: 5 * 60 * 1000,
  })
  const awakeStartMinutes = awakeWindow?.start_minutes ?? DEFAULT_AWAKE_START
  const awakeEndMinutes = awakeWindow?.end_minutes ?? DEFAULT_AWAKE_END

  const { data: pendingProposals = [] } = useQuery<ServerProposal[]>({
    queryKey: ['my-proposals', 'pending-overlay'],
    queryFn: () => planningAPI.getMyProposals({ pending: true }).then((r) => r.data),
    enabled: isLoggedIn() && persistLocal && !previewMode,
    staleTime: 15_000,
  })
  const proposedOverlay = useMemo(
    () => (persistLocal && !previewMode ? overlayFromProposals(pendingProposals) : []),
    [persistLocal, previewMode, pendingProposals],
  )

  const skipUndoRef = useRef(false)
  const undoStackRef = useRef<UndoEntry[]>([])
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])
  const recordUndo = useCallback((label: string, apply: UndoEntry['apply']) => {
    if (skipUndoRef.current) return
    const next = [...undoStackRef.current.slice(-39), { label, apply }]
    undoStackRef.current = next
    setUndoStack(next)
  }, [])
  const undo = useCallback(async () => {
    const stack = undoStackRef.current
    if (stack.length === 0) return
    const entry = stack[stack.length - 1]!
    undoStackRef.current = stack.slice(0, -1)
    setUndoStack(undoStackRef.current)
    skipUndoRef.current = true
    try {
      await entry.apply()
    } finally {
      skipUndoRef.current = false
    }
  }, [])

  const [draftEvents, setDraftEvents] = useState<CalendarEventRecord[]>(draftSeed ?? [])
  useEffect(() => {
    setDraftEvents(draftSeed ?? [])
  }, [draftSeed])

  useEffect(() => {
    onDraftEventsChange?.(draftEvents)
  }, [draftEvents, onDraftEventsChange])

  const events = useMemo(
    () =>
      previewMode
        ? [...serverEvents, ...draftEvents]
        : [...serverEvents, ...proposedOverlay],
    [previewMode, serverEvents, draftEvents, proposedOverlay],
  )

  const isDraftEvent = useCallback(
    (id: string) =>
      previewMode &&
      (id.startsWith('draft:') || draftEvents.some((d) => d.id === id)),
    [previewMode, draftEvents],
  )

  const isOutsideAwake = useCallback(
    (startMinutes: number, endMinutes?: number) =>
      isOutsideAwakeRange(startMinutes, awakeStartMinutes, awakeEndMinutes, endMinutes),
    [awakeStartMinutes, awakeEndMinutes],
  )

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

  const mutateDraft = useCallback(
    (updater: (prev: CalendarEventRecord[]) => CalendarEventRecord[]) => {
      setDraftEvents((prev) => updater(prev))
    },
    [],
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
      recordUndo(
        newRecs.length > 1 ? `افزودن ${newRecs.length} رویداد` : 'افزودن رویداد',
        () => {
          const ids = new Set(newRecs.map((item) => item.id))
          mutate((prev) => prev.filter((e) => !ids.has(e.id)))
          if (isLoggedIn()) {
            newRecs.forEach((item) => {
              calendarAPI.deleteEvent(item.id, apiParams).catch(() => undefined)
            })
          }
        },
      )

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
    [mutate, apiParams, recordUndo],
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
      recordUndo(`افزودن ${newRecs.length} رویداد`, () => {
        const ids = new Set(newRecs.map((item) => item.id))
        mutate((prev) => prev.filter((e) => !ids.has(e.id)))
        if (isLoggedIn()) {
          newRecs.forEach((item) => {
            calendarAPI.deleteEvent(item.id, apiParams).catch(() => undefined)
          })
        }
      })

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
    [mutate, queryClient, queryKey, apiParams, persistLocal, recordUndo],
  )

  const updateEvent = useCallback<EventsContextValue['updateEvent']>(
    (id, patch, scope = 'single') => {
      if (isDraftEvent(id)) {
        const before = draftEvents.find((e) => e.id === id)
        mutateDraft((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
        if (before) {
          recordUndo('ویرایش پیش‌نویس', () => {
            mutateDraft((prev) => prev.map((e) => (e.id === id ? before : e)))
          })
        }
        return
      }
      if (isProposedEvent({ id } as CalendarEventRecord)) {
        alert('این بلوک پیشنهادی است؛ اول تأیید یا رد کنید.')
        return
      }
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
        recordUndo('ویرایش گروه رویداد', () => {
          if (backup) {
            queryClient.setQueryData(queryKey, backup)
            if (persistLocal) persist(backup)
          }
          if (isLoggedIn() && backup) {
            calendarAPI.updateGroup(gid, groupPatchToServer({
              title: current.title,
              description: current.description,
              startMinutes: current.startMinutes,
              endMinutes: current.endMinutes,
              color: current.color,
              allDay: current.allDay,
            }), apiParams).catch(() => undefined)
          }
        })
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
      if (backup && current) {
        recordUndo('ویرایش رویداد', () => {
          queryClient.setQueryData(queryKey, backup)
          if (persistLocal) persist(backup)
          if (isLoggedIn()) {
            calendarAPI.updateEvent(id, patchToServer(current), apiParams).catch(() => undefined)
          }
        })
      }
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
    [mutate, queryClient, countInGroup, queryKey, apiParams, persistLocal, isDraftEvent, mutateDraft, recordUndo, draftEvents],
  )

  const removeEvent = useCallback<EventsContextValue['removeEvent']>(
    (id, scope = 'single') => {
      if (isDraftEvent(id)) {
        const removed = draftEvents.find((e) => e.id === id)
        mutateDraft((prev) => prev.filter((e) => e.id !== id))
        if (removed) {
          recordUndo('حذف پیش‌نویس', () => {
            mutateDraft((prev) => [...prev, removed])
          })
        }
        return
      }
      if (isProposedEvent({ id } as CalendarEventRecord)) {
        alert('این بلوک پیشنهادی است؛ از دکمه رد استفاده کنید.')
        return
      }
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
        recordUndo('حذف گروه رویداد', () => {
          if (!backup) return
          queryClient.setQueryData(queryKey, backup)
          if (persistLocal) persist(backup)
        })
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
      if (target) {
        recordUndo('حذف رویداد', () => {
          mutate((prev) => (prev.some((e) => e.id === target.id) ? prev : [...prev, target]))
          if (isLoggedIn()) {
            calendarAPI.createEvents([toServer(target)], apiParams).catch(() => undefined)
          }
        })
      }
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
    [mutate, queryClient, countInGroup, queryKey, apiParams, persistLocal, isDraftEvent, mutateDraft, recordUndo, draftEvents],
  )

  const moveEvent = useCallback<EventsContextValue['moveEvent']>(
    async (id, target) => {
      const draftCurrent = draftEvents.find((e) => e.id === id)
      const backup = queryClient.getQueryData<CalendarEventRecord[]>(queryKey)
      const current = draftCurrent ?? backup?.find((e) => e.id === id)
      if (!current) return { snapped: false }
      if (isImmutable(current)) {
        alert('این رویداد ثابت مدرسه است و قابل جابه‌جایی نیست.')
        return { snapped: false }
      }
      if (isProposedEvent(current)) {
        alert('بلوک پیشنهادی را نمی‌شود جابه‌جا کرد؛ اول تأیید یا رد کنید.')
        return { snapped: false }
      }

      const duration = Math.max(15, current.endMinutes - current.startMinutes)
      const nextStart = Math.max(0, Math.min(24 * 60 - 15, target.startMinutes))
      const optimistic: CalendarEventRecord = {
        ...current,
        jy: target.date.jy,
        jm: target.date.jm,
        jd: target.date.jd,
        startMinutes: nextStart,
        endMinutes: Math.min(24 * 60, nextStart + duration),
      }

      const unchanged =
        current.jy === optimistic.jy &&
        current.jm === optimistic.jm &&
        current.jd === optimistic.jd &&
        current.startMinutes === optimistic.startMinutes
      if (unchanged) return { snapped: false }

      if (isDraftEvent(id)) {
        mutateDraft((prev) => prev.map((e) => (e.id === id ? optimistic : e)))
        recordUndo('جابه‌جایی پیش‌نویس', () => {
          mutateDraft((prev) => prev.map((e) => (e.id === id ? current : e)))
        })
        return { snapped: false }
      }

      mutate((prev) => prev.map((e) => (e.id === id ? optimistic : e)))
      recordUndo('جابه‌جایی رویداد', async () => {
        mutate((prev) => prev.map((e) => (e.id === id ? current : e)))
        if (isLoggedIn()) {
          await planningAPI
            .moveBlock(
              id,
              {
                date: formatJalaliDate({ jy: current.jy, jm: current.jm, jd: current.jd }),
                start_minutes: current.startMinutes,
                snap: true,
                expected_version: current.version,
              },
              apiParams,
            )
            .catch(() => undefined)
        }
      })

      if (!isLoggedIn()) return { snapped: false }

      try {
        const res = await planningAPI.moveBlock(
          id,
          {
            date: formatJalaliDate(target.date),
            start_minutes: nextStart,
            snap: true,
            expected_version: current.version,
          },
          apiParams,
        )
        const payload = res.data as { event: ServerEvent; snapped?: boolean }
        const serverEv = fromServer(payload.event)
        mutate((prev) => prev.map((e) => (e.id === id ? serverEv : e)))
        return { snapped: !!payload.snapped }
      } catch (err: unknown) {
        if (backup) {
          queryClient.setQueryData(queryKey, backup)
          if (persistLocal) persist(backup)
        }
        const code = (err as { response?: { data?: { error?: { code?: string; message?: string } } } })
          ?.response?.data?.error?.code
        const message = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message
        if (code === 'IMMUTABLE_EVENT_VIOLATION') {
          alert('این رویداد ثابت مدرسه است و قابل جابه‌جایی نیست.')
        } else if (code === 'DAILY_CAPACITY_FULL') {
          alert('ظرفیت بیداری آن روز (۰۶–۲۳) پر است.')
        } else {
          alert(message || 'جابه‌جایی انجام نشد.')
        }
        return { snapped: false }
      }
    },
    [mutate, queryClient, queryKey, apiParams, persistLocal, draftEvents, isDraftEvent, mutateDraft, recordUndo],
  )

  const placeTimedBlock = useCallback<EventsContextValue['placeTimedBlock']>(
    async (input) => {
      if (previewMode) {
        const duration = Math.max(15, input.durationMinutes || 90)
        const start = Math.max(0, input.startMinutes)
        const draft: CalendarEventRecord = {
          id: `draft:${generateEventId()}`,
          jy: input.date.jy,
          jm: input.date.jm,
          jd: input.date.jd,
          title: input.title?.trim() || 'بلوک پیشنهادی',
          description: 'پیش‌نویس برنامه‌ریزی گروهی',
          startMinutes: start,
          endMinutes: Math.min(24 * 60, start + duration),
          color: input.color || '#10b981',
          allDay: false,
          createdAt: new Date().toISOString(),
          origin: 'plan_preview',
          kind: 'mutable',
        }
        mutateDraft((prev) => [...prev, draft])
        recordUndo('گذاشتن پیش‌نویس', () => {
          mutateDraft((prev) => prev.filter((e) => e.id !== draft.id))
        })
        return { snapped: false }
      }
      if (!isLoggedIn()) {
        alert('برای گذاشتن بلوک باید وارد شوید.')
        return { snapped: false }
      }
      try {
        const body: Record<string, unknown> = {
          date: formatJalaliDate(input.date),
          start_minutes: input.startMinutes,
          snap: true,
        }
        if (input.templateKey) body.template = input.templateKey
        if (input.title) body.title = input.title
        if (input.durationMinutes) body.duration_minutes = input.durationMinutes
        if (input.color) body.color = input.color

        const res = await planningAPI.placeBlock(body, apiParams)
        const payload = res.data as { event: ServerEvent; snapped?: boolean }
        const serverEv = fromServer(payload.event)
        mutate((prev) => {
          if (prev.some((e) => e.id === serverEv.id)) {
            return prev.map((e) => (e.id === serverEv.id ? serverEv : e))
          }
          return [...prev, serverEv]
        })
        recordUndo('گذاشتن بلوک', () => {
          mutate((prev) => prev.filter((e) => e.id !== serverEv.id))
          calendarAPI.deleteEvent(serverEv.id, apiParams).catch(() => undefined)
        })
        return { snapped: !!payload.snapped }
      } catch (err: unknown) {
        const code = (err as { response?: { data?: { error?: { code?: string; message?: string } } } })
          ?.response?.data?.error?.code
        const message = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message
        if (code === 'DAILY_CAPACITY_FULL') {
          alert('ظرفیت بیداری آن روز (۰۶–۲۳) پر است.')
        } else {
          alert(message || 'گذاشتن بلوک انجام نشد.')
        }
        return { snapped: false }
      }
    },
    [apiParams, mutate, previewMode, mutateDraft, recordUndo],
  )

  const respondProposed = useCallback<EventsContextValue['respondProposed']>(
    async (id, accept, reason) => {
      const event = events.find((item) => item.id === id)
      if (!event || !isProposedEvent(event) || event.proposalId == null || event.blockIndex == null) {
        return
      }
      try {
        const res = await planningAPI.respondProposalBlock(event.proposalId, {
          block_index: event.blockIndex,
          accept,
          reason: reason || '',
        })
        const payload = res.data as { event?: ServerEvent; status?: string }
        queryClient.setQueryData<ServerProposal[]>(['my-proposals', 'pending-overlay'], (prev = []) =>
          prev.map((item) => {
            if (item.id !== event.proposalId) return item
            const decisions = [...(item.block_decisions ?? item.blocks.map(() => 'pending'))]
            decisions[event.blockIndex!] = accept ? 'accepted' : 'rejected'
            const stillPending = decisions.some((d) => d === 'pending')
            return {
              ...item,
              block_decisions: decisions,
              status: stillPending ? 'pending' : payload.status || (accept ? 'accepted' : 'rejected'),
            }
          }),
        )
        await queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
        if (accept && payload.event) {
          const serverEv = fromServer(payload.event)
          mutate((prev) => {
            if (prev.some((item) => item.id === serverEv.id)) {
              return prev.map((item) => (item.id === serverEv.id ? serverEv : item))
            }
            return [...prev, serverEv]
          })
        }
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message
        alert(message || 'پاسخ به پیشنهاد انجام نشد.')
      }
    },
    [events, mutate, queryClient],
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
      isOwnCalendar: persistLocal,
      ownerUserId: ownerKey,
      addEvent,
      addEventsBatch,
      updateEvent,
      moveEvent,
      placeTimedBlock,
      removeEvent,
      countInGroup,
      eventsForDay,
      eventsForRange,
      awakeStartMinutes,
      awakeEndMinutes,
      isOutsideAwake,
      canUndo: undoStack.length > 0,
      undoLabel: undoStack.at(-1)?.label ?? null,
      undo,
      respondProposed,
    }),
    [
      events,
      persistLocal,
      ownerKey,
      addEvent,
      addEventsBatch,
      updateEvent,
      moveEvent,
      placeTimedBlock,
      removeEvent,
      countInGroup,
      eventsForDay,
      eventsForRange,
      awakeStartMinutes,
      awakeEndMinutes,
      isOutsideAwake,
      undoStack,
      undo,
      respondProposed,
    ],
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext)
  if (!ctx) throw new Error('useEvents must be used within EventsProvider')
  return ctx
}
