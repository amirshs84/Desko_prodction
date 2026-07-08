import { useState, useEffect, useCallback } from 'react';

export const usePWA = () => {
  // نگهداری رویداد نصب مرورگر برای فراخوانی دستی
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // وضعیت اینکه آیا کاربر هم‌اکنون داخل نسخه نصب‌شده (PWA) است یا خیر
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // ۱. بررسی اولیه: آیا اپلیکیشن در حالت Standalone (نصب‌شده) باز شده است؟
    const checkStandaloneMode = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      // پشتیبانی از نسخه قدیمی‌تر iOS Safari
      const isIOSStandalone = window.navigator.standalone === true; 
      
      setIsStandalone(isStandaloneMedia || isIOSStandalone);
    };
    
    checkStandaloneMode();

    // ۲. شکار رویداد beforeinstallprompt (فقط در اندروید و ویندوز/کروم رخ می‌دهد)
    const handleBeforeInstallPrompt = (e) => {
      // جلوگیری از نمایش پاپ‌آپ پیش‌فرض و مزاحم مرورگر در پایین صفحه
      e.preventDefault();
      // ذخیره رویداد در استیت برای اتصال به دکمه اختصاصی خودمان
      setDeferredPrompt(e);
    };

    // ۳. شنود رویداد موفقیت‌آمیز بودن نصب
    const handleAppInstalled = () => {
      // پاکسازی رویداد پس از نصب موفق
      setDeferredPrompt(null);
      // تغییر وضعیت به نصب‌شده
      setIsStandalone(true);
      
      // در محیط‌های عملیاتی واقعی، اینجا می‌توانید یک لاگ به گوگل آنالیتیکس بفرستید
      console.log('PWA installed successfully!');
    };

    // ثبت شنونده‌های رویداد (Event Listeners)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // پاکسازی (Cleanup) هنگام خارج شدن کامپوننت از DOM برای جلوگیری از Memory Leak
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // تابع فراخوانی دیالوگ نصب مرورگر (متصل به دکمه نصب)
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('رویداد نصب در دسترس نیست. مرورگر پشتیبانی نمی‌کند یا اپلیکیشن از قبل نصب شده است.');
      return false;
    }

    try {
      // نمایش دیالوگ بومی مرورگر (Native Prompt)
      deferredPrompt.prompt();
      
      // منتظر ماندن برای پاسخ کاربر (آیا Accept کرد یا Cancel؟)
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('کاربر نصب اپلیکیشن را تایید کرد.');
      } else {
        console.log('کاربر نصب اپلیکیشن را رد کرد.');
      }
      
      // رویداد prompt فقط یک بار قابل استفاده است، پس از استفاده باید پاک شود
      setDeferredPrompt(null);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('خطا در هنگام نمایش دیالوگ نصب:', error);
      return false;
    }
  }, [deferredPrompt]);

  return { deferredPrompt, isStandalone, promptInstall };
};
