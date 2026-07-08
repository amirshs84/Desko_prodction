import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * دانلود یک Blob روی هر دو پلتفرم web و native.
 * - Web: از URL.createObjectURL + anchor tag استفاده می‌کند
 * - Native (Capacitor): فایل را در Documents ذخیره کرده و Share sheet را باز می‌کند
 */
export async function downloadBlob(blob, fileName) {
  if (Capacitor.isNativePlatform()) {
    await _downloadBlobNative(blob, fileName);
  } else {
    _downloadBlobWeb(blob, fileName);
  }
}

function _downloadBlobWeb(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

async function _downloadBlobNative(blob, fileName) {
  const base64 = await _blobToBase64(blob);

  await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    directory: Directory.Documents,
    path: fileName,
  });

  await Share.share({
    title: fileName,
    url: uri,
    dialogTitle: 'ذخیره یا اشتراک‌گذاری فایل',
  });
}

function _blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * باز کردن یک URL برای دانلود یا مشاهده.
 * - Native: در مرورگر سیستم (خارج از WebView) باز می‌شود
 * - Web: در تب جدید باز می‌شود
 */
export function openExternalUrl(url) {
  if (Capacitor.isNativePlatform()) {
    window.open(url, '_system');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
