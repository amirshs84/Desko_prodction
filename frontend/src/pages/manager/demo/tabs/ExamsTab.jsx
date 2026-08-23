import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronLeft } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE, EmptyDataMessage } from '../components/DemoUi';
import { examAPI } from '../../../../api/client';
import { toFaDigits } from '../../../../lib/persianDigits';

const STATUS_LABEL = {
  SCHEDULED: { label: 'زمان‌بندی‌شده', color: '#2563EB', bg: '#DBEAFE' },
  RUNNING: { label: 'در حال برگزاری', color: '#059669', bg: '#D1FAE5' },
  COMPLETED: { label: 'پایان‌یافته', color: '#4B5563', bg: '#F3F4F6' },
  CANCELLED: { label: 'لغو شده', color: '#DC2626', bg: '#FEE2E2' },
};

function fa(value) {
  return toFaDigits(String(value ?? ''));
}

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
}

function ExamsBody({ compact }) {
  const [selectedId, setSelectedId] = useState(null);
  const listQuery = useQuery({
    queryKey: ['manager', 'exam-sessions'],
    queryFn: () => examAPI.managerListSessions().then((r) => r.data),
  });
  const resultsQuery = useQuery({
    queryKey: ['manager', 'exam-sessions', selectedId, 'results'],
    queryFn: () => examAPI.managerSessionResults(selectedId).then((r) => r.data),
    enabled: Boolean(selectedId),
  });
  const sessions = listQuery.data?.items || [];
  const selected = resultsQuery.data;

  return (
    <div className={`${compact ? 'px-5 py-5 space-y-5' : 'px-8 py-6 space-y-6'}`}>
      <div>
        <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>نتایج آزمون‌ها</h1>
        <p className="text-sm text-gray-500 mt-1">نمای مدرسه از جلسات برگزارشده توسط مشاوران</p>
      </div>

      {listQuery.isLoading && <p className="text-sm text-gray-500">در حال بارگذاری…</p>}
      {listQuery.isError && <p className="text-sm text-red-500">بارگذاری جلسات ناموفق بود.</p>}
      {!listQuery.isLoading && sessions.length === 0 && (
        <div className="rounded-3xl p-8" style={CARD_STYLE}>
          <EmptyDataMessage />
        </div>
      )}

      <div className="grid gap-3">
        {sessions.map((session) => {
          const meta = STATUS_LABEL[session.status] || STATUS_LABEL.SCHEDULED;
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelectedId(session.id)}
              className="text-right rounded-3xl p-5"
              style={{
                ...CARD_STYLE,
                border: selectedId === session.id ? '1px solid #10B981' : CARD_STYLE.border,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                    <FileText size={20} color="#059669" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{session.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.exam_title} · مشاور: {session.consultant_name || '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatWhen(session.start_time)}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg }}>
                  {meta.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedId && (
        <div className="rounded-3xl p-5" style={CARD_STYLE}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">کارنامه جلسه</h3>
            <button type="button" onClick={() => setSelectedId(null)} className="text-xs text-gray-500 flex items-center gap-1">
              بستن <ChevronLeft size={14} />
            </button>
          </div>
          {resultsQuery.isLoading && <p className="text-sm text-gray-500">در حال دریافت نتایج…</p>}
          {selected && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                میانگین نمره:{' '}
                {selected.results?.filter((r) => r.score != null).length
                  ? fa(
                    (
                      selected.results
                        .filter((r) => r.score != null)
                        .reduce((sum, r) => sum + Number(r.score), 0)
                      / selected.results.filter((r) => r.score != null).length
                    ).toFixed(1),
                  )
                  : '—'}
              </p>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-right">
                      <th className="p-2">رتبه</th>
                      <th className="p-2">نام</th>
                      <th className="p-2">وضعیت</th>
                      <th className="p-2">نمره</th>
                      <th className="p-2">درصد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.results || []).map((row) => (
                      <tr key={row.attempt_id || row.user_id} className="border-t border-gray-100">
                        <td className="p-2">{row.rank ? fa(row.rank) : '—'}</td>
                        <td className="p-2 font-medium">{row.full_name}</td>
                        <td className="p-2 text-xs">{row.status || '—'}</td>
                        <td className="p-2">{row.score != null ? fa(row.score) : '—'}</td>
                        <td className="p-2">{row.percent != null ? `${fa(row.percent)}٪` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(selected.results || []).length && <EmptyDataMessage />}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ExamsDesktop() {
  return (
    <DesktopPageShell>
      <ExamsBody />
    </DesktopPageShell>
  );
}

export function ExamsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <ExamsBody compact />
    </MobilePageShell>
  );
}
