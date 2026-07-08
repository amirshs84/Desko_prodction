import api from '../../../api/client';
import type {
  AiModel,
  Attachment,
  Conversation,
  ConversationFilters,
  Message,
  PaginatedResponse,
  SendMessageResponse,
} from './types';

const AI_PREFIX = 'ai/';

export async function fetchModels(): Promise<AiModel[]> {
  const { data } = await api.get<{ items: AiModel[] }>(`${AI_PREFIX}models/`);
  return data.items;
}

export async function fetchConversations(
  filters: ConversationFilters = {},
  cursor?: string | null,
  limit = 30,
): Promise<PaginatedResponse<Conversation>> {
  const { data } = await api.get<PaginatedResponse<Conversation>>(`${AI_PREFIX}conversations/`, {
    params: {
      cursor: cursor ?? undefined,
      limit,
      search: filters.search || undefined,
      pinned: filters.pinned ? 'true' : undefined,
      favorite: filters.favorite ? 'true' : undefined,
      archived: filters.archived ? 'true' : undefined,
    },
  });
  return data;
}

export async function fetchConversation(conversationId: string): Promise<Conversation> {
  const { data } = await api.get<Conversation>(`${AI_PREFIX}conversations/${conversationId}/`);
  return data;
}

export async function createConversation(payload: {
  model_id: string;
  title?: string;
  temperature?: number;
  top_p?: number;
  max_output_tokens?: number;
}): Promise<Conversation> {
  const { data } = await api.post<Conversation>(`${AI_PREFIX}conversations/`, payload);
  return data;
}

export async function renameConversation(
  conversationId: string,
  title: string,
  expectedVersion: number,
): Promise<Conversation> {
  const { data } = await api.patch<Conversation>(`${AI_PREFIX}conversations/${conversationId}/`, {
    title,
    expected_version: expectedVersion,
  });
  return data;
}

export async function deleteConversation(
  conversationId: string,
  expectedVersion: number,
): Promise<void> {
  await api.delete(`${AI_PREFIX}conversations/${conversationId}/`, {
    params: { expected_version: expectedVersion },
  });
}

export async function conversationAction(
  conversationId: string,
  action: 'pin' | 'favorite' | 'archive' | 'unarchive',
  expectedVersion: number,
): Promise<Conversation> {
  const { data } = await api.post<Conversation>(
    `${AI_PREFIX}conversations/${conversationId}/actions/${action}/`,
    { expected_version: expectedVersion },
  );
  return data;
}

export async function fetchMessages(
  conversationId: string,
  cursor?: string | null,
  limit = 50,
  order: 'asc' | 'desc' = 'desc',
): Promise<PaginatedResponse<Message>> {
  const { data } = await api.get<PaginatedResponse<Message>>(
    `${AI_PREFIX}conversations/${conversationId}/messages/`,
    { params: { cursor: cursor ?? undefined, limit, order } },
  );
  return data;
}

export async function sendMessage(
  conversationId: string,
  payload: {
    content: string;
    parent_id?: string | null;
    quoted_message_id?: string | null;
    idempotency_key?: string;
  },
): Promise<SendMessageResponse> {
  const { data } = await api.post<SendMessageResponse>(
    `${AI_PREFIX}conversations/${conversationId}/messages/send/`,
    payload,
  );
  return data;
}

export async function regenerateMessage(
  messageId: string,
  expectedVersion: number,
): Promise<Message> {
  const { data } = await api.post<Message>(
    `${AI_PREFIX}messages/${messageId}/actions/regenerate/`,
    { expected_version: expectedVersion },
  );
  return data;
}

export async function uploadAttachment(file: File): Promise<Attachment> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<Attachment>(`${AI_PREFIX}attachments/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function getAiErrorMessage(err: unknown, fallback = 'خطا در ارتباط با سرور.'): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    const msg = response?.data?.error?.message;
    if (msg) return msg;
  }
  return fallback;
}
