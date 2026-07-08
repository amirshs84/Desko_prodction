export const HOUR_PX = 64
export const GRID_PX = 24 * HOUR_PX

export function clampMinute(m: number): number {
  return Math.max(0, Math.min(24 * 60 - 15, m))
}

export function yToMinute(y: number, gridHeight: number): number {
  const ratio = Math.max(0, Math.min(1, y / gridHeight))
  return clampMinute(Math.round((ratio * 24 * 60) / 15) * 15)
}

export function pixelsForRange(start: number, end: number): { top: number; height: number } {
  const top = (start / (24 * 60)) * GRID_PX
  const h = Math.max(20, ((end - start) / (24 * 60)) * GRID_PX)
  return { top, height: h }
}
