import { useEffect, useSyncExternalStore } from 'react'
import type { Task } from '@/types'
import { Discipline, appIdFor, isNativeApp, taskAppKey, type PhoneApp } from './discipline'

// One shared copy, so the editor, the task list and the Focus page always agree.
let links: Record<string, string> = {}
let linksLoaded = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function loadLinks() {
  if (!isNativeApp || linksLoaded) return
  linksLoaded = true
  Discipline.getTaskApps()
    .then((r) => {
      links = r.map
      emit()
    })
    .catch(() => {
      linksLoaded = false
    })
}

let appsPromise: Promise<PhoneApp[]> | null = null

/** The apps on this phone, read once and kept. */
export function loadPhoneApps(): Promise<PhoneApp[]> {
  if (!isNativeApp) return Promise.resolve([])
  appsPromise ??= Discipline.getApps()
    .then((r) => r.apps)
    .catch(() => {
      appsPromise = null
      return []
    })
  return appsPromise
}

/** Saves (or clears, with an empty id) the app a task uses. */
export async function saveTaskApp(task: Task, appId: string): Promise<void> {
  const key = taskAppKey(task)
  await Discipline.setTaskApp({ key, appId })
  links = { ...links }
  if (appId) links[key] = appId
  else delete links[key]
  emit()
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

/** The id of the app linked to this task ('' when none, and always '' on the website). */
export function useTaskAppId(task: Task): string {
  useEffect(loadLinks, [])
  return useSyncExternalStore(subscribe, () => appIdFor(links, task))
}
