import { Capacitor, registerPlugin } from '@capacitor/core'
import type { ISODate, Task } from '@/types'

export type PhoneApp = { id: string; name: string; icon: string }

export type DisciplineAlarm = {
  id: string
  label: string
  hour: number
  minute: number
  repeat: boolean
  taskId: string
  /** Identifies the task's app link. See taskAppKey. */
  appKey: string
  /** A daily alarm stays quiet on this day, because the task is already done. */
  skipDate: string
}

export type DisciplineStatus = {
  locked: boolean
  activeAlarmId: string
  activeTaskId: string
  ringing: boolean
  waitingForCall: boolean
  accessibilityOn: boolean
  notificationsOn: boolean
  fullScreenOn: boolean
}

type DisciplinePlugin = {
  getApps(): Promise<{ apps: PhoneApp[] }>
  getBlocked(): Promise<{ ids: string[] }>
  setBlocked(options: { ids: string[] }): Promise<void>
  saveAlarm(options: Omit<DisciplineAlarm, 'skipDate'>): Promise<{ nextAt: number }>
  removeAlarm(options: { id: string }): Promise<void>
  listAlarms(): Promise<{ alarms: DisciplineAlarm[] }>
  markDone(options: { id: string; date: string }): Promise<void>
  testAlarm(): Promise<void>
  complete(): Promise<void>
  getStatus(): Promise<DisciplineStatus>
  requestNotifications(): Promise<void>
  setTaskApp(options: { key: string; appId: string }): Promise<void>
  getTaskApps(): Promise<{ map: Record<string, string> }>
  openApp(options: { id: string }): Promise<void>
  openSettings(options: { page: 'accessibility' | 'notifications' | 'battery' | 'fullscreen' | 'app' }): Promise<void>
}

/** The phone side of MYOS. Only exists inside the Android app. */
export const Discipline = registerPlugin<DisciplinePlugin>('Discipline')

export const isNativeApp = Capacitor.isNativePlatform()

export const TEST_ALARM_ID = '__test__'

/**
 * The task an alarm is waiting for. For a repeating (daily) task, that is today's turn of it.
 * Returns `undefined` when today's turn does not exist yet, which means "not done".
 */
export function targetTask(tasks: Task[], taskId: string, today: ISODate): Task | null | undefined {
  const base = tasks.find((t) => t.id === taskId)
  if (!base) return null // the task was deleted: nothing left to wait for
  if (!base.recurrenceId) return base
  return tasks.find((t) => t.recurrenceId === base.recurrenceId && t.occurrenceDate === today)
}

/** True when the alarm has nothing left to wait for. */
export function isTaskDone(tasks: Task[], taskId: string, today: ISODate): boolean {
  const target = targetTask(tasks, taskId, today)
  if (target === null) return true
  if (target === undefined) return false
  return target.status === 'done'
}

/**
 * Names a task's app link. A repeating task keeps one link for the whole series.
 * If the task became a series after the link was saved, the old link (by task id) is still found.
 */
export function taskAppKey(task: Task): string {
  return task.recurrenceId ?? task.id
}

export function appIdFor(links: Record<string, string>, task: Task): string {
  return links[taskAppKey(task)] ?? links[task.id] ?? ''
}
