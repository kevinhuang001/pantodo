import { useEffect, useRef, useState } from 'react'

import { Icon } from './Icon'
import type { IconName } from './Icon'

export interface MenuItemSpec {
  key: string
  label: string
  icon?: IconName
  selected?: boolean
  onSelect: () => void
}

interface MenuProps {
  label: string
  icon: IconName
  items: MenuItemSpec[]
  title?: string
}

/**
 * The reference project's only menu pattern: a `<details>` disclosure, so it needs no portal and
 * closes on outside click via a listener rather than a library.
 */
export function Menu({ label, icon, items, title }: MenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: MouseEvent) => {
      const node = ref.current
      if (node !== null && event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <details className="menu" ref={ref} open={open}>
      <summary
        className="icon-button"
        aria-label={label}
        title={title ?? label}
        onClick={(event) => {
          event.preventDefault()
          setOpen((value) => !value)
        }}
      >
        <Icon name={icon} />
      </summary>
      <div className="menu-panel" role="menu">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitemradio"
            aria-checked={item.selected === true}
            className={item.selected === true ? 'menu-item selected' : 'menu-item'}
            onClick={() => {
              setOpen(false)
              item.onSelect()
            }}
          >
            {item.icon === undefined ? (
              <span className="menu-item-spacer" />
            ) : (
              <Icon name={item.icon} />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </details>
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
