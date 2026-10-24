import { queryClient } from '../lib/queryClient'
import { notificationClient } from '../features/notifications/NotificationClient'

export const performLogout = async () => {
  // نیاز به accessToken دارد؛ پس قبل از پاک شدن localStorage
  await Promise.race([
    notificationClient.stop().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

  const quickNotes = localStorage.getItem('quickNotesList');
  const theme = localStorage.getItem('app-theme');
  
  localStorage.clear();
  sessionStorage.clear();
  
  if (quickNotes !== null) localStorage.setItem('quickNotesList', quickNotes);
  if (theme !== null) localStorage.setItem('app-theme', theme);
  
  // پاک‌سازی cache in-memory قبل از reload
  queryClient.clear();

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch { /* silent */ }
  
  window.location.replace('/login');
};
