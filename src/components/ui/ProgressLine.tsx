import { cn } from '@/lib/cn'

/** A thin, quiet progress line. Purely visual; the numbers are always written out beside it. */
export function ProgressLine({ percent, className }: { percent: number; className?: string }) {
  return (
    <div aria-hidden className={cn('h-1 w-full overflow-hidden rounded-full bg-line', className)}>
      <div
        className="h-full rounded-full bg-calm-green transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  )
}
