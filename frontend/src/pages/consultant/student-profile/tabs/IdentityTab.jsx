import { Card } from '../../demo/components/DemoUi';
import { GRADE_LABELS, PROFILE } from '../profileTheme';

export function IdentityTab({ student, userId }) {
  const rows = [
    { label: 'نام و نام خانوادگی', value: student?.full_name || '—' },
    { label: 'شناسه کاربری', value: student?.user_id || userId || '—' },
    {
      label: 'شماره تماس',
      value: student?.phone_number || '—',
      ltr: Boolean(student?.phone_number),
    },
    {
      label: 'سطح تحصیلی',
      value: student?.grade
        ? `پایه ${GRADE_LABELS[student.grade] || student.grade}`
        : '—',
    },
    { label: 'رشته / المپیاد', value: student?.olympiad_field || '—' },
    {
      label: 'کلاس‌ها',
      value: (student?.class_names || []).join('، ') || '—',
    },
    {
      label: 'گروه‌های مشاور',
      value: (student?.groups || []).map((g) => g.name).join('، ') || '—',
    },
    { label: 'شماره تماس اولیا', value: '—' },
    { label: 'سوابق تحصیلی', value: '—' },
  ];

  return (
    <div className="px-4 md:px-8 py-6 pb-10 max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: PROFILE.ink }}>
          اطلاعات هویتی
        </h2>
        <p className="text-sm mt-1" style={{ color: PROFILE.inkMuted }}>
          اطلاعات پایه ثبت‌شده در مدرسه. فیلدهای بدون داده خالی نمایش داده می‌شوند.
        </p>
      </div>

      <Card className="!p-0 overflow-hidden">
        <dl className="divide-y divide-gray-50">
          {rows.map((row) => (
            <div
              key={row.label}
              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6"
            >
              <dt className="text-xs font-medium sm:w-40 shrink-0" style={{ color: PROFILE.inkMuted }}>
                {row.label}
              </dt>
              <dd
                className="text-sm font-semibold"
                style={{ color: row.value === '—' ? PROFILE.inkSoft : PROFILE.ink }}
                dir={row.ltr ? 'ltr' : undefined}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
