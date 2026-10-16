import en from './locales/en'
import ja from './locales/ja'
import zhCN from './locales/zh-CN'

export const LOCALES = ['zh-CN', 'en', 'ja'] as const

export type Locale = (typeof LOCALES)[number]
export type LocalePreference = 'system' | Locale
export type MessageKey = keyof typeof zhCN

export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '简体中文',
  en: 'English',
  ja: '日本語',
}

export const FALLBACK_LOCALE: Locale = 'zh-CN'

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  en,
  ja,
}

let currentLocale: Locale = FALLBACK_LOCALE

function systemLocale(): string {
  if (typeof navigator === 'undefined') return FALLBACK_LOCALE
  return navigator.language || FALLBACK_LOCALE
}

/** Map any BCP-47 tag onto a supported locale, falling back to zh-CN. */
export function matchLocale(tag: string): Locale {
  const lower = tag.toLowerCase()
  if (lower.startsWith('zh')) return 'zh-CN'
  if (lower.startsWith('ja')) return 'ja'
  if (lower.startsWith('en')) return 'en'
  return FALLBACK_LOCALE
}

export function resolveLocale(preference: LocalePreference, tag = systemLocale()): Locale {
  return preference === 'system' ? matchLocale(tag) : preference
}

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(locale: Locale): void {
  currentLocale = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string

/** Translate a key, interpolating `{name}` placeholders. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = catalogs[currentLocale][key] ?? catalogs[FALLBACK_LOCALE][key] ?? key
  if (vars === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name]
    return value === undefined ? match : String(value)
  })
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || isLocale(value)
}
