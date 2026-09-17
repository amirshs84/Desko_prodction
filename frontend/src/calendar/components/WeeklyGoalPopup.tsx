import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planningAPI } from '../../api/client'

type ProposalNotice = {
  id: number
  goal_message?: string
  notice_seen_at?: string | null
  status: string
  created_at?: string | null
}

type Props = {
  enabled?: boolean
}

export function WeeklyGoalPopup({ enabled = true }: Props) {
  const qc = useQueryClient()
  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('isLoggedIn')

  const { data: proposals = [] } = useQuery<ProposalNotice[]>({
    queryKey: ['my-proposals'],
    queryFn: () => planningAPI.getMyProposals().then((r) => r.data),
    enabled: enabled && loggedIn,
    staleTime: 30_000,
  })

  const unseen = proposals.find((item) => !item.notice_seen_at)
  const message =
    unseen?.goal_message?.trim() ||
    'برنامهٔ جدید این هفته منتشر شد. آماده‌ای؟'

  const ack = useMutation({
    mutationFn: () => planningAPI.ackProposalNotice(unseen!.id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-proposals'] })
    },
  })

  if (!enabled || !unseen) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
      dir="rtl"
      role="dialog"
      aria-labelledby="weekly-goal-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/30 bg-[var(--t-card)] shadow-[0_0_80px_rgba(16,185,129,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-400/25 via-sky-500/10 to-transparent" />
        <div className="relative px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400/15 text-3xl">
            🎯
          </div>
          <p className="text-xs font-bold tracking-wide text-emerald-300">هدف این هفته</p>
          <h2 id="weekly-goal-title" className="mt-2 text-xl font-black leading-snug text-[var(--t-ink)]">
            {message}
          </h2>
          <p className="mt-3 text-sm text-[var(--t-ink-3)]">
            برنامه را در تقویم ببین، بلوک‌های پیشنهادی را تأیید کن و با قدرت شروع کن.
          </p>
          <button
            type="button"
            disabled={ack.isPending}
            onClick={() => ack.mutate()}
            className="mt-6 min-h-[48px] w-full rounded-2xl bg-gradient-to-l from-emerald-400 to-sky-400 text-base font-black text-black shadow-lg disabled:opacity-60"
          >
            {ack.isPending ? '…' : 'آماده‌ام!'}
          </button>
        </div>
      </div>
    </div>
  )
}
