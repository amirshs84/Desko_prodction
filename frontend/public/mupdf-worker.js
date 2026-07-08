/**
 * MuPDF WASM در یک Module Worker.
 * ─────────────────────────────────────────────────────────────────────────
 * mupdf.js یک ES Module است؛ با importScripts() در Worker کلاسیک بار نمی‌شود
 * و خطای «Cannot use import statement outside a module» می‌گیرید.
 *
 * مسیر نسبت به همین فایل: public/mupdf/mupdf.js (+ mupdf-wasm.js و mupdf-wasm.wasm)
 */
import { Document, Matrix, ColorSpace } from './mupdf/mupdf.js';

let doc = null;

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'LOAD': {
        if (doc) {
          try { doc.destroy(); } catch {}
          doc = null;
        }
        const buf = new Uint8Array(payload.data);
        doc = Document.openDocument(buf, 'application/pdf');
        const totalPages = doc.countPages();
        self.postMessage({ id, result: { totalPages } });
        break;
      }

      case 'RENDER': {
        if (!doc) throw new Error('No document loaded');
        const { pageIndex, scale } = payload;

        const page = doc.loadPage(pageIndex);
        const matrix = Matrix.scale(scale, scale);
        const pixmap = page.toPixmap(
          matrix,
          ColorSpace.DeviceRGB,
          false,
          true
        );
        const png = pixmap.asPNG();
        pixmap.destroy();
        page.destroy();

        self.postMessage({ id, result: { png } }, [png.buffer]);
        break;
      }

      case 'DESTROY': {
        if (doc) {
          try { doc.destroy(); } catch {}
          doc = null;
        }
        self.postMessage({ id, result: null });
        break;
      }

      default:
        self.postMessage({ id, error: `Unknown message type: ${type}` });
    }
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
