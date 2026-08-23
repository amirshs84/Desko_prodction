import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import BottomNav from '../components/BottomNav'
import { examAPI } from '../api/client'
import { toFaDigits } from '../lib/persianDigits'

function fa(n: number | string) {
  return toFaDigits(String(n))
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ExamResults() {
  const { attemptId } = useParams()
  if (!attemptId) return <ResultsList />
  return <ResultDetail attemptId={attemptId} />
}

function ResultsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'exam-sessions'],
    queryFn: () => examAPI.getMySessions().then((r) => r.data),
  })
  const finished = (data?.items || []).filter(
    (item: { attempt_id?: string; attempt_status?: string }) =>
      item.attempt_id && item.attempt_status === 'FINISHED',
  )

  return (
    <div className="min-h-dvh bg-page text-ink" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-28 space-y-4">
        <h1 className="text-2xl font-black">کارنامه‌ها</h1>
        {isLoading && <p className="text-sm text-ink-3">در حال بارگذاری…</p>}
        {!isLoading && !finished.length && (
          <div className="rounded-3xl bg-panel p-5 text-sm text-ink-3">
            هنوز کارنامه آماده‌ای ندارید. پس از پایان جلسه و تصحیح، اینجا ظاهر می‌شود.
          </div>
        )}
        {finished.map((item: { id: number; attempt_id: string; title: string; exam_title: string; end_time: string }) => (
          <Link
            key={item.attempt_id}
            to={`/exam-results/${item.attempt_id}`}
            className="block rounded-3xl bg-panel p-4"
          >
            <p className="font-bold">{item.title}</p>
            <p className="text-xs text-ink-3 mt-1">{item.exam_title} · {formatWhen(item.end_time)}</p>
          </Link>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}

function ResultDetail({ attemptId }: { attemptId: string }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['student', 'attempt-result', attemptId],
    queryFn: () => examAPI.getAttemptResult(attemptId).then((r) => r.data),
  })

  const answers = data?.result?.answers || []
  const stats = data?.stats || { correct: 0, wrong: 0, blank: 0 }
  const percent = data?.percent
  const score = data?.result?.score
  const maxScore = data?.result?.max_score
  const minScore = data?.result?.min_score

  const ring = useMemo(() => {
    const p = Math.max(0, Math.min(100, Number(percent || 0)))
    const r = 54
    const circ = 2 * Math.PI * r
    return { p, circ, offset: circ - (p / 100) * circ }
  }, [percent])

  return (
    <div className="min-h-dvh bg-page text-ink" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-28 space-y-5">
        <button type="button" onClick={() => navigate('/exams')} className="text-sm text-emerald-400">
          بازگشت به آزمون‌ها
        </button>
        {isLoading && <p className="text-sm text-ink-3">در حال دریافت کارنامه…</p>}
        {isError && (
          <div className="rounded-3xl bg-panel p-5 text-sm text-rose-400">
            {(error as { response?: { data?: { code?: string; error?: string } } })?.response?.data?.error
              || (error as { response?: { data?: { code?: string } } })?.response?.data?.code
              || 'کارنامه هنوز آماده نیست. پس از پایان زمان جلسه دوباره تلاش کنید.'}
          </div>
        )}
        {data && (
          <>
            <div className="rounded-3xl p-5 bg-panel flex items-center gap-5">
              <svg width="140" height="140" className="flex-shrink-0">
                <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="10"
                  strokeDasharray={ring.circ}
                  strokeDashoffset={ring.offset}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                />
                <text x="70" y="76" textAnchor="middle" fill="white" fontSize="22" fontWeight="800">
                  {percent != null ? `${fa(percent)}٪` : '—'}
                </text>
              </svg>
              <div className="min-w-0">
                <h1 className="text-xl font-black">{data.session?.title || 'کارنامه آزمون'}</h1>
                <p className="text-sm text-ink-3 mt-1">{data.session?.exam_title}</p>
                <p className="text-sm mt-3">
                  نمره {fa(score ?? '—')} از {fa(maxScore ?? '—')}
                  {minScore != null ? ` · کف ${fa(minScore)}` : ''}
                </p>
                {data.rank != null && (
                  <p className="text-sm text-emerald-400 mt-1">رتبه {fa(data.rank)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat label="صحیح" value={stats.correct} color="#34d399" />
              <Stat label="غلط" value={stats.wrong} color="#f87171" />
              <Stat label="نزده" value={stats.blank} color="#94a3b8" />
            </div>

            <section>
              <h2 className="font-bold mb-3">مرور سوال‌ها</h2>
              <div className="space-y-2">
                {answers.map((answer: {
                  exam_session_problem_id: string
                  response_data?: { selected_option_id?: number | null }
                  correct_option_id: number
                  score: number
                }, index: number) => {
                  const selected = answer.response_data?.selected_option_id
                  const ok = selected === answer.correct_option_id
                  const blank = selected == null
                  return (
                    <div key={answer.exam_session_problem_id} className="rounded-2xl bg-panel px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-bold">سوال {fa(index + 1)}</span>
                      <span className="text-xs text-ink-3">
                        پاسخ شما: {selected == null ? 'نزده' : fa(selected)} · صحیح: {fa(answer.correct_option_id)}
                      </span>
                      <span className="text-sm font-black" style={{ color: blank ? '#94a3b8' : ok ? '#34d399' : '#f87171' }}>
                        {fa(answer.score)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-panel p-4 text-center">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="text-2xl font-black mt-1" style={{ color }}>{fa(value)}</p>
    </div>
  )
}
