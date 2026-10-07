import * as Dropdown from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Menu = Dropdown.Root
export const MenuTrigger = Dropdown.Trigger

export function MenuContent({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={6}
        className="fade z-50 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-[0_8px_24px_-10px_rgba(23,26,31,0.2)]"
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  )
}

export function MenuItem({
  children,
  onSelect,
  danger,
}: {
  children: ReactNode
  onSelect: () => void
  danger?: boolean
}) {
  return (
    <Dropdown.Item
      onSelect={onSelect}
      className={cn(
        'cursor-pointer rounded-lg px-3 py-2 text-base outline-none select-none data-[highlighted]:bg-bg',
        danger ? 'text-soft-red' : 'text-ink',
      )}
    >
      {children}
    </Dropdown.Item>
  )
}

export function MenuSeparator() {
  return <Dropdown.Separator className="my-1 h-px bg-line" />
}
