/** Windows ARABIC charset — covers Persian text when fonts are not embedded. */
const FONT_CHARSET_ARABIC = 178;

function publicUrl(pathname) {
  return new URL(pathname, window.location.origin).href;
}

function waitTask(task) {
  if (task == null) return Promise.resolve(undefined);
  if (typeof task.then === 'function') return task;
  if (typeof task.toPromise === 'function') return task.toPromise();
  return new Promise((resolve, reject) => {
    if (typeof task.wait === 'function') task.wait(resolve, reject);
    else resolve(task);
  });
}

let enginePromise;

async function createEngine() {
  const { createPdfiumEngine } = await import('@embedpdf/engines/pdfium-worker-engine');
  const wasmUrl = publicUrl('/pdfium/pdfium.wasm');
  const fontBase = publicUrl('/pdfium/fonts');
  const engine = createPdfiumEngine(wasmUrl, {
    encoderPoolSize: 0,
    fontFallback: {
      baseUrl: fontBase,
      fonts: {
        [FONT_CHARSET_ARABIC]: [
          { url: 'NotoNaskhArabic-Regular.ttf', weight: 400 },
          { url: 'NotoNaskhArabic-Bold.ttf', weight: 700 },
        ],
      },
    },
  });
  return engine;
}

export function getPdfiumEngine() {
  if (!enginePromise) {
    enginePromise = createEngine().catch((error) => {
      enginePromise = undefined;
      throw error;
    });
  }
  return enginePromise;
}

export { waitTask };
