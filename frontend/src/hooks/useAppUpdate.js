import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { SERVER_ORIGIN } from '../api/config';

const SERVER_VERSION_URL = `${SERVER_ORIGIN}/version.json`;
const STORAGE_KEY = 'desko_pending_update_version';

/** مقایسه ساده semver — مثبت یعنی v2 جدیدتر از v1 است */
function compareVersions(v1, v2) {
  const p1 = String(v1).split('.').map(Number);
  const p2 = String(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] ?? 0;
    const b = p2[i] ?? 0;
    if (b > a) return 1;
    if (b < a) return -1;
  }
  return 0;
}

/**
 * دریافت نسخه سرور:
 * - در اپ native از CapacitorHttp استفاده می‌کند (CORS را دور می‌زند)
 * - در مرورگر از fetch معمولی
 */
async function fetchServerVersion() {
  const isNative = Capacitor.isNativePlatform();
  console.log(`[useAppUpdate] پلتفرم: ${isNative ? 'native' : 'web'} — URL: ${SERVER_VERSION_URL}`);

  if (isNative) {
    // CapacitorHttp درخواست را از لایه native اندروید می‌زند — CORS اعمال نمی‌شود
    const response = await CapacitorHttp.get({
      url: SERVER_VERSION_URL,
      connectTimeout: 10000,
      readTimeout: 10000,
    });
    console.log('[useAppUpdate] CapacitorHttp status:', response.status);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP_${response.status}`);
    }
    // data در CapacitorHttp معمولاً خودکار parse می‌شود اگر Content-Type: application/json باشد
    const data = typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data;
    return data;
  } else {
    // مرورگر: fetch معمولی با timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(SERVER_VERSION_URL, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP_${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('TIMEOUT: سرور پاسخ نداد (بیش از ۱۰ ثانیه)');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * دریافت نسخه محلی از APK با timeout
 */
async function fetchLocalVersion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('/version.json', { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('TIMEOUT: خواندن version.json محلی بیش از ۸ ثانیه طول کشید');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * هوک بررسی آپدیت اپ.
 *
 * - نسخه فعلی: از version.json داخل APK
 * - نسخه سرور: در native از CapacitorHttp (بدون CORS)، در وب از fetch
 * - نتیجه در localStorage کش می‌شود تا badge ناو حتی قبل از check نشان داده شود
 */
export function useAppUpdate() {
  const [currentVersion, setCurrentVersion] = useState(null);
  const [latestVersion, setLatestVersion] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const [checked, setChecked] = useState(false);

  /* بارگذاری نسخه محلی (از APK) هنگام mount */
  useEffect(() => {
    fetchLocalVersion()
      .then(data => setCurrentVersion(data?.version ?? null))
      .catch(err => console.warn('[useAppUpdate] بارگذاری اولیه نسخه محلی شکست خورد:', err?.message));
  }, []);

  /* بررسی کش قدیمی برای badge ناو */
  useEffect(() => {
    if (!currentVersion) return;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && compareVersions(currentVersion, cached) > 0) {
      setHasUpdate(true);
      setLatestVersion(cached);
    } else if (cached && compareVersions(currentVersion, cached) === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentVersion]);

  const checkForUpdate = useCallback(async () => {
    setChecking(true);
    setError(null);
    setErrorDetail(null);

    // ۱. نسخه محلی
    let localData;
    try {
      localData = await fetchLocalVersion();
      console.log('[useAppUpdate] نسخه محلی:', localData?.version);
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.error('[useAppUpdate] خطا در نسخه محلی:', msg);
      setError('خطا در خواندن نسخه اپلیکیشن نصب‌شده.');
      setErrorDetail(`محلی: ${msg}`);
      setChecking(false);
      return;
    }

    // ۲. نسخه سرور
    let serverData;
    try {
      serverData = await fetchServerVersion();
      console.log('[useAppUpdate] نسخه سرور:', serverData?.version);
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.error('[useAppUpdate] خطا در نسخه سرور:', msg);

      let friendlyError = 'خطا در دریافت اطلاعات آپدیت از سرور.';
      const lmsg = msg.toLowerCase();
      if (msg.startsWith('TIMEOUT') || lmsg.includes('timeout')) {
        friendlyError = 'سرور پاسخ نداد (timeout). اتصال اینترنت را بررسی کنید.';
      } else if (msg.startsWith('HTTP_')) {
        friendlyError = `سرور خطا برگرداند: ${msg}`;
      } else if (
        lmsg.includes('failed to fetch') ||
        lmsg.includes('network') ||
        lmsg.includes('net::') ||
        lmsg.includes('econnrefused') ||
        lmsg.includes('unable to resolve')
      ) {
        friendlyError = 'خطای شبکه: اتصال اینترنت یا دسترسی به سرور را بررسی کنید.';
      } else if (lmsg.includes('cors')) {
        friendlyError = 'خطای CORS: درخواست توسط سرور رد شد.';
      } else if (lmsg.includes('json') || lmsg.includes('parse')) {
        friendlyError = 'پاسخ سرور نامعتبر است (خطای JSON).';
      }

      setError(friendlyError);
      setErrorDetail(`سرور: ${msg}`);
      setChecking(false);
      return;
    }

    // ۳. مقایسه نسخه‌ها
    const localVer = localData?.version ?? '0.0.0';
    const serverVer = serverData?.version ?? '0.0.0';
    const updateAvailable = compareVersions(localVer, serverVer) > 0;

    console.log(`[useAppUpdate] محلی=${localVer} | سرور=${serverVer} | آپدیت=${updateAvailable}`);

    setCurrentVersion(localVer);
    setLatestVersion(serverVer);
    setLatestData(serverData);
    setHasUpdate(updateAvailable);
    setChecked(true);

    if (updateAvailable) {
      localStorage.setItem(STORAGE_KEY, serverVer);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    setChecking(false);
  }, []);

  return {
    currentVersion,
    latestVersion,
    latestData,
    hasUpdate,
    checking,
    checked,
    error,
    errorDetail,
    checkForUpdate,
  };
}
