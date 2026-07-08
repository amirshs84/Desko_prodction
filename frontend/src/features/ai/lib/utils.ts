export const aiQueryKeys = {
  all: ['ai'] as const,
  models: () => [...aiQueryKeys.all, 'models'] as const,
  conversations: (filters: Record<string, unknown>) =>
    [...aiQueryKeys.all, 'conversations', filters] as const,
  conversation: (id: string | null) => [...aiQueryKeys.all, 'conversation', id] as const,
  messages: (conversationId: string | null) =>
    [...aiQueryKeys.all, 'messages', conversationId] as const,
};

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function copyPlainText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function isAssistantRole(role: string): boolean {
  return role === 'assistant';
}

export function isUserRole(role: string): boolean {
  return role === 'user';
}

/** فقط پیام‌های user/assistant برای نمایش چت */
export function isVisibleChatRole(role: string): boolean {
  return role === 'user' || role === 'assistant';
}
