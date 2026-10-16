/**
 * Colour palette for projects and tags.
 *
 * Mirrors `--tag-1..8` in src/styles/tokens.css. It is duplicated here on purpose: grouping and
 * colour derivation are pure domain logic that must stay testable outside a browser, where CSS
 * custom properties are not readable.
 */
export const TAG_PALETTE: readonly string[] = [
  '#2d6d95',
  '#4b9568',
  '#bd7451',
  '#8a6bb1',
  '#be463f',
  '#3f7f8f',
  '#a8823c',
  '#5a7fb8',
]

export const TAG_PALETTE_DARK: readonly string[] = [
  '#6fb3d9',
  '#6cbd8b',
  '#d9966f',
  '#a98fd0',
  '#e0776f',
  '#5fa8b8',
  '#c8a45e',
  '#7f9fd8',
]

export function paletteFor(theme: 'light' | 'dark'): readonly string[] {
  return theme === 'dark' ? TAG_PALETTE_DARK : TAG_PALETTE
}
