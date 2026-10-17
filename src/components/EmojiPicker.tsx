import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Smile } from 'lucide-react'
import { getLocale, t } from '@/i18n'
import { useAppStore } from '@/domain/store'
import { resolveTheme, systemPrefersDark } from '@/domain/theme'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

function EmojiCatalog({ onSelect }: { onSelect: (emoji: string) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const preference = useAppStore((s) => s.settings.theme)
  const locale = getLocale()
  useEffect(() => {
    let disposed = false
    let picker: HTMLElement | undefined
    void Promise.all([
      import('emoji-mart'),
      import('@emoji-mart/data'),
      locale === 'zh-CN'
        ? import('@emoji-mart/data/i18n/zh.json')
        : locale === 'ja'
          ? import('@emoji-mart/data/i18n/ja.json')
          : import('@emoji-mart/data/i18n/en.json'),
    ])
      .then(([{ Picker }, { default: data }, { default: i18n }]) => {
        if (disposed || !host.current) return
        picker = new Picker({
          data,
          i18n,
          set: 'native',
          theme: resolveTheme(preference, systemPrefersDark()),
          previewPosition: 'none',
          skinTonePosition: 'search',
          maxFrequentRows: 1,
          perLine: 8,
          autoFocus: true,
          onEmojiSelect: (emoji: { native: string }) => onSelect(emoji.native),
        }) as unknown as HTMLElement
        host.current.replaceChildren(picker)
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      picker?.remove()
    }
  }, [locale, preference, onSelect])
  return (
    <div className="emoji-catalog" ref={host}>
      {failed ? <p role="alert">{t('work.failed')}</p> : null}
    </div>
  )
}

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="field emoji-field">
      <label htmlFor={id}>{t('emoji.label')}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" className="emoji-trigger" aria-label={t('emoji.label')}>
            <span className="emoji-preview">{value || <Smile size={20} />}</span>
            <span>{t('emoji.choose')}</span>
            <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" align="center" collisionPadding={12} className="emoji-popover">
          <EmojiCatalog
            onSelect={(emoji) => {
              onChange(emoji)
              setOpen(false)
            }}
          />
          <div className="emoji-custom">
            <Input
              aria-label={t('emoji.custom')}
              placeholder={t('emoji.custom')}
              maxLength={32}
              onChange={(e) => {
                const part = [
                  ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
                    e.target.value.trim(),
                  ),
                ][0]?.segment
                if (
                  part &&
                  /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(
                    part,
                  )
                ) {
                  onChange(part)
                  setOpen(false)
                }
              }}
            />
            <Button
              variant="ghost"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              {t('emoji.clear')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
