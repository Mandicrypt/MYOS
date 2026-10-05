import { Ellipsis, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { isActive, mainNav, settingsNav, type NavItem } from '@/app/navigation'
import { useUi } from '@/app/ui-context'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/store'
import { ThemeToggle } from './ThemeToggle'

const primary = ['/', '/focus', '/tasks'].map((to) => mainNav.find((n) => n.to === to)!)
const more = [...mainNav.filter((n) => !primary.includes(n)), settingsNav]

const tabClass = (active: boolean) =>
  cn(
    'flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[12px] transition-colors',
    active ? 'text-ink' : 'text-muted',
  )

function MobileTab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.to)
  const Icon = item.icon
  return (
    <Link to={item.to} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
      <Icon className="size-5" strokeWidth={active ? 2 : 1.6} />
      {item.label}
    </Link>
  )
}

/** Phone navigation: three destinations, a central Add, and everything else under More. */
export function MobileNavigation() {
  const { pathname } = useLocation()
  const { openQuickAdd, setSearchOpen } = useUi()
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const moreActive = more.some((n) => isActive(pathname, n.to))

  const [home, focus, tasks] = primary

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="flex items-stretch">
          <MobileTab item={home} pathname={pathname} />
          <MobileTab item={focus} pathname={pathname} />
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              aria-label="Add"
              onClick={() => openQuickAdd('task')}
              className="grid size-11 place-items-center rounded-full bg-primary text-on-primary shadow-[0_4px_12px_-4px_var(--primary)]"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <MobileTab item={tasks} pathname={pathname} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={tabClass(moreActive)}
            aria-label="More sections"
          >
            <Ellipsis className="size-5" strokeWidth={moreActive ? 2 : 1.6} />
            More
          </button>
        </div>
      </nav>

      <Modal open={open} onOpenChange={setOpen} title="More" description="Other sections">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setSearchOpen(true)
          }}
          className="-mx-2 mb-1 flex h-12 w-[calc(100%+1rem)] items-center gap-3.5 rounded-lg px-2 text-md text-muted"
        >
          <Search className="size-5" strokeWidth={1.6} />
          Search
        </button>
        <ul className="-mx-2">
          {more.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.to)
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-12 items-center gap-3.5 rounded-lg px-2 text-md',
                    active ? 'text-ink' : 'text-muted',
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.6} />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/inbox' && state.inbox.length ? (
                    <span className="text-base text-faint">{state.inbox.length}</span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="-mx-2 mt-2 border-t border-line pt-2">
          <ThemeToggle withLabel className="h-12 w-full px-2 text-md" />
        </div>
      </Modal>
    </>
  )
}
