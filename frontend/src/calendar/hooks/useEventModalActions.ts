import { useEvents } from '../context/EventsContext'
import type {
  CalendarEventRecord,
  EventEditScope,
  EventRepeatScope,
} from '../types/calendar'
import type { JalaliDate } from '../lib/jalaliUtils'

export type EventSavePayload = {
  date: JalaliDate
  title: string
  description: string
  allDay: boolean
  startMinutes: number
  endMinutes: number
  color: string
  repeat: EventRepeatScope
}

export function useEventModalActions(
  editing: CalendarEventRecord | null,
  onDone: () => void,
) {
  const { addEvent, updateEvent, removeEvent, countInGroup } = useEvents()

  const groupSize = editing?.groupId ? countInGroup(editing.groupId) : 1
  const hasGroup = groupSize > 1

  const onSave = (p: EventSavePayload, scope: EventEditScope = 'single') => {
    if (editing?.kind === 'immutable' || editing?.proposed) {
      alert(editing.proposed ? 'این بلوک پیشنهادی است؛ از تأیید یا رد استفاده کنید.' : 'این رویداد ثابت مدرسه است و قابل ویرایش نیست.')
      return
    }
    if (editing) {
      const patch = {
        title: p.title,
        description: p.description,
        startMinutes: p.startMinutes,
        endMinutes: p.endMinutes,
        allDay: p.allDay,
        color: p.color,
        ...(scope === 'single'
          ? { jy: p.date.jy, jm: p.date.jm, jd: p.date.jd }
          : {}),
      }
      updateEvent(editing.id, patch, scope)
    } else {
      addEvent({
        date: p.date,
        title: p.title,
        description: p.description,
        startMinutes: p.startMinutes,
        endMinutes: p.endMinutes,
        allDay: p.allDay,
        color: p.color,
        repeat: p.repeat,
      })
    }
    onDone()
  }

  const onDelete = (scope: EventEditScope = 'single') => {
    if (!editing) return
    if (editing.kind === 'immutable' || editing.proposed) {
      alert(editing.proposed ? 'این بلوک پیشنهادی است؛ از دکمه رد استفاده کنید.' : 'این رویداد ثابت مدرسه است و قابل حذف نیست.')
      return
    }
    removeEvent(editing.id, scope)
    onDone()
  }

  return { groupSize, hasGroup, onSave, onDelete }
}
