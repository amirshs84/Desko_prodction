const FA = '۰۱۲۳۴۵۶۷۸۹'
const EN = '0123456789'

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA[Number(d)] ?? d)
}

/** تبدیل ارقام فارسی/عربی به انگلیسی (برای شماره تلفن و ورودی‌های عددی) */
export function toEnDigits(input: string): string {
  return String(input).replace(/[۰-۹٠-٩]/g, (d) => {
    const faIdx = FA.indexOf(d)
    if (faIdx >= 0) return EN[faIdx]
    const arIdx = '٠١٢٣٤٥٦٧٨٩'.indexOf(d)
    return arIdx >= 0 ? EN[arIdx] : d
  })
}
