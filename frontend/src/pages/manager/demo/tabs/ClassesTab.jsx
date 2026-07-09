import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie,
} from 'recharts';
import {
  Plus, Settings, Download, Search, ChevronDown, SlidersHorizontal,
  Monitor, BookOpen, Users, UserCheck, AlertTriangle, CheckCircle2,
  MoreHorizontal, ChevronLeft, ChevronRight, TrendingUp, Star, ClipboardCheck,
  FileText, UserPlus, Pencil, Trash2, UserCog,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import { useManagerClasses } from '../hooks/useManagerClasses';
import ClassFormModal from '../components/ClassFormModal';
import ClassStudentsModal from '../components/ClassStudentsModal';
import ClassSettingsModal from '../components/ClassSettingsModal';
import {
  buildCapacitySummary,
  buildGradeDistribution,
  buildStudentCountBars,
  buildTopClassesByStudents,
  buildAttentionClasses,
  buildRecentActivities,
  buildFooterKpis,
  toPersianDigits,
  formatCount,
} from '../utils/classDataTransformers';
import { getIranDate } from '../../../../utils/dateUtils';
import { downloadBlob } from '../../../../utils/download';
import { managerAPI } from '../../../../api/client';

const GRADE_FILTER_OPTIONS = [
  { value: '', label: 'همه مقاطع' },
  { value: '7', label: 'هفتم' },
  { value: '8', label: 'هشتم' },
  { value: '9', label: 'نهم' },
  { value: '10', label: 'دهم' },
  { value: '11', label: 'یازدهم' },
  { value: '12', label: 'دوازدهم' },
  { value: 'graduate', label: 'فارغ‌التحصیل' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'true', label: 'فعال' },
  { value: 'false', label: 'غیرفعال' },
];

const RADIAN = Math.PI / 180;
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function CapacityIcon({ type, color }) {
  const props = { size: 18, color };
  switch (type) {
    case 'book': return <BookOpen {...props} />;
    case 'users': return <Users {...props} />;
    case 'capacity': return <UserCheck {...props} />;
    case 'alert': return <AlertTriangle {...props} />;
    case 'check': return <CheckCircle2 {...props} />;
    default: return <BookOpen {...props} />;
  }
}

function ActivityIcon({ type, color }) {
  const props = { size: 16, color };
  switch (type) {
    case 'plus': return <Plus {...props} />;
    case 'grade': return <FileText {...props} />;
    case 'attendance': return <ClipboardCheck {...props} />;
    case 'teacher': return <UserPlus {...props} />;
    default: return <FileText {...props} />;
  }
}

function FooterKpiIcon({ type, color }) {
  const props = { size: 18, color };
  switch (type) {
    case 'book': return <BookOpen {...props} />;
    case 'users': return <Users {...props} />;
    case 'star': return <Star {...props} />;
    case 'clipboard': return <ClipboardCheck {...props} />;
    default: return <BookOpen {...props} />;
  }
}

function ClassesPageHeader({ compact, onCreateClick, onSettingsClick }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#D1FAE5' }}
        >
          <Monitor size={22} color="#10B981" />
        </div>
        <div>
          <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>داشبورد کلاس‌ها</h1>
          <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            نمای کلی عملکرد و وضعیت کلاس‌ها
          </p>
        </div>
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-shrink-0'}`}>
        <button
          type="button"
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#10B981' }}
        >
          <Plus size={16} />
          <span>ایجاد کلاس جدید</span>
        </button>
        <button
          type="button"
          onClick={onSettingsClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <Settings size={16} color="#10B981" />
          <span>تنظیمات کلاس‌ها</span>
        </button>
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none flex items-center gap-2 pl-8 pr-4 py-2.5 rounded-2xl text-sm font-medium cursor-pointer"
        style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function ClassesFiltersRow({ compact, filters, updateFilter, onExport, showAdvanced, onToggleAdvanced }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center justify-between gap-4'}`}>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : ''}`}>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm min-w-[200px]"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}
        >
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            placeholder="جستجوی کلاس..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder:text-gray-400 text-sm"
          />
        </div>
        <FilterDropdown
          label="وضعیت"
          value={filters.is_active}
          options={STATUS_FILTER_OPTIONS}
          onChange={(v) => updateFilter('is_active', v)}
        />
        <FilterDropdown
          label="مقطع"
          value={filters.grade}
          options={GRADE_FILTER_OPTIONS}
          onChange={(v) => updateFilter('grade', v)}
        />
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="p-2.5 rounded-2xl hover:bg-white transition-all"
          style={{
            background: showAdvanced ? '#D1FAE5' : '#fff',
            border: '1px solid #E5E7EB',
          }}
          title="فیلتر پیشرفته"
        >
          <SlidersHorizontal size={18} color={showAdvanced ? '#10B981' : '#6B7280'} />
        </button>
      </div>
      <button
        type="button"
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium self-start"
        style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
      >
        <Download size={16} color="#10B981" />
        <span>خروجی اکسل</span>
      </button>
    </div>
  );
}

function PerformanceBarChart({ data }) {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۱. تعداد دانش‌آموزان هر کلاس</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">داده‌ای برای نمایش وجود ندارد</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 9, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, _name, props) => [`${toPersianDigits(props.payload.count)} نفر`, 'دانش‌آموز']}
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={36}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="label"
                  position="top"
                  style={{ fontSize: 10, fontWeight: 700, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 pt-3 border-t border-gray-100">
            بر اساس تعداد دانش‌آموزان ثبت‌نام‌شده در هر کلاس
          </p>
        </>
      )}
    </div>
  );
}

function SubjectDistributionChart({ data, total }) {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۳. توزیع کلاس‌ها بر اساس مقطع</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">داده‌ای برای نمایش وجود ندارد</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <PieChart width={150} height={150}>
              <Pie
                data={data}
                cx={70}
                cy={70}
                innerRadius={48}
                outerRadius={68}
                dataKey="value"
                labelLine={false}
                label={renderDonutLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500">مجموع کلاس‌ها</span>
              <span className="text-lg font-bold text-gray-900">{formatCount(total)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
                <span className="text-xs font-semibold text-gray-800">
                  ({toPersianDigits(item.value)}٪)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CapacitySummaryCard({ items }) {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۲. خلاصه ظرفیت کلاس‌ها</h3>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: item.bg }}
            >
              <CapacityIcon type={item.icon} color={item.color} />
            </div>
            <span className="text-sm text-gray-600 flex-1">{item.label}</span>
            <span className="text-sm font-bold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentCountBar({ count, max }) {
  const rate = max > 0 ? Math.round((count / max) * 100) : 0;
  const color = rate >= 75 ? '#10B981' : rate >= 40 ? '#14B8A6' : '#F59E0B';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
        <div className="h-full rounded-full" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-left">{formatCount(count)}</span>
    </div>
  );
}

function ClassActionMenu({ classItem, onEdit, onDelete, onManageStudents }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-gray-100"
      >
        <MoreHorizontal size={16} color="#9CA3AF" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-20 py-1 rounded-xl shadow-lg min-w-[160px]"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}
          >
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit(classItem); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={14} /> ویرایش
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onManageStudents(classItem); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <UserCog size={14} /> مدیریت دانش‌آموزان
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(classItem); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} /> حذف
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ClassesTable({
  compact, rows, loading, maxStudents, page, totalPages, pageSize, totalCount,
  goToPage, onEdit, onDelete, onManageStudents,
}) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page, '...', totalPages];
  }, [page, totalPages]);

  return (
    <div className="rounded-3xl p-5 overflow-hidden" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۴. لیست کلاس‌ها</h3>
      <div className={compact ? 'overflow-x-auto' : ''}>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['کد کلاس', 'نام کلاس', 'مقطع', 'تعداد دانش‌آموز', 'وضعیت', 'نسبت ظرفیت', 'عملیات'].map((col) => (
                <th key={col} className="text-xs text-gray-400 font-medium text-right pb-3 px-2 first:pr-0 last:pl-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm text-gray-500">در حال بارگذاری...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm text-gray-400">کلاسی یافت نشد</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3.5 px-2 first:pr-0 text-xs font-medium text-gray-500">{row.code}</td>
                  <td className="py-3.5 px-2 text-sm font-semibold text-gray-900">{row.name}</td>
                  <td className="py-3.5 px-2 text-xs text-gray-600">{row.grade_display}</td>
                  <td className="py-3.5 px-2 text-sm font-bold text-gray-800">
                    {formatCount(row.student_count || 0)}
                  </td>
                  <td className="py-3.5 px-2">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        background: row.is_active ? '#D1FAE5' : '#F3F4F6',
                        color: row.is_active ? '#059669' : '#6B7280',
                      }}
                    >
                      {row.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="py-3.5 px-2">
                    <StudentCountBar count={row.student_count || 0} max={maxStudents} />
                  </td>
                  <td className="py-3.5 px-2 last:pl-0">
                    <ClassActionMenu
                      classItem={row}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onManageStudents={onManageStudents}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          نمایش {toPersianDigits(start)} تا {toPersianDigits(end)} از {formatCount(totalCount)} ردیف
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
          {pageNumbers.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => typeof p === 'number' && goToPage(p)}
              disabled={p === '...'}
              className="w-8 h-8 rounded-lg text-xs font-medium disabled:cursor-default"
              style={{
                background: p === page ? '#10B981' : 'transparent',
                color: p === page ? '#fff' : '#6B7280',
              }}
            >
              {typeof p === 'number' ? toPersianDigits(p) : p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronLeft size={16} color="#9CA3AF" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TopAttendanceWidget({ items }) {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۵. پرجمعیت‌ترین کلاس‌ها</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">داده‌ای وجود ندارد</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.rank} className="flex items-center gap-3">
              <span className="text-lg">{item.medal}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.rate}%`, background: '#10B981' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-emerald-600">{formatCount(item.count)} نفر</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionNeededWidget({ items }) {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۶. کلاس‌های نیازمند توجه</h3>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: '#D1FAE5' }}>
          <CheckCircle2 size={16} color="#10B981" />
          <p className="text-sm text-emerald-700">همه کلاس‌ها وضعیت مناسبی دارند</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const isDanger = item.variant === 'danger';
            return (
              <div
                key={item.name}
                className="flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: isDanger ? '#FEF2F2' : '#FFFBEB' }}
              >
                <AlertTriangle size={16} color={isDanger ? '#EF4444' : '#F59E0B'} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: isDanger ? '#EF4444' : '#D97706' }}>
                    {item.issue}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentActivitiesWidget({ items }) {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۷. فعالیت‌های اخیر کلاس‌ها</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6 flex-1">فعالیتی ثبت نشده</p>
      ) : (
        <div className="flex flex-col gap-4 flex-1">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: item.bg }}
                >
                  <ActivityIcon type={item.icon} color={item.color} />
                </div>
                {i < items.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: '#E5E7EB', minHeight: 16 }} />
                )}
              </div>
              <div className="pb-1">
                <p className="text-sm text-gray-800 leading-snug">{item.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FooterKpiCards({ compact, items }) {
  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-4'}`}>
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-3xl p-4 flex items-center gap-3"
          style={CARD_STYLE}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: item.iconBg }}
          >
            <FooterKpiIcon type={item.icon} color={item.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500 font-medium truncate">{item.title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp size={10} color="#10B981" />
              <span className="text-xs font-medium text-emerald-500">{item.trend}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClassesBody({ compact }) {
  const {
    classes,
    paginatedClasses,
    meta,
    filters,
    updateFilter,
    page,
    totalPages,
    pageSize,
    goToPage,
    loading,
    error,
    actionLoading,
    createClass,
    updateClass,
    deleteClass,
  } = useManagerClasses();

  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [studentsModalClass, setStudentsModalClass] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const maxStudents = useMemo(
    () => Math.max(...classes.map((c) => c.student_count || 0), 1),
    [classes],
  );

  const capacitySummary = useMemo(
    () => buildCapacitySummary({
      activeCount: meta.active_count,
      totalStudents: meta.total_students,
      classes,
    }),
    [meta, classes],
  );

  const gradeDistribution = useMemo(() => buildGradeDistribution(classes), [classes]);
  const performanceBars = useMemo(() => buildStudentCountBars(classes), [classes]);
  const topClasses = useMemo(() => buildTopClassesByStudents(classes), [classes]);
  const attentionClasses = useMemo(() => buildAttentionClasses(classes), [classes]);
  const recentActivities = useMemo(() => buildRecentActivities(classes), [classes]);
  const footerKpis = useMemo(
    () => buildFooterKpis({
      activeCount: meta.active_count,
      totalStudents: meta.total_students,
      classes,
    }),
    [meta, classes],
  );

  const handleCreateClick = () => {
    setEditingClass(null);
    setFormOpen(true);
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormOpen(true);
  };

  const handleDelete = async (classItem) => {
    if (!window.confirm(`کلاس «${classItem.name}» حذف شود؟`)) return;
    const result = await deleteClass(classItem.id);
    if (!result.ok) alert(result.error);
  };

  const handleFormSubmit = async (data) => {
    if (editingClass) return updateClass(editingClass.id, data);
    return createClass(data);
  };

  const handleExportExcel = async () => {
    const today = getIranDate();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startDate = thirtyDaysAgo.toLocaleDateString('en-CA');
    const endDate = today.toLocaleDateString('en-CA');

    try {
      const response = await managerAPI.exportExcelBlob({ start_date: startDate, end_date: endDate });
      const blob = response.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        alert('فایلی دریافت نشد.');
        return;
      }
      await downloadBlob(blob, `students_${startDate}_${endDate}.xlsx`);
    } catch (err) {
      const msg = err.response?.status === 401
        ? 'نشست نامعتبر است؛ لطفاً دوباره وارد شوید.'
        : 'خطا در دانلود فایل اکسل';
      alert(msg);
    }
  };

  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <ClassesPageHeader
        compact={compact}
        onCreateClick={handleCreateClick}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      {error && (
        <div className="p-4 rounded-2xl text-sm text-red-700" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <ClassesFiltersRow
        compact={compact}
        filters={filters}
        updateFilter={updateFilter}
        onExport={handleExportExcel}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
      />

      {showAdvanced && (
        <p className="text-xs text-gray-500 px-1">
          فیلترهای فعال: جستجو، وضعیت ({filters.is_active === '' ? 'همه' : filters.is_active === 'true' ? 'فعال' : 'غیرفعال'})،
          مقطع ({GRADE_FILTER_OPTIONS.find((g) => g.value === filters.grade)?.label || 'همه'})
        </p>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <CapacitySummaryCard items={capacitySummary} />
        <SubjectDistributionChart data={gradeDistribution} total={meta.count} />
        <PerformanceBarChart data={performanceBars} />
      </div>

      <ClassesTable
        compact={compact}
        rows={paginatedClasses}
        loading={loading}
        maxStudents={maxStudents}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={classes.length}
        goToPage={goToPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onManageStudents={setStudentsModalClass}
      />

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <RecentActivitiesWidget items={recentActivities} />
        <AttentionNeededWidget items={attentionClasses} />
        <TopAttendanceWidget items={topClasses} />
      </div>

      <FooterKpiCards compact={compact} items={footerKpis} />

      <ClassSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        classes={classes}
        loading={loading}
        onEdit={(classItem) => {
          setEditingClass(classItem);
          setFormOpen(true);
        }}
        onManageStudents={(classItem) => {
          setStudentsModalClass(classItem);
        }}
      />

      <ClassFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingClass(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingClass}
        loading={actionLoading}
        title={editingClass ? 'ویرایش کلاس' : 'ایجاد کلاس جدید'}
      />

      <ClassStudentsModal
        open={!!studentsModalClass}
        classItem={studentsModalClass}
        onClose={() => setStudentsModalClass(null)}
      />

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function ClassesDesktop() {
  return (
    <DesktopPageShell>
      <ClassesBody />
    </DesktopPageShell>
  );
}

export function ClassesMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <ClassesBody compact />
    </MobilePageShell>
  );
}
