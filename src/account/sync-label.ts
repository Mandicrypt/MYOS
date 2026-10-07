/** Plain words for the current sync state. */
export function syncLabel(state: string, lastSyncedAt: string | null): string {
  if (state === 'syncing') return 'Syncing…'
  if (state === 'offline') return 'Offline. Changes are saved on this device and will sync when you reconnect.'
  if (state === 'error') return 'Couldn’t sync. Your changes are saved on this device.'
  if (!lastSyncedAt) return 'Synced'
  const mins = Math.round((Date.now() - new Date(lastSyncedAt).getTime()) / 60_000)
  return mins < 1 ? 'All changes synced' : `All changes synced · ${mins} min ago`
}
