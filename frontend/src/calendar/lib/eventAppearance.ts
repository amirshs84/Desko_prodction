import type { CSSProperties } from 'react'
import type { CalendarEventRecord } from '../types/calendar'

export const DEFAULT_AWAKE_START = 7 * 60
export const DEFAULT_AWAKE_END = 23 * 60

export const IMMUTABLE_FILL = '#475569'
export const IMMUTABLE_TEXT = '#f1f5f9'

export const PROPOSED_HATCH =
  'repeating-linear-gradient(-52deg, rgba(255,255,255,0.28) 0 5px, rgba(15,23,42,0.12) 5px 10px)'

export const INACTIVE_HATCH =
  'repeating-linear-gradient(-45deg, rgba(148,163,184,0.16) 0 7px, rgba(15,23,42,0.42) 7px 14px)'

export function isProposedEvent(event?: CalendarEventRecord | null): boolean {
  return Boolean(event?.proposed) || Boolean(event?.id?.startsWith('proposal:'))
}

export function isOutsideAwake(
  startMinutes: number,
  awakeStart: number,
  awakeEnd: number,
  endMinutes?: number,
): boolean {
  if (startMinutes < awakeStart || startMinutes >= awakeEnd) return true
  if (endMinutes != null && endMinutes > awakeEnd) return true
  return false
}

export function eventBlockStyle(event: CalendarEventRecord): CSSProperties {
  if (event.kind === 'immutable') {
    return {
      background: IMMUTABLE_FILL,
      color: IMMUTABLE_TEXT,
      opacity: 1,
    }
  }
  if (isProposedEvent(event)) {
    return {
      background: event.color,
      color: '#0b1220',
      opacity: 0.82,
      backgroundImage: PROPOSED_HATCH,
    }
  }
  return {
    background: event.color,
    color: '#081016',
    opacity: 1,
  }
}
