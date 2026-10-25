import { CalendarDays, Sparkles, Users } from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { AudienceSwitch, InsightCard, ManualPicker, PreviewBoard } from './planFlow';
import { RangePicker } from './rangePicker';
import { usePlanChrome, useWeeklyPlan } from './weeklyPlanModel';
import {
  DesktopPlanGrid,
  ExceptionPanel,
  GenerateButton,
  PlanNotice,
  PlanSelect,
  QuickApply,
  SubjectSettings,
} from './weeklyPieces';

const CARD = 'bg-white rounded-[24px] border border-[#E5EEE9] shadow-[0_10px_28px_rgba(18,70,45,0.05)]';

export default function WeeklyPlanDesktop() {
  const plan = useWeeklyPlan();
  const [menu, setMenu] = usePlanChrome(plan);

  return (
    <div className="px-4 xl:px-6 pb-8 flex flex-col gap-4 min-w-0">
      <section className="relative z-20 rounded-[28px] px-2 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col items-start gap-2 min-w-0">
            <h1 className="inline-flex items-center gap-2 text-[22px] font-extrabold" style={{ color: PANEL.greenText }}>
              <CalendarDays size={22} />
              برنامه‌ریزی هفتگی
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4CC] text-[#A16207] text-xs font-bold px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
              پیش‌نویس (ثبت موقت - ذخیره خودکار)
            </span>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xl min-w-0">
            <div className="flex flex-wrap gap-2">
              <ExceptionPanel
                open={menu === 'exception'}
                onToggle={() => setMenu((current) => (current === 'exception' ? null : 'exception'))}
                excluded={plan.excluded}
                onToggleStudent={plan.toggleExcluded}
              />
              <AudienceSwitch plan={plan} />
              <div className="flex-1 min-w-[220px]">
                {plan.audience === 'group' ? (
                  <PlanSelect
                    icon={Users}
                    menuLabel="گروه"
                    valueLabel={plan.groupValueLabel}
                    open={menu === 'group'}
                    onToggle={() => setMenu((current) => (current === 'group' ? null : 'group'))}
                    selected={plan.groupId}
                    onSelect={(id) => {
                      plan.setGroupId(id);
                      setMenu(null);
                    }}
                    options={plan.groupOptions}
                  />
                ) : (
                  <ManualPicker
                    open={menu === 'manual'}
                    onToggle={() => setMenu((current) => (current === 'manual' ? null : 'manual'))}
                    plan={plan}
                  />
                )}
              </div>
            </div>
            <RangePicker
              start={plan.range.start}
              end={plan.range.end}
              onChange={plan.setRange}
              onOpen={() => setMenu(null)}
            />
            {plan.usingSamples && plan.audience === 'group' && (
              <p className="text-[11px] leading-5 text-[#7C8B85]">
                گروه‌های نمونه فقط برای چیدمان محلی هستند. پیش‌نمایش واقعی با گروه حساب شما یا انتخاب دستی ساخته می‌شود.
              </p>
            )}
          </div>
        </div>
      </section>

      <PlanNotice notice={plan.notice} />

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] items-start min-w-0">
        <section className={`${CARD} p-4 flex flex-col gap-3 min-w-0`}>
          <h2 className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-[#17352C]">
            <Sparkles size={16} color="#E0A106" />
            بخش ۱: تنظیمات الگوریتم
          </h2>
          <QuickApply plan={plan} />
          <SubjectSettings plan={plan} />
          <InsightCard plan={plan} />
          <GenerateButton plan={plan} />
        </section>

        <section className={`${CARD} p-4 min-w-0`}>
          <h2 className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-[#17352C] mb-3">
            <Sparkles size={16} color="#E0A106" />
            بخش ۲: پیش‌نمایش زنده و ویرایش جدول (خروجی الگوریتم)
          </h2>
          <DesktopPlanGrid plan={plan} />
        </section>
      </div>
      <PreviewBoard plan={plan} />
    </div>
  );
}
