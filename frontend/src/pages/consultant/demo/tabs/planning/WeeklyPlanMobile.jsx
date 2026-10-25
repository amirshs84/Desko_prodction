import { useState } from 'react';
import { Bell, CalendarDays, ChevronDown, Eye, Menu, Settings, Users } from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { InitialAvatar } from '../../components/PanelArt';
import { consultantIdentity } from '../../lib/format';
import { performLogout } from '../../../../../utils/auth';
import { AudienceSwitch, InsightCard, ManualPicker, PreviewBoard } from './planFlow';
import { RangePicker } from './rangePicker';
import { usePlanChrome, useWeeklyPlan } from './weeklyPlanModel';
import {
  ExceptionPanel,
  GenerateButton,
  MobilePlanGrid,
  PlanNotice,
  PlanSelect,
  QuickApply,
  SubjectSettings,
} from './weeklyPieces';

export default function WeeklyPlanMobile({ onMenuClick }) {
  const plan = useWeeklyPlan();
  const [menu, setMenu] = usePlanChrome(plan);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const identity = consultantIdentity();

  const logout = async () => {
    setAccountOpen(false);
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    await performLogout();
  };

  return (
    <div className="px-4 sm:px-6 pb-4 max-w-3xl mx-auto w-full min-w-0 flex flex-col gap-3">
      <header>
        <div className="flex items-center justify-between gap-3 pt-3">
          <div className="relative" data-plan-popover>
            <button
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              className="flex items-center gap-2 min-w-0 text-right"
              aria-expanded={accountOpen}
            >
              <InitialAvatar name={identity.full} size={40} />
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold truncate" style={{ color: PANEL.ink }}>{identity.full}</span>
                <span className="block text-[11px]" style={{ color: PANEL.muted }}>{identity.role}</span>
              </span>
            </button>
            {accountOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-30 w-40 rounded-2xl bg-white p-1.5 shadow-xl border border-[#E5EEE9]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="w-full text-right px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50"
                >
                  خروج از حساب
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" data-plan-popover>
              <button
                type="button"
                aria-label="اعلان‌ها"
                onClick={() => setMenu((current) => (current === 'bell' ? null : 'bell'))}
                className="relative w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#17352C]"
              >
                <Bell size={20} />
                <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#E11D48]" />
              </button>
              {menu === 'bell' && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-56 rounded-2xl bg-white p-3 shadow-xl border border-[#E5EEE9] text-xs leading-5 text-[#17352C]">
                  ۳ دانش‌آموز هنوز برنامه این هفته را تایید نکرده‌اند.
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="باز کردن منو"
              onClick={onMenuClick}
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#17352C]"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col items-start gap-2">
          <h1 className="inline-flex items-center gap-2 text-[22px] font-extrabold" style={{ color: PANEL.greenText }}>
            <CalendarDays size={22} />
            برنامه‌ریزی هفتگی
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4CC] text-[#A16207] text-[11px] font-bold px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            پیش‌نویس (ثبت موقت - ذخیره خودکار)
          </span>
        </div>
      </header>

      <div className="relative z-20 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <ExceptionPanel
            open={menu === 'exception'}
            onToggle={() => setMenu((current) => (current === 'exception' ? null : 'exception'))}
            excluded={plan.excluded}
            onToggleStudent={plan.toggleExcluded}
          />
          <AudienceSwitch plan={plan} />
          <div className="flex-1 min-w-0">
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
            گروه‌های نمونه فقط برای چیدمان محلی هستند. پیش‌نمایش واقعی با گروه حساب یا انتخاب دستی ساخته می‌شود.
          </p>
        )}
      </div>

      <PlanNotice notice={plan.notice} />

      <section className="bg-white rounded-[24px] border border-[#E5EEE9] shadow-sm">
        <button
          type="button"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((value) => !value)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3"
        >
          <span className="inline-flex items-center gap-2 font-extrabold text-[#0F6A49]">
            <Settings size={18} />
            تنظیمات الگوریتم
          </span>
          <ChevronDown size={18} className={`text-[#7C8B85] transition ${settingsOpen ? 'rotate-180' : ''}`} />
        </button>
        {settingsOpen && (
          <div className="px-3 pb-3 flex flex-col gap-3">
            <QuickApply plan={plan} />
            <SubjectSettings plan={plan} />
            <InsightCard plan={plan} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-[24px] border border-[#E5EEE9] shadow-sm">
        <button
          type="button"
          aria-expanded={previewOpen}
          onClick={() => setPreviewOpen((value) => !value)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3"
        >
          <span className="inline-flex items-center gap-2 font-extrabold text-[#0F6A49] text-right min-w-0 leading-6">
            <Eye size={18} className="shrink-0" />
            پیش‌نمایش و ویرایش جدول (خروجی الگوریتم)
          </span>
          <ChevronDown size={18} className={`shrink-0 text-[#7C8B85] transition ${previewOpen ? 'rotate-180' : ''}`} />
        </button>
        {previewOpen && (
          <div className="px-3 pb-3">
            <MobilePlanGrid plan={plan} />
          </div>
        )}
      </section>

      <GenerateButton plan={plan} />
      <PreviewBoard plan={plan} />
    </div>
  );
}
