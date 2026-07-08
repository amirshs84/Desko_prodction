import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Menu, Share, Sparkles, User } from 'lucide-react';
import { ChatComposer } from './components/ChatComposer';
import { ChatSidebar } from './components/ChatSidebar';
import { MessageBubble } from './components/MessageBubble';
import { useAiChat } from './hooks/useAiChat';
import { useAiConversations } from './hooks/useAiQueries';
import type { Conversation, Message } from './api/types';
import { copyPlainText } from './lib/utils';

export function AiChatPage() {
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [messageReactions, setMessageReactions] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(historySearch), 300);
    return () => clearTimeout(t);
  }, [historySearch]);

  const conversationsQuery = useAiConversations({ search: debouncedSearch || undefined });

  const conversations = useMemo(
    () => conversationsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [conversationsQuery.data],
  );

  const handleConversationCreated = useCallback((conv: Conversation) => {
    setActiveConversationId(conv.id);
  }, []);

  const {
    models,
    modelsLoading,
    messages,
    isLoading,
    isSending,
    isThinking,
    error,
    setError,
    sendMessage,
    regenerate,
    uploadFile,
    messagesQuery,
  } = useAiChat({
    conversationId: activeConversationId,
    onConversationCreated: handleConversationCreated,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  useEffect(
    () => () => {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const stopRecordingStream = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const toggleMic = async () => {
    setRecordingError(null);
    if (isRecording) {
      stopRecordingStream();
      setIsRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError('مرورگر از ضبط صدا پشتیبانی نمی‌کند.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (typeof MediaRecorder !== 'undefined') {
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.start();
      }
      setIsRecording(true);
    } catch {
      setRecordingError('اجازهٔ میکروفون داده نشد.');
    }
  };

  const newEmptyChat = () => {
    setActiveConversationId(null);
    setShowSidebar(false);
    setError(null);
  };

  const handleCopy = async (msgId: string, text: string) => {
    const ok = await copyPlainText(text);
    if (ok) {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      setCopiedMessageId(msgId);
      copyToastTimerRef.current = setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const setReaction = (msgId: string, vote: 'up' | 'down') => {
    setMessageReactions((prev) => {
      if (prev[msgId] === vote) {
        const next = { ...prev };
        delete next[msgId];
        return next;
      }
      return { ...prev, [msgId]: vote };
    });
  };

  const handleUploadFiles = async (files: FileList, kind: string) => {
    const file = files[0];
    if (!file) return;
    const attachment = await uploadFile(file);
    if (attachment) {
      setUploadNotice(
        `[${kind}] «${file.name}» آپلود شد (${attachment.parse_status}). پردازش RAG در پس‌زمینه انجام می‌شود.`,
      );
      setTimeout(() => setUploadNotice(null), 5000);
    }
  };

  const handleRegenerate = (message: Message) => {
    void regenerate(message);
  };

  const hasMessages = messages.length > 0;
  const composerDisabled = isSending || modelsLoading || !models?.length;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-[#121212] font-sans text-white" dir="rtl">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/timer')}
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="بازگشت"
          >
            <ArrowLeft className="size-6" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="منو"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasMessages ? (
            <>
              <button type="button" className="rounded-full p-2 transition-colors hover:bg-white/10" aria-label="اشتراک">
                <Share size={20} />
              </button>
              <button
                type="button"
                onClick={newEmptyChat}
                className="rounded-full p-2 transition-colors hover:bg-white/10"
                aria-label="گفت‌وگوی جدید"
              >
                <Edit3 size={20} />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                <Sparkles size={16} />
                <span>{models?.[0]?.display_name ?? 'دستیار AI'}</span>
              </div>
              <button type="button" className="rounded-full bg-white/10 p-2" aria-label="پروفایل">
                <User size={20} />
              </button>
            </>
          )}
        </div>
      </header>

      <ChatSidebar
        open={showSidebar}
        conversations={conversations}
        activeId={activeConversationId}
        search={historySearch}
        isLoading={conversationsQuery.isLoading}
        hasMore={!!conversationsQuery.hasNextPage}
        isFetchingMore={conversationsQuery.isFetchingNextPage}
        onClose={() => setShowSidebar(false)}
        onSearchChange={setHistorySearch}
        onSelect={(conv) => {
          setActiveConversationId(conv.id);
          setShowSidebar(false);
          setError(null);
        }}
        onNewChat={newEmptyChat}
        onLoadMore={() => void conversationsQuery.fetchNextPage()}
        onGoHome={() => {
          setShowSidebar(false);
          navigate('/timer');
        }}
      />

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
          <button
            type="button"
            className="mr-2 underline underline-offset-2"
            onClick={() => setError(null)}
          >
            بستن
          </button>
        </div>
      )}

      {uploadNotice && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {uploadNotice}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex min-h-full flex-col gap-6">
          {messagesQuery.hasNextPage && activeConversationId && (
            <button
              type="button"
              onClick={() => void messagesQuery.fetchNextPage()}
              disabled={messagesQuery.isFetchingNextPage}
              className="mx-auto text-xs text-white/45 hover:text-white/70"
            >
              {messagesQuery.isFetchingNextPage ? 'بارگذاری…' : 'پیام‌های قدیمی‌تر'}
            </button>
          )}

          {isLoading && activeConversationId && (
            <div className="flex flex-1 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}

          {!isLoading && !hasMessages && (
            <div className="flex flex-1 flex-col items-center justify-center text-white/50">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-white text-black">
                <Sparkles size={32} />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-white">دستیار</h1>
              <p>چطور می‌توانم کمکتان کنم؟</p>
              {!models?.length && !modelsLoading && (
                <p className="mt-4 max-w-xs text-center text-xs text-amber-400">
                  مدل AI فعالی یافت نشد. دستور seed_ai_model را روی سرور اجرا کنید.
                </p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              copied={copiedMessageId === msg.id}
              reaction={messageReactions[msg.id]}
              onCopy={() => void handleCopy(msg.id, msg.content ?? '')}
              onReaction={(vote) => setReaction(msg.id, vote)}
              onRegenerate={() => handleRegenerate(msg)}
            />
          ))}

          {isThinking && messages.every((m) => !m.isStreaming) && (
            <div className="flex w-full justify-end">
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="size-4 animate-pulse rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatComposer
        disabled={composerDisabled}
        isRecording={isRecording}
        recordingError={recordingError}
        onSend={(text) => void sendMessage(text)}
        onUploadFiles={(files, kind) => void handleUploadFiles(files, kind)}
        onToggleMic={() => void toggleMic()}
      />
    </div>
  );
}
