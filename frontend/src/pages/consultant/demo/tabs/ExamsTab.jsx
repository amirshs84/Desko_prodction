import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, FileText, Plus, Users, Clock, CheckCircle2, X,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { Card, EmptyState, PrimaryButton, SecondaryButton } from '../components/DemoUi';
import { examAPI } from '../../../../api/client';
import { useConsultantRoster } from '../hooks/useConsultantQueries';
import { toFaDigits } from '../../../../lib/persianDigits';

const EXAM_KEYS = {
  list: () => ['consultant', 'exams'],
  exam: (id) => ['consultant', 'exams', id],
  session: (id) => ['consultant', 'exam-sessions', id],
  results: (id) => ['consultant', 'exam-sessions', id, 'results'],
};

const STATUS_LABEL = {
  SCHEDULED: { label: 'زمان‌بندی‌شده', color: '#2563EB', bg: '#DBEAFE' },
  RUNNING: { label: 'در حال برگزاری', color: '#059669', bg: '#D1FAE5' },
  COMPLETED: { label: 'پایان‌یافته', color: '#4B5563', bg: '#F3F4F6' },
  CANCELLED: { label: 'لغو شده', color: '#DC2626', bg: '#FEE2E2' },
};

function fa(value) {
  return toFaDigits(String(value ?? ''));
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function StatusPill({ status }) {
  const meta = STATUS_LABEL[status] || STATUS_LABEL.SCHEDULED;
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function ExamsBody({ compact }) {
  const qc = useQueryClient();
  const [view, setView] = useState({ mode: 'list' });
  const examsQuery = useQuery({
    queryKey: EXAM_KEYS.list(),
    queryFn: () => examAPI.listExams().then((r) => r.data),
  });
  const exams = examsQuery.data || [];

  return (
    <div className={compact ? 'px-5 py-5 space-y-5' : 'px-8 py-6 space-y-6'}>
      {view.mode === 'list' && (
        <ExamList
          compact={compact}
          exams={exams}
          loading={examsQuery.isLoading}
          error={examsQuery.isError}
          onCreate={() => setView({ mode: 'wizard', step: 1, draft: {} })}
          onOpen={(exam) => setView({ mode: 'exam', examId: exam.id })}
        />
      )}
      {view.mode === 'wizard' && (
        <CreateWizard
          compact={compact}
          step={view.step}
          draft={view.draft}
          onChange={(next) => setView((prev) => ({ ...prev, ...next }))}
          onCancel={() => setView({ mode: 'list' })}
          onCreated={(exam) => {
            qc.invalidateQueries({ queryKey: EXAM_KEYS.list() });
            setView({ mode: 'exam', examId: exam.id });
          }}
        />
      )}
      {view.mode === 'exam' && (
        <ExamDetail
          examId={view.examId}
          onBack={() => setView({ mode: 'list' })}
          onOpenSession={(sessionId) => setView({ mode: 'session', examId: view.examId, sessionId })}
        />
      )}
      {view.mode === 'session' && (
        <SessionDetail
          examId={view.examId}
          sessionId={view.sessionId}
          onBack={() => setView({ mode: 'exam', examId: view.examId })}
        />
      )}
    </div>
  );
}

function ExamList({ compact, exams, loading, error, onCreate, onOpen }) {
  return (
    <>
      <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
        <div>
          <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>آزمون‌ها</h1>
          <p className="text-sm text-gray-500 mt-1">ساخت دفترچه، زمان‌بندی جلسه و مشاهده کارنامه</p>
        </div>
        <PrimaryButton onClick={onCreate} className="flex items-center gap-2 self-start">
          <Plus size={16} />
          آزمون جدید
        </PrimaryButton>
      </div>
      {loading && <p className="text-sm text-gray-500">در حال بارگذاری…</p>}
      {error && <p className="text-sm text-red-500">بارگذاری آزمون‌ها ناموفق بود.</p>}
      {!loading && exams.length === 0 && (
        <Card>
          <EmptyState message="هنوز آزمونی نساخته‌اید. با آپلود PDF شروع کنید." />
        </Card>
      )}
      <div className="grid gap-4">
        {exams.map((exam) => (
          <button
            key={exam.id}
            type="button"
            onClick={() => onOpen(exam)}
            className="text-right rounded-3xl p-5 hover:border-emerald-200 transition"
            style={{ background: '#fff', border: '1px solid #F3F4F6', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                  <FileText size={20} color="#059669" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{exam.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {fa(exam.problems_count)} سوال · {fa(exam.session_count || 0)} جلسه
                  </p>
                </div>
              </div>
              <ChevronLeft size={18} color="#9CA3AF" />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function CreateWizard({ step, draft, onChange, onCancel, onCreated }) {
  const roster = useConsultantRoster({ period: 'weekly' });
  const students = roster.data?.students || [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const answerGrid = useMemo(() => {
    const count = Number(draft.problems_count || 0);
    const options = Number(draft.options_per_problem || 4);
    const keys = { ...(draft.answer_keys || {}) };
    return { count, options, keys };
  }, [draft]);

  const setKey = (q, opt) => {
    onChange({
      draft: {
        ...draft,
        answer_keys: { ...(draft.answer_keys || {}), [q]: opt },
      },
    });
  };

  const createAll = async () => {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('title', draft.title);
      if (draft.description) form.append('description', draft.description);
      form.append('problems_count', String(draft.problems_count));
      form.append('options_per_problem', String(draft.options_per_problem || 4));
      form.append('answer_keys', JSON.stringify(draft.answer_keys || {}));
      form.append('booklet', draft.file);
      const created = await examAPI.createExam(form).then((r) => r.data);
      const session = await examAPI.createSession(created.id, {
        title: draft.session_title || created.title,
        start_time: fromLocalInput(draft.start_time),
        end_time: fromLocalInput(draft.end_time),
      }).then((r) => r.data);
      const selected = Array.from(draft.selected || []);
      if (selected.length) {
        await examAPI.addParticipants(session.id, selected);
      }
      onCreated(created);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.error || data?.code || 'ساخت آزمون ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-gray-900">ساخت آزمون · مرحله {fa(step)} از ۴</h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">عنوان
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
              value={draft.title || ''}
              onChange={(e) => onChange({ draft: { ...draft, title: e.target.value } })}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">توضیح (اختیاری)
            <textarea
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
              rows={3}
              value={draft.description || ''}
              onChange={(e) => onChange({ draft: { ...draft, description: e.target.value } })}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">دفترچه PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="mt-1 block w-full text-sm"
              onChange={(e) => onChange({ draft: { ...draft, file: e.target.files?.[0] } })}
            />
          </label>
          {draft.file && (
            <p className="text-xs text-emerald-700">فایل انتخاب‌شده: {draft.file.name} ({Math.max(1, Math.round(draft.file.size / 1024))} کیلوبایت)</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">تعداد سوال
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                value={draft.problems_count || ''}
                onChange={(e) => onChange({ draft: { ...draft, problems_count: e.target.value, answer_keys: {} } })}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">تعداد گزینه
              <input
                type="number"
                min={2}
                max={6}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                value={draft.options_per_problem || 4}
                onChange={(e) => onChange({ draft: { ...draft, options_per_problem: e.target.value, answer_keys: {} } })}
              />
            </label>
          </div>
          {answerGrid.count > 0 && (
            <div className="max-h-80 overflow-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-right">سوال</th>
                    {Array.from({ length: answerGrid.options }, (_, i) => (
                      <th key={i} className="p-2">{fa(i + 1)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: answerGrid.count }, (_, qi) => {
                    const q = qi + 1;
                    return (
                      <tr key={q} className="border-t border-gray-50">
                        <td className="p-2 font-medium">{fa(q)}</td>
                        {Array.from({ length: answerGrid.options }, (_, oi) => {
                          const opt = oi + 1;
                          const selected = Number(answerGrid.keys[q]) === opt;
                          return (
                            <td key={opt} className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => setKey(q, opt)}
                                className={`w-8 h-8 rounded-full text-xs font-bold ${selected ? 'text-white' : 'text-gray-600 bg-gray-100'}`}
                                style={selected ? { background: '#10B981' } : undefined}
                              >
                                {fa(opt)}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">عنوان جلسه
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
              value={draft.session_title || draft.title || ''}
              onChange={(e) => onChange({ draft: { ...draft, session_title: e.target.value } })}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">شروع
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                value={draft.start_time || ''}
                onChange={(e) => onChange({ draft: { ...draft, start_time: e.target.value } })}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">پایان
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                value={draft.end_time || ''}
                onChange={(e) => onChange({ draft: { ...draft, end_time: e.target.value } })}
              />
            </label>
          </div>
          <p className="text-xs text-amber-700">زمان شروع باید در آینده باشد.</p>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">دانش‌آموزان همین مدرسه را برای شرکت انتخاب کنید.</p>
          <div className="max-h-80 overflow-auto space-y-2">
            {students.map((s) => {
              const selected = new Set(draft.selected || []);
              const checked = selected.has(s.user_id);
              return (
                <label key={s.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(s.user_id);
                      else next.add(s.user_id);
                      onChange({ draft: { ...draft, selected: Array.from(next) } });
                    }}
                  />
                  <span className="text-sm font-medium text-gray-800">{s.full_name || `دانش‌آموز ${s.user_id}`}</span>
                  {s.grade && <span className="text-xs text-gray-400">{s.grade}</span>}
                </label>
              );
            })}
            {!students.length && <EmptyState message="دانش‌آموزی در roster نیست." />}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      <div className="flex justify-between mt-6">
        <SecondaryButton onClick={step === 1 ? onCancel : () => onChange({ step: step - 1 })}>
          {step === 1 ? 'انصراف' : 'قبلی'}
        </SecondaryButton>
        {step < 4 ? (
          <PrimaryButton
            disabled={
              (step === 1 && (!draft.title || !draft.file))
              || (step === 2 && (
                !Number(draft.problems_count)
                || Object.keys(draft.answer_keys || {}).length !== Number(draft.problems_count)
              ))
              || (step === 3 && (!draft.start_time || !draft.end_time))
            }
            onClick={() => onChange({ step: step + 1 })}
          >
            ادامه
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={busy} onClick={createAll}>
            {busy ? 'در حال ثبت…' : 'ثبت آزمون'}
          </PrimaryButton>
        )}
      </div>
    </Card>
  );
}

function ExamDetail({ examId, onBack, onOpenSession }) {
  const qc = useQueryClient();
  const examQuery = useQuery({
    queryKey: EXAM_KEYS.exam(examId),
    queryFn: () => examAPI.getExam(examId).then((r) => r.data),
  });
  const exam = examQuery.data;
  const [showSchedule, setShowSchedule] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const createSession = useMutation({
    mutationFn: () => examAPI.createSession(examId, {
      title: sessionTitle || exam?.title,
      start_time: fromLocalInput(startTime),
      end_time: fromLocalInput(endTime),
    }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXAM_KEYS.exam(examId) });
      setShowSchedule(false);
    },
  });

  if (examQuery.isLoading) return <p className="text-sm text-gray-500">در حال بارگذاری…</p>;
  if (!exam) return <EmptyState message="آزمون پیدا نشد" />;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-emerald-700 flex items-center gap-1">
        <ChevronLeft size={16} className="rotate-180" /> بازگشت
      </button>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-xl text-gray-900">{exam.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{fa(exam.problems_count)} سوال تستی</p>
            {exam.booklet_name && (
              <p className="text-xs text-gray-400 mt-1">دفترچه: {exam.booklet_name}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <SecondaryButton
              onClick={async () => {
                try {
                  const blob = await examAPI.getExamBookletBlob(examId);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = exam.booklet_name || `${exam.title}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  window.alert(err?.response?.data?.error || err.message || 'دانلود دفترچه ناموفق بود');
                }
              }}
            >
              دانلود دفترچه
            </SecondaryButton>
            <PrimaryButton onClick={() => setShowSchedule(true)}>جلسه جدید</PrimaryButton>
          </div>
        </div>
      </Card>
      {showSchedule && (
        <Card>
          <h3 className="font-bold mb-3">زمان‌بندی جلسه</h3>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2"
              placeholder="عنوان جلسه"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
            />
            <input type="datetime-local" className="w-full rounded-xl border border-gray-200 px-3 py-2" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input type="datetime-local" className="w-full rounded-xl border border-gray-200 px-3 py-2" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <div className="flex gap-2">
              <PrimaryButton disabled={createSession.isPending} onClick={() => createSession.mutate()}>ثبت</PrimaryButton>
              <SecondaryButton onClick={() => setShowSchedule(false)}>انصراف</SecondaryButton>
            </div>
          </div>
        </Card>
      )}
      {(exam.sessions || []).map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onOpenSession(session.id)}
          className="w-full text-right"
        >
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{session.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatWhen(session.start_time)} تا {formatWhen(session.end_time)}
                </p>
              </div>
              <StatusPill status={session.status} />
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}

function SessionDetail({ sessionId, onBack }) {
  const qc = useQueryClient();
  const roster = useConsultantRoster({ period: 'weekly' });
  const students = roster.data?.students || [];
  const sessionQuery = useQuery({
    queryKey: EXAM_KEYS.session(sessionId),
    queryFn: () => examAPI.getSession(sessionId).then((r) => r.data),
  });
  const resultsQuery = useQuery({
    queryKey: EXAM_KEYS.results(sessionId),
    queryFn: () => examAPI.getSessionResults(sessionId).then((r) => r.data),
  });
  const addMutation = useMutation({
    mutationFn: (userIds) => examAPI.addParticipants(sessionId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXAM_KEYS.session(sessionId) });
      qc.invalidateQueries({ queryKey: EXAM_KEYS.results(sessionId) });
    },
  });
  const session = sessionQuery.data;
  const results = resultsQuery.data?.results || [];
  const assigned = new Set((session?.participants || []).filter((p) => p.status === 'ASSIGNED').map((p) => p.user_id));

  if (sessionQuery.isLoading) return <p className="text-sm text-gray-500">در حال بارگذاری…</p>;
  if (!session) return <EmptyState />;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-emerald-700">بازگشت به آزمون</button>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-xl">{session.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{session.exam_title}</p>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock size={14} /> {formatWhen(session.start_time)} — {formatWhen(session.end_time)}
            </p>
          </div>
          <StatusPill status={session.status} />
        </div>
      </Card>
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Users size={16} /> شرکت‌کنندگان</h3>
        <div className="max-h-56 overflow-auto space-y-2">
          {students.map((s) => (
            <label key={s.user_id} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={assigned.has(s.user_id)}
                disabled={assigned.has(s.user_id) || addMutation.isPending || session.status === 'COMPLETED'}
                onChange={() => addMutation.mutate([s.user_id])}
              />
              <span>{s.full_name || s.user_id}</span>
              {assigned.has(s.user_id) && <CheckCircle2 size={14} color="#059669" />}
            </label>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-bold mb-3">کارنامه جلسه</h3>
        {resultsQuery.isLoading && <p className="text-sm text-gray-500">در حال دریافت نتایج…</p>}
        {!results.length && !resultsQuery.isLoading && (
          <EmptyState message="هنوز نتیجه‌ای ثبت نشده است." />
        )}
        {results.length > 0 && (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-right">
                  <th className="p-2">رتبه</th>
                  <th className="p-2">نام</th>
                  <th className="p-2">وضعیت</th>
                  <th className="p-2">نمره</th>
                  <th className="p-2">درصد</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.attempt_id || row.user_id} className="border-t border-gray-100">
                    <td className="p-2">{row.rank ? fa(row.rank) : '—'}</td>
                    <td className="p-2 font-medium">{row.full_name}</td>
                    <td className="p-2 text-xs">{row.status || '—'}</td>
                    <td className="p-2">{row.score != null ? fa(row.score) : '—'}</td>
                    <td className="p-2">{row.percent != null ? `${fa(row.percent)}٪` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function ExamsDesktop() {
  return (
    <DesktopPageShell title="آزمون‌ها">
      <ExamsBody />
    </DesktopPageShell>
  );
}

export function ExamsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <ExamsBody compact />
    </MobilePageShell>
  );
}
