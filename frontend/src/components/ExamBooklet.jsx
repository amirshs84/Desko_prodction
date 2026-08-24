import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

function PdfPage({ pdf, pageNumber }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !pdf) return undefined;
    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const width = Math.min(canvas.parentElement?.clientWidth || 800, 980);
      const viewport = page.getViewport({ scale: Math.max(width / base.width, 0.8) });
      const context = canvas.getContext('2d', { alpha: false });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  return <canvas ref={canvasRef} className="w-full bg-white mb-3 rounded-sm shadow" />;
}

export default function ExamBooklet({ blobUrl }) {
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState(blobUrl ? 'loading' : 'empty');

  useEffect(() => {
    if (!blobUrl) {
      setPdf(null);
      setPageCount(0);
      setStatus('empty');
      return undefined;
    }
    let cancelled = false;
    let loadingTask;
    setStatus('loading');
    (async () => {
      loadingTask = getDocument({ url: blobUrl });
      const doc = await loadingTask.promise;
      if (cancelled) {
        doc.destroy();
        return;
      }
      setPdf(doc);
      setPageCount(doc.numPages);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('fallback');
    });
    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [blobUrl]);

  if (status === 'empty' || !blobUrl) {
    return <p className="text-sm text-ink-3 p-6">دفترچه در دسترس نیست.</p>;
  }
  if (status === 'fallback') {
    return (
      <iframe
        title="دفترچه آزمون"
        src={blobUrl}
        className="w-full h-full min-h-[45vh] bg-white"
      />
    );
  }
  if (status === 'loading') {
    return <p className="text-sm text-ink-3 p-6">در حال نمایش دفترچه…</p>;
  }
  return (
    <div className="h-full overflow-auto bg-[#1a1a1a] p-3">
      {Array.from({ length: pageCount }, (_, index) => (
        <PdfPage key={index + 1} pdf={pdf} pageNumber={index + 1} />
      ))}
    </div>
  );
}
