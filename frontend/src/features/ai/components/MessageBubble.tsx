import { Check, Copy, RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ChatMessage } from '../api/types';

interface MessageBubbleProps {
  message: ChatMessage;
  copied: boolean;
  reaction?: 'up' | 'down';
  onCopy: () => void;
  onReaction: (vote: 'up' | 'down') => void;
  onRegenerate: () => void;
}

export function MessageBubble({
  message,
  copied,
  reaction,
  onCopy,
  onReaction,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const text = message.content ?? '';
  const showActions = !isUser && !message.isStreaming && message.status !== 'pending';

  return (
    <div className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[88%] ${
          isUser ? 'rounded-2xl rounded-br-md bg-[#2f2f2f] px-4 py-3' : 'px-2 py-1'
        }`}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-full bg-white text-black">
              <Sparkles size={14} />
            </div>
            <span className="text-sm font-semibold">دستیار</span>
            {message.status === 'failed' && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">
                خطا
              </span>
            )}
          </div>
        )}

        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {text || (message.isStreaming ? '' : '…')}
          {message.isStreaming && (
            <span className="mr-1 inline-block size-2 animate-pulse rounded-full bg-white/80 align-middle" />
          )}
        </div>

        {showActions && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-gray-400">
            <button
              type="button"
              onClick={onCopy}
              className="transition-colors hover:text-white"
              aria-label={copied ? 'کپی شد' : 'کپی متن پاسخ'}
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
            <button
              type="button"
              onClick={() => onReaction('up')}
              className={`transition-colors hover:text-white ${
                reaction === 'up' ? 'text-emerald-400' : ''
              }`}
              aria-label="پسند"
            >
              <ThumbsUp size={16} strokeWidth={reaction === 'up' ? 2.5 : 1.75} />
            </button>
            <button
              type="button"
              onClick={() => onReaction('down')}
              className={`transition-colors hover:text-white ${
                reaction === 'down' ? 'text-rose-400' : ''
              }`}
              aria-label="نپسند"
            >
              <ThumbsDown size={16} strokeWidth={reaction === 'down' ? 2.5 : 1.75} />
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="transition-colors hover:text-white"
              aria-label="تولید مجدد"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
