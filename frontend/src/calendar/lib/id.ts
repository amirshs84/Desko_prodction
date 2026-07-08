/** در HTTP لوکال (مثل 192.168.x) معمولاً secure context نیست و randomUUID کار نمی‌کند. */
export function generateEventId(): string {
  try {
    const c = globalThis.crypto
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID()
    }
  } catch {
    /* noop */
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
