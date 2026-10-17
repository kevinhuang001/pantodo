export const ACCENT_COLORS = [
  'sage',
  'ocean',
  'teal',
  'lavender',
  'rose',
  'peach',
  'amber',
  'graphite',
] as const
export type AccentColor = (typeof ACCENT_COLORS)[number]
