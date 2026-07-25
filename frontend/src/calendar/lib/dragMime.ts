/** MIME درگ رویداد موجود روی تقویم */
export const EVENT_DRAG_MIME = 'application/x-desko-cal-event'

/** MIME درگ بلوک آماده از پنل کنار تقویم */
export const TEMPLATE_DRAG_MIME = 'application/x-desko-block-template'

/** پیشوند text/plain — بعضی مرورگرها MIME سفارشی را در drop خالی می‌کنند */
export const TEMPLATE_TEXT_PREFIX = 'desko-tpl:'

export type DragBlockTemplate = {
  key: string
  title: string
  duration_minutes: number
  color: string
}

export function encodeTemplateDrag(template: DragBlockTemplate): string {
  return TEMPLATE_TEXT_PREFIX + JSON.stringify(template)
}

export function parseTemplateDrag(dataTransfer: DataTransfer): DragBlockTemplate | null {
  const custom = dataTransfer.getData(TEMPLATE_DRAG_MIME)
  if (custom) {
    try {
      return JSON.parse(custom) as DragBlockTemplate
    } catch {
      /* fall through */
    }
  }
  const plain = dataTransfer.getData('text/plain')
  if (plain.startsWith(TEMPLATE_TEXT_PREFIX)) {
    try {
      return JSON.parse(plain.slice(TEMPLATE_TEXT_PREFIX.length)) as DragBlockTemplate
    } catch {
      return null
    }
  }
  return null
}

export function isTemplateDrag(types: readonly string[]): boolean {
  return (
    types.includes(TEMPLATE_DRAG_MIME) ||
    types.includes('text/plain')
  )
}
