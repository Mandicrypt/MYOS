import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { resolvedTheme, watchDeviceTheme } from '@/lib/theme'
import { useStore } from '@/store/store'

/** One-tap switch between light and dark. */
export function ThemeToggle({ withLabel, className }: { withLabel?: boolean; className?: string }) {
  const { state, dispatch } = useStore()
  const choice = state.settings.theme
  const [, rerender] = useState(0)
  useEffect(() => (choice === 'system' ? watchDeviceTheme(() => rerender((n) => n + 1)) : undefined), [choice])

  const isDark = resolvedTheme(choice) === 'dark'
  const label = isDark ? 'Switch to light' : 'Switch to dark'
  const Icon = isDark ? Sun : Moon

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'settings/update', patch: { theme: isDark ? 'light' : 'dark' } })}
      aria-label={withLabel ? undefined : label}
      title={withLabel ? undefined : label}
      className={cn(
        'inline-flex items-center gap-3.5 rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink',
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.6} />
      {withLabel ? label : null}
    </button>
  )
}
