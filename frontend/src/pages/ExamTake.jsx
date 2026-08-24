import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examAPI } from '../api/client';
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

function optionCountFor(problem, session) {
  return problem?.public_payload?.options?.length || session?.options_per_problem || 4;
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
    localOnly: true,
  }));
}

export default function ExamTake() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [problems, setProblems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [now, setNow] = useState(Date.now());
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef({});
  const pdfUrlRef = useRef('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => () => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
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
    (async () => {
      try {
        const mine = await examAPI.getMySessions().then((r) => r.data.items || []);
        const current = mine.find((item) => String(item.id) === String(sessionId));
        if (!current) throw new Error('این آزمون برای شما ثبت نشده است');
        if (cancelled) return;
        setSession(current);
        const started = await examAPI.startAttempt(sessionId).then((r) => r.data);
        if (cancelled) return;
        setAttempt(started);
        const bookletPromise = loadBooklet(sessionId).catch((err) => {
          if (!cancelled) setError(errorMessage(err) || 'دفترچه در دسترس نیست.');
        });
        try {
          const problemPage = await examAPI.getAttemptProblems(started.attempt_id).then((r) => r.data);
          if (cancelled) return;
          const items = problemPage.items || [];
          setProblems(items.length ? items : syntheticProblems(current));
          const initial = {};
          for (const p of items) {
            initial[p.id] = p.selected_option_id ?? null;
          }
          setAnswers(initial);
        } catch (err) {
          if (!cancelled) {
            setProblems(syntheticProblems(current));
            setError((prev) => prev || errorMessage(err));
          }
        }
        await bookletPromise;
      } catch (err) {
        setError(errorMessage(err) || 'ورود به آزمون ناموفق بود');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, loadBooklet]);

  const expireAt = attempt?.expire_at ? new Date(attempt.expire_at).getTime() : 0;
  const remaining = Math.max(0, expireAt - now);
  const expired = expireAt > 0 && remaining <= 0;

  const remainingLabel = useMemo(() => {
    const total = Math.floor(remaining / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${fa(h)}:${fa(String(m).padStart(2, '0'))}:${fa(String(s).padStart(2, '0'))}`;
  }, [remaining]);

  const sendAnswer = (problemId, optionId) => {
    if (!attempt || expired || String(problemId).startsWith('local-')) return;
    setAnswers((prev) => ({ ...prev, [problemId]: optionId }));
    clearTimeout(saveTimer.current[problemId]);
    saveTimer.current[problemId] = setTimeout(() => {
      examAPI.sendAnswer(attempt.attempt_id, {
        exam_session_problem_id: problemId,
        response_data: { selected_option_id: optionId },
      }).catch(() => {});
    }, 250);
  };

  const submit = async () => {
    if (!attempt) return;
    if (!window.confirm('آزمون ارسال شود؟ بعد از ارسال نمی‌توانید پاسخ را تغییر دهید.')) return;
    setSubmitting(true);
    try {
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
          <p className="text-[11px] text-ink-3">{fa(problems.length)} سوال</p>
        </div>
        <div className={`font-black text-lg ${remaining < 60000 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {remainingLabel}
        </div>
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              download={session?.title ? `${session.title}.pdf` : 'booklet.pdf'}
              className="px-3 py-2 rounded-xl border border-edge text-xs font-bold"
            >
              دانلود دفترچه
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
      {error && <p className="px-4 py-2 text-sm text-rose-400">{error}</p>}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_320px]">
        <div className="min-h-0 bg-black/20">
          {pdfUrl ? (
            <iframe
              title="دفترچه آزمون"
              src={pdfUrl}
              className="w-full h-full min-h-[60vh] bg-white"
            />
          ) : (
            <p className="text-sm text-ink-3 p-6">دفترچه در دسترس نیست.</p>
          )}
        </div>
        <aside className="overflow-auto border-t lg:border-t-0 lg:border-r border-edge bg-panel p-3">
          <p className="text-xs text-ink-3 mb-3">پاسخ‌برگ</p>
          <div className="space-y-2">
            {problems.map((problem, index) => {
              const selected = answers[problem.id];
              const optionCount = optionCountFor(problem, session);
              return (
                <div key={problem.id} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-bold text-ink-3">{fa(problem.order_index ?? index + 1)}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: optionCount }, (_, i) => {
                      const opt = problem.public_payload?.options?.[i]?.id || i + 1;
                      const active = selected === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={expired || problem.localOnly}
                          onClick={() => sendAnswer(problem.id, opt)}
                          className={`w-8 h-8 rounded-full text-xs font-bold border ${active ? 'bg-emerald-500 text-black border-emerald-400' : 'border-edge text-ink-2'}`}
                        >
                          {fa(opt)}
                        </button>
                      );
                    })}
                  </div>
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
