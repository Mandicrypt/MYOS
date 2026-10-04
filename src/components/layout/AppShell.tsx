import { Outlet, useLocation } from 'react-router-dom'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { Sidebar } from '@/components/navigation/Sidebar'

/** The frame around every page except Focus, which runs full-screen. */
export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        <div
          key={pathname}
          className="appear mx-auto w-full max-w-[680px] px-5 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-32 sm:px-8 md:pt-20 md:pb-24"
        >
          <Outlet />
        </div>
      </main>
      <MobileNavigation />
    </div>
  )
}
