import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  Check,
  FileOutput,
  Send,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { InitialAvatar } from '../../components/PanelArt';
import { PANEL } from '../../constants/theme';
import { faNum } from '../../lib/format';
import { BALANCE, CRITICAL, GROUPS, GROWTH, PARENT_REPORTS, TREND } from './reportsModel';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6A49]';
const CARD = 'bg-white rounded-[22px] border border-[#E5EEE9] shadow-[0_10px_28px_rgba(18,70,45,0.05)]';

export function ReportsNotice({ notice }) {
  if (!notice) return null;
  return (
    <p role="status" className="rounded-2xl bg-[#E6F6EC] text-[#0F6A49] text-sm font-bold px-3 py-2">
      {notice}
    </p>
  );
}

export function ReportsSpotlight({ reports }) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(200px,0.72fr)_minmax(220px,0.9fr)] gap-3 items-stretch">
      <article className={`${CARD} p-4 flex items-center justify-between gap-3 min-w-0`}>
        <div className="min-w-0">
          <p className="text-[12.5px]" style={{ color: PANEL.muted }}>خلاصه تغییرات از آخرین بازدید شما</p>
          <p className="mt-1.5 text-[15px] sm:text-[17px] font-extrabold leading-7" style={{ color: PANEL.green }}>
            {faNum(4)} دانش‌آموز به لیست برترین‌ها صعود کرده‌اند
          </p>
        </div>
        <span className="w-11 h-11 rounded-2xl bg-[#E7F6EC] text-[#128A4C] flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </span>
      </article>

      <article className={`${CARD} p-4 flex items-center justify-between gap-3 min-w-0`}>
        <div className="min-w-0">
          <p className="text-[12.5px]" style={{ color: PANEL.muted }}>میانگین ساعت مطالعه</p>
          <p className="mt-1.5 text-[18px] font-extrabold inline-flex items-center gap-1" style={{ color: PANEL.green }}>
            <ArrowUp size={18} />
            {`${faNum(18)}٪ افزایش یافته`}
          </p>
        </div>
        <span className="w-11 h-11 rounded-2xl bg-[#E7F6EC] text-[#128A4C] flex items-center justify-center shrink-0">
          <BookOpen size={18} />
        </span>
      </article>

      <div className="rounded-[22px] bg-[#E7F6EC] min-h-[72px] flex items-center px-4">
        {reports.chip ? (
          <div className="relative z-10 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm max-w-full">
            <Check size={15} color="#128A4C" />
            <span className="text-[12.5px] font-bold truncate" style={{ color: PANEL.ink }}>
              {faNum(4)} پیشنهاد جدید از آخرین ورود شما
            </span>
            <button
              type="button"
              aria-label="بستن پیشنهادها"
              onClick={reports.dismissChip}
              className={`w-6 h-6 rounded-full inline-flex items-center justify-center ${FOCUS}`}
              style={{ color: PANEL.muted }}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PersonRow({ person, tone, noted, onOpen, onMessage }) {
  const up = tone === 'growth';
  return (
    <li className="rounded-2xl px-3 py-2.5 flex flex-wrap items-center gap-2.5 min-w-0" style={{ background: up ? '#F7FBF8' : '#FFF6F6' }}>
      <InitialAvatar name={person.name} size={36} />
      <button
        type="button"
        onClick={() => onOpen(person.name)}
        className={`min-w-0 flex-1 text-right ${FOCUS}`}
      >
        <span className="block text-[13.5px] font-extrabold truncate" style={{ color: PANEL.ink }}>{person.name}</span>
        <span className="block text-[11.5px] mt-0.5 truncate" style={{ color: PANEL.muted }}>
          {person.grade} • {person.track}
        </span>
      </button>
      <div className="text-left shrink-0">
        <p className="text-[15px] font-extrabold tabular-nums inline-flex items-center gap-0.5" style={{ color: up ? '#128A4C' : '#E25B4A' }}>
          {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {`${faNum(person.delta)}٪`}
        </p>
        <p className="text-[10.5px] mt-0.5" style={{ color: PANEL.muted }}>{person.metric}</p>
      </div>
      <button
        type="button"
        onClick={() => onMessage(person)}
        disabled={noted}
        className={`h-8 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap basis-full sm:basis-auto sm:shrink-0 ${FOCUS}`}
        style={{
          background: noted ? '#F4F6F5' : (up ? '#E7F8EE' : '#FDECEC'),
          color: noted ? PANEL.muted : (up ? '#128A4C' : '#E25B4A'),
        }}
      >
        {noted ? 'ثبت شد' : (up ? 'ارسال پیام انگیزشی' : 'ارسال پیام فوری')}
      </button>
    </li>
  );
}

export function MovementCards({ reports, onOpen }) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <article className={`${CARD} p-4 min-w-0`}>
        <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold mb-3" style={{ color: PANEL.ink }}>
          <Sparkles size={16} color="#128A4C" />
          دانش‌آموزان با بیشترین رشد در این هفته
        </h2>
        <ul className="flex flex-col gap-2">
          {GROWTH.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              tone="growth"
              noted={Boolean(reports.noted[person.id])}
              onOpen={onOpen}
              onMessage={(item) => reports.noteMessage(item, 'growth')}
            />
          ))}
        </ul>
      </article>

      <article className="rounded-[22px] border border-[#F6D5D5] bg-[#FFF8F8] p-4 min-w-0 shadow-[0_10px_28px_rgba(180,40,40,0.04)]">
        <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold" style={{ color: '#C2414A' }}>
          <TriangleAlert size={16} />
          گزارش تغییرات بحرانی و نیازمند توجه
        </h2>
        <p className="text-[12.5px] font-bold mt-2 mb-3" style={{ color: '#E25B4A' }}>
          دانش‌آموزان با افت شدید عملکرد در این هفته
        </p>
        <ul className="flex flex-col gap-2">
          {CRITICAL.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              tone="critical"
              noted={Boolean(reports.noted[person.id])}
              onOpen={onOpen}
              onMessage={(item) => reports.noteMessage(item, 'urgent')}
            />
          ))}
        </ul>
      </article>
    </section>
  );
}

function GroupsCard() {
  return (
    <article className={`${CARD} p-4 min-w-0`}>
      <h3 className="inline-flex items-center gap-2 text-[14px] font-extrabold mb-4" style={{ color: PANEL.ink }}>
        <BarChart3 size={16} color={PANEL.green} />
        عملکرد گروه‌های دانش‌آموزی
      </h3>
      <ul className="flex flex-col gap-3">
        {GROUPS.map((group) => (
          <li key={group.id} className="flex items-center gap-2 min-w-0">
            <span className="w-[5.6rem] shrink-0 text-[12.5px] font-bold" style={{ color: PANEL.ink }}>{group.label}</span>
            <span className="flex-1 h-2.5 rounded-full bg-[#F3F6F4] overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${group.percent}%`, background: group.color }} />
            </span>
            <span className="w-10 text-left text-[12.5px] font-extrabold tabular-nums" style={{ color: PANEL.ink }}>
              {`${faNum(group.percent)}٪`}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function BalanceCard() {
  return (
    <article className={`${CARD} p-4 min-w-0`}>
      <h3 className="text-[14px] font-extrabold mb-2" style={{ color: PANEL.ink }}>تعادل مطالعه (تشریحی / تستی)</h3>
      <div className="flex items-center justify-center gap-4 min-w-0">
        <ul className="flex flex-col gap-2 text-[12.5px]">
          {BALANCE.map((item) => (
            <li key={item.id} className="flex items-center gap-2 font-bold" style={{ color: PANEL.ink }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              {item.label}
              <span className="tabular-nums" style={{ color: PANEL.muted }}>{`${faNum(item.percent)}٪`}</span>
            </li>
          ))}
        </ul>
        <div className="relative w-[150px] h-[150px] shrink-0" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={BALANCE} dataKey="percent" innerRadius={48} outerRadius={68} startAngle={90} endAngle={-270} stroke="none">
                {BALANCE.map((item) => <Cell key={item.id} fill={item.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px]" style={{ color: PANEL.muted }}>کل مطالعه</span>
            <span className="text-[18px] font-extrabold" style={{ color: PANEL.green }}>{`${faNum(102)}٪`}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function TrendCard() {
  return (
    <article className={`${CARD} p-4 min-w-0`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-extrabold" style={{ color: PANEL.ink }}>روند ساعات مطالعه و تعداد آزمون‌ها</h3>
      </div>
      <div className="flex items-center gap-3 text-[11px] mb-2" style={{ color: PANEL.muted }}>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[#1F9D5A]" />ساعت مطالعه</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[#3B82F6]" />تعداد آزمون</span>
      </div>
      <div className="h-[180px] w-full min-w-0" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={TREND} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#E5EEE9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7C8B85' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#7C8B85' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 40]}
              ticks={[0, 10, 20, 30]}
              tickFormatter={(value) => faNum(value)}
              width={32}
            />
            <Line type="monotone" dataKey="hours" stroke="#1F9D5A" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="exams" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function AnalysisRow() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold" style={{ color: PANEL.ink }}>
        <BarChart3 size={16} color={PANEL.green} />
        تحلیل‌های کلی و روندها
      </h2>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <GroupsCard />
        <BalanceCard />
        <TrendCard />
      </div>
    </section>
  );
}

export function ParentReports({ reports, onOpen }) {
  return (
    <section className={`${CARD} p-4 min-w-0`}>
      <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold mb-3" style={{ color: PANEL.ink }}>
        <FileOutput size={16} color={PANEL.green} />
        گزارش‌های آماده ارسال به والدین
      </h2>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-[13px]">
          <thead>
            <tr style={{ color: PANEL.muted }}>
              <th className="font-semibold py-2 px-2">نام دانش‌آموز</th>
              <th className="font-semibold py-2 px-2">نوع گزارش</th>
              <th className="font-semibold py-2 px-2">تاریخ تهیه</th>
              <th className="font-semibold py-2 px-2">وضعیت</th>
              <th className="font-semibold py-2 px-2">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {PARENT_REPORTS.map((row) => {
              const done = Boolean(reports.sent[row.id]);
              return (
                <tr key={row.id} className="border-t border-[#F0F5F2]">
                  <td className="py-2.5 px-2">
                    <button type="button" onClick={() => onOpen(row.name)} className={`font-extrabold ${FOCUS}`} style={{ color: PANEL.ink }}>
                      {row.name}
                    </button>
                  </td>
                  <td className="py-2.5 px-2" style={{ color: PANEL.ink }}>{row.kind}</td>
                  <td className="py-2.5 px-2 tabular-nums" style={{ color: PANEL.ink }}>{faNum(row.date)}</td>
                  <td className="py-2.5 px-2">
                    <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: done ? PANEL.green : '#128A4C' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: done ? '#1F9D5A' : '#3DDC84' }} />
                      {done ? 'ارسال شد' : 'آماده تایید'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <button
                      type="button"
                      onClick={() => reports.sendReport(row)}
                      disabled={done}
                      className={`h-8 px-3 rounded-full text-[12px] font-bold text-white inline-flex items-center gap-1 ${FOCUS}`}
                      style={{ background: done ? '#9BB8AB' : PANEL.green }}
                    >
                      <Send size={13} />
                      {done ? 'ارسال شد' : 'بررسی و ارسال'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden flex flex-col gap-2">
        {PARENT_REPORTS.map((row) => {
          const done = Boolean(reports.sent[row.id]);
          return (
            <li key={row.id} className="rounded-2xl border border-[#F0F5F2] p-3">
              <button type="button" onClick={() => onOpen(row.name)} className={`font-extrabold ${FOCUS}`} style={{ color: PANEL.ink }}>
                {row.name}
              </button>
              <p className="text-[12.5px] mt-1" style={{ color: PANEL.muted }}>{row.kind}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[12px] tabular-nums" style={{ color: PANEL.ink }}>{faNum(row.date)}</span>
                <span className="text-[12px] font-bold" style={{ color: '#128A4C' }}>{done ? 'ارسال شد' : 'آماده تایید'}</span>
              </div>
              <button
                type="button"
                onClick={() => reports.sendReport(row)}
                disabled={done}
                className={`mt-2 h-9 w-full rounded-full text-[12.5px] font-bold text-white inline-flex items-center justify-center gap-1 ${FOCUS}`}
                style={{ background: done ? '#9BB8AB' : PANEL.green }}
              >
                <Send size={13} />
                {done ? 'ارسال شد' : 'بررسی و ارسال'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
