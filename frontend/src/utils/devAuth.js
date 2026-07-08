/**
 * فقط برای npm run dev — در build پروداکشن import.meta.env.DEV === false است
 * و این bypass به‌طور خودکار غیرفعال می‌شود.
 */
export const isDevAuthBypass = () => import.meta.env.DEV;
