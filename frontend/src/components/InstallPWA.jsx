import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';

export default function InstallPWA() {
  const { installPrompt, promptInstall, isInstalled, isIOS } = usePWA();
  // استیتی برای بستن پیام راهنمای اپل توسط کاربر
  const [dismissed, setDismissed] = useState(false);

  // اگر نصب شده یا کاربر آن را رد کرده، هیچ چیزی نشان نده
  if (isInstalled || dismissed) {
    return null;
  }

  // ---- حالت اول: کاربر آیفون/آیپد است ----
  if (isIOS) {
    return (
      <div className="fixed bottom-24 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 animate-bounce flex flex-col gap-3" dir="rtl">
        <div className="flex justify-between items-start">
          <div className="text-sm leading-relaxed">
            <p className="font-bold mb-1 text-teal-400">نصب اپلیکیشن در آیفون</p>
            <p className="text-xs opacity-90">
              برای نصب، دکمه <span className="font-bold">Share</span> 
              <svg className="inline-block w-4 h-4 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              را لمس کرده و سپس <br/>
              <span className="font-bold text-teal-300">Add to Home Screen</span> 
              را انتخاب کنید.
            </p>
          </div>
          <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ---- حالت دوم: کاربر اندروید/ویندوز است و آماده نصب ----
  if (installPrompt) {
    return (
      <div className="fixed bottom-24 left-4 right-4 bg-teal-800 text-white p-4 rounded-xl shadow-lg flex justify-between items-center z-50 animate-bounce" dir="rtl">
        <div>
          <h4 className="font-bold text-sm">نصب اپلیکیشن تایمر</h4>
          <p className="text-xs opacity-80 mt-1">برای دسترسی سریع‌تر، نصب کنید</p>
        </div>
        <button 
          onClick={promptInstall}
          className="bg-white text-teal-800 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-100 transition-colors"
        >
          نصب
        </button>
      </div>
    );
  }

  // اگر هیچ‌کدام از شرایط برقرار نبود
  return null;
}
