import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  hideTitle?: boolean
  children: ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, title, description, hideTitle, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fade fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          className={cn(
            'appear fixed z-50 bg-surface shadow-[0_12px_40px_-12px_rgba(23,26,31,0.25)] outline-none',
            'inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
            'sm:inset-x-auto sm:top-[14vh] sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-2xl sm:p-6',
            className,
          )}
        >
          <div className={cn('mb-4 flex items-center justify-between gap-4', hideTitle && 'sr-only')}>
            <Dialog.Title className="text-md font-medium">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="-mr-1.5 rounded-md p-1.5 text-muted hover:text-ink">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
