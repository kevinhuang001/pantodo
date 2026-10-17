import { useId, useState } from 'react'
import { ChevronDown, Search, Smile } from 'lucide-react'
import { t } from '@/i18n'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
const CHOICES = [
  ['📁', 'folder project 文件夹 项目 フォルダ'],
  ['🪴', 'plant 植物 植木'],
  ['📚', 'books study 学习 书 本'],
  ['🎯', 'target goal 目标'],
  ['💻', 'computer work 工作 电脑 パソコン'],
  ['🧪', 'science experiment 实验 科学'],
  ['✍️', 'write 写作 笔记'],
  ['☕', 'coffee life 生活 咖啡'],
  ['🏡', 'home 家 房子'],
  ['🌿', 'leaf nature 自然 树叶'],
  ['✨', 'sparkles 星光 完成'],
  ['🗓️', 'calendar 日历 日程'],
  ['🧩', 'puzzle view 视图 拼图'],
  ['🎨', 'art 设计 绘画'],
  ['🚀', 'rocket 火箭 启动'],
  ['🛠️', 'tools 工具 修理'],
  ['🌱', 'seed 成长 幼苗'],
  ['🔥', 'fire 火 紧急'],
  ['⚡', 'bolt 电 闪电'],
  ['☁️', 'cloud 云'],
  ['📌', 'pin 固定 图钉'],
  ['✅', 'done 完成'],
  ['🔬', 'research 研究 显微镜'],
  ['🎓', 'graduate 毕业 学业'],
  ['📝', 'note 记录 论文'],
  ['🏃', 'run 运动 跑步'],
  ['🎵', 'music 音乐'],
  ['✈️', 'travel 旅行 飞机'],
  ['💡', 'idea 想法 灵感'],
  ['📦', 'box 收纳 箱子'],
  ['⏰', 'time 时间 闹钟'],
  ['🌙', 'moon 夜晚 月亮'],
]
export function EmojiPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('')
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
        <PopoverContent align="start" className="emoji-popover">
          <div className="emoji-search">
            <Search size={15} />
            <Input
              aria-label={t('emoji.search')}
              placeholder={t('emoji.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="emoji-grid">
            {CHOICES.filter(([emoji, keywords]) =>
              (emoji + keywords).includes(search.toLowerCase()),
            ).map(([emoji]) => (
              <Button
                key={emoji}
                type="button"
                variant="ghost"
                className="emoji-choice"
                aria-label={emoji}
                aria-pressed={value === emoji}
                onClick={() => {
                  onChange(emoji!)
                  setOpen(false)
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
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
