import { t } from '@/i18n'
const CHOICES = [
  '📁',
  '🪴',
  '📚',
  '🎯',
  '💻',
  '🧪',
  '✍️',
  '☕',
  '🏡',
  '🌿',
  '✨',
  '🗓️',
  '🧩',
  '🎨',
  '🚀',
  '🛠️',
  '🌱',
  '🔥',
  '⚡',
  '☁️',
]
export function EmojiPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="field">
      <label>{t('emoji.label')}</label>
      <div className="emoji-picker">
        <input
          className="input emoji-input"
          aria-label={t('emoji.custom')}
          placeholder="＋"
          value={value}
          onChange={(event) => {
            const parts = [
              ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
                event.target.value.trim(),
              ),
            ]
            onChange(parts[0]?.segment ?? '')
          }}
        />
        {CHOICES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={value === emoji ? 'emoji-choice selected' : 'emoji-choice'}
            aria-label={emoji}
            aria-pressed={value === emoji}
            onClick={() => onChange(emoji)}
          >
            {emoji}
          </button>
        ))}
        <button className="text-button" type="button" onClick={() => onChange('')}>
          {t('emoji.clear')}
        </button>
      </div>
    </div>
  )
}
