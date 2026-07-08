import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { dataAPI } from '../api/client';

/* ─── IndexedDB helpers ─────────────────────────────────────────────────────── */
const DB_NAME = 'pdfReaderDB';
const DB_VER  = 1;
const STORE   = 'pdfs';

const openDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

const idbGet    = async (id)  => { const db = await openDB(); return new Promise((res, rej) => { const r = db.transaction(STORE,'readonly').objectStore(STORE).get(id); r.onsuccess=()=>res(r.result??null); r.onerror=()=>rej(r.error); }); };
const idbPut    = async (rec) => { const db = await openDB(); return new Promise((res, rej) => { const r = db.transaction(STORE,'readwrite').objectStore(STORE).put(rec); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); };
const idbGetAll = async ()    => { const db = await openDB(); return new Promise((res, rej) => { const r = db.transaction(STORE,'readonly').objectStore(STORE).getAll(); r.onsuccess=()=>res(r.result??[]); r.onerror=()=>rej(r.error); }); };
const idbDelete = async (id)  => { const db = await openDB(); return new Promise((res, rej) => { const r = db.transaction(STORE,'readwrite').objectStore(STORE).delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); };

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const toPersianDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
};

const toFarsiNum = (n) =>
  String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

const stripMeta = ({ data: _d, ...rest }) => rest;

/* ─── mupdf worker bridge ─────────────────────────────────────────────────── */
const WORKER_CODE = /* js */`
importScripts('/mupdf/mupdf.js');

let mupdf = null;
let doc   = null;

async function init() {
  mupdf = await MuPDF();
}

const readyPromise = init();

self.onmessage = async (e) => {
  await readyPromise;
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'LOAD': {
        if (doc) { doc.destroy(); doc = null; }
        const buf = new Uint8Array(payload.data);
        doc = mupdf.Document.openDocument(buf, 'application/pdf');
        const count = doc.countPages();
        self.postMessage({ id, result: { totalPages: count } });
        break;
      }
      case 'RENDER': {
        const { pageIndex, scale } = payload;
        const page    = doc.loadPage(pageIndex);
        const matrix  = mupdf.Matrix.scale(scale, scale);
        const pixmap  = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
        const png     = pixmap.asPNG();
        pixmap.destroy();
        page.destroy();
        self.postMessage({ id, result: { png } }, [png.buffer]);
        break;
      }
      case 'DESTROY': {
        if (doc) { doc.destroy(); doc = null; }
        self.postMessage({ id, result: null });
        break;
      }
      default:
        self.postMessage({ id, error: 'unknown type' });
    }
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
`;

/* ─── MuPDF Worker Manager ──────────────────────────────────────────────── */
class MuPDFWorker {
  constructor() {
    this._pending = new Map();
    this._seq     = 0;

    try {
      const workerUrl = new URL('mupdf-worker.js', document.baseURI).href;
      this._worker = new Worker(workerUrl, { type: 'module' });
      this._worker.onmessage = this._onMessage.bind(this);
      this._worker.onerror   = (e) => {
        console.error('MuPDF Worker error:', e);
        const err = new Error('Worker error: ' + (e.message || 'unknown'));
        this._pending.forEach(({ reject: rej }) => rej(err));
        this._pending.clear();
      };
    } catch (e) {
      console.error('Worker creation failed:', e);
      this._worker = null;
    }
  }

  _onMessage(e) {
    const { id, result, error } = e.data;
    const p = this._pending.get(id);
    if (!p) return;
    this._pending.delete(id);
    if (error) p.reject(new Error(error));
    else       p.resolve(result);
  }

  send(type, payload, transfer = []) {
    return new Promise((resolve, reject) => {
      if (!this._worker) {
        reject(new Error('Worker not available'));
        return;
      }
      const id = ++this._seq;
      this._pending.set(id, { resolve, reject });
      this._worker.postMessage({ id, type, payload }, transfer);
    });
  }

  destroy() {
    if (this._worker) this._worker.terminate();
  }
}

/* singleton worker */
let _workerInstance = null;
const getWorker = () => {
  if (!_workerInstance) _workerInstance = new MuPDFWorker();
  return _workerInstance;
};

/* ─── Single Page Component (lazy render) ──────────────────────────────── */
const PDFPage = ({ pageIndex, scale, worker, isVisible, pageGap, baseRatio, onDimensions }) => {
  const canvasRef  = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const renderRef  = useRef(false);
  const scaleRef   = useRef(scale);

  useEffect(() => {
    if (scaleRef.current !== scale) {
      scaleRef.current = scale;
      setRendered(false);
      renderRef.current = false;
    }
  }, [scale]);

  useEffect(() => {
    if (!isVisible || rendered || renderRef.current) return;
    renderRef.current = true;
    setLoading(true);

    worker.send('RENDER', { pageIndex, scale })
      .then(({ png }) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const blob = new Blob([png], { type: 'image/png' });
        const url  = URL.createObjectURL(blob);
        const img  = new Image();
        img.onload = () => {
          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          onDimensions?.(pageIndex, img.naturalWidth / scale, img.naturalHeight / scale);
          setRendered(true);
          setLoading(false);
        };
        img.src = url;
      })
      .catch((err) => {
        console.error(`Page ${pageIndex + 1} render error:`, err);
        renderRef.current = false;
        setLoading(false);
      });
  }, [isVisible, pageIndex, scale, worker, rendered, onDimensions]);

  // عرض پایه PDF معمولاً ۵۹۵ پوینت است. با ضرب در scale واقعی، عرض دقیق محاسبه می‌شود.
  const placeholderW = Math.round(595 * scale);
  const placeholderH = baseRatio
    ? Math.round(placeholderW * baseRatio)
    : Math.round(placeholderW * (842 / 595)); // نسبت استاندارد A4

  return (
    <div
      className="pdf-page-wrapper relative flex justify-center"
      style={{ marginBottom: `${pageGap}px` }}
      data-page={pageIndex + 1}
    >
      <div className="relative inline-block">
        {!rendered && (
          <div
            className="flex items-center justify-center rounded-sm"
            style={{
              width:      placeholderW,
              height:     placeholderH,
              background: 'rgba(30,30,50,0.6)',
            }}
          >
            {loading && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
            )}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="rounded-sm shadow-2xl max-w-none"
          style={{ display: rendered ? 'block' : 'none', height: 'auto' }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1.5
                     text-xs text-ink-4 select-none tabular-nums text-center w-full"
          style={{ direction: 'rtl' }}
        >
          صفحه {toFarsiNum(pageIndex + 1)}
        </div>
      </div>
    </div>
  );
};

/* ─── Reader View ─────────────────────────────────────────────────────────── */
const ReaderView = ({ pdf, onClose }) => {
  const scrollRef      = useRef(null);
  const contentRef     = useRef(null);
  const [totalPages,   setTotalPages]   = useState(pdf.totalPages || 0);
  const [currentPage,  setCurrentPage]  = useState(pdf.lastReadPage || 1);
  const [loadingDoc,   setLoadingDoc]   = useState(true);
  
  // محاسبه baseScale به گونه‌ای که زوم 100% دقیقاً کل عرض صفحه نمایش را پر کند (با احتساب حاشیه‌ها)
  const baseScale = useRef((window.innerWidth - 16) / 595).current;
  const [scale, setScale] = useState(1.0); // 1.0 یعنی 100% عرض صفحه
  const actualScale = scale * baseScale;

  const [visiblePages, setVisiblePages] = useState(new Set());
  const [pageInput,    setPageInput]    = useState(String(pdf.lastReadPage || 1));
  const [pageRatios,   setPageRatios]   = useState({});
  const workerRef      = useRef(null);
  const observerRef    = useRef(null);
  const PAGE_GAP       = 24;
  const pendingAnchorRef = useRef(null);

  /* callback از PDFPage برای ذخیره نسبت ابعاد واقعی صفحه */
  const handlePageDimensions = useCallback((pageIndex, baseW, baseH) => {
    const ratio = baseH / Math.max(1, baseW);
    setPageRatios((prev) => {
      if (prev[pageIndex] != null && Math.abs(prev[pageIndex] - ratio) < 0.001) return prev;
      return { ...prev, [pageIndex]: ratio };
    });
  }, []);

  /* ── تنظیم scale با حفظ نقطه anchor (عمودی و افقی) ── */
  const setScaleWithAnchor = useCallback((updater, anchorClientY = null, anchorClientX = null) => {
    const root = scrollRef.current;
    if (root && !loadingDoc && totalPages > 0) {
      const rootRect = root.getBoundingClientRect();
      const targetY  = anchorClientY ?? rootRect.top + root.clientHeight / 2;
      const targetX  = anchorClientX ?? rootRect.left + root.clientWidth / 2;

      let found = false;
      root.querySelectorAll('[data-page]').forEach((el) => {
        if (found) return;
        const r = el.getBoundingClientRect();
        if (r.top <= targetY && r.bottom > targetY) {
          found = true;
          pendingAnchorRef.current = {
            page:       Number(el.dataset.page),
            elRatioY:   (targetY - r.top) / Math.max(1, r.height),
            vpFractionY:(targetY - rootRect.top) / root.clientHeight,
            elRatioX:   (targetX - r.left) / Math.max(1, r.width),
            vpFractionX:(targetX - rootRect.left) / root.clientWidth,
          };
        }
      });

      if (!found) {
        const anchorY = root.scrollTop + root.clientHeight / 2;
        const anchorX = root.scrollLeft + root.clientWidth / 2;
        pendingAnchorRef.current = {
          fallbackRatioY: anchorY / Math.max(1, root.scrollHeight),
          fallbackRatioX: anchorX / Math.max(1, root.scrollWidth),
        };
      }
    } else {
      pendingAnchorRef.current = null;
    }
    setScale(updater);
  }, [loadingDoc, totalPages]);

  /* بعد از تغییر scale، scroll position رو بر اساس anchor تنظیم می‌کنیم */
  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (!anchor) return;

    const root = scrollRef.current;
    if (!root || loadingDoc || totalPages === 0) return;

    let disconnected = false;

    const apply = () => {
      if (disconnected || !root.isConnected) return;

      if (anchor.fallbackRatioY != null) {
        const sh = root.scrollHeight, ch = root.clientHeight;
        const sw = root.scrollWidth,  cw = root.clientWidth;
        if (sh > ch) root.scrollTop = Math.max(0, Math.min(anchor.fallbackRatioY * sh - ch / 2, sh - ch));
        if (sw > cw) root.scrollLeft = Math.max(0, Math.min(anchor.fallbackRatioX * sw - cw / 2, sw - cw));
        return;
      }

      const el = root.querySelector(`[data-page="${anchor.page}"]`);
      if (!el) return;
      const rootRect = root.getBoundingClientRect();
      const elRect   = el.getBoundingClientRect();

      const anchorAbsY = elRect.top - rootRect.top + root.scrollTop + elRect.height * anchor.elRatioY;
      const targetST   = anchorAbsY - root.clientHeight * anchor.vpFractionY;
      root.scrollTop   = Math.max(0, Math.min(targetST, root.scrollHeight - root.clientHeight));

      const anchorAbsX = elRect.left - rootRect.left + root.scrollLeft + elRect.width * anchor.elRatioX;
      const targetSL   = anchorAbsX - root.clientWidth * anchor.vpFractionX;
      root.scrollLeft  = Math.max(0, Math.min(targetSL, root.scrollWidth - root.clientWidth));
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(root);
    const col = root.querySelector(':scope > div');
    if (col) ro.observe(col);
    const tid = window.setTimeout(() => { disconnected = true; ro.disconnect(); }, 4000);

    return () => {
      disconnected = true;
      window.clearTimeout(tid);
      ro.disconnect();
    };
  }, [scale, loadingDoc, totalPages]);

  /* ── بارگذاری سند ── */
  useEffect(() => {
    workerRef.current = getWorker();
    setLoadingDoc(true);

    if (!pdf.data || pdf.data.byteLength === 0) {
      console.error('PDF data is empty or missing');
      setLoadingDoc(false);
      return;
    }

    /* یه کپی از buffer می‌سازیم و به worker منتقل می‌کنیم (transfer برای سرعت) */
    const bufCopy = pdf.data.slice(0);

    workerRef.current
      .send('LOAD', { data: bufCopy }, [bufCopy])
      .then(({ totalPages: tp }) => {
        setTotalPages(tp);
        setLoadingDoc(false);
      })
      .catch((e) => {
        console.error('PDF load error:', e);
        setLoadingDoc(false);
      });

    return () => {};
  }, [pdf]);

  /* ── صفحه جاری از scroll ── */
  const pageInputFocusedRef = useRef(false);

  const computeCurrentPageFromScroll = useCallback(() => {
    const root = scrollRef.current;
    if (!root || totalPages === 0) return;
    const rootRect    = root.getBoundingClientRect();
    const viewportMid = rootRect.top + rootRect.height / 2;
    let bestPage = 1, bestDist = Infinity;
    root.querySelectorAll('[data-page]').forEach((el) => {
      const r    = el.getBoundingClientRect();
      const mid  = r.top + r.height / 2;
      const dist = Math.abs(mid - viewportMid);
      if (dist < bestDist) { bestDist = dist; bestPage = Number(el.dataset.page); }
    });
    setCurrentPage((prev) => (prev === bestPage ? prev : bestPage));
    if (!pageInputFocusedRef.current) {
      setPageInput((prev) => { const next = String(bestPage); return prev === next ? prev : next; });
    }
  }, [totalPages]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || loadingDoc || totalPages === 0) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; computeCurrentPageFromScroll(); });
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    computeCurrentPageFromScroll();
    return () => root.removeEventListener('scroll', onScroll);
  }, [loadingDoc, totalPages, computeCurrentPageFromScroll]);

  useEffect(() => {
    if (loadingDoc || totalPages === 0) return;
    const id = requestAnimationFrame(() => computeCurrentPageFromScroll());
    return () => cancelAnimationFrame(id);
  }, [scale, loadingDoc, totalPages, computeCurrentPageFromScroll]);

  /* ── IntersectionObserver برای lazy render ── */
  useEffect(() => {
    if (loadingDoc || totalPages === 0) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = Number(entry.target.dataset.page);
          setVisiblePages((prev) => {
            const next = new Set(prev);
            if (entry.isIntersecting) next.add(pageNum);
            return next;
          });
        });
      },
      { root: scrollRef.current, rootMargin: '300px 0px 300px 0px', threshold: [0, 0.1, 0.3, 0.5, 0.9, 1.0] }
    );

    scrollRef.current?.querySelectorAll('[data-page]')?.forEach((el) => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, [loadingDoc, totalPages]);

  /* ── ذخیره پیشرفت ── */
  const persistProgress = useCallback(async (page, total) => {
    try { await idbPut({ ...pdf, lastReadPage: page, totalPages: total }); } catch {}
  }, [pdf]);

  const syncServer = useCallback(async (page) => {
    try { await dataAPI.updatePdfProgress({ filename: pdf.id, last_read_page: page }); } catch {}
  }, [pdf.id]);

  const currentPageRef = useRef(currentPage);
  const totalPagesRef  = useRef(totalPages);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { totalPagesRef.current  = totalPages;  }, [totalPages]);

  useEffect(() => {
    const iv = setInterval(() => {
      persistProgress(currentPageRef.current, totalPagesRef.current);
      syncServer(currentPageRef.current);
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [persistProgress, syncServer]);

  useEffect(() => () => {
    persistProgress(currentPageRef.current, totalPagesRef.current);
    syncServer(currentPageRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── اسکرول به صفحه ── */
  const scrollToPage = useCallback((pageNum) => {
    const el = scrollRef.current?.querySelector(`[data-page="${pageNum}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goTo = (p) => {
    const c = Math.max(1, Math.min(p, totalPages || 1));
    setCurrentPage(c);
    setPageInput(String(c));
    scrollToPage(c);
  };

  /* ── اسکرول اولیه ── */
  useEffect(() => {
    if (loadingDoc || totalPages === 0) return;
    const target = pdf.lastReadPage || 1;
    if (target > 1) setTimeout(() => scrollToPage(target), 100);
  }, [loadingDoc, totalPages, pdf.lastReadPage, scrollToPage]);

  const handleClose = async () => {
    await persistProgress(currentPage, totalPages);
    await syncServer(currentPage);
    onClose();
  };

  const pct = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  /* ── Pinch Zoom با CSS transform (smooth, بدون state update در طول gesture) ── */
  const scaleLiveRef = useRef(scale);
  useEffect(() => { scaleLiveRef.current = scale; }, [scale]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loadingDoc) return;

    const getTouchDist = (ts) => {
      const dx = ts[0].clientX - ts[1].clientX;
      const dy = ts[0].clientY - ts[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const pinch = { active: false, dist: 0, baseScale: 1, originX: 0, originY: 0, lastRatio: 1 };

    const onStart = (e) => {
      if (e.touches.length !== 2) return;
      pinch.active    = true;
      pinch.dist      = getTouchDist(e.touches);
      pinch.baseScale = scaleLiveRef.current;
      pinch.lastRatio = 1;

      const elRect = el.getBoundingClientRect();
      const midX   = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY   = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      /* origin نسبت به content div (با احتساب scroll) */
      pinch.originX = midX - elRect.left + el.scrollLeft;
      pinch.originY = midY - elRect.top  + el.scrollTop;

      const content = contentRef.current;
      if (content) {
        content.style.transformOrigin = `${pinch.originX}px ${pinch.originY}px`;
        content.style.willChange = 'transform';
      }
      /* در طول pinch، overflow رو hide کنیم تا محتوا clip بشه */
      el.style.overflow = 'hidden';
    };

    const onMove = (e) => {
      if (e.touches.length !== 2 || !pinch.active) return;
      e.preventDefault();

      const ratio   = getTouchDist(e.touches) / pinch.dist;
      const minR    = 0.5 / pinch.baseScale;
      const maxR    = 5.0 / pinch.baseScale;
      pinch.lastRatio = Math.max(minR, Math.min(maxR, ratio));

      const content = contentRef.current;
      if (content) content.style.transform = `scale(${pinch.lastRatio})`;
    };

    const onEnd = () => {
      if (!pinch.active) return;
      pinch.active = false;

      /* overflow رو برگردون */
      el.style.overflow = '';

      const content = contentRef.current;
      if (content) {
        content.style.transform      = '';
        content.style.transformOrigin = '';
        content.style.willChange     = '';
      }

      const finalScale = Math.max(0.5, Math.min(5,
        parseFloat((pinch.baseScale * pinch.lastRatio).toFixed(2))
      ));

      /* anchor: نقطه‌ای که دو انگشت روش بودن */
      const elRect        = el.getBoundingClientRect();
      const anchorClientY = pinch.originY - el.scrollTop + elRect.top;
      const anchorClientX = pinch.originX - el.scrollLeft + elRect.left;
      setScaleWithAnchor(() => finalScale, anchorClientY, anchorClientX);
    };

    el.addEventListener('touchstart',  onStart, { passive: true });
    el.addEventListener('touchmove',   onMove,  { passive: false });
    el.addEventListener('touchend',    onEnd,   { passive: true });
    el.addEventListener('touchcancel', onEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart',  onStart);
      el.removeEventListener('touchmove',   onMove);
      el.removeEventListener('touchend',    onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [loadingDoc, setScaleWithAnchor]);

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col select-none">
      {/* نوار بالا */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-card-deep/98
                      border-b border-edge flex-shrink-0 safe-area-pt" dir="rtl">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={handleClose}
            className="text-ink-3 hover:text-ink transition p-2 rounded-xl hover:bg-panel flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-sm text-ink-2 truncate max-w-[160px] md:max-w-xs">{pdf.name}</span>
        </div>

        {/* کنترل zoom — وسط viewport anchor */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScaleWithAnchor((s) => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))))}
            className="text-ink-3 hover:text-ink p-2 rounded-lg hover:bg-panel transition text-base leading-none font-bold">
            −
          </button>
          <span className="text-xs text-ink-4 w-10 text-center">{Math.round(scale * 100)}٪</span>
          <button
            onClick={() => setScaleWithAnchor((s) => Math.min(5, parseFloat((s + 0.25).toFixed(2))))}
            className="text-ink-3 hover:text-ink p-2 rounded-lg hover:bg-panel transition text-base leading-none font-bold">
            +
          </button>
        </div>
      </div>

      {/* نوار پیشرفت */}
      <div className="h-[2px] bg-panel flex-shrink-0">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {/* ناحیه اسکرول پیوسته */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-auto bg-[#18181f] touch-pan-x touch-pan-y overscroll-y-contain"
      >
        {loadingDoc ? (
          <div className="flex items-center justify-center h-full w-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <div
            ref={contentRef}
            className="flex flex-col items-center py-6 px-2"
            style={{ minWidth: 'fit-content' }}
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <PDFPage
                key={`${pdf.id}-page-${i}`}
                pageIndex={i}
                scale={actualScale}
                worker={workerRef.current}
                isVisible={visiblePages.has(i + 1)}
                pageGap={PAGE_GAP + 16}
                baseRatio={pageRatios[i]}
                onDimensions={handlePageDimensions}
              />
            ))}
          </div>
        )}
      </div>

      {/* نوار پایین — ناوبری */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-card-deep/98
                      border-t border-edge flex-shrink-0 safe-area-pb" dir="rtl">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm text-indigo-300
                     disabled:opacity-30 hover:bg-indigo-500/15 transition border border-indigo-500/20
                     disabled:border-transparent">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          قبلی
        </button>

        <div className="flex items-center gap-1.5" dir="rtl">
          <input
            type="number"
            value={pageInput}
            min={1}
            max={totalPages}
            onFocus={() => { pageInputFocusedRef.current = true; }}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => {
              pageInputFocusedRef.current = false;
              goTo(parseInt(pageInput, 10) || 1);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') goTo(parseInt(pageInput, 10) || 1); }}
            className="w-14 text-center bg-panel border border-edge-2 rounded-lg py-1.5 text-sm
                       text-ink-2 focus:outline-none focus:border-indigo-500 transition"
          />
          <span className="text-xs text-ink-4 whitespace-nowrap">
            از {toFarsiNum(totalPages || 0)}
          </span>
        </div>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm text-indigo-300
                     disabled:opacity-30 hover:bg-indigo-500/15 transition border border-indigo-500/20
                     disabled:border-transparent">
          بعدی
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rotate-180" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ─── Library Card ────────────────────────────────────────────────────────── */
const PDFCard = ({ pdf, onOpen, onDelete, onRename }) => {
  const pct = pdf.totalPages > 0
    ? Math.round(((pdf.lastReadPage || 1) / pdf.totalPages) * 100)
    : 0;

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer
                  transition-all duration-200 hover:scale-[1.02]"
      style={{
        background:           'var(--t-glass)',
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border:               '1.5px solid rgba(99,102,241,0.45)',
        boxShadow:            '0 4px 24px rgba(99,102,241,0.12), inset 0 0 0 1px var(--t-glass)',
      }}
      onClick={() => onOpen(pdf)}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: 'linear-gradient(90deg, transparent, #818cf8, transparent)' }} />

      <div className="flex items-center justify-center pt-5 pb-2">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-400" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>

      <div className="px-3 pb-3 flex flex-col gap-1 flex-1">
        <p className="text-ink-2 text-[13px] font-medium text-right line-clamp-2 leading-relaxed" dir="auto">
          {pdf.name}
        </p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[11px] text-ink-4">{toPersianDate(pdf.addedAt)}</span>
          <span className="text-[11px] text-indigo-400 tabular-nums" dir="rtl">
            {toFarsiNum(pdf.lastReadPage || 1)} / {pdf.totalPages > 0 ? toFarsiNum(pdf.totalPages) : '?'}
          </span>
        </div>
        {pdf.totalPages > 0 && (
          <div className="w-full h-1 rounded-full overflow-hidden mt-1.5 bg-panel">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #818cf8, #6366f1)' }} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 px-2 pb-2">
        <button onClick={(e) => { e.stopPropagation(); onRename(pdf); }}
          className="text-ink-4 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-panel transition"
          aria-label="تغییر نام">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(pdf.id); }}
          className="text-ink-4 hover:text-red-400 p-1.5 rounded-lg hover:bg-panel transition"
          aria-label="حذف">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const PDFReader = () => {
  const navigate = useNavigate();
  const [library,     setLibrary]     = useState([]);
  const [loadingLib,  setLoadingLib]  = useState(true);
  const [activePdf,   setActivePdf]   = useState(null);
  const [renamingPdf, setRenamingPdf] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const refreshLibrary = async () => {
    const all = await idbGetAll();
    setLibrary(all.map(stripMeta).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)));
  };

  useEffect(() => { refreshLibrary().finally(() => setLoadingLib(false)); }, []);

  const fetchServerProgressPage = async (filename) => {
    try {
      const res  = await dataAPI.getPdfProgress(filename);
      const page = Number(res?.data?.last_read_page);
      return Number.isInteger(page) && page > 0 ? page : null;
    } catch (error) {
      if (error?.response?.status !== 404) console.error('Error loading PDF progress:', error);
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    e.target.value = '';

    setIsImporting(true);
    try {
      const buf        = await file.arrayBuffer();
      const id         = `${file.name}_${file.size}`;
      const serverPage = await fetchServerProgressPage(id);
      let record = await idbGet(id);

      if (!record) {
        const newRec = {
          id,
          name:         file.name.replace(/\.pdf$/i, ''),
          data:         buf,
          lastReadPage: serverPage ?? 1,
          totalPages:   0,
          addedAt:      new Date().toISOString(),
        };
        await idbPut(newRec);
        await refreshLibrary();
        record = await idbGet(id);
      } else if (serverPage && serverPage !== record.lastReadPage) {
        const merged = { ...record, lastReadPage: serverPage };
        await idbPut(merged);
        await refreshLibrary();
        record = await idbGet(id);
      }

      if (record) setActivePdf(record);
    } catch (err) {
      console.error('Import error:', err);
      alert('خطا در پردازش فایل PDF');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpen   = async (meta) => { const full = await idbGet(meta.id); if (full) setActivePdf(full); };
  const handleDelete = async (id)   => { if (!confirm('این PDF از کتابخانه حذف شود؟')) return; await idbDelete(id); setLibrary((p) => p.filter((f) => f.id !== id)); };
  const handleCloseReader = async () => { setActivePdf(null); await refreshLibrary(); };
  const handleRenameStart = (pdf) => { setRenamingPdf(pdf); setRenameValue(pdf.name); };
  const handleRenameConfirm = async () => {
    if (!renamingPdf || !renameValue.trim()) return;
    const full = await idbGet(renamingPdf.id);
    if (full) { await idbPut({ ...full, name: renameValue.trim() }); await refreshLibrary(); }
    setRenamingPdf(null);
    setRenameValue('');
  };

  if (activePdf) return <ReaderView pdf={activePdf} onClose={handleCloseReader} />;

  return (
    <div className="h-full flex flex-col bg-bg text-ink" dir="rtl">
      {/* هدر */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 md:px-8 md:pt-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-ink-3 hover:text-ink transition p-2 rounded-xl hover:bg-panel">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold pb-1" style={{
            background:             'linear-gradient(90deg, #818cf8, #6366f1)',
            WebkitBackgroundClip:   'text',
            WebkitTextFillColor:    'transparent',
          }}>
            کتابخانه
          </h1>
          {!loadingLib && (
            <span className="text-sm text-ink-4 mt-1">{toFarsiNum(library.length)} فایل</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none pb-nav-safe">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {loadingLib && (
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
            </div>
          )}

          {!loadingLib && library.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 gap-3 text-ink-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 opacity-25" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-lg">کتابخانه خالی است</p>
              <p className="text-sm">با دکمه + یک فایل PDF اضافه کنید</p>
            </div>
          )}

          {!loadingLib && library.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {library.map((pdf) => (
                <PDFCard key={pdf.id} pdf={pdf} onOpen={handleOpen} onDelete={handleDelete} onRename={handleRenameStart} />
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={() => fileInputRef.current?.click()} aria-label="افزودن PDF"
        className="fixed fab-safe-bottom left-4 md:left-8 z-40 w-14 h-14 rounded-full flex items-center
                   justify-center transition-transform hover:scale-110 active:scale-95"
        style={{
          background:  'linear-gradient(135deg, #818cf8, #4f46e5)',
          boxShadow:   '0 6px 28px rgba(99,102,241,0.45)',
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none"
          viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <input ref={fileInputRef} type="file" accept="application/pdf"
        className="hidden" onChange={handleFileChange} />

      {/* مدال تغییر نام */}
      {renamingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setRenamingPdf(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: 'var(--t-card)', border: '1.5px solid rgba(99,102,241,0.4)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-ink-2 mb-4 text-right">تغییر نام فایل</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenamingPdf(null); }}
              className="w-full px-3 py-2.5 bg-panel text-ink rounded-xl border border-edge-2
                         focus:outline-none focus:border-indigo-500 text-sm mb-4"
              dir="auto"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenamingPdf(null)}
                className="px-4 py-2 text-ink-3 rounded-lg hover:bg-panel transition text-sm">
                انصراف
              </button>
              <button onClick={handleRenameConfirm}
                disabled={!renameValue.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)', color: '#fff' }}>
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay در حال بارگذاری فایل */}
      {isImporting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4" />
          <p className="text-ink-2 font-medium text-lg">در حال آماده‌سازی فایل...</p>
          <p className="text-ink-4 text-sm mt-2">لطفاً چند لحظه صبر کنید</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default PDFReader;
