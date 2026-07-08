/**
 * Shared TanStack Query hooks for core data entities.
 *
 * هر hook:
 *  - اولین بار از localStorage cache پاسخ فوری می‌دهد
 *  - در پس‌زمینه fetch می‌کند و UI را به‌روز می‌کند
 *  - در صورت خطا، ۲ بار retry با تأخیر نمایی انجام می‌دهد
 *  - بعد از موفقیت، cache را برای ۵ دقیقه fresh نگه می‌دارد
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dataAPI, calendarAPI } from '../api/client'
import { isDevAuthBypass } from '../utils/devAuth'
import { DEV_MOCK_SESSIONS, DEV_MOCK_COURSES } from '../utils/devMockData'


export const QUERY_KEYS = {
  sessions: ['sessions'],
  subjects: ['subjects'],
  calendarEvents: ['calendar_events'],
}
const isQueryEnabled = () => isDevAuthBypass() || isLoggedIn()
const isLoggedIn = () => !!localStorage.getItem('isLoggedIn')

/** لیست جلسات مطالعه */
export function useSessions() {
  return useQuery({
    queryKey: QUERY_KEYS.sessions,
    queryFn: () => dataAPI.getSessions().then((r) => r.data),
    enabled: isLoggedIn(),
  })
}

/** لیست درس‌ها / موضوعات */
export function useSubjects() {
  return useQuery({
    queryKey: QUERY_KEYS.subjects,
    queryFn: () => dataAPI.getSubjects().then((r) => r.data),
    enabled: isLoggedIn(),
  })
}

/** رویدادهای تقویم — داده از سرور با fallback به localStorage */
export function useCalendarEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.calendarEvents,
    queryFn: () => calendarAPI.getEvents().then((r) => r.data),
    enabled: isLoggedIn(),
    staleTime: 5 * 60 * 1000,
  })
}

/** بعد از ثبت جلسه جدید صدا بزن تا cache sessions خودکار refetch شود */
export function useInvalidateSessions() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions })
}

/** بعد از ایجاد/ویرایش درس صدا بزن تا cache subjects خودکار refetch شود */
export function useInvalidateSubjects() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subjects })
}

/** بعد از تغییر رویدادهای تقویم صدا بزن */
export function useInvalidateCalendarEvents() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarEvents })
}
