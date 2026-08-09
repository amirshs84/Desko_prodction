const RETURN_TAB_KEY = 'consultant:returnTab';

/** قبل از رفتن به پروفایل دانش‌آموز، تب فعلی پنل را به‌خاطر بسپار. */
export function rememberConsultantTab(tabId) {
  if (!tabId) return;
  try {
    sessionStorage.setItem(RETURN_TAB_KEY, tabId);
  } catch {
    /* ignore */
  }
}

/** هنگام بازگشت به /consultant خوانده و پاک می‌شود. */
export function consumeConsultantReturnTab(fallback = 'dashboard') {
  try {
    const tab = sessionStorage.getItem(RETURN_TAB_KEY);
    if (tab) {
      sessionStorage.removeItem(RETURN_TAB_KEY);
      return tab;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * پرش به پروفایل دانش‌آموز.
 * @param {string} [opts.profileTab] — calendar | interactions | analytics | identity
 * @param {string} [opts.fromTab] — تب مبدأ برای دکمه بازگشت
 */
export function openStudentProfile(navigate, userId, { profileTab, fromTab } = {}) {
  if (fromTab) rememberConsultantTab(fromTab);
  const path = profileTab
    ? `/consultant/student/${userId}/${profileTab}`
    : `/consultant/student/${userId}`;
  navigate(path);
}
