import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { getPdfiumEngine, waitTask } from '../pdf/pdfiumEngine';

const MAX_BITMAP_EDGE = 2560;
const WIDTH_SNAP = 16;

function createGate() {
  let chain = Promise.resolve();
  return (fn) => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };
}

function paintRaw(canvas, raw) {
  if (!canvas || !raw?.data || !raw.width || !raw.height) return;
  const length = raw.width * raw.height * 4;
  const source = raw.data instanceof Uint8ClampedArray
    ? raw.data
    : new Uint8ClampedArray(raw.data.buffer ?? raw.data);
  if (source.length < length) return;
  const pixels = source.length === length ? source : source.subarray(0, length);
  const copy = new Uint8ClampedArray(pixels);
  canvas.width = raw.width;
  canvas.height = raw.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  ctx.putImageData(new ImageData(copy, raw.width, raw.height), 0, 0);
}

function clearCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

function pageMetrics(page, cssWidth) {
  const pageW = Math.max(Number(page?.size?.width) || 595, 1);
  const pageH = Math.max(Number(page?.size?.height) || 842, 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let scaleFactor = cssWidth / pageW;
  const longEdge = Math.max(pageW, pageH) * scaleFactor * dpr;
  if (longEdge > MAX_BITMAP_EDGE) {
    scaleFactor *= MAX_BITMAP_EDGE / longEdge;
  }
  return {
    scaleFactor,
    dpr,
  };
}

const BookletPage = memo(function BookletPage({
  engine,
  doc,
  page,
  cssWidth,
  eager,
  gate,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [inView, setInView] = useState(Boolean(eager));
  const [failed, setFailed] = useState(false);
  const metrics = pageMetrics(page, cssWidth);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { root: null, rootMargin: '180% 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !engine || !doc || !page || cssWidth < 80) {
      if (!inView) clearCanvas(canvasRef.current);
      return undefined;
    }

    let cancelled = false;
    setFailed(false);
    gate(async () => {
      if (cancelled) return;
      const raw = await waitTask(
        engine.renderPageRaw(doc, page, {
          scaleFactor: metrics.scaleFactor,
          dpr: metrics.dpr,
          withAnnotations: true,
        }),
      );
      if (cancelled) return;
      paintRaw(canvasRef.current, raw);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [inView, engine, doc, page, cssWidth, metrics.scaleFactor, metrics.dpr, gate]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden bg-white rounded-sm shadow"
      style={{ aspectRatio: `${Math.max(page?.size?.width || 595, 1)} / ${Math.max(page?.size?.height || 842, 1)}` }}
    >
      {failed ? (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-ink-3 p-4">
          این صفحه رندر نشد.
        </p>
      ) : (
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ imageRendering: 'auto' }}
        />
      )}
    </div>
  );
});

export default function ExamBooklet({ file }) {
  const hostRef = useRef(null);
  const docRef = useRef(null);
  const gateRef = useRef(createGate());
  const [engine, setEngine] = useState(null);
  const [doc, setDoc] = useState(null);
  const [cssWidth, setCssWidth] = useState(0);
  const [status, setStatus] = useState(file ? 'loading' : 'empty');

  const measure = useCallback(() => {
    const next = Math.round(hostRef.current?.clientWidth || 0);
    if (next < 80) return;
    setCssWidth((prev) => (Math.abs(prev - next) < WIDTH_SNAP ? prev : next));
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, status]);

  useEffect(() => {
    if (!file) {
      setStatus('empty');
      setDoc(null);
      return undefined;
    }

    let cancelled = false;
    docRef.current = null;
    setDoc(null);
    setStatus('loading');
    gateRef.current = createGate();

    (async () => {
      const pdfEngine = await getPdfiumEngine();
      if (cancelled) return;
      setEngine(pdfEngine);
      const content = await file.arrayBuffer();
      if (cancelled) return;
      const opened = await waitTask(
        pdfEngine.openDocumentBuffer({
          id: `booklet-${Date.now()}`,
          content,
        }),
      );
      if (cancelled) {
        waitTask(pdfEngine.closeDocument(opened)).catch(() => {});
        return;
      }
      docRef.current = opened;
      setDoc(opened);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      const opened = docRef.current;
      docRef.current = null;
      if (!opened) return;
      getPdfiumEngine()
        .then((pdfEngine) => waitTask(pdfEngine.closeDocument(opened)))
        .catch(() => {});
    };
  }, [file]);

  if (status === 'empty' || !file) {
    return <p className="text-sm text-ink-3 p-6">دفترچه در دسترس نیست.</p>;
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-rose-400 p-6 leading-7">
        نمایش دفترچه روی این دستگاه ناموفق بود. از دکمهٔ دانلود در بالای صفحه استفاده کنید.
      </p>
    );
  }

  const pages = doc?.pages || [];

  return (
    <div ref={hostRef} className="bg-[#1a1a1a] p-3 space-y-3">
      {(status === 'loading' || !pages.length || cssWidth < 80) && (
        <p className="text-sm text-ink-3 p-6">در حال نمایش دفترچه…</p>
      )}
      {status === 'ready' && cssWidth >= 80 && pages.map((page, index) => (
        <BookletPage
          key={page.index ?? index}
          engine={engine}
          doc={doc}
          page={page}
          cssWidth={cssWidth}
          eager={index < 2}
          gate={gateRef.current}
        />
      ))}
    </div>
  );
}
