import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examAPI } from '../api/client';
import { toFaDigits } from '../lib/persianDigits';

function fa(value) {
  return toFaDigits(String(value ?? ''));
}

const WORKER_CODE = `
importScripts('/mupdf/mupdf.js');
let mupdf = null;
let doc = null;
const readyPromise = (async () => { mupdf = await MuPDF(); })();
self.onmessage = async (e) => {
  await readyPromise;
  const { id, type, payload } = e.data;
  try {
    if (type === 'LOAD') {
      if (doc) { doc.destroy(); doc = null; }
      const buf = new Uint8Array(payload.data);
      doc = mupdf.Document.openDocument(buf, 'application/pdf');
      self.postMessage({ id, result: { totalPages: doc.countPages() } });
    } else if (type === 'RENDER') {
      const page = doc.loadPage(payload.pageIndex);
      const matrix = mupdf.Matrix.scale(payload.scale, payload.scale);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
      const png = pixmap.asPNG();
      pixmap.destroy();
      page.destroy();
      self.postMessage({ id, result: { png } }, [png.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
`;

function createWorker() {
  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

export default function ExamTake() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [problems, setProblems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [now, setNow] = useState(Date.now());
  const [pageUrls, setPageUrls] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const workerRef = useRef(null);
  const saveTimer = useRef({});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadPdf = useCallback(async (blob) => {
    const buffer = await blob.arrayBuffer();
    const worker = createWorker();
    workerRef.current = worker;
    const total = await new Promise((resolve, reject) => {
      const onMsg = (e) => {
        if (e.data.id !== 'load') return;
        worker.removeEventListener('message', onMsg);
        if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data.result.totalPages);
      };
      worker.addEventListener('message', onMsg);
      worker.postMessage({ id: 'load', type: 'LOAD', payload: { data: buffer } }, [buffer]);
    });
    const urls = [];
    for (let i = 0; i < total; i += 1) {
      const png = await new Promise((resolve, reject) => {
        const id = `p${i}`;
        const onMsg = (e) => {
          if (e.data.id !== id) return;
          worker.removeEventListener('message', onMsg);
          if (e.data.error) reject(new Error(e.data.error));
          else resolve(e.data.result.png);
        };
        worker.addEventListener('message', onMsg);
        worker.postMessage({ id, type: 'RENDER', payload: { pageIndex: i, scale: 1.4 } });
      });
      urls.push(URL.createObjectURL(new Blob([png], { type: 'image/png' })));
    }
    setPageUrls(urls);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await examAPI.getMySessions().then((r) => r.data.items || []);
        const current = mine.find((item) => String(item.id) === String(sessionId));
        if (!current) throw new Error('این آزمون برای شما ثبت نشده است');
        setSession(current);
        const started = await examAPI.startAttempt(sessionId).then((r) => r.data);
        if (cancelled) return;
        setAttempt(started);
        const [problemPage, booklet] = await Promise.all([
          examAPI.getAttemptProblems(started.attempt_id).then((r) => r.data),
          examAPI.getBookletBlob(sessionId).then((r) => r.data),
        ]);
        if (cancelled) return;
        setProblems(problemPage.items || []);
        const initial = {};
        for (const p of problemPage.items || []) {
          initial[p.id] = p.selected_option_id ?? null;
        }
        setAnswers(initial);
        await loadPdf(booklet);
      } catch (err) {
        const data = err?.response?.data;
        setError(data?.error || data?.code || err.message || 'ورود به آزمون ناموفق بود');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      workerRef.current?.terminate();
    };
  }, [sessionId, loadPdf]);

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
    if (!attempt || expired) return;
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
      setError(err?.response?.data?.code || 'ارسال آزمون ناموفق بود');
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
      <header className="flex items-center justify-between px-4 py-3 border-b border-edge bg-panel/80">
        <div className="min-w-0">
          <p className="font-bold truncate">{session?.title}</p>
          <p className="text-[11px] text-ink-3">{fa(problems.length)} سوال</p>
        </div>
        <div className={`font-black text-lg ${remaining < 60000 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {remainingLabel}
        </div>
        <button
          type="button"
          disabled={submitting || expired}
          onClick={submit}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-sm font-bold disabled:opacity-50"
        >
          ارسال
        </button>
      </header>
      {error && <p className="px-4 py-2 text-sm text-rose-400">{error}</p>}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_320px]">
        <div className="overflow-auto p-3 space-y-3 bg-black/20">
          {pageUrls.map((url, i) => (
            <img key={url} src={url} alt={`صفحه ${i + 1}`} className="w-full rounded-xl bg-white" />
          ))}
          {!pageUrls.length && <p className="text-sm text-ink-3 p-6">دفترچه در دسترس نیست.</p>}
        </div>
        <aside className="overflow-auto border-t lg:border-t-0 lg:border-r border-edge bg-panel p-3">
          <p className="text-xs text-ink-3 mb-3">پاسخ‌برگ</p>
          <div className="space-y-2">
            {problems.map((problem, index) => {
              const selected = answers[problem.id];
              const optionCount = problem.public_payload?.options?.length || session?.options_per_problem || 4;
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
                          disabled={expired}
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
          </div>
        </aside>
      </div>
    </div>
  );
}
