import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { Card, EmptyState, PrimaryButton, SecondaryButton } from '../components/DemoUi';
import { usePlanRun, usePlanRuns } from '../hooks/useConsultantQueries';

function modeLabel(mode) {
  return mode === 'forced' ? 'قطعی' : 'پیشنهادی';
}

function statusLabel(status) {
  if (status === 'accepted') return 'پذیرفته';
  if (status === 'rejected') return 'رد شده';
  return 'در انتظار';
}

function HistoryBody() {
  const navigate = useNavigate();
  const { data: runs = [], isLoading } = usePlanRuns();
  const [selectedId, setSelectedId] = useState(null);
  const { data: detail, isLoading: loadingDetail } = usePlanRun(selectedId);

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">تاریخچه برنامه‌ها</h2>
        <p className="text-sm text-gray-500 mt-1">اجراهای گروهی و وضعیت پیشنهادها</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          {isLoading && <EmptyState message="در حال بارگذاری…" />}
          {!isLoading && runs.length === 0 && <EmptyState message="اجرایی ثبت نشده است" />}
          <ul className="divide-y divide-gray-50">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(run.id)}
                  className="w-full text-right px-4 py-3 hover:bg-sky-50/50"
                  style={{ background: selectedId === run.id ? '#E0F2FE' : 'transparent' }}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {modeLabel(run.mode)} · {run.intensity}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {run.student_count} دانش‌آموز
                    {run.pending_count ? ` · ${run.pending_count} در انتظار` : ''}
                  </p>
                  {run.created_at && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(run.created_at).toLocaleString('fa-IR')}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          {!selectedId && (
            <EmptyState message="یک اجرا را برای دیدن جزئیات انتخاب کنید" />
          )}
          {selectedId && loadingDetail && <EmptyState message="در حال بارگذاری جزئیات…" />}
          {selectedId && !loadingDetail && detail && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-bold text-gray-900">
                  اجرا #{detail.id} · {modeLabel(detail.mode)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  شدت: {detail.intensity}
                  {detail.group_tag ? ` · برچسب: ${detail.group_tag}` : ''}
                  {detail.window?.start && detail.window?.end
                    ? ` · بازه ${detail.window.start.jy}/${detail.window.start.jm}/${detail.window.start.jd} تا ${detail.window.end.jy}/${detail.window.end.jm}/${detail.window.end.jd}`
                    : ''}
                </p>
                {detail.summary && (
                  <p className="text-sm text-gray-600 mt-2">{detail.summary}</p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="py-2 text-right font-medium">دانش‌آموز</th>
                      <th className="py-2 text-right font-medium">وضعیت</th>
                      <th className="py-2 text-right font-medium">بلوک</th>
                      <th className="py-2 text-right font-medium">اکشن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.proposals || []).map((p) => (
                      <tr key={p.id} className="border-b border-gray-50">
                        <td className="py-2.5">{p.student_name || p.student_id}</td>
                        <td className="py-2.5">{statusLabel(p.status)}</td>
                        <td className="py-2.5">
                          {p.block_count}
                          {p.shortfall_minutes
                            ? ` · کمبود ${p.shortfall_minutes}د`
                            : ''}
                        </td>
                        <td className="py-2.5">
                          <SecondaryButton
                            className="!py-1 !px-2 !text-xs"
                            onClick={() => navigate(`/consultant/student/${p.student_id}`)}
                          >
                            تقویم / نسخه‌ها
                          </SecondaryButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PrimaryButton
                className="self-start"
                onClick={() => setSelectedId(null)}
              >
                بستن جزئیات
              </PrimaryButton>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function HistoryDesktop() {
  return (
    <DesktopPageShell title="تاریخچه">
      <HistoryBody />
    </DesktopPageShell>
  );
}

export function HistoryMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <HistoryBody />
    </MobilePageShell>
  );
}
