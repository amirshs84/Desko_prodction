import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import {
  Card, EmptyState, PrimaryButton, SecondaryButton, formatMinutes,
} from '../components/DemoUi';
import { useConsultant } from '../context/ConsultantContext';
import {
  useConsultantGroups, useConsultantStudents, CONSULTANT_KEYS,
} from '../hooks/useConsultantQueries';
import { planningAPI } from '../../../../api/client';
import { todayJalali, addDays } from '../../../../calendar/lib/jalaliUtils';

const STEPS = ['مخاطب', 'بازه و تقاضا', 'پیش‌نمایش', 'انتشار'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function jalaliStr(d) {
  return `${d.jy}-${pad(d.jm)}-${pad(d.jd)}`;
}

function PlanningBody() {
  const qc = useQueryClient();
  const { planningSeed, clearPlanningSeed, selectedGroupId, setSelectedGroupId, navigateToTab } =
    useConsultant();
  const { data: groups = [] } = useConsultantGroups();
  const { data: students = [] } = useConsultantStudents();

  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState('group');
  const [groupId, setGroupId] = useState(selectedGroupId || '');
  const [manualIds, setManualIds] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);

  const t = todayJalali();
  const [start, setStart] = useState(jalaliStr(t));
  const [end, setEnd] = useState(jalaliStr(addDays(t.jy, t.jm, t.jd, 6)));
  const [intensity, setIntensity] = useState('normal');
  const [subjectsText, setSubjectsText] = useState('ریاضی، فیزیک');
  const [totalMinutes, setTotalMinutes] = useState(180);
  const [mode, setMode] = useState('suggested');
  const [preview, setPreview] = useState(null);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (planningSeed?.groupId != null) {
      setAudience('group');
      setGroupId(planningSeed.groupId);
      setSelectedGroupId(planningSeed.groupId);
      setStep(0);
      clearPlanningSeed();
    }
  }, [planningSeed, clearPlanningSeed, setSelectedGroupId]);

  const subjects = useMemo(
    () => subjectsText.split(/[,،]/).map((s) => s.trim()).filter(Boolean),
    [subjectsText],
  );

  const buildBody = () => {
    const body = {
      start,
      end,
      intensity,
      subjects,
      total_minutes: Number(totalMinutes),
      mode,
    };
    if (audience === 'group') {
      body.group_id = Number(groupId);
    } else {
      const ids = manualIds.filter((id) => !excludedIds.includes(id));
      body.student_ids = ids;
    }
    if (preview && excludedIds.length && audience === 'group') {
      const keep = (preview.students || [])
        .map((s) => s.student_id)
        .filter((id) => !excludedIds.includes(id));
      delete body.group_id;
      body.student_ids = keep;
    }
    return body;
  };

  const previewMutation = useMutation({
    mutationFn: (data) => planningAPI.previewPlan(data).then((r) => r.data),
    onSuccess: (data) => {
      setPreview(data);
      setPublishResult(null);
      setStep(2);
      setError('');
    },
    onError: (err) => {
      setError(err?.response?.data?.error?.message || 'خطا در پیش‌نمایش');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (data) => planningAPI.publishPlan(data).then((r) => r.data),
    onSuccess: (data) => {
      setPublishResult(data);
      setStep(3);
      setError('');
      qc.invalidateQueries({ queryKey: CONSULTANT_KEYS.plans() });
      qc.invalidateQueries({ queryKey: ['consultant', 'snapshots'] });
      qc.invalidateQueries({ queryKey: ['calendar_events'] });
    },
    onError: (err) => {
      setError(err?.response?.data?.error?.message || 'خطا در انتشار');
    },
  });

  const toggleManual = (id) => {
    setManualIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canGoDemand = audience === 'group' ? !!groupId : manualIds.length > 0;
  const canPreview = subjects.length > 0 && Number(totalMinutes) > 0 && start && end;

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">برنامه‌ریزی گروهی</h2>
        <p className="text-sm text-gray-500 mt-1">ویزارد پیش‌نمایش و انتشار — بدون موتور کلاینت</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              background: step === i ? '#E0F2FE' : '#F3F4F6',
              color: step === i ? '#0284C7' : '#6B7280',
            }}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3">{error}</div>
      )}

      {step === 0 && (
        <Card className="flex flex-col gap-4">
          <div className="flex gap-2">
            <SecondaryButton
              className={audience === 'group' ? '!bg-sky-100 !text-sky-700' : ''}
              onClick={() => setAudience('group')}
            >
              گروه
            </SecondaryButton>
            <SecondaryButton
              className={audience === 'manual' ? '!bg-sky-100 !text-sky-700' : ''}
              onClick={() => setAudience('manual')}
            >
              انتخاب دستی
            </SecondaryButton>
          </div>

          {audience === 'group' ? (
            <select
              value={groupId}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : '';
                setGroupId(v);
                setSelectedGroupId(v || null);
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            >
              <option value="">انتخاب گروه…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.member_count})
                </option>
              ))}
            </select>
          ) : (
            <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl p-2">
              {students.map((s) => (
                <label key={s.user_id} className="flex items-center gap-2 py-1.5 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={manualIds.includes(s.user_id)}
                    onChange={() => toggleManual(s.user_id)}
                  />
                  <span>{s.full_name || s.phone_number}</span>
                </label>
              ))}
            </div>
          )}

          <PrimaryButton disabled={!canGoDemand} onClick={() => setStep(1)}>
            ادامه
          </PrimaryButton>
        </Card>
      )}

      {step === 1 && (
        <Card className="flex flex-col gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-gray-500">
              شروع (شمسی YYYY-MM-DD)
              <input
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs text-gray-500">
              پایان
              <input
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
          </div>
          <label className="text-xs text-gray-500">
            درس‌ها (با ویرگول)
            <input
              value={subjectsText}
              onChange={(e) => setSubjectsText(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            مجموع دقیقه
            <input
              type="number"
              min={1}
              value={totalMinutes}
              onChange={(e) => setTotalMinutes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            فشردگی
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
            >
              <option value="light">سبک (light)</option>
              <option value="normal">عادی (normal)</option>
              <option value="heavy">سنگین (heavy)</option>
            </select>
          </label>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setStep(0)}>بازگشت</SecondaryButton>
            <PrimaryButton
              disabled={!canPreview || previewMutation.isPending}
              onClick={() => {
                setExcludedIds([]);
                previewMutation.mutate(buildBody());
              }}
            >
              {previewMutation.isPending ? 'در حال محاسبه…' : 'پیش‌نمایش'}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {step === 2 && preview && (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span>بلوک‌ها: <b>{preview.total_blocks}</b></span>
            <span>شدت: <b>{preview.intensity}</b></span>
            {preview.has_deadlock && (
              <span className="text-red-600 font-semibold">بن‌بست در ظرفیت برخی دانش‌آموزان</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b">
                  <th className="py-2 text-right">حذف از اجرا</th>
                  <th className="py-2 text-right">نام</th>
                  <th className="py-2 text-right">بلوک</th>
                  <th className="py-2 text-right">کسری</th>
                  <th className="py-2 text-right">هشدار</th>
                </tr>
              </thead>
              <tbody>
                {(preview.students || []).map((s) => (
                  <tr key={s.student_id} className="border-b border-gray-50">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={excludedIds.includes(s.student_id)}
                        onChange={() => {
                          setExcludedIds((prev) =>
                            prev.includes(s.student_id)
                              ? prev.filter((x) => x !== s.student_id)
                              : [...prev, s.student_id],
                          );
                        }}
                      />
                    </td>
                    <td className="py-2">{s.student_name || s.student_id}</td>
                    <td className="py-2">{s.blocks?.length ?? 0}</td>
                    <td className="py-2">
                      {s.shortfall_minutes
                        ? formatMinutes(s.shortfall_minutes)
                        : '—'}
                    </td>
                    <td className="py-2 text-xs text-amber-700">
                      {s.has_deadlock ? 'بن‌بست' : ''}
                      {(s.warnings || []).map((w) => w.code).join('، ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setStep(1)}>بازگشت</SecondaryButton>
            <SecondaryButton
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate(buildBody())}
            >
              پیش‌نمایش دوباره
            </SecondaryButton>
            <PrimaryButton onClick={() => setStep(3)}>ادامه به انتشار</PrimaryButton>
          </div>
        </Card>
      )}

      {step === 3 && !publishResult && (
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            حالت انتشار را انتخاب کنید. پیشنهادی به اینباکس دانش‌آموز می‌رود؛ قطعی فقط در فضاهای خالی می‌نشیند.
          </p>
          <div className="flex gap-2">
            <SecondaryButton
              className={mode === 'suggested' ? '!bg-sky-100 !text-sky-700' : ''}
              onClick={() => setMode('suggested')}
            >
              پیشنهادی
            </SecondaryButton>
            <SecondaryButton
              className={mode === 'forced' ? '!bg-sky-100 !text-sky-700' : ''}
              onClick={() => setMode('forced')}
            >
              قطعی (forced)
            </SecondaryButton>
          </div>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setStep(2)}>بازگشت</SecondaryButton>
            <PrimaryButton
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate({ ...buildBody(), mode })}
            >
              {publishMutation.isPending ? 'در حال انتشار…' : 'انتشار'}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {step === 3 && publishResult && (
        <Card className="flex flex-col gap-4">
          <h3 className="font-bold text-gray-900">انتشار انجام شد</h3>
          <p className="text-sm text-gray-600">
            حالت: {publishResult.mode === 'forced' ? 'قطعی' : 'پیشنهادی'} · رویدادها:{' '}
            {publishResult.created_events ?? 0}
            {publishResult.snapshots_taken
              ? ` · اسنپ‌شات: ${publishResult.snapshots_taken}`
              : ''}
          </p>
          {publishResult.mode === 'forced' && (
            <p className="text-xs text-gray-500">
              برای بازگشت، از ورک‌اسپیس دانش‌آموز → تب نسخه‌ها استفاده کنید.
            </p>
          )}
          <div className="flex gap-2">
            <PrimaryButton onClick={() => navigateToTab('history')}>رفتن به تاریخچه</PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setPublishResult(null);
                setPreview(null);
                setStep(0);
                setExcludedIds([]);
              }}
            >
              برنامه جدید
            </SecondaryButton>
          </div>
        </Card>
      )}

      {step === 2 && !preview && <EmptyState message="پیش‌نمایش موجود نیست" />}
    </div>
  );
}

export function PlanningDesktop() {
  return (
    <DesktopPageShell title="برنامه‌ریزی گروهی">
      <PlanningBody />
    </DesktopPageShell>
  );
}

export function PlanningMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <PlanningBody />
    </MobilePageShell>
  );
}
