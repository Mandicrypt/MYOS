import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'quiet'
type Size = 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md', className?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40',
    size === 'md' && 'h-9 px-3.5 text-base',
    size === 'lg' && 'h-12 px-5 text-md',
    variant === 'primary' && 'bg-primary text-on-primary hover:bg-primary-hover',
    variant === 'secondary' && 'border border-line bg-surface text-ink hover:border-[var(--line-strong)]',
    variant === 'quiet' && 'text-muted hover:bg-hover hover:text-ink',
    className,
  )

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
})
