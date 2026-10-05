import { isEmptyChangeSet, type CloudRepository } from '../cloud/repository'
import { rowsToState } from '../cloud/rows'
import { readCache, removeCache, STATE_VERSION, writeCache } from '../persistence'
import type { AppState } from '@/types'
import { diffStates } from './diff'
import { mergeStates } from './merge'

export type SyncState = 'syncing' | 'synced' | 'offline' | 'error'
export type SyncStatus = { state: SyncState; lastSyncedAt: string | null }

export const baseKey = (userId: string) => `myos:v2:cloud-base:${userId}`

type Options = {
  repo: CloudRepository
  userId: string
  /** The live state, read at the moment it's needed. */
  getState: () => AppState
  /** Merge cloud data into the live state (done inside the store, so no edit is lost). */
  applyMerge: (cloud: AppState, base: AppState | null) => void
  /** Seconds between background checks for changes from other devices. */
  pullEverySeconds?: number
  /** Milliseconds to wait after a change before uploading (groups quick edits). */
  pushDelayMs?: number
  /** Set to false in checks, where there is no window. */
  listenToBrowser?: boolean
}

/**
 * Keeps one user's data in step with the cloud.
 *
 * It remembers `base`: what the cloud held at the last successful sync, saved on
 * this device. Uploads are simply "what changed since base", so changes made
 * offline (even across reloads) are sent once the connection returns.
 * Operations run one at a time, in order.
 */
export class SyncController {
  private readonly o: Required<Options>
  private base: AppState | null
  private chain: Promise<unknown> = Promise.resolve()
  private timer: ReturnType<typeof setTimeout> | undefined
  private interval: ReturnType<typeof setInterval> | undefined
  private listeners = new Set<(s: SyncStatus) => void>()
  private stopBrowser: (() => void) | undefined
  status: SyncStatus = { state: 'syncing', lastSyncedAt: null }

  constructor(options: Options, base: AppState | null = null) {
    this.o = { pullEverySeconds: 30, pushDelayMs: 800, listenToBrowser: true, ...options }
    this.base = base ?? readCache(baseKey(options.userId))
  }

  subscribe(fn: (s: SyncStatus) => void): () => void {
    this.listeners.add(fn)
    fn(this.status)
    return () => this.listeners.delete(fn)
  }

  private setStatus(state: SyncState) {
    this.status = { state, lastSyncedAt: state === 'synced' ? new Date().toISOString() : this.status.lastSyncedAt }
    this.listeners.forEach((fn) => fn(this.status))
  }

  private setBase(state: AppState) {
    this.base = state
    writeCache(baseKey(this.o.userId), state)
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.chain.then(job, job)
    this.chain = run.catch(() => undefined)
    return run
  }

  private failed(error: unknown) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (!offline) console.warn('MYOS sync:', error)
    this.setStatus(offline ? 'offline' : 'error')
  }

  /** Begin syncing: fetch now, then keep checking quietly. */
  start(): void {
    void this.pull()
    this.interval = setInterval(() => void this.pull(), this.o.pullEverySeconds * 1000)
    if (this.o.listenToBrowser && typeof window !== 'undefined') {
      const online = () => void this.pull()
      const visible = () => document.visibilityState === 'visible' && void this.pull()
      window.addEventListener('online', online)
      document.addEventListener('visibilitychange', visible)
      this.stopBrowser = () => {
        window.removeEventListener('online', online)
        document.removeEventListener('visibilitychange', visible)
      }
    }
  }

  stop(): void {
    clearTimeout(this.timer)
    clearInterval(this.interval)
    this.stopBrowser?.()
    this.listeners.clear()
  }

  /** Call after every local change. Uploads shortly after, grouping quick edits. */
  notifyChange(): void {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.push(), this.o.pushDelayMs)
  }

  /** Fetch from the cloud, merge into the live state, then upload anything only this device has. */
  pull(): Promise<boolean> {
    return this.enqueue(async () => {
      this.setStatus('syncing')
      try {
        const cloud = rowsToState(await this.o.repo.load(this.o.userId), STATE_VERSION)
        const merged = mergeStates(this.o.getState(), cloud, this.base)
        this.o.applyMerge(cloud, this.base)
        this.setBase(cloud)
        await this.upload(merged)
        return true
      } catch (error) {
        this.failed(error)
        return false
      }
    })
  }

  /** Upload what changed since the last sync. */
  push(): Promise<boolean> {
    return this.enqueue(async () => {
      try {
        await this.upload(this.o.getState())
        return true
      } catch (error) {
        this.failed(error)
        return false
      }
    })
  }

  private async upload(state: AppState) {
    if (!this.base) return // Wait for the first successful fetch.
    const changes = diffStates(this.base, state, this.o.userId)
    if (!isEmptyChangeSet(changes)) {
      this.setStatus('syncing')
      await this.o.repo.apply(this.o.userId, changes)
      this.setBase(state)
    }
    this.setStatus('synced')
  }

  /** Upload right away. Resolves true if everything reached the cloud. */
  async flush(): Promise<boolean> {
    clearTimeout(this.timer)
    return this.push()
  }

  /** True if this device has changes the cloud hasn't received. */
  hasPendingChanges(): boolean {
    if (!this.base) return true
    return !isEmptyChangeSet(diffStates(this.base, this.o.getState(), this.o.userId))
  }

  /** Forget this user's sync memory on this device (used on sign-out). */
  static forget(userId: string): void {
    removeCache(baseKey(userId))
  }
}
