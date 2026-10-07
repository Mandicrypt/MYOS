import { cloneElement, useId, type ReactElement } from 'react'
import { cn } from '@/lib/cn'

export const inputClass =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none transition-colors placeholder:text-faint hover:border-[var(--line-strong)] focus:border-accent'

/** A labelled form control. The label is tied to the control by id, so screen readers read just the label. */
export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactElement<{ id?: string }>
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('block', className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  )
}

type Option<T extends string> = { value: T; label: string }

/** A small row of mutually exclusive choices. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-bg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm transition-colors',
            value === o.value
              ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(23,26,31,0.08)]'
              : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
