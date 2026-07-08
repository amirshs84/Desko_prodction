import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Star } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE, CardFooter, RankBadge } from '../components/DemoUi';
import {
  GRADE_AVERAGE_DATA,
  LOWEST_GPA_STUDENTS,
  TOP_STUDENTS_GRADE_10,
  TOP_STUDENTS_GRADE_11,
  TOP_STUDENTS_GRADE_12,
  MOST_ACTIVE_STUDENTS,
  STUDY_TIME_BY_GRADE,
} from '../data/studentsMockData';

function GradeAverageChart() {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">میانگین نمرات به تفکیک پایه</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={GRADE_AVERAGE_DATA} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="grade"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 20]}
            ticks={[0, 5, 10, 15, 20]}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}`, 'میانگین']}
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={52}>
            {GRADE_AVERAGE_DATA.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 12, fontWeight: 700, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <CardFooter text="میانگین نمره کل بر اساس ۲۰" />
    </div>
  );
}

function LowestGPAStudentsTable() {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۵ دانش‌آموز با پایین‌ترین معدل</h3>
      <div className="flex-1">
        <div
          className="grid gap-2 pb-2 mb-2 border-b border-gray-100"
          style={{ gridTemplateColumns: '40px 1fr 60px 80px' }}
        >
          <span className="text-xs text-gray-400 font-medium">رتبه</span>
          <span className="text-xs text-gray-400 font-medium">نام دانش‌آموز</span>
          <span className="text-xs text-gray-400 font-medium text-center">معدل</span>
          <span className="text-xs text-gray-400 font-medium text-left">پایه</span>
        </div>
        <div className="flex flex-col gap-3">
          {LOWEST_GPA_STUDENTS.map((s) => (
            <div
              key={s.rank}
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: '40px 1fr 60px 80px' }}
            >
              <RankBadge rank={s.rank} color="#EF4444" bg="#F87171" lightText />
              <span className="text-sm font-semibold text-gray-900 truncate">{s.name}</span>
              <span className="text-sm font-bold text-gray-900 text-center">{s.gpa}</span>
              <span className="text-xs text-gray-500 text-left">{s.grade}</span>
            </div>
          ))}
        </div>
      </div>
      <CardFooter variant="warning" text="نیازمند توجه و پیگیری" />
    </div>
  );
}

function GradeTopList({ grade, color, bgLight, students }) {
  return (
    <div className="flex-1 min-w-0">
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-3"
        style={{ background: bgLight }}
      >
        <Star size={16} color={color} fill={color} />
        <span className="text-sm font-bold" style={{ color }}>{grade}</span>
      </div>
      <div
        className="grid gap-2 pb-2 mb-2 border-b border-gray-100 px-1"
        style={{ gridTemplateColumns: '36px 1fr 48px' }}
      >
        <span className="text-xs text-gray-400 font-medium">رتبه</span>
        <span className="text-xs text-gray-400 font-medium">نام</span>
        <span className="text-xs text-gray-400 font-medium text-left">معدل</span>
      </div>
      <div className="flex flex-col gap-2.5 px-1">
        {students.map((s) => (
          <div
            key={s.rank}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: '36px 1fr 48px' }}
          >
            <RankBadge rank={s.rank} color={color} bg={color} lightText />
            <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
            <span className="text-sm font-bold text-left" style={{ color }}>{s.gpa}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopStudentsByGrade() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-5">
        <h3 className="font-bold text-gray-900 text-sm">۵ دانش‌آموز برتر در هر پایه</h3>
        <Star size={16} color="#F59E0B" fill="#F59E0B" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GradeTopList grade="پایه دهم" color="#10B981" bgLight="#D1FAE5" students={TOP_STUDENTS_GRADE_10} />
        <GradeTopList grade="پایه یازدهم" color="#14B8A6" bgLight="#CCFBF1" students={TOP_STUDENTS_GRADE_11} />
        <GradeTopList grade="پایه دوازدهم" color="#3B82F6" bgLight="#DBEAFE" students={TOP_STUDENTS_GRADE_12} />
      </div>
    </div>
  );
}

function MostActiveStudentsTable() {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">۵ دانش‌آموز پرکاربرد (بیشترین زمان استفاده)</h3>
      <div
        className="grid gap-2 pb-2 mb-2 border-b border-gray-100"
        style={{ gridTemplateColumns: '40px 1fr 80px 70px' }}
      >
        <span className="text-xs text-gray-400 font-medium">رتبه</span>
        <span className="text-xs text-gray-400 font-medium">نام دانش‌آموز</span>
        <span className="text-xs text-gray-400 font-medium text-center">پایه</span>
        <span className="text-xs text-gray-400 font-medium text-left">زمان کل</span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {MOST_ACTIVE_STUDENTS.map((s) => (
          <div
            key={s.rank}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: '40px 1fr 80px 70px' }}
          >
            <RankBadge rank={s.rank} color="#059669" bg="#D1FAE5" />
            <span className="text-sm font-semibold text-gray-900 truncate">{s.name}</span>
            <span className="text-xs text-gray-500 text-center">{s.grade}</span>
            <span className="text-sm font-bold text-emerald-600 text-left">{s.time}</span>
          </div>
        ))}
      </div>
      <CardFooter text="براساس مجموع زمان حضور در اپلیکیشن" />
    </div>
  );
}

function StudyTimeByGrade() {
  const maxMinutes = 180;
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-5">میانگین زمان مطالعه به تفکیک پایه</h3>
      <div className="flex flex-col gap-5 flex-1 justify-center">
        {STUDY_TIME_BY_GRADE.map((item) => (
          <div key={item.grade}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{item.grade}</span>
              <span className="text-sm font-bold text-gray-900">{item.time}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.minutes / maxMinutes) * 100}%`,
                  background: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <CardFooter text="میانگین زمان مطالعه روزانه هر دانش‌آموز" />
    </div>
  );
}

function StudentsPageHeader({ compact }) {
  return (
    <div>
      <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>
        نمای کلی دانش‌آموزان
      </h1>
      <p className={`text-gray-500 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        بررسی عملکرد و فعالیت دانش‌آموزان
      </p>
    </div>
  );
}

function StudentsBody({ compact }) {
  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <StudentsPageHeader compact={compact} />

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <GradeAverageChart />
        <LowestGPAStudentsTable />
      </div>

      <TopStudentsByGrade />

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <MostActiveStudentsTable />
        <StudyTimeByGrade />
      </div>

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function StudentsDesktop() {
  return (
    <DesktopPageShell>
      <StudentsBody />
    </DesktopPageShell>
  );
}

export function StudentsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <StudentsBody compact />
    </MobilePageShell>
  );
}
