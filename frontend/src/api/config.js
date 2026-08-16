/** آدرس عمومی سرور فعلی */
export const SERVER_ORIGIN = 'http://185.252.86.221';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }
  // در بیلد production بدون env، همان origin + nginx proxy
  if (import.meta.env.PROD) {
    if (typeof window !== 'undefined' && window.location?.protocol === 'capacitor:') {
      return `${SERVER_ORIGIN}/api/`;
    }
    return '/api/';
  }
  return 'http://localhost:8000/api/';
};

export const API_BASE_URL = getBaseURL();
