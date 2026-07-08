/** انواع قرارداد API اپ AI — هم‌راستا با serializers بک‌اند. */

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';
export type ConversationStatus = 'active' | 'archived' | 'deleted';

export interface PageMeta {
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: PageMeta;
}

export interface AiModel {
  id: string;
  key: string;
  display_name: string;
  provider_key: string;
  context_window: number;
  max_output_tokens: number;
  capabilities: string[];
}

export interface Conversation {
  id: string;
  title: string;
  status: ConversationStatus;
  is_pinned: boolean;
  is_favorite: boolean;
  model_id: string;
  version: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  status: MessageStatus;
  seq: number;
  content: string | null;
  parent_id: string | null;
  active_version_id: string | null;
  model_id: string | null;
  version: number;
}

export interface SendMessageResponse {
  user_message: Message;
  assistant_message: Message;
}

export interface Attachment {
  id: string;
  file_type: string;
  size_bytes: number;
  mime_type: string;
  parse_status: string;
  checksum_sha256: string;
  is_ready_for_rag: boolean;
}

export interface AiApiError {
  error: {
    code: string;
    message: string;
    detail?: string;
    meta?: Record<string, unknown>;
  };
}

export type StreamEventType = 'token' | 'done' | 'error';

export interface StreamEvent {
  event: StreamEventType;
  data: Record<string, unknown>;
}

/** پیام نمایشی در UI — ترکیب داده سرور + استریم زنده */
export interface ChatMessage extends Message {
  isStreaming?: boolean;
}

export interface ConversationFilters {
  search?: string;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
}
