import { useEffect, useRef, useState } from 'react';

function workerUrl() {
  return new URL('/mupdf-worker.js', window.location.origin).href;
}

function createWorker() {
  const worker = new Worker(workerUrl(), { type: 'module' });
  let seq = 0;
  const pending = new Map();
  worker.onmessage = (event) => {
    const { id, result, error } = event.data || {};
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    if (error) job.reject(new Error(error));
    else job.resolve(result);
  };
  worker.onerror = (event) => {
    const err = new Error(event.message || 'خطا در موتور دفترچه');
    pending.forEach((job) => job.reject(err));
    pending.clear();
  };
  const send = (type, payload, transfer = []) => {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload }, transfer);
    });
  };
  return {
    send,
    terminate() {
      pending.forEach((job) => job.reject(new Error('stopped')));
      pending.clear();
      worker.terminate();
    },
  };
}

export default function ExamBooklet({ blobUrl }) {
  const hostRef = useRef(null);
  const urlsRef = useRef([]);
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState(blobUrl ? 'loading' : 'empty');

  useEffect(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    setPages([]);
    if (!blobUrl) {
      setStatus('empty');
      return undefined;
    }

    let cancelled = false;
    const worker = createWorker();
    setStatus('loading');

    (async () => {
      const pdfData = await fetch(blobUrl).then((res) => res.arrayBuffer());
      if (cancelled) return;
      const { totalPages } = await worker.send('LOAD', { data: pdfData }, [pdfData]);
      const width = hostRef.current?.clientWidth || window.innerWidth || 800;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.max((width / 595) * dpr, 1.1);
      const next = [];
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        const { png } = await worker.send('RENDER', { pageIndex, scale });
        if (cancelled) return;
        const url = URL.createObjectURL(new Blob([png], { type: 'image/png' }));
        urlsRef.current.push(url);
        next.push(url);
        setPages([...next]);
        setStatus('ready');
      }
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      worker.terminate();
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, [blobUrl]);

  if (status === 'empty' || !blobUrl) {
    return <p className="text-sm text-ink-3 p-6">دفترچه در دسترس نیست.</p>;
  }
  if (status === 'error') {
    return (
      <iframe
        title="دفترچه آزمون"
        src={blobUrl}
        className="w-full h-[70vh] lg:h-full min-h-[45vh] bg-white"
      />
    );
  }

  return (
    <div ref={hostRef} className="bg-[#1a1a1a] p-3 space-y-3">
      {status === 'loading' && !pages.length && (
        <p className="text-sm text-ink-3 p-6">در حال نمایش دفترچه…</p>
      )}
      {pages.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`صفحه ${index + 1}`}
          className="w-full bg-white rounded-sm shadow"
        />
      ))}
    </div>
  );
}
