import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notifyApi } from '../api/notifyApi';
import { notificationClient } from '../NotificationClient';

const CHANNEL_LABEL = { PUSH: 'اعلان', IN_APP: 'داخل برنامه' };

function Toggle({ checked, disabled, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-6 rounded-full transition-colors disabled:opacity-40
                        ${checked ? 'bg-brand' : 'bg-panel-hover'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                        ${checked ? 'right-1' : 'right-5'}`} />
    </button>
  );
}

function PushPermissionCard() {
  const [state, setState] = useState(null);
  useEffect(() => {
    notificationClient.permissionState().then(setState).catch(() => setState('unsupported'));
  }, []);

  if (!state || state === 'granted' || state === 'unsupported') return null;
  return (
    <div className="bg-brand/10 border border-brand/30 rounded-2xl p-4 flex items-center gap-3">
      <p className="text-sm flex-1">
        {state === 'denied'
          ? 'دسترسی اعلان در تنظیمات دستگاه/مرورگر مسدود شده است.'
          : 'برای دریافت یادآورها و پیام‌ها، اعلان‌ها را فعال کنید.'}
      </p>
      {state !== 'denied' && (
        <button type="button" className="px-3 py-2 rounded-xl bg-brand text-white text-xs font-semibold"
                onClick={() => notificationClient.enablePush().then(setState).catch(() => {})}>
          فعال‌سازی
        </button>
      )}
    </div>
  );
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notify', 'preferences'], queryFn: notifyApi.preferences });

  const save = useMutation({
    mutationFn: notifyApi.updatePreferences,
    onSuccess: (next) => qc.setQueryData(['notify', 'preferences'], next),
  });

  const [quiet, setQuiet] = useState({ start: '23:00', end: '07:00' });
  useEffect(() => {
    if (data?.quiet_hours) {
      const [start, end] = data.quiet_hours.split('-');
      setQuiet({ start, end });
    }
  }, [data?.quiet_hours]);

  const muted = data?.muted_until && new Date(data.muted_until) > new Date();

  return (
    <div className="h-full bg-page text-ink flex flex-col overflow-hidden" dir="rtl">
      <div className="shrink-0 px-4 pt-6 pb-4 flex items-center gap-3 border-b border-edge">
        <button type="button" onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-xl bg-panel flex items-center justify-center text-ink-2">
          →
        </button>
        <h1 className="text-lg font-bold">تنظیمات اعلان‌ها</h1>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-nav-safe">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <PushPermissionCard />
          {isLoading && <p className="text-center text-sm text-ink-4">در حال بارگذاری…</p>}

          {data && (
            <>
              <section>
                <h2 className="text-xs font-semibold text-ink-4 mb-3 px-1">دسته‌ها</h2>
                <div className="bg-panel border border-edge rounded-2xl divide-y divide-edge">
                  {data.categories.map((c) => (
                    <div key={c.key} className="px-4 py-3">
                      <p className="text-sm font-medium">{c.title}</p>
                      {c.description && <p className="text-xs text-ink-4 mt-0.5">{c.description}</p>}
                      <div className="flex gap-4 mt-2">
                        {Object.entries(c.channels).map(([channel, enabled]) => (
                          <label key={channel} className="flex items-center gap-2 text-xs text-ink-2">
                            <Toggle checked={enabled} disabled={!c.configurable || save.isPending}
                                    onChange={(v) => save.mutate({
                                      toggles: [{ category: c.key, channel, enabled: v }],
                                    })} />
                            {CHANNEL_LABEL[channel] || channel}
                          </label>
                        ))}
                      </div>
                      {!c.configurable && (
                        <p className="text-[10px] text-ink-4 mt-1">این دسته برای اطلاع‌رسانی ضروری است و قابل خاموش شدن نیست.</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xs font-semibold text-ink-4 mb-3 px-1">ساعات سکوت</h2>
                <div className="bg-panel border border-edge rounded-2xl px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">اعلان‌های غیرضروری در این بازه نگه داشته شوند</p>
                    <Toggle checked={data.quiet_hours_enabled} disabled={save.isPending}
                            onChange={(v) => save.mutate({ quiet_hours_enabled: v })} />
                  </div>
                  <div className="flex items-center gap-2 text-sm" dir="ltr">
                    <input type="time" value={quiet.start}
                           onChange={(e) => setQuiet((q) => ({ ...q, start: e.target.value }))}
                           className="bg-panel-hover rounded-lg px-2 py-1" />
                    <span className="text-ink-4">→</span>
                    <input type="time" value={quiet.end}
                           onChange={(e) => setQuiet((q) => ({ ...q, end: e.target.value }))}
                           className="bg-panel-hover rounded-lg px-2 py-1" />
                    <button type="button" disabled={save.isPending}
                            onClick={() => save.mutate({
                              quiet_hours: `${quiet.start}-${quiet.end}`,
                              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            })}
                            className="ml-auto text-xs text-brand font-semibold">
                      ذخیره
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xs font-semibold text-ink-4 mb-3 px-1">توقف موقت</h2>
                <div className="bg-panel border border-edge rounded-2xl px-4 py-3 flex flex-wrap gap-2">
                  {muted ? (
                    <>
                      <p className="text-sm flex-1">
                        بی‌صدا تا {new Date(data.muted_until).toLocaleString('fa-IR')}
                      </p>
                      <button type="button" className="text-xs text-brand font-semibold"
                              onClick={() => save.mutate({ muted_until: null })}>
                        لغو
                      </button>
                    </>
                  ) : (
                    [1, 8, 24].map((h) => (
                      <button key={h} type="button" disabled={save.isPending}
                              className="px-3 py-2 rounded-xl bg-panel-hover text-xs"
                              onClick={() => save.mutate({
                                muted_until: new Date(Date.now() + h * 3600 * 1000).toISOString(),
                              })}>
                        {h.toLocaleString('fa-IR')} ساعت
                      </button>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
