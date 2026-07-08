const FA = '۰۱۲۳۴۵۶۷۸۹'

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA[Number(d)] ?? d)
}
