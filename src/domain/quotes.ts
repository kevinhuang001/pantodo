import { t, type MessageKey } from '@/i18n'
const COUNT = 16
/** Choose once when Create opens; avoid repeating the previous message in the same session. */
export function pickQuote(): number {
  let previous = -1
  try {
    previous = Number(sessionStorage.getItem('pantodo.last-quote') ?? '-1')
  } catch {
    /* Optional preference. */
  }
  const valid = Number.isInteger(previous) && previous >= 0 && previous < COUNT
  let next = Math.floor(Math.random() * (valid ? COUNT - 1 : COUNT))
  if (valid && next >= previous) next++
  return next
}
export function quoteText(index: number) {
  return t(('quote.' + index) as MessageKey)
}

export function rememberQuote(index: number) {
  try {
    sessionStorage.setItem('pantodo.last-quote', String(index))
  } catch {
    /* Creation works without session storage. */
  }
}
