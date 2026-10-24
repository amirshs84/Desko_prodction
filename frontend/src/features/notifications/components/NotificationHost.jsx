import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { notificationClient } from '../NotificationClient';
import { bindNavigate } from '../lib/deepLink';
import { on, NotifyEvents } from '../lib/eventBus';
import InAppMessageHost from './InAppMessageHost';
import InAppToast from './InAppToast';

/** یک‌بار داخل Router: اتصال navigate برای deep link، شروع کلاینت بعد از ورود، UI داخل اپ. */
export default function NotificationHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => bindNavigate(navigate), [navigate]);

  // بعد از login توکن در localStorage می‌نشیند و route عوض می‌شود → اینجا start می‌شود
  useEffect(() => {
    if (localStorage.getItem('accessToken')) notificationClient.start();
  }, [location.pathname]);

  useEffect(
    () => on(NotifyEvents.INBOX_CHANGED, () => queryClient.invalidateQueries({ queryKey: ['notify'] })),
    [queryClient],
  );

  return (
    <>
      <InAppToast />
      <InAppMessageHost />
    </>
  );
}
