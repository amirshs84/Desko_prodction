import { API_BASE_URL } from '../../../api/config';
import type { StreamEvent, StreamEventType } from './types';

function parseSseBlock(block: string): StreamEvent | null {
  let eventName: StreamEventType | null = null;
  let dataRaw = '';

  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() as StreamEventType;
    } else if (line.startsWith('data:')) {
      dataRaw += line.slice(5).trim();
    }
  }

  if (!eventName) return null;

  let data: Record<string, unknown> = {};
  if (dataRaw) {
    try {
      data = JSON.parse(dataRaw) as Record<string, unknown>;
    } catch {
      data = { raw: dataRaw };
    }
  }

  return { event: eventName, data };
}

/**
 * استریم SSE با fetch (پشتیبانی از Authorization header).
 * EventSource نative هدر سفارشی نمی‌پذیرد.
 */
export async function* streamAssistantMessage(
  messageId: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const token = localStorage.getItem('accessToken');
  const url = `${API_BASE_URL}${API_BASE_URL.endsWith('/') ? '' : '/'}ai/messages/${messageId}/stream/`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  if (!response.ok) {
    let message = `خطای استریم (${response.status})`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    yield { event: 'error', data: { code: 'STREAM_HTTP_ERROR', message } };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { event: 'error', data: { code: 'NO_BODY', message: 'بدنهٔ استریم در دسترس نیست.' } };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      const evt = parseSseBlock(trimmed);
      if (evt) yield evt;
    }
  }

  if (buffer.trim()) {
    const evt = parseSseBlock(buffer.trim());
    if (evt) yield evt;
  }
}
