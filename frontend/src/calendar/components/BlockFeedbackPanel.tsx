import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planningAPI } from '../../api/client'
import type { CalendarEventRecord } from '../types/calendar'
import { isProposedEvent } from '../lib/eventAppearance'

const STICKERS = [
  { value: 1, emoji: '😫', label: 'خسته', hint: 'سخت گذشت', glow: 'shadow-[0_0_18px_rgba(248,113,113,0.45)]' },
  { value: 2, emoji: '😕', label: 'سخت', hint: 'کمی سنگین', glow: 'shadow-[0_0_18px_rgba(251,146,60,0.4)]' },
  { value: 3, emoji: '😐', label: 'معمولی', hint: 'نه بد نه عالی', glow: 'shadow-[0_0_18px_rgba(250,204,21,0.35)]' },
  { value: 4, emoji: '🙂', label: 'خوب', hint: 'راضی‌ام', glow: 'shadow-[0_0_18px_rgba(74,222,128,0.4)]' },
  { value: 5, emoji: '🤩', label: 'عالی', hint: 'ترکوند!', glow: 'shadow-[0_0_18px_rgba(56,189,248,0.5)]' },
] as const

type Summary = {
  sample_size: number
  efficiency: number
  recent: { client_id: string; rating: number; mood: number }[]
}

type Props = {
  event: CalendarEventRecord
}

export function BlockFeedbackPanel({ event }: Props) {
  const qc = useQueryClient()
  const queryKey = ['block-feedback', 'me']
  const { data } = useQuery<Summary>({
    queryKey,
    queryFn: () => planningAPI.getBlockFeedback().then((r) => r.data),
    enabled: !!localStorage.getItem('isLoggedIn'),
    staleTime: 30_000,
  })

  const existing = data?.recent?.find((item) => item.client_id === event.id)
  const [picked, setPicked] = useState(existing?.rating ?? 0)
  const [done, setDone] = useState(Boolean(existing))

  useEffect(() => {
    if (!existing) return
    setPicked(existing.rating)
    setDone(true)
  }, [existing])

  const submit = useMutation({
    mutationFn: (value: number) =>
      planningAPI
        .submitBlockFeedback({
          client_id: event.id,
          rating: value,
          mood: value,
        })
        .then((r) => r.data),
    onSuccess: (_data, value) => {
      setPicked(value)
      setDone(true)
      qc.invalidateQueries({ queryKey })
    },
  })

  if (event.allDay || isProposedEvent(event) || event.kind === 'immutable') return null

  return (
    <div
      className="mt-3 overflow-hidden rounded-2xl border border-[var(--t-edge-2)] bg-gradient-to-b from-white/5 to-transparent p-3"
      dir="rtl"
    >
      <p className="text-sm font-black text-[var(--t-ink)]">این بلوک چطور بود؟</p>
      <p className="mt-0.5 text-[11px] text-[var(--t-ink-3)]">
        یک استیکر بزن؛ بازدهی‌ات برای برنامهٔ بعدی عوض می‌شود.
      </p>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {STICKERS.map((item) => {
          const active = picked === item.value
          return (
            <button
              key={item.value}
              type="button"
              title={item.hint}
              disabled={submit.isPending}
              onClick={() => submit.mutate(item.value)}
              className={`flex flex-col items-center rounded-2xl border px-1 py-2 transition ${
                active
                  ? `scale-105 border-white/40 bg-white/10 ${item.glow}`
                  : 'border-transparent bg-black/20 opacity-70 hover:opacity-100'
              }`}
            >
              <span className={`text-2xl leading-none ${active ? 'animate-bounce' : ''}`}>
                {item.emoji}
              </span>
              <span className="mt-1 text-[10px] font-bold text-[var(--t-ink)]">{item.label}</span>
            </button>
          )
        })}
      </div>

      {submit.isPending ? (
        <p className="mt-2 text-center text-[11px] text-[var(--t-ink-3)]">در حال ثبت…</p>
      ) : done ? (
        <p className="mt-2 text-center text-[11px] font-semibold text-emerald-300">ثبت شد. دمت گرم ✨</p>
      ) : null}
      {submit.isError ? (
        <p className="mt-2 text-center text-[11px] text-red-400">
          ثبت نشد. فقط مالک بلوک می‌تواند امتیاز بدهد.
        </p>
      ) : null}
    </div>
  )
}
