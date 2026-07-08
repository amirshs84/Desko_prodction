import React, { createContext, useContext, useEffect, useState } from 'react';

// ایجاد کانتکست
const PWAContext = createContext();

export const PWAProvider = ({ children }) => {
  // ۱. تابع کمکی برای تشخیص دقیق حالت اجرای اپلیکیشن (Standalone)
  const checkIsStandalone = () => {
    // بررسی در مرورگرهای مدرن و اندروید
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    // بررسی اختصاصی برای سافاری در iOS
    const isIOSStandalone = window.navigator.standalone === true; 
    
    return isStandaloneMedia || isIOSStandalone;
  };

  // استیت‌های مدیریت PWA
  const [isStandalone, setIsStandalone] = useState(checkIsStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // ۲. شنود تغییرات حالت نمایش (مثلاً اگر کاربر وسط کار اپ را نصب کرد)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      setIsStandalone(e.matches);
    };

    // اضافه کردن لیسنر مدیا کوئری (پشتیبانی از مرورگرهای جدید و قدیمی)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleDisplayModeChange); // Fallback
    }

    // ۳. شکار رویداد نصب از سمت مرورگر
    const handleBeforeInstallPrompt = (e) => {
      // جلوگیری از نمایش پاپ‌آپ پیش‌فرض مرورگر
      e.preventDefault();
      // ذخیره رویداد در استیت برای استفاده در دکمه نصب
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // ۴. شنود رویداد موفقیت‌آمیز بودن نصب
    const handleAppInstalled = () => {
      // وقتی نصب تمام شد، رویداد را پاک می‌کنیم و حالت را به نصب‌شده تغییر می‌دهیم
      setDeferredPrompt(null);
      setIsStandalone(true);
      console.log('PWA was installed successfully');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // پاکسازی (Cleanup) لیسنرها هنگام از بین رفتن کامپوننت
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // ۵. تابع فراخوانی دیالوگ نصب (برای اتصال به دکمه در UI)
  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.warn('رویداد نصب هنوز آماده نیست یا مرورگر پشتیبانی نمی‌کند.');
      return;
    }

    // نمایش دیالوگ نصب به کاربر
    deferredPrompt.prompt();

    // منتظر ماندن برای انتخاب کاربر (قبول یا رد نصب)
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('کاربر نصب اپلیکیشن را تایید کرد.');
    } else {
      console.log('کاربر نصب اپلیکیشن را رد کرد.');
    }

    // رویداد beforeinstallprompt فقط یک بار قابل استفاده است، پس آن را پاک می‌کنیم
    setDeferredPrompt(null);
  };

  return (
    <PWAContext.Provider value={{ deferredPrompt, isStandalone, promptInstall }}>
      {children}
    </PWAContext.Provider>
  );
};

// هوک سفارشی برای استفاده راحت‌تر در کامپوننت‌ها
export const usePWA = () => useContext(PWAContext);
