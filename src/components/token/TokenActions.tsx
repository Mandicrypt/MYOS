import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { CopyStatus } from './useCopy'

const press = 'active:translate-y-px active:duration-75'

/** The main action: opens the official trading page in a new tab. */
export function BuyButton({ url, ticker, className }: { url: string; ticker: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClass('primary', 'lg', cn('group gap-2 active:bg-primary-hover/90', press, className))}
    >
      Buy {ticker}
      <ArrowUpRight
        className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        aria-hidden
      />
    </a>
  )
}

const copyLabel: Record<CopyStatus, string> = { idle: 'Copy CA', copied: 'Copied', failed: 'Copy failed' }

/** Copies the contract address. Shows "Copied" briefly, then goes back to normal. */
export function CopyButton({
  status,
  onCopy,
  size = 'lg',
  className,
}: {
  status: CopyStatus
  onCopy: () => void
  size?: 'md' | 'lg'
  className?: string
}) {
  const Icon = status === 'copied' ? Check : Copy
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={status === 'idle' ? 'Copy contract address' : copyLabel[status]}
      className={buttonClass(
        'secondary',
        size,
        cn(
          'active:bg-hover',
          press,
          status === 'copied' && 'border-calm-green text-calm-green hover:border-calm-green',
          status === 'failed' && 'border-soft-red text-soft-red hover:border-soft-red',
          className,
        ),
      )}
    >
      <Icon className="size-4" aria-hidden />
      {copyLabel[status]}
    </button>
  )
}

/** The full contract address, never shortened, easy to select, with its own copy button. */
export function ContractAddress({
  address,
  status,
  onCopy,
}: {
  address: string
  status: CopyStatus
  onCopy: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <code
        aria-label="Contract address"
        className="min-w-0 font-mono text-[14px] leading-6 tracking-tight break-all text-ink select-all sm:text-[15px]"
      >
        {address}
      </code>
      <CopyButton status={status} onCopy={onCopy} size="md" className="w-full shrink-0 sm:w-auto" />
    </div>
  )
}
