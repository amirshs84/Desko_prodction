export const EVENT_COLORS: string[] = [
  '#34d399',
  '#10b981',
  '#2dd4bf',
  '#22d3ee',
  '#38bdf8',
  '#a3e635',
  '#84cc16',
  '#fbbf24',
  '#fb923c',
  '#f472b6',
  '#c084fc',
  '#a78bfa',
]

let next = 0

export function nextEventColor(): string {
  const c = EVENT_COLORS[next % EVENT_COLORS.length]
  next += 1
  return c
}

export function peekNextColor(): string {
  return EVENT_COLORS[next % EVENT_COLORS.length]
}
