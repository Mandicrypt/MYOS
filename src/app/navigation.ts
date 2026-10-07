import {
  Award,
  CalendarCheck,
  CircleDot,
  Coins,
  FileText,
  Flag,
  Folder,
  House,
  Inbox,
  ListChecks,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { label: string; to: string; icon: LucideIcon }

export const mainNav: NavItem[] = [
  { label: 'Home', to: '/', icon: House },
  { label: 'Focus', to: '/focus', icon: CircleDot },
  { label: 'Inbox', to: '/inbox', icon: Inbox },
  { label: 'Tasks', to: '/tasks', icon: ListChecks },
  { label: 'Projects', to: '/projects', icon: Folder },
  { label: 'Goals', to: '/goals', icon: Flag },
  { label: 'Notes', to: '/notes', icon: FileText },
  { label: 'Rewards', to: '/rewards', icon: Award },
  { label: 'Weekly Review', to: '/review', icon: CalendarCheck },
]

/** Public token page. Shown quietly beside Settings, not in the main list. */
export const tokenNav: NavItem = { label: '$MYOS Token', to: '/token', icon: Coins }

export const settingsNav: NavItem = { label: 'Settings', to: '/settings', icon: Settings }

export function isActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}
