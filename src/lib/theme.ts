import type { ThemeChoice } from '@/types'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** The theme actually on screen once "Match device" is resolved. */
export function resolvedTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice
  return darkQuery().matches ? 'dark' : 'light'
}

/** Puts the chosen theme on the page and tints the phone's browser bar to match. */
export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = choice
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

/** Re-run `onChange` when the device switches between light and dark. */
export function watchDeviceTheme(onChange: () => void): () => void {
  const q = darkQuery()
  q.addEventListener('change', onChange)
  return () => q.removeEventListener('change', onChange)
}
