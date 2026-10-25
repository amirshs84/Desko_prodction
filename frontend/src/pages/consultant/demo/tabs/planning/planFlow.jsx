import { useMemo } from 'react';
import { CalendarDays, Sparkles, Users } from 'lucide-react';
import { formatMinutes } from '../../components/DemoUi';
import { PANEL } from '../../constants/theme';
import { faNum } from '../../lib/format';
import { PreviewCalendarModal } from './PreviewCalendarModal';
import { buildInsights } from './weeklyPlanModel';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6A49]';

export function AudienceSwitch({ plan }) {
  return (
    <div className="flex h-11 rounded-2xl bg-white border border-[#E5EEE9] p-1 shadow-sm shrink-0" role="group" aria-label="نوع مخاطب">
      {[
        ['group', 'گروه'],
        ['manual', 'انتخاب دستی'],
      ].map(([id, label]) => {
        const active = plan.audience === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => plan.setAudience(id)}
            className={`px-3 rounded-xl text-[12px] font-extrabold ${FOCUS}`}
            style={{ background: active ? '#0F6A49' : 'transparent', color: active ? '#fff' : '#17352C' }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ManualPicker({ open, onToggle, plan }) {
  return (
    <div className={`relative min-w-0 flex-1 ${open ? 'z-30' : ''}`} data-plan-popover>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`w-full h-11 px-3 rounded-2xl bg-white border border-[#E5EEE9] text-sm font-bold text-[#17352C] shadow-sm inline-flex items-center gap-2 ${FOCUS}`}
      >
        <Users size={16} color={PANEL.green} />
        <span className="truncate flex-1 text-right">دانش‌آموزان ({faNum(plan.manualIds.length)})</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[220px] max-h-64 overflow-y-auto rounded-2xl bg-white border border-[#E5EEE9] shadow-xl p-2">
          {plan.students.length === 0 && (
            <p className="text-xs text-[#7C8B85] px-2 py-3">فهرست دانش‌آموزان در دسترس نیست</p>
          )}
          {plan.students.map((student) => (
            <label key={student.user_id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-[#17352C]">
              <input
                type="checkbox"
                checked={plan.manualIds.includes(student.user_id)}
                onChange={() => plan.toggleManual(student.user_id)}
                className="accent-[#0F6A49]"
              />
              <span className="truncate">{student.full_name || student.phone_number}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function CapacityHeatstrip({ members, rosterById }) {
  const load = members?.length
    ? members.reduce((sum, member) => sum + (rosterById[member.user_id]?.study_seconds || 0), 0) / members.length / 3600
    : 0;
  const weights = [0.7, 1.1, 1.2, 1.15, 1.0, 0.5, 0.35];
  const days = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  return (
    <div className="flex gap-1 items-end h-10" title="فشار تقریبی هفته">
      {days.map((day, index) => {
        const level = Math.min(1, (load / 14) * weights[index]);
        return (
          <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
            <div
              className="w-full rounded-sm bg-[#0F6A49]"
              style={{ height: `${10 + level * 22}px`, opacity: 0.28 + level * 0.72 }}
            />
            <span className="text-[9px] text-[#7C8B85]">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

export function InsightCard({ plan }) {
  const insights = useMemo(
    () => buildInsights(plan.liveGroups, plan.rosterById),
    [plan.liveGroups, plan.rosterById],
  );
  if (!plan.liveGroups.length || plan.audience !== 'group') return null;
  return (
    <div className="rounded-2xl bg-[#F3FBF6] border border-[#E5EEE9] p-3">
      <p className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#0F6A49] mb-2">
        <Sparkles size={14} />
        پیشنهاد گروه
      </p>
      <ul className="flex flex-col gap-2">
        {insights.map((item) => (
          <li key={item.id} className="text-[12px] leading-5 text-[#17352C]">
            <p>{item.text}</p>
            {item.groupId != null && (
              <button
                type="button"
                onClick={() => plan.setGroupId(item.groupId)}
                className={`mt-1 text-[11px] font-extrabold text-[#0F6A49] ${FOCUS}`}
              >
                {item.actionLabel}
              </button>
            )}
          </li>
        ))}
      </ul>
      {plan.selectedLiveGroup && (
        <div className="mt-3">
          <p className="text-[10px] text-[#7C8B85] mb-1">فشار تقریبی هفته</p>
          <CapacityHeatstrip members={plan.selectedLiveGroup.members} rosterById={plan.rosterById} />
        </div>
      )}
    </div>
  );
}

export function PlanAlert({ message, onRetry, pending }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl bg-red-50 text-red-700 text-sm px-3 py-2 flex items-center justify-between gap-2">
      <p className="min-w-0">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={pending}
          className={`shrink-0 h-8 px-2.5 rounded-xl bg-white text-xs font-extrabold text-red-700 disabled:opacity-60 ${FOCUS}`}
        >
          تلاش دوباره
        </button>
      )}
    </div>
  );
}

export function PreviewBoard({ plan }) {
  if (!plan.preview && !plan.previewError) return null;
  const remaining = (plan.preview?.students || []).filter(
    (student) => !plan.excludedIds.includes(student.student_id) && !plan.committedIds.includes(student.student_id),
  ).length;
  return (
    <section className="rounded-[24px] bg-white border border-[#E5EEE9] shadow-[0_10px_28px_rgba(18,70,45,0.05)] p-4 min-w-0">
      <h2 className="text-[15px] font-extrabold text-[#17352C] mb-3">پیش‌نمایش گروهی</h2>
      {plan.previewError && (
        <div className="mb-3">
          <PlanAlert message={plan.previewError} onRetry={plan.retryPreview} pending={plan.busy} />
        </div>
      )}
      {plan.preview && (
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap gap-3 text-sm text-[#17352C]">
            <span>بلوک‌ها: <b>{faNum(plan.preview?.total_blocks ?? 0)}</b></span>
            <span>باقی‌مانده در بچ: <b>{faNum(remaining)}</b></span>
            {plan.preview?.has_deadlock && (
              <span className="text-red-600 font-bold">تداخل یا کسری ظرفیت در برخی افراد</span>
            )}
            {plan.committedIds.length > 0 && (
              <span className="text-[#0F6A49] text-xs font-bold">
                {faNum(plan.committedIds.length)} نفر فردی ثبت و از بچ خارج شدند
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <input
              value={plan.previewSearch}
              onChange={(event) => plan.setPreviewSearch(event.target.value)}
              placeholder="جست‌وجوی نام"
              aria-label="جست‌وجوی دانش‌آموز در پیش‌نمایش"
              className={`flex-1 min-w-0 h-10 rounded-xl border border-[#E5EEE9] px-3 text-sm ${FOCUS}`}
            />
            <div className="flex gap-1 p-1 rounded-xl bg-[#F3F6F4] shrink-0">
              {[
                ['all', 'همه'],
                ['ok', 'بدون تداخل'],
                ['conflict', 'تداخل'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={plan.previewFilter === id}
                  onClick={() => plan.setPreviewFilter(id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${FOCUS}`}
                  style={{
                    background: plan.previewFilter === id ? '#0F6A49' : 'transparent',
                    color: plan.previewFilter === id ? '#fff' : '#5E6E68',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#E5EEE9]">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-[11px] text-[#7C8B85] border-b bg-[#F8FBFA]">
                  <th className="py-2.5 px-3 text-right font-bold">حذف از بچ</th>
                  <th className="py-2.5 px-3 text-right font-bold">نام</th>
                  <th className="py-2.5 px-3 text-right font-bold">وضعیت</th>
                  <th className="py-2.5 px-3 text-right font-bold">بلوک</th>
                  <th className="py-2.5 px-3 text-right font-bold">کسری</th>
                  <th className="py-2.5 px-3 text-right font-bold">اقدام</th>
                </tr>
              </thead>
              <tbody>
                {plan.previewStudents.map((student) => {
                  const conflict = student.has_deadlock || student.shortfall_minutes > 0;
                  const dropped = plan.excludedIds.includes(student.student_id);
                  return (
                    <tr key={student.student_id} className="border-b border-[#F3F6F4]" style={{ opacity: dropped ? 0.45 : 1 }}>
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          aria-label={`حذف ${student.student_name || student.student_id} از بچ`}
                          checked={dropped}
                          onChange={() => plan.toggleBatchExcluded(student.student_id)}
                          className="accent-[#0F6A49]"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#17352C]">{student.student_name || student.student_id}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: conflict ? '#FEF3C7' : '#E6F6EC', color: conflict ? '#A16207' : '#0F6A49' }}
                        >
                          {conflict ? 'تداخل/کسری' : 'آماده'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums">{faNum(student.blocks?.length ?? 0)}</td>
                      <td className="py-2.5 px-3">{student.shortfall_minutes ? formatMinutes(student.shortfall_minutes) : '—'}</td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => plan.setCalendarStudent(student)}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white ${FOCUS}`}
                          style={{ background: PANEL.green }}
                        >
                          <CalendarDays size={14} />
                          تقویم
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {plan.previewStudents.length === 0 && (
              <p className="text-center text-sm text-[#7C8B85] py-8">دانش‌آموزی با این فیلتر در بچ نمانده است</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={plan.retryPreview}
              disabled={plan.busy}
              className={`h-10 px-3 rounded-xl border border-[#E5EEE9] text-sm font-bold text-[#17352C] disabled:opacity-60 ${FOCUS}`}
            >
              {plan.busy ? 'در حال محاسبه…' : 'پیش‌نمایش دوباره'}
            </button>
            <button
              type="button"
              onClick={() => plan.setPublishOpen(true)}
              disabled={remaining === 0}
              className={`h-10 px-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 ${FOCUS}`}
              style={{ background: PANEL.green }}
            >
              ادامه به انتشار
            </button>
          </div>
        </div>
      )}
      {plan.calendarStudent && (
        <PreviewCalendarModal
          student={plan.calendarStudent}
          windowStart={plan.preview?.window?.start}
          onClose={() => plan.setCalendarStudent(null)}
          onCommitted={plan.onIndividualCommitted}
        />
      )}
    </section>
  );
}

export function PublishSheet({ plan }) {
  if (!plan.publishOpen) return null;
  if (plan.publishResult) {
    return (
      <div className="rounded-2xl border border-[#E5EEE9] bg-[#F3FBF6] p-3 flex flex-col gap-2">
        <p className="text-sm font-extrabold text-[#17352C]">انتشار انجام شد</p>
        <p className="text-xs text-[#3E524A]">
          حالت: {plan.publishResult.mode === 'forced' ? 'قطعی' : 'پیشنهادی'}
          {' · '}
          رویدادها: {faNum(plan.publishResult.created_events ?? 0)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => plan.navigateToTab('analytics')}
            className={`h-9 px-3 rounded-xl text-white text-xs font-bold ${FOCUS}`}
            style={{ background: PANEL.green }}
          >
            رفتن به گزارش‌ها
          </button>
          <button
            type="button"
            onClick={plan.resetPublish}
            className={`h-9 px-3 rounded-xl border border-[#E5EEE9] text-xs font-bold text-[#17352C] ${FOCUS}`}
          >
            برنامه جدید
          </button>
        </div>
      </div>
    );
  }
  return (
    <div data-plan-popover className="rounded-2xl border border-[#E5EEE9] bg-white p-3 flex flex-col gap-3">
      <p className="text-sm font-extrabold text-[#17352C]">انتشار برنامه</p>
      <p className="text-[12px] leading-5 text-[#5E6E68]">
        پیشنهادی به اینباکس دانش‌آموز می‌رود. قطعی فقط در جاهای خالی تقویم می‌نشیند.
      </p>
      <div className="flex gap-2" role="group" aria-label="حالت انتشار">
        {[
          ['suggested', 'پیشنهادی'],
          ['forced', 'قطعی'],
        ].map(([id, label]) => {
          const active = plan.mode === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => plan.setMode(id)}
              className={`h-9 px-3 rounded-xl text-xs font-extrabold ${FOCUS}`}
              style={{ background: active ? '#E6F6EC' : '#F3F6F4', color: active ? '#0F6A49' : '#17352C' }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <label className="text-[12px] font-bold text-[#17352C] flex flex-col gap-1">
        پیام هدف هفته
        <textarea
          value={plan.goalMessage}
          onChange={(event) => plan.setGoalMessage(event.target.value.slice(0, 500))}
          maxLength={500}
          rows={3}
          placeholder="هدف این هفته را برای دانش‌آموز بنویسید"
          className={`rounded-xl border border-[#E5EEE9] px-3 py-2 text-sm font-medium ${FOCUS}`}
        />
      </label>
      {plan.publishError && <p className="text-xs font-bold text-red-600">{plan.publishError}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => plan.setPublishOpen(false)}
          className={`h-10 px-3 rounded-xl border border-[#E5EEE9] text-sm font-bold text-[#17352C] ${FOCUS}`}
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={plan.publish}
          disabled={plan.publishing}
          className={`h-10 px-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 ${FOCUS}`}
          style={{ background: PANEL.green }}
        >
          {plan.publishing ? 'در حال انتشار…' : 'انتشار'}
        </button>
      </div>
    </div>
  );
}
