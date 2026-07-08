/**
 * ۱) pdfjs-dist: cmaps و standard_fonts → public/pdfjs
 * ۲) mupdf: mupdf.js + mupdf-wasm.js + mupdf-wasm.wasm → public/mupdf (Worker / APK)
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
