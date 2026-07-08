import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  getAiErrorMessage,
  sendMessage as sendMessageApi,
  regenerateMessage,
  uploadAttachment,
} from '../api/client';
import { streamAssistantMessage } from '../api/sse';
import type { ChatMessage, Conversation, Message } from '../api/types';
import { useAiMessages, useAiModels } from './useAiQueries';
import { aiQueryKeys, createIdempotencyKey, isVisibleChatRole } from '../lib/utils';

interface UseAiChatOptions {
  conversationId: string | null;
  onConversationCreated?: (conversation: Conversation) => void;
}

interface StreamingState {
  messageId: string;
  content: string;
}

export function useAiChat({ conversationId, onConversationCreated }: UseAiChatOptions) {
  const queryClient = useQueryClient();
  const { data: models, isLoading: modelsLoading } = useAiModels();
  const messagesQuery = useAiMessages(conversationId);

  const [streaming, setStreaming] = useState<StreamingState | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const defaultModelId = models?.[0]?.id ?? null;

  const flatMessages = useMemo(() => {
    if (!messagesQuery.data) return [] as Message[];
    const all = messagesQuery.data.pages.flatMap((p) => p.items);
    const byId = new Map<string, Message>();
    for (const msg of all) {
      byId.set(msg.id, msg);
    }
    return [...byId.values()].sort((a, b) => a.seq - b.seq);
  }, [messagesQuery.data]);

  const displayMessages = useMemo((): ChatMessage[] => {
    return flatMessages
      .filter((m) => isVisibleChatRole(m.role))
      .map((m) => {
        if (streaming && m.id === streaming.messageId) {
          return {
            ...m,
            content: streaming.content || m.content,
            status: 'streaming',
            isStreaming: true,
          };
        }
        return m;
      });
  }, [flatMessages, streaming]);

  const stopStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const runStream = useCallback(
    async (assistantMessageId: string, convId: string) => {
      stopStream();
      const controller = new AbortController();
      streamAbortRef.current = controller;

      setStreaming({ messageId: assistantMessageId, content: '' });

      try {
        for await (const evt of streamAssistantMessage(assistantMessageId, controller.signal)) {
          if (evt.event === 'token') {
            const delta = String(evt.data.delta ?? '');
            setStreaming((prev) =>
              prev && prev.messageId === assistantMessageId
                ? { ...prev, content: prev.content + delta }
                : prev,
            );
          } else if (evt.event === 'error') {
            const msg = String(evt.data.message ?? 'خطا در تولید پاسخ.');
            setError(msg);
            break;
          } else if (evt.event === 'done') {
            break;
          }
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(getAiErrorMessage(err, 'اتصال استریم قطع شد.'));
        }
      } finally {
        setStreaming(null);
        streamAbortRef.current = null;
        await queryClient.invalidateQueries({ queryKey: aiQueryKeys.messages(convId) });
        await queryClient.invalidateQueries({ queryKey: aiQueryKeys.all });
      }
    },
    [queryClient, stopStream],
  );

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    if (!defaultModelId) {
      throw new Error('مدل فعالی یافت نشد. لطفاً با پشتیبانی تماس بگیرید.');
    }
    const conv = await createConversation({ model_id: defaultModelId });
    onConversationCreated?.(conv);
    await queryClient.invalidateQueries({ queryKey: aiQueryKeys.all });
    return conv.id;
  }, [conversationId, defaultModelId, onConversationCreated, queryClient]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      setError(null);
      setIsSending(true);

      try {
        const convId = await ensureConversation();
        const result = await sendMessageApi(convId, {
          content: trimmed,
          idempotency_key: createIdempotencyKey(),
        });

        await queryClient.invalidateQueries({ queryKey: aiQueryKeys.messages(convId) });

        setIsSending(false);
        await runStream(result.assistant_message.id, convId);
      } catch (err) {
        setIsSending(false);
        setError(getAiErrorMessage(err, 'ارسال پیام ناموفق بود.'));
      }
    },
    [ensureConversation, isSending, queryClient, runStream],
  );

  const regenerate = useCallback(
    async (message: Message) => {
      if (message.role !== 'assistant' || isSending) return;

      setError(null);
      setIsSending(true);

      try {
        const updated = await regenerateMessage(message.id, message.version);
        await queryClient.invalidateQueries({
          queryKey: aiQueryKeys.messages(message.conversation_id),
        });
        setIsSending(false);
        await runStream(updated.id, message.conversation_id);
      } catch (err) {
        setIsSending(false);
        setError(getAiErrorMessage(err, 'تولید مجدد ناموفق بود.'));
      }
    },
    [isSending, queryClient, runStream],
  );

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const attachment = await uploadAttachment(file);
      return attachment;
    } catch (err) {
      setError(getAiErrorMessage(err, 'آپلود فایل ناموفق بود.'));
      return null;
    }
  }, []);

  const isStreaming = streaming !== null;
  const isLoading = messagesQuery.isLoading || modelsLoading;
  const isThinking =
    isSending || isStreaming || displayMessages.some((m) => m.status === 'pending');

  return {
    models,
    modelsLoading,
    messages: displayMessages,
    isLoading,
    isSending,
    isStreaming,
    isThinking,
    error,
    setError,
    sendMessage,
    regenerate,
    uploadFile,
    messagesQuery,
    defaultModelId,
  };
}
