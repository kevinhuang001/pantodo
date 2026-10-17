import { Children, isValidElement, Fragment } from 'react'
import type { ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
interface Option {
  value: string
  label: ReactNode
  disabled?: boolean
}
function options(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child): Option[] => {
    if (
      !isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)
    )
      return []
    if (child.type === Fragment) return options(child.props.children)
    return [
      {
        value: String(child.props.value ?? ''),
        label: child.props.children,
        disabled: child.props.disabled,
      },
    ]
  })
}
/** Shared shadcn Select for form fields, filters and compact toolbar controls. */
export function SelectField({
  children,
  value,
  onValueChange,
  className,
  id,
  disabled,
  icon,
  contentClassName,
  ...props
}: {
  children: ReactNode
  value: string | number
  onValueChange: (value: string) => void
  className?: string
  id?: string
  disabled?: boolean
  icon?: ReactNode
  contentClassName?: string
  'aria-label'?: string
}) {
  return (
    <Select
      value={String(value) || '__pantodo_empty__'}
      onValueChange={(v) => onValueChange(v === '__pantodo_empty__' ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} data-value={String(value)} className={className} {...props}>
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={6}
        align="start"
        className={['product-select-content', contentClassName].filter(Boolean).join(' ')}
      >
        {options(children).map((option) => (
          <SelectItem
            key={option.value}
            data-value={option.value}
            value={option.value || '__pantodo_empty__'}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
