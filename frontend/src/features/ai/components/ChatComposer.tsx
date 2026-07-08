import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Brain,
  Camera,
  FileText,
  Image as ImageIcon,
  Mic,
  Plus,
  Sparkles,
  Video,
} from 'lucide-react';

interface ChatComposerProps {
  disabled?: boolean;
  isRecording?: boolean;
  recordingError?: string | null;
  onSend: (text: string) => void;
  onUploadFiles: (files: FileList, kind: string) => void;
  onToggleMic: () => void;
}

export function ChatComposer({
  disabled,
  isRecording,
  recordingError,
  onSend,
  onUploadFiles,
  onToggleMic,
}: ChatComposerProps) {
  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAttachMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.('[data-attach-menu]') && !t.closest?.('[data-attach-trigger]')) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showAttachMenu]);

  const handleSend = () => {
    if (!inputText.trim() || disabled) return;
    onSend(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const pick = (ref: React.RefObject<HTMLInputElement | null>, kind: string) => {
    setShowAttachMenu(false);
    ref.current?.click();
    void kind;
  };

  return (
    <div className="relative shrink-0 p-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && onUploadFiles(e.target.files, 'دوربین')}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onUploadFiles(e.target.files, 'گالری')}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onUploadFiles(e.target.files, 'فایل')}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onUploadFiles(e.target.files, 'ویدیو')}
      />

      {showAttachMenu && (
        <div
          data-attach-menu
          className="absolute bottom-[calc(100%+8px)] left-4 z-20 flex max-h-64 w-[min(calc(100vw-2rem),280px)] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-[#2f2f2f] shadow-xl"
        >
          {[
            { icon: Camera, label: 'دوربین', color: 'text-blue-400', action: () => pick(cameraRef, 'camera') },
            { icon: ImageIcon, label: 'گالری تصاویر', color: 'text-green-400', action: () => pick(galleryRef, 'gallery') },
            { icon: FileText, label: 'فایل‌ها', color: 'text-purple-400', action: () => pick(fileRef, 'file') },
            { icon: Video, label: 'ویدیوها', color: 'text-red-400', action: () => pick(videoRef, 'video') },
          ].map(({ icon: Icon, label, color, action }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-3 p-4 text-right transition-colors hover:bg-white/5"
              onClick={action}
            >
              <Icon size={20} className={`shrink-0 ${color}`} />
              <span>{label}</span>
            </button>
          ))}
          <button
            type="button"
            className="flex items-center gap-3 p-4 text-right transition-colors hover:bg-white/5 opacity-50"
            disabled
          >
            <Sparkles size={20} className="shrink-0 text-yellow-400" />
            <span>ساخت تصویر (به‌زودی)</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-3 p-4 text-right transition-colors hover:bg-white/5 opacity-50"
            disabled
          >
            <Brain size={20} className="shrink-0 text-pink-400" />
            <span>فکر عمیق (به‌زودی)</span>
          </button>
        </div>
      )}

      {recordingError && (
        <p className="mb-2 px-1 text-center text-xs text-amber-400/90">{recordingError}</p>
      )}
      {isRecording && (
        <p className="mb-2 flex items-center justify-center gap-2 text-center text-xs font-medium text-red-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-red-500" />
          </span>
          در حال ضبط صدا…
        </p>
      )}

      <div className="flex min-h-[56px] items-end rounded-3xl bg-[#2f2f2f] p-2">
        <div className="flex shrink-0 items-center gap-1 px-2">
          {inputText.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              className="rounded-full bg-white p-2 text-black transition-colors hover:bg-gray-200 disabled:opacity-40"
              aria-label="ارسال"
            >
              <ArrowUp size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleMic}
              className={`rounded-full p-2 transition-colors hover:bg-white/10 ${
                isRecording ? 'text-red-400' : 'text-white/80'
              }`}
              aria-label="ضبط صدا"
            >
              <Mic size={22} />
            </button>
          )}
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="پیام خود را بنویسید…"
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-white outline-none placeholder:text-white/35"
          dir="rtl"
        />

        <button
          type="button"
          data-attach-trigger
          onClick={() => setShowAttachMenu((v) => !v)}
          disabled={disabled}
          className="shrink-0 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
          aria-label="پیوست"
        >
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}
