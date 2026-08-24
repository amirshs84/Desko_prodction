import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examAPI } from '../api/client';
import ExamBooklet from '../components/ExamBooklet';
import { toFaDigits } from '../lib/persianDigits';

function fa(value) {
  return toFaDigits(String(value ?? ''));
}

function errorMessage(err) {
  const data = err?.response?.data;
  if (data && typeof data === 'object' && !(data instanceof Blob)) {
    return data.error || data.code || err.message || 'خطا';
  }
  return err?.message || 'خطا';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function optionCountFor(problem, session) {
  return Number(problem?.public_payload?.options?.length || session?.options_per_problem || 4);
}

function questionNumber(problem, index) {
  return Number(problem?.order_index ?? index + 1);
}

function syntheticProblems(session) {
  const count = Number(session?.problems_count || 0);
  const options = Number(session?.options_per_problem || 4);
  return Array.from({ length: count }, (_, index) => ({
    id: `local-${index + 1}`,
    order_index: index + 1,
    public_payload: {
      options: Array.from({ length: options }, (__, i) => ({ id: i + 1 })),
    },
  }));
}

function mergeProblems(incoming, fallbackSession) {
  const items = Array.isArray(incoming) ? incoming.filter((item) => isUuid(item?.id)) : [];
  if (items.length) {
    return [...items].sort((a, b) => Number(a.order_index) - Number(b.order_index));
  }
  return syntheticProblems(fallbackSession);
}

export default function ExamTake() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [problems, setProblems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [saveState, setSaveState] = useState({});
  const [now, setNow] = useState(Date.now());
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef({});
  const pdfUrlRef = useRef('');
  const problemsRef = useRef([]);
  const attemptRef = useRef(null);
  const answersRef = useRef({});

  useEffect(() => {
    problemsRef.current = problems;
  }, [problems]);
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => () => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    Object.values(saveTimer.current).forEach((timer) => clearTimeout(timer));
  }, []);

  const persistAnswer = useCallback(async (qNum, optionId) => {
    const currentAttempt = attemptRef.current;
    const problem = problemsRef.current.find((item, index) => questionNumber(item, index) === qNum);
    if (!currentAttempt?.attempt_id || !isUuid(problem?.id)) {
      setSaveState((prev) => ({ ...prev, [qNum]: 'queued' }));
      return;
    }
    setSaveState((prev) => ({ ...prev, [qNum]: 'saving' }));
    try {
      await examAPI.sendAnswer(currentAttempt.attempt_id, {
        exam_session_problem_id: problem.id,
        response_data: { selected_option_id: optionId },
      });
      setSaveState((prev) => ({ ...prev, [qNum]: 'saved' }));
    } catch {
      setSaveState((prev) => ({ ...prev, [qNum]: 'error' }));
    }
  }, []);

  const queueSave = useCallback((qNum, optionId) => {
    clearTimeout(saveTimer.current[qNum]);
    saveTimer.current[qNum] = setTimeout(() => {
      persistAnswer(qNum, optionId);
    }, 200);
  }, [persistAnswer]);

  const applyProblemPage = useCallback((page, currentSession) => {
    const nextProblems = mergeProblems(page?.items, currentSession);
    setProblems(nextProblems);
    setAnswers((prev) => {
      const next = { ...prev };
      (page?.items || []).forEach((problem, index) => {
        const qNum = questionNumber(problem, index);
        if (next[qNum] == null && problem.selected_option_id != null) {
          next[qNum] = Number(problem.selected_option_id);
        }
      });
      answersRef.current = next;
      return next;
    });
    const hasReal = nextProblems.some((item) => isUuid(item.id));
    if (hasReal) setError('');
    return hasReal;
  }, []);

  const loadBooklet = useCallback(async (id) => {
    const blob = await examAPI.getBookletBlob(id);
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    const url = URL.createObjectURL(blob);
    pdfUrlRef.current = url;
    setPdfUrl(url);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer;
    (async () => {
      try {
        const mine = await examAPI.getMySessions().then((r) => r.data.items || []);
        const current = mine.find((item) => String(item.id) === String(sessionId));
        if (!current) throw new Error('این آزمون برای شما ثبت نشده است');
        if (cancelled) return;
        setSession(current);
        setProblems(syntheticProblems(current));
        const started = await examAPI.startAttempt(sessionId).then((r) => r.data);
        if (cancelled) return;
        setAttempt(started);
        attemptRef.current = started;
        loadBooklet(sessionId).catch(() => {
          if (!cancelled) setPdfUrl('');
        });

        const loadSheet = async () => {
          const problemPage = await examAPI.getAttemptProblems(started.attempt_id).then((r) => r.data);
          if (cancelled) return true;
          return applyProblemPage(problemPage, current);
        };

        const sheetReadyNow = applyProblemPage(started?.problems, current);
        if (!sheetReadyNow) {
          try {
            await loadSheet();
          } catch {
            if (!cancelled) setProblems(syntheticProblems(current));
          }
        }

        const flushQueued = () => {
          Object.entries(answersRef.current).forEach(([qNum, optionId]) => {
            if (optionId == null) return;
            persistAnswer(Number(qNum), optionId);
          });
        };

        const poll = async () => {
          if (cancelled) return;
          const hasReal = problemsRef.current.some((item) => isUuid(item.id));
          if (hasReal) {
            flushQueued();
            return;
          }
          try {
            const ready = await loadSheet();
            if (ready) flushQueued();
          } catch {
            /* keep local sheet */
          }
          if (!cancelled) retryTimer = setTimeout(poll, 4000);
        };
        retryTimer = setTimeout(poll, 1500);
      } catch (err) {
        setError(errorMessage(err) || 'ورود به آزمون ناموفق بود');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [sessionId, applyProblemPage, loadBooklet, persistAnswer]);

  const expireAt = attempt?.expire_at ? new Date(attempt.expire_at).getTime() : 0;
  const remaining = Math.max(0, expireAt - now);
  const expired = expireAt > 0 && remaining <= 0;
  const canAnswer = Boolean(attempt) && !expired && !submitting;
  const answeredCount = Object.values(answers).filter((value) => value != null).length;
  const sheetReady = problems.some((item) => isUuid(item.id));

  const remainingLabel = useMemo(() => {
    const total = Math.max(0, Math.floor(remaining / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${fa(h)}:${fa(String(m).padStart(2, '0'))}:${fa(String(s).padStart(2, '0'))}`;
  }, [remaining]);

  const choose = (qNum, optionId) => {
    if (!canAnswer) return;
    const nextValue = Number(answers[qNum]) === Number(optionId) ? null : Number(optionId);
    setAnswers((prev) => ({ ...prev, [qNum]: nextValue }));
    setSaveState((prev) => ({ ...prev, [qNum]: 'saving' }));
    queueSave(qNum, nextValue);
  };

  const submit = async () => {
    if (!attempt) return;
    if (!window.confirm('آزمون ارسال شود؟ بعد از ارسال نمی‌توانید پاسخ را تغییر دهید.')) return;
    setSubmitting(true);
    try {
      await Promise.all(
        Object.entries(answers).map(([qNum, optionId]) => persistAnswer(Number(qNum), optionId)),
      );
      await examAPI.submitAttempt(attempt.attempt_id);
      navigate('/exams', { replace: true });
    } catch (err) {
      setError(errorMessage(err) || 'ارسال آزمون ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  };

  if (busy) {
    return (
      <div className="min-h-dvh bg-page text-ink flex items-center justify-center" dir="rtl">
        در حال آماده‌سازی دفترچه…
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="min-h-dvh bg-page text-ink p-6" dir="rtl">
        <p className="text-rose-400">{error}</p>
        <button type="button" className="mt-4 text-emerald-400" onClick={() => navigate('/exams')}>بازگشت</button>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-page text-ink flex flex-col" dir="rtl">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-edge bg-panel/80">
        <div className="min-w-0">
          <p className="font-bold truncate">{session?.title}</p>
          <p className="text-[11px] text-ink-3">
            {fa(answeredCount)} از {fa(problems.length)} پاسخ داده
          </p>
        </div>
        <div className={`font-black text-lg tabular-nums ${remaining < 60000 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {remainingLabel}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pdfUrl && (
            <a
              href={pdfUrl}
              download={session?.title ? `${session.title}.pdf` : 'booklet.pdf'}
              className="px-3 py-2 rounded-xl border border-edge-2 text-xs font-bold"
            >
              دانلود
            </a>
          )}
          <button
            type="button"
            disabled={submitting || expired}
            onClick={submit}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-sm font-bold disabled:opacity-50"
          >
            ارسال
          </button>
        </div>
      </header>
      {!sheetReady && (
        <p className="px-4 py-2 text-xs text-amber-300 bg-amber-500/10">
          پاسخ‌برگ روی دستگاه فعال است. همگام‌سازی با سرور در حال انجام است…
        </p>
      )}
      {error && <p className="px-4 py-2 text-sm text-rose-400">{error}</p>}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="min-h-0 bg-black/30 order-2 lg:order-1">
          {pdfUrl ? (
            <ExamBooklet blobUrl={pdfUrl} />
          ) : (
            <p className="text-sm text-ink-3 p-6">دفترچه در دسترس نیست.</p>
          )}
        </div>
        <aside className="order-1 lg:order-2 overflow-auto border-b lg:border-b-0 lg:border-r border-edge bg-[#0b1220] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-sm">پاسخ‌برگ</p>
              <p className="text-[11px] text-ink-3 mt-0.5">با لمس دایره گزینه را انتخاب کنید</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
              {fa(answeredCount)}/{fa(problems.length)}
            </span>
          </div>
          <div className="space-y-2">
            {problems.map((problem, index) => {
              const qNum = questionNumber(problem, index);
              const selected = answers[qNum] == null ? null : Number(answers[qNum]);
              const optionCount = optionCountFor(problem, session);
              const state = saveState[qNum];
              return (
                <div
                  key={problem.id || qNum}
                  className="rounded-2xl bg-panel px-3 py-2.5 border border-edge-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-black/40 text-xs font-black flex items-center justify-center text-ink-2">
                      {fa(qNum)}
                    </span>
                    <div className="flex-1 flex items-center justify-between gap-1">
                      {Array.from({ length: optionCount }, (_, i) => {
                        const opt = Number(problem.public_payload?.options?.[i]?.id || i + 1);
                        const active = selected === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={!canAnswer}
                            onClick={() => choose(qNum, opt)}
                            aria-pressed={active}
                            className={`h-11 min-w-11 flex-1 rounded-full text-sm font-black border-2 transition active:scale-95 disabled:opacity-40 ${
                              active
                                ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
                                : 'bg-transparent text-ink-2 border-ink-4 hover:border-emerald-400 hover:text-white'
                            }`}
                          >
                            {fa(opt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[10px] mt-1.5 pr-11 h-4">
                    {state === 'saving' && <span className="text-ink-3">در حال ذخیره…</span>}
                    {state === 'saved' && <span className="text-emerald-400">ذخیره شد</span>}
                    {state === 'queued' && <span className="text-amber-300">منتظر همگام‌سازی</span>}
                    {state === 'error' && (
                      <button type="button" className="text-rose-400" onClick={() => persistAnswer(qNum, selected)}>
                        ذخیره نشد · دوباره تلاش
                      </button>
                    )}
                  </p>
                </div>
              );
            })}
            {!problems.length && <p className="text-sm text-ink-3">سوالی برای این آزمون ثبت نشده است.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
