import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

type CheckboxProps = {
  checked: boolean
  onChange: () => void
  label: string
  size?: 'md' | 'sm'
}

/** Round completion control. `label` names what is being completed, for screen readers. */
export function Checkbox({ checked, onChange, label, size = 'md' }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'group grid shrink-0 place-items-center rounded-full border transition-colors',
        size === 'md' ? 'size-[22px]' : 'size-[18px]',
        checked
          ? 'border-calm-green bg-calm-green text-on-green'
          : 'border-[var(--control)] text-transparent hover:border-calm-green hover:text-calm-green/60',
      )}
    >
      <Check className={size === 'md' ? 'size-3.5' : 'size-3'} strokeWidth={3} />
    </button>
  )
}
