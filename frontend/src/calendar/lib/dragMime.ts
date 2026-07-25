/** MIME درگ رویداد موجود روی تقویم */
export const EVENT_DRAG_MIME = 'application/x-desko-cal-event'

/** MIME درگ بلوک آماده از پنل کنار تقویم */
export const TEMPLATE_DRAG_MIME = 'application/x-desko-block-template'

export type DragBlockTemplate = {
  key: string
  title: string
  duration_minutes: number
  color: string
}
