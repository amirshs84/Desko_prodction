import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Sparkles, Users } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import {
  Card, EmptyState, PrimaryButton, SecondaryButton, formatMinutes,
} from '../components/DemoUi';
import { useConsultant } from '../context/ConsultantContext';
import {
  useConsultantGroups,
  useConsultantRoster,
  useConsultantStudents,
  useSubjectCatalog,
  CONSULTANT_KEYS,
} from '../hooks/useConsultantQueries';
import { planningAPI } from '../../../../api/client';
import { todayJalali, addDays } from '../../../../calendar/lib/jalaliUtils';
import { PreviewCalendarModal } from './planning/PreviewCalendarModal';
import { STEPS, STUDIO } from './planning/studioTheme';

function newDemand(subject = '') {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    subject,
    amount: 90,
    unit: 'minutes',
    activity: 'study',
    priority: 3,
    movability: 2,
  };
}

const PRIORITY_HINT = ['حذف‌شدنی', 'مرور جزئی', 'عادی', 'مهم', 'آزمون/جمع‌بندی'];
const MOVABILITY_HINT = ['میخ‌شده', 'کم', 'متوسط', 'زیاد', 'آزاد'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function jalaliStr(d) {
  return `${d.jy}-${pad(d.jm)}-${pad(d.jd)}`;
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

/** الگوریتم ساده «نیاز به مداخله» — میانگین performance معکوس. */
function interventionScore(members, rosterById) {
  if (!members?.length) return 1;
  const scores = members.map((m) => {
    const row = rosterById[m.user_id];
    return row?.performance != null ? 1 - Number(row.performance) : 0.5;
  });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function avgExecutionPercent(members, rosterById) {
  if (!members?.length) return null;
  const vals = members
    .map((m) => rosterById[m.user_id]?.performance)
    .filter((v) => v != null)
    .map(Number);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}

function buildInsights(groups, rosterById) {
  const insights = [];
  for (const g of groups.slice(0, 8)) {
    const members = g.members || [];
    if (!members.length) continue;
    const avg = avgExecutionPercent(members, rosterById);
    const weak = members
      .map((m) => ({ m, p: rosterById[m.user_id]?.performance ?? 0 }))
      .filter((x) => x.p < 0.35)
      .sort((a, b) => a.p - b.p);

    if (avg != null && avg < 45) {
      insights.push({
        id: `low-${g.id}`,
        groupId: g.id,
        text: `گروه «${g.name}» میانگین اجرای حدود ${avg}٪ دارد؛ پیشنهاد می‌شود این هفته ۲ ساعت جبرانی به برنامه اضافه شود.`,
        actionLabel: 'اعمال روی این گروه',
      });
    } else if (weak.length >= 2) {
      insights.push({
        id: `weak-${g.id}`,
        groupId: g.id,
        text: `در گروه «${g.name}» ${weak.length} نفر عملکرد ضعیف دارند. اولویت مداخله با ${weak[0].m.full_name || 'اعضا'} است.`,
        actionLabel: 'انتخاب گروه',
      });
    }
  }
  if (!insights.length && groups.length) {
    insights.push({
      id: 'ok',
      groupId: groups[0].id,
      text: 'فعلاً افت شدید گروهی دیده نمی‌شود. می‌توانید یک الگوی سبک برای تثبیت برنامه اعمال کنید.',
      actionLabel: 'شروع با اولین گروه',
    });
  }
  return insights.slice(0, 3);
}

/** هیت‌مپ ظرفیت ساده ۷روزه بر اساس میانگین مطالعه اعضا (MVP قاعده‌محور). */
function CapacityHeatstrip({ members, rosterById }) {
  const load = members?.length
    ? members.reduce((s, m) => s + (rosterById[m.user_id]?.study_seconds || 0), 0) /
      members.length /
      3600
    : 0;
  // توزیع تقریبی فشار در هفته (شنبه→جمعه) — قاعده‌محور MVP
  const weights = [0.7, 1.1, 1.2, 1.15, 1.0, 0.5, 0.35];
  const days = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  return (
    <div className="flex gap-1 items-end h-10" title="فشار تقریبی هفته (MVP)">
      {days.map((d, i) => {
        const intensity = Math.min(1, (load / 14) * weights[i]);
        const hue = 140 - intensity * 140;
        return (
          <div key={d} className="flex flex-col items-center gap-0.5 flex-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${10 + intensity * 22}px`,
                background: `hsl(${hue} 65% 42%)`,
                opacity: 0.35 + intensity * 0.65,
              }}
            />
            <span className="text-[9px] text-gray-400">{d}</span>
          </div>
        );
      })}
    </div>
  );
}

function PlanningBody() {
  const qc = useQueryClient();
  const { planningSeed, clearPlanningSeed, selectedGroupId, setSelectedGroupId, navigateToTab } =
    useConsultant();
  const { data: groups = [] } = useConsultantGroups();
  const { data: students = [] } = useConsultantStudents();
  const { data: rosterPage } = useConsultantRoster({ period: 'weekly' });
  const { data: catalog } = useSubjectCatalog();
  const catalogByName = useMemo(() => {
    const map = {};
    for (const s of catalog?.subjects || []) map[s.name] = s;
    return map;
  }, [catalog]);
  const rosterById = useMemo(() => {
    const map = {};
    for (const s of rosterPage?.students || []) map[s.user_id] = s;
    return map;
  }, [rosterPage]);

  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState('group');
  const [groupId, setGroupId] = useState(selectedGroupId || '');
  const [manualIds, setManualIds] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);
  const [committedIds, setCommittedIds] = useState([]);

  const t = todayJalali();
  const [start, setStart] = useState(jalaliStr(t));
  const [end, setEnd] = useState(jalaliStr(addDays(t.jy, t.jm, t.jd, 6)));
  const [intensity, setIntensity] = useState('normal');
  const [demands, setDemands] = useState(() => [newDemand('ریاضی'), newDemand('فیزیک')]);
  const [mode, setMode] = useState('suggested');
  const [goalMessage, setGoalMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState('');

  // فیلتر پیش‌نمایش
  const [previewFilter, setPreviewFilter] = useState('all'); // all | ok | conflict
  const [previewSearch, setPreviewSearch] = useState('');
  const [calendarStudent, setCalendarStudent] = useState(null);

  useEffect(() => {
    if (planningSeed?.groupId != null) {
      setAudience('group');
      setGroupId(planningSeed.groupId);
      setSelectedGroupId(planningSeed.groupId);
      setStep(0);
      clearPlanningSeed();
    }
  }, [planningSeed, clearPlanningSeed, setSelectedGroupId]);

  const validDemands = useMemo(
    () => demands.filter((d) => d.subject.trim() && Number(d.amount) > 0),
    [demands],
  );

  const sortedGroups = useMemo(() => {
    return [...groups].sort(
      (a, b) =>
        interventionScore(b.members, rosterById) - interventionScore(a.members, rosterById),
    );
  }, [groups, rosterById]);

  const insights = useMemo(
    () => buildInsights(sortedGroups, rosterById),
    [sortedGroups, rosterById],
  );

  const removedIds = useMemo(
    () => [...new Set([...excludedIds, ...committedIds])],
    [excludedIds, committedIds],
  );

  const buildBody = () => {
    const body = {
      start,
      end,
      intensity,
      mode,
      demands: validDemands.map((d) => ({
        subject: d.subject.trim(),
        amount: Number(d.amount),
        unit: d.unit,
        activity: d.unit === 'count' ? 'test' : d.activity,
        priority: Number(d.priority),
        movability: Number(d.movability),
      })),
    };
    if (audience === 'group' && !removedIds.length) {
      body.group_id = Number(groupId);
    } else if (audience === 'group') {
      const keep = (preview?.students || [])
        .map((s) => s.student_id)
        .filter((id) => !removedIds.includes(id));
      body.student_ids = keep.length
        ? keep
        : (groups.find((g) => g.id === Number(groupId))?.members || [])
          .map((m) => m.user_id)
          .filter((id) => !removedIds.includes(id));
    } else {
      body.student_ids = manualIds.filter((id) => !removedIds.includes(id));
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

  const selectGroup = (id) => {
    setAudience('group');
    setGroupId(id);
    setSelectedGroupId(id);
  };

  const canGoDemand = audience === 'group' ? !!groupId : manualIds.length > 0;
  const canPreview = validDemands.length > 0 && start && end;

  const previewStudents = useMemo(() => {
    // افراد ثبت‌شده‌ی فردی از لیست بچ حذف می‌شوند؛ «حذف از بچ» فقط برای انتشار است.
    let list = (preview?.students || []).filter((s) => !committedIds.includes(s.student_id));
    if (previewFilter === 'ok') list = list.filter((s) => !s.has_deadlock && !s.shortfall_minutes);
    if (previewFilter === 'conflict') {
      list = list.filter((s) => s.has_deadlock || s.shortfall_minutes > 0);
    }
    const q = previewSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        `${s.student_name || ''} ${s.student_id}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [preview, committedIds, previewFilter, previewSearch]);

  const onIndividualCommitted = (studentId) => {
    setCommittedIds((prev) => [...prev, studentId]);
    setCalendarStudent(null);
    setPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        students: (prev.students || []).filter((s) => s.student_id !== studentId),
        total_blocks: (prev.students || [])
          .filter((s) => s.student_id !== studentId)
          .reduce((n, s) => n + (s.blocks?.length || 0), 0),
      };
    });
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto flex flex-col gap-5 pb-28">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: STUDIO.ink }}>
          استودیوی برنامه‌ریزی
        </h2>
        <p className="text-sm mt-1" style={{ color: STUDIO.muted }}>
          کارخانه برنامه‌سازی: الگو بسازید، گروهی اعمال کنید، جزئیات را روی تقویم هر فرد ویرایش کنید
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{
              background: step === i ? STUDIO.brandSoft : '#F3F4F6',
              color: step === i ? STUDIO.brandStrong : '#6B7280',
            }}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3">{error}</div>
      )}

      {/* —— گام ۰: انتخاب گروه / کارخانه —— */}
      {step === 0 && (
        <>
          <div className="flex gap-2">
            <SecondaryButton
              className={audience === 'group' ? '!bg-emerald-50 !text-emerald-800' : ''}
              onClick={() => setAudience('group')}
            >
              بر اساس گروه
            </SecondaryButton>
            <SecondaryButton
              className={audience === 'manual' ? '!bg-emerald-50 !text-emerald-800' : ''}
              onClick={() => setAudience('manual')}
            >
              انتخاب دستی
            </SecondaryButton>
          </div>

          {audience === 'group' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedGroups.length === 0 && <EmptyState message="هنوز گروهی نساخته‌اید" />}
              {sortedGroups.map((g) => {
                const avg = avgExecutionPercent(g.members, rosterById);
                const top = (g.members || []).slice(0, 3);
                const selected = Number(groupId) === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selectGroup(g.id)}
                    className="text-right rounded-2xl border p-4 bg-white shadow-sm transition hover:shadow-md"
                    style={{
                      borderColor: selected ? STUDIO.brand : STUDIO.border,
                      boxShadow: selected ? '0 0 0 2px rgba(5,150,105,0.2)' : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: STUDIO.ink }}>{g.name}</h3>
                        <p className="text-xs mt-1" style={{ color: STUDIO.muted }}>
                          {g.member_count} عضو
                          {avg != null ? ` · میانگین اجرا ${avg}٪` : ' · بدون داده اجرا'}
                        </p>
                      </div>
                      <Users size={18} style={{ color: STUDIO.brand }} />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex -space-x-2 space-x-reverse">
                        {top.map((m) => (
                          <span
                            key={m.user_id}
                            className="w-8 h-8 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white"
                            style={{ background: STUDIO.brand }}
                            title={m.full_name}
                          >
                            {initials(m.full_name)}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate flex-1">
                        {top.map((m) => m.full_name || m.phone_number).join('، ') || 'بدون عضو'}
                      </p>
                    </div>
                    <div className="mt-3">
                      <p className="text-[10px] text-gray-400 mb-1">فشار تقریبی هفته</p>
                      <CapacityHeatstrip members={g.members} rosterById={rosterById} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Card className="!p-3 max-h-64 overflow-y-auto">
              {students.map((s) => (
                <label key={s.user_id} className="flex items-center gap-2 py-1.5 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={manualIds.includes(s.user_id)}
                    onChange={() => toggleManual(s.user_id)}
                    className="accent-emerald-600"
                  />
                  <span>{s.full_name || s.phone_number}</span>
                </label>
              ))}
            </Card>
          )}

          {audience === 'group' && (
            <Card className="!p-4" style={{ border: `1px solid ${STUDIO.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} style={{ color: STUDIO.brand }} />
                <h3 className="font-bold text-sm" style={{ color: STUDIO.brandStrong }}>
                  دستیار پیشنهاد (قاعده‌محور)
                </h3>
              </div>
              <ul className="flex flex-col gap-3">
                {insights.map((ins) => (
                  <li
                    key={ins.id}
                    className="rounded-xl p-3 text-sm leading-relaxed"
                    style={{ background: STUDIO.brandSoft, color: STUDIO.ink }}
                  >
                    <p>{ins.text}</p>
                    {ins.groupId != null && (
                      <button
                        type="button"
                        className="mt-2 text-xs font-bold"
                        style={{ color: STUDIO.brandStrong }}
                        onClick={() => selectGroup(ins.groupId)}
                      >
                        {ins.actionLabel} ←
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <PrimaryButton
            disabled={!canGoDemand}
            onClick={() => setStep(1)}
            style={{ background: STUDIO.brand }}
          >
            ادامه به بازه و تقاضا
          </PrimaryButton>
        </>
      )}

      {/* —— گام ۱ —— */}
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
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-600">تقاضای هر درس</p>
            {demands.map((row) => {
              const profile = catalogByName[row.subject.trim()];
              return (
                <div key={row.key} className="rounded-xl border border-gray-100 p-3 flex flex-col gap-2">
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      value={row.subject}
                      onChange={(e) => setDemands((prev) => prev.map((d) => (
                        d.key === row.key ? { ...d, subject: e.target.value } : d
                      )))}
                      placeholder="نام درس"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      list="planning-subject-names"
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={1}
                        value={row.amount}
                        onChange={(e) => setDemands((prev) => prev.map((d) => (
                          d.key === row.key ? { ...d, amount: e.target.value } : d
                        )))}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      />
                      <select
                        value={row.unit}
                        onChange={(e) => setDemands((prev) => prev.map((d) => (
                          d.key === row.key ? { ...d, unit: e.target.value } : d
                        )))}
                        className="rounded-xl border border-gray-200 px-2 py-2 text-sm bg-white"
                      >
                        <option value="minutes">دقیقه</option>
                        <option value="count">تست</option>
                      </select>
                    </div>
                    <select
                      value={row.unit === 'count' ? 'test' : row.activity}
                      disabled={row.unit === 'count'}
                      onChange={(e) => setDemands((prev) => prev.map((d) => (
                        d.key === row.key ? { ...d, activity: e.target.value } : d
                      )))}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                    >
                      <option value="study">مطالعه</option>
                      <option value="test">تست‌زنی</option>
                      <option value="review">مرور</option>
                      <option value="solve">حل سوال</option>
                    </select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="text-[11px] text-gray-500">
                      اهمیت {row.priority} · {PRIORITY_HINT[row.priority - 1]}
                      <input
                        type="range" min={1} max={5}
                        value={row.priority}
                        onChange={(e) => setDemands((prev) => prev.map((d) => (
                          d.key === row.key ? { ...d, priority: Number(e.target.value) } : d
                        )))}
                        className="w-full accent-emerald-600"
                      />
                    </label>
                    <label className="text-[11px] text-gray-500">
                      شناوری {row.movability} · {MOVABILITY_HINT[row.movability]}
                      <input
                        type="range" min={0} max={4}
                        value={row.movability}
                        onChange={(e) => setDemands((prev) => prev.map((d) => (
                          d.key === row.key ? { ...d, movability: Number(e.target.value) } : d
                        )))}
                        className="w-full accent-emerald-600"
                      />
                    </label>
                  </div>
                  {profile && (
                    <p className="text-[11px] text-emerald-700">
                      تگ کاتالوگ: {(profile.tags || []).join('، ') || 'بدون تگ'}
                      {profile.is_analytical ? ' · تحلیلی (بلوک سنگین)' : ''}
                    </p>
                  )}
                  {demands.length > 1 && (
                    <button
                      type="button"
                      className="self-start text-[11px] text-red-500"
                      onClick={() => setDemands((prev) => prev.filter((d) => d.key !== row.key))}
                    >
                      حذف درس
                    </button>
                  )}
                </div>
              );
            })}
            <datalist id="planning-subject-names">
              {(catalog?.subjects || []).map((s) => (
                <option key={s.name} value={s.name} />
              ))}
            </datalist>
            <SecondaryButton type="button" onClick={() => setDemands((prev) => [...prev, newDemand()])}>
              + درس دیگر
            </SecondaryButton>
          </div>
          <label className="text-xs text-gray-500">
            فشردگی — طول بلوک و استراحت بعد از هر تگ
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
            >
              <option value="light">سبک (۶۰ دقیقه + ۱۵ استراحت)</option>
              <option value="normal">عادی (۹۰ دقیقه + ۱۵ استراحت)</option>
              <option value="heavy">سنگین (۱۲۰ دقیقه + ۱۰ استراحت)</option>
            </select>
          </label>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setStep(0)}>بازگشت</SecondaryButton>
            <PrimaryButton
              disabled={!canPreview || previewMutation.isPending}
              style={{ background: STUDIO.brand }}
              onClick={() => {
                setExcludedIds([]);
                setCommittedIds([]);
                previewMutation.mutate(buildBody());
              }}
            >
              {previewMutation.isPending ? 'در حال محاسبه…' : 'پیش‌نمایش'}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {/* —— گام ۲: پیش‌نمایش غنی —— */}
      {step === 2 && preview && (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 text-sm items-center">
            <span>بلوک‌ها: <b>{preview.total_blocks}</b></span>
            <span>
              باقی‌مانده در بچ:{' '}
              <b>{previewStudents.filter((s) => !excludedIds.includes(s.student_id)).length}</b>
            </span>
            {preview.has_deadlock && (
              <span className="text-red-600 font-semibold">تداخل/کسری ظرفیت در برخی افراد</span>
            )}
            {committedIds.length > 0 && (
              <span className="text-emerald-700 text-xs font-semibold">
                {committedIds.length} نفر به‌صورت فردی ثبت و از بچ خارج شدند
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={previewSearch}
              onChange={(e) => setPreviewSearch(e.target.value)}
              placeholder="جست‌وجوی نام…"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="flex gap-1 p-1 rounded-xl bg-gray-50">
              {[
                ['all', 'همه'],
                ['ok', 'بدون تداخل'],
                ['conflict', 'تداخل/کسری'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreviewFilter(id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: previewFilter === id ? STUDIO.brand : 'transparent',
                    color: previewFilter === id ? '#fff' : STUDIO.muted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: STUDIO.border }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-gray-400 border-b bg-gray-50">
                  <th className="py-2.5 px-3 text-right">حذف از بچ</th>
                  <th className="py-2.5 px-3 text-right">نام</th>
                  <th className="py-2.5 px-3 text-right">وضعیت</th>
                  <th className="py-2.5 px-3 text-right">بلوک</th>
                  <th className="py-2.5 px-3 text-right">کسری</th>
                  <th className="py-2.5 px-3 text-right">اقدام</th>
                </tr>
              </thead>
              <tbody>
                {previewStudents.map((s) => {
                  const conflict = s.has_deadlock || s.shortfall_minutes > 0;
                  const dropped = excludedIds.includes(s.student_id);
                  return (
                    <tr
                      key={s.student_id}
                      className="border-b border-gray-50"
                      style={{ opacity: dropped ? 0.45 : 1 }}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={dropped}
                          onChange={() => {
                            setExcludedIds((prev) =>
                              prev.includes(s.student_id)
                                ? prev.filter((x) => x !== s.student_id)
                                : [...prev, s.student_id],
                            );
                          }}
                          className="accent-emerald-600"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{s.student_name || s.student_id}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: conflict ? '#FEF3C7' : STUDIO.brandSoft,
                            color: conflict ? STUDIO.warn : STUDIO.brandStrong,
                          }}
                        >
                          {conflict ? 'تداخل/کسری' : 'آماده'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums">{s.blocks?.length ?? 0}</td>
                      <td className="py-2.5 px-3">
                        {s.shortfall_minutes ? formatMinutes(s.shortfall_minutes) : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setCalendarStudent(s)}
                          className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white"
                          style={{ background: STUDIO.brand }}
                        >
                          <CalendarDays size={14} />
                          مشاهده تقویم
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {previewStudents.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">
                دانش‌آموزی با این فیلتر در بچ نمانده است
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setStep(1)}>بازگشت</SecondaryButton>
            <SecondaryButton
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate(buildBody())}
            >
              پیش‌نمایش دوباره
            </SecondaryButton>
            <PrimaryButton
              style={{ background: STUDIO.brand }}
              disabled={previewStudents.filter((s) => !excludedIds.includes(s.student_id)).length === 0}
              onClick={() => setStep(3)}
            >
              ادامه به انتشار
            </PrimaryButton>
          </div>
        </Card>
      )}

      {/* —— گام ۳ —— */}
      {step === 3 && !publishResult && (
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            حالت انتشار را انتخاب کنید. پیشنهادی به اینباکس دانش‌آموز می‌رود؛ قطعی فقط در فضاهای خالی می‌نشیند.
            افراد ثبت‌شده‌ی فردی از این بچ حذف شده‌اند.
          </p>
          <div className="flex gap-2">
            <SecondaryButton
              className={mode === 'suggested' ? '!bg-emerald-50 !text-emerald-800' : ''}
              onClick={() => setMode('suggested')}
            >
              پیشنهادی
            </SecondaryButton>
            <SecondaryButton
              className={mode === 'forced' ? '!bg-emerald-50 !text-emerald-800' : ''}
              onClick={() => setMode('forced')}
            >
              قطعی
            </SecondaryButton>
          </div>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            پیام هدف هفته برای دانش‌آموز
            <textarea
              value={goalMessage}
              onChange={(e) => setGoalMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="مثلاً: هدف این هفته ما: افزایش ۳۰ درصدی تست‌های فیزیک و تسلط روی مبحث توابع است. آماده‌ای؟"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setStep(2)}>بازگشت</SecondaryButton>
            <PrimaryButton
              disabled={publishMutation.isPending}
              style={{ background: STUDIO.brand }}
              onClick={() =>
                publishMutation.mutate({
                  ...buildBody(),
                  mode,
                  goal_message: goalMessage.trim(),
                })
              }
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
          </p>
          <div className="flex gap-2">
            <PrimaryButton
              style={{ background: STUDIO.brand }}
              onClick={() => navigateToTab('analytics')}
            >
              رفتن به تاریخچه
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setPublishResult(null);
                setPreview(null);
                setStep(0);
                setExcludedIds([]);
                setCommittedIds([]);
              }}
            >
              برنامه جدید
            </SecondaryButton>
          </div>
        </Card>
      )}

      {step === 2 && !preview && <EmptyState message="پیش‌نمایش موجود نیست" />}

      {calendarStudent && (
        <PreviewCalendarModal
          student={calendarStudent}
          windowStart={preview?.window?.start}
          onClose={() => setCalendarStudent(null)}
          onCommitted={onIndividualCommitted}
        />
      )}
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
