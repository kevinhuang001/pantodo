import { Icon } from './Icon'
import type { IconName } from './Icon'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu'
export interface MenuItemSpec {
  key: string
  label: string
  icon?: IconName
  selected?: boolean
  onSelect: () => void
}
export function Menu({
  label,
  icon,
  items,
  title,
}: {
  label: string
  icon: IconName
  items: MenuItemSpec[]
  title?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="icon-button" aria-label={label} title={title ?? label}>
          <Icon name={icon} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="product-menu">
        <DropdownMenuRadioGroup value={items.find((item) => item.selected)?.key}>
          {items.map((item) => (
            <DropdownMenuRadioItem key={item.key} value={item.key} onSelect={item.onSelect}>
              {item.icon ? <Icon name={item.icon} /> : null}
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
interface SegmentedProps {
  label: string
  options: { key: string; label: string; icon?: IconName }[]
  value: string
  onChange: (key: string) => void
}

export function Segmented({ label, options, value, onChange }: SegmentedProps) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.key === value
        return (
          <button
            key={option.key}
            type="button"
            className={active ? 'segmented-item active' : 'segmented-item'}
            aria-pressed={active}
            title={option.label}
            onClick={() => onChange(option.key)}
          >
            {option.icon === undefined ? null : <Icon name={option.icon} size={14} />}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
