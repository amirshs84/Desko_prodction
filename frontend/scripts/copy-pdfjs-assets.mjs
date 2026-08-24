/**
 * ۱) pdfjs-dist: cmaps و standard_fonts → public/pdfjs
 * ۲) mupdf: mupdf.js + mupdf-wasm.js + mupdf-wasm.wasm → public/mupdf (کتابخانه)
 * ۳) PDFium: pdfium.wasm + فونت عربی → public/pdfium (دفترچه آزمون)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, '..');
const distRoot = path.join(frontendRoot, 'public', 'pdfjs');
const pdfjsNm = path.join(frontendRoot, 'node_modules', 'pdfjs-dist');

const MUPDF_FILES = ['mupdf.js', 'mupdf-wasm.js', 'mupdf-wasm.wasm'];

/** نصب در frontend یا hoisting در ریشهٔ مونوریپو */
function resolveMupdfDist() {
  const candidates = [
    path.join(frontendRoot, 'node_modules', 'mupdf', 'dist'),
    path.join(frontendRoot, '..', 'node_modules', 'mupdf', 'dist'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'mupdf-wasm.wasm'))) return p;
  }
  return null;
}

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`missing: ${src}`);
  rimraf(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

rimraf(distRoot);
fs.mkdirSync(distRoot, { recursive: true });
copyDir(path.join(pdfjsNm, 'cmaps'), path.join(distRoot, 'cmaps'));
copyDir(path.join(pdfjsNm, 'standard_fonts'), path.join(distRoot, 'standard_fonts'));
console.log('[copy-pdfjs-assets] ok → public/pdfjs/');

const mupdfDist = resolveMupdfDist();
if (!mupdfDist) {
  console.error(
    '[copy-mupdf] پکیج mupdf پیدا نشد. در پوشه frontend اجرا کن: npm install'
  );
  process.exit(1);
}
const mupdfPublic = path.join(frontendRoot, 'public', 'mupdf');
fs.mkdirSync(mupdfPublic, { recursive: true });
for (const name of MUPDF_FILES) {
  const from = path.join(mupdfDist, name);
  if (!fs.existsSync(from)) {
    console.error(`[copy-mupdf] فایل نیست: ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(mupdfPublic, name));
}
console.log('[copy-mupdf] ok → public/mupdf/ (' + MUPDF_FILES.join(', ') + ')');

function resolvePdfiumWasm() {
  const candidates = [
    path.join(frontendRoot, 'node_modules', '@embedpdf', 'pdfium', 'dist', 'pdfium.wasm'),
    path.join(frontendRoot, '..', 'node_modules', '@embedpdf', 'pdfium', 'dist', 'pdfium.wasm'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function resolveArabicFonts() {
  const candidates = [
    path.join(frontendRoot, 'node_modules', '@embedpdf', 'fonts-arabic', 'fonts'),
    path.join(frontendRoot, '..', 'node_modules', '@embedpdf', 'fonts-arabic', 'fonts'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

const pdfiumWasm = resolvePdfiumWasm();
if (!pdfiumWasm) {
  console.error('[copy-pdfium] فایل pdfium.wasm پیدا نشد. در پوشه frontend اجرا کن: npm install');
  process.exit(1);
}
const pdfiumPublic = path.join(frontendRoot, 'public', 'pdfium');
fs.mkdirSync(pdfiumPublic, { recursive: true });
fs.copyFileSync(pdfiumWasm, path.join(pdfiumPublic, 'pdfium.wasm'));

const arabicFonts = resolveArabicFonts();
const fontNames = ['NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic-Bold.ttf'];
if (arabicFonts) {
  const fontDest = path.join(pdfiumPublic, 'fonts');
  fs.mkdirSync(fontDest, { recursive: true });
  for (const name of fontNames) {
    const from = path.join(arabicFonts, name);
    if (!fs.existsSync(from)) {
      console.error(`[copy-pdfium] فونت نیست: ${from}`);
      process.exit(1);
    }
    fs.copyFileSync(from, path.join(fontDest, name));
  }
  console.log('[copy-pdfium] ok → public/pdfium/ (pdfium.wasm, fonts)');
} else {
  console.error('[copy-pdfium] پکیج @embedpdf/fonts-arabic پیدا نشد');
  process.exit(1);
}
