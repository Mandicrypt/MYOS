import { Plus, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { isActive, mainNav, settingsNav, type NavItem } from '@/app/navigation'
import { useUi } from '@/app/ui-context'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/store'
import { ThemeToggle } from './ThemeToggle'
import { Wordmark } from './Wordmark'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function SidebarLink({ item, count }: { item: NavItem; count?: number }) {
  const { pathname } = useLocation()
  const active = isActive(pathname, item.to)
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center justify-between rounded-lg px-3 text-base transition-colors',
        active ? 'bg-hover text-ink' : 'text-muted hover:text-ink',
      )}
    >
      {item.label}
      {count ? <span className="text-sm text-faint tabular-nums">{count}</span> : null}
    </Link>
  )
}

/** Desktop navigation: quiet text links, nothing competing with the page. */
export function Sidebar() {
  const { state } = useStore()
  const { openQuickAdd, setSearchOpen } = useUi()

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col px-4 py-7 md:flex">
      <Link to="/" className="mb-8 self-start rounded-md px-3" aria-label="MYOS home">
        <Wordmark />
      </Link>

      <button
        type="button"
        onClick={() => openQuickAdd('task')}
        className="mb-6 flex h-9 items-center justify-between rounded-lg px-3 text-base text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <span className="flex items-center gap-2">
          <Plus className="size-4" /> Add
        </span>
        <kbd className="font-sans text-sm text-faint">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="-mt-5 mb-6 flex h-9 items-center justify-between rounded-lg px-3 text-base text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" /> Search
        </span>
        <kbd className="font-sans text-sm text-faint">/</kbd>
      </button>

      <nav aria-label="Main" className="flex-1">
        <ul className="space-y-0.5">
          {mainNav.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} count={item.to === '/inbox' ? state.inbox.length : undefined} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-1">
        <div className="flex-1">
          <SidebarLink item={settingsNav} />
        </div>
        <ThemeToggle className="size-9 justify-center" />
      </div>
    </aside>
  )
}
