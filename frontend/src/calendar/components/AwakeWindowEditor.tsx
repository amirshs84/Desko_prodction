import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planningAPI } from '../../api/client'
import { toFaDigits } from '../lib/persianDigits'

type WindowPayload = {
  start_minutes: number
  end_minutes: number
  label: string
  capacity_minutes: number
  is_default: boolean
  min_duration_minutes: number
  default_start_minutes: number
  default_end_minutes: number
}

type Props = {
  open: boolean
  onClose: () => void
  /** اگر ست شود، بازهٔ دانش‌آموز دیگری خوانده می‌شود (مشاور — فقط مشاهده). */
  userId?: string | number | null
  canEdit?: boolean
}

const HOURS = Array.from({ length: 25 }, (_, i) => i)
const MINS = [0, 15, 30, 45]
const QUERY_KEY = ['awake-window']

function splitMinutes(total: number): { h: number; m: number } {
  const clamped = Math.max(0, Math.min(1440, total))
  if (clamped === 1440) return { h: 24, m: 0 }
  return { h: Math.floor(clamped / 60), m: clamped % 60 }
}

function joinMinutes(h: number, m: number): number {
  return Math.max(0, Math.min(1440, h * 60 + m))
}

function clockLabel(minutes: number): string {
  const { h, m } = splitMinutes(minutes)
  return toFaDigits(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
}

export function AwakeWindowEditor({ open, onClose, userId, canEdit = true }: Props) {
  const qc = useQueryClient()
  const params = userId != null && userId !== '' && userId !== 'me' ? { user: userId } : undefined
  const queryKey = [...QUERY_KEY, params?.user ?? 'me']
  const editable = canEdit && !params

  const { data, isLoading } = useQuery<WindowPayload>({
    queryKey,
    queryFn: () => planningAPI.getAwakeWindow(params).then((r) => r.data),
    enabled: open && !!localStorage.getItem('isLoggedIn'),
  })

  const [sh, setSh] = useState(7)
  const [sm, setSm] = useState(0)
  const [eh, setEh] = useState(23)
  const [em, setEm] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    const start = splitMinutes(data.start_minutes)
    const end = splitMinutes(data.end_minutes)
    setSh(start.h)
    setSm(start.m)
    setEh(end.h)
    setEm(end.m)
    setError('')
    setSaved(false)
  }, [data, open])

  const save = useMutation({
    mutationFn: () =>
      planningAPI.updateAwakeWindow({
        start_minutes: joinMinutes(sh, sm),
        end_minutes: joinMinutes(eh, em),
      }).then((r) => r.data as WindowPayload),
    onSuccess: (payload) => {
      qc.setQueryData(queryKey, payload)
      setSaved(true)
      setError('')
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      setError(err?.response?.data?.error?.message || 'ذخیره نشد.')
    },
  })

  const reset = useMutation({
    mutationFn: () => planningAPI.resetAwakeWindow().then((r) => r.data as WindowPayload),
    onSuccess: (payload) => {
      qc.setQueryData(queryKey, payload)
      setSaved(true)
      setError('')
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      setError(err?.response?.data?.error?.message || 'بازنشانی نشد.')
    },
  })

  if (!open) return null

  const startMinutes = joinMinutes(sh, sm)
  const endMinutes = joinMinutes(eh, em)
  const hours = Math.max(0, (endMinutes - startMinutes) / 60)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] p-4 shadow-xl sm:rounded-2xl"
        onPointerDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="بازه فعال"
        dir="rtl"
      >
        <h2 className="text-base font-bold text-[var(--t-ink)]">بازه فعال روزانه</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--t-ink-3)]">
          موتور برنامه‌ریزی فقط داخل همین بازه بلوک می‌گذارد. پیش‌فرض ۷ تا ۲۳ است.
          {!editable ? ' مشاهدهٔ بازهٔ این دانش‌آموز — ویرایش فقط برای خودش است.' : null}
        </p>

        {isLoading ? (
          <p className="mt-4 text-sm text-[var(--t-ink-3)]">در حال بارگذاری…</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <TimeField label="شروع" h={sh} m={sm} setH={setSh} setM={setSm} disabled={!editable} />
            <TimeField label="پایان" h={eh} m={em} setH={setEh} setM={setEm} disabled={!editable} />
          </div>
        )}

        <p className="mt-3 text-xs text-[var(--t-ink-2)]">
          طول بازه: {toFaDigits(hours.toFixed(hours % 1 ? 2 : 0))} ساعت
          {data?.is_default ? ' · پیش‌فرض سیستم' : ''}
        </p>

        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
        {saved ? (
          <p className="mt-2 text-xs text-emerald-400">ذخیره شد. اجرای بعدی برنامه این بازه را رعایت می‌کند.</p>
        ) : null}

        <div className="mt-4 flex flex-row-reverse gap-2">
          {editable ? (
            <>
              <button
                type="button"
                className="min-h-[44px] flex-1 rounded-xl bg-[var(--t-brand-2)] text-sm font-semibold text-black disabled:opacity-50"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? '…' : 'ذخیره'}
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-xl px-3 text-sm text-[var(--t-ink-2)]"
                disabled={reset.isPending}
                onClick={() => reset.mutate()}
              >
                پیش‌فرض
              </button>
            </>
          ) : (
            <p className="flex-1 text-xs text-[var(--t-ink-3)]">
              الان {clockLabel(startMinutes)} تا {clockLabel(endMinutes)}
            </p>
          )}
          <button
            type="button"
            className="min-h-[44px] rounded-xl px-4 text-sm text-[var(--t-ink-2)]"
            onClick={onClose}
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  )
}

function TimeField({
  label,
  h,
  m,
  setH,
  setM,
  disabled,
}: {
  label: string
  h: number
  m: number
  setH: (n: number) => void
  setM: (n: number) => void
  disabled: boolean
}) {
  return (
    <label className="text-xs text-[var(--t-ink-3)]">
      {label}
      <div dir="ltr" className="mt-1 flex gap-2">
        <select
          value={h}
          disabled={disabled}
          onChange={(e) => setH(Number(e.target.value))}
          className="min-h-[40px] flex-1 rounded-md border border-[var(--t-edge-2)] bg-[var(--t-panel)] px-1 text-sm text-[var(--t-ink)] disabled:opacity-60"
        >
          {HOURS.map((x) => (
            <option key={x} value={x}>
              {toFaDigits(String(x).padStart(2, '0'))}
            </option>
          ))}
        </select>
        <select
          value={m}
          disabled={disabled}
          onChange={(e) => setM(Number(e.target.value))}
          className="min-h-[40px] flex-1 rounded-md border border-[var(--t-edge-2)] bg-[var(--t-panel)] px-1 text-sm text-[var(--t-ink)] disabled:opacity-60"
        >
          {MINS.map((x) => (
            <option key={x} value={x}>
              {toFaDigits(String(x).padStart(2, '0'))}
            </option>
          ))}
        </select>
      </div>
    </label>
  )
}
