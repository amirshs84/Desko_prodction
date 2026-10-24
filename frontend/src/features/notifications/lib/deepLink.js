let navigateRef = null;
let pending = null;

/** react-router navigate را از NotificationHost (داخل Router) ثبت می‌کند. */
export function bindNavigate(navigate) {
  navigateRef = navigate;
  if (pending) {
    const link = pending;
    pending = null;
    openDeepLink(link);
  }
}

/** فقط مسیرهای داخلی اپ پذیرفته می‌شوند (جلوگیری از open redirect). */
export function normalizeDeepLink(link) {
  if (!link || typeof link !== 'string') return null;
  try {
    if (/^https?:\/\//i.test(link)) {
      const url = new URL(link);
      if (url.origin !== window.location.origin) return null;
      return url.pathname + url.search + url.hash;
    }
  } catch {
    return null;
  }
  return link.startsWith('/') && !link.startsWith('//') ? link : null;
}

export function openDeepLink(link) {
  const path = normalizeDeepLink(link);
  if (!path) return false;
  if (!navigateRef) {
    // cold start: Router هنوز mount نشده
    pending = path;
    return true;
  }
  navigateRef(path);
  return true;
}
