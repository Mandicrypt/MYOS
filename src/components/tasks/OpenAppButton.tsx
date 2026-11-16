import { useEffect, useState } from 'react'
import { Discipline, isNativeApp } from '@/native/discipline'
import { loadPhoneApps, useTaskAppId } from '@/native/phone-apps'
import type { PhoneApp } from '@/native/discipline'
import type { Task } from '@/types'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/** "Open TikTok": takes you straight into the app this task uses. Only appears in the phone app, for tasks with an app. */
export function OpenAppButton({ task, compact }: { task: Task; compact?: boolean }) {
  const appId = useTaskAppId(task)
  const [app, setApp] = useState<PhoneApp | null>(null)

  useEffect(() => {
    if (!appId) return
    let cancelled = false
    void loadPhoneApps().then((apps) => {
      if (!cancelled) setApp(apps.find((a) => a.id === appId) ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [appId])

  if (!isNativeApp || !appId || !app || task.status === 'done') return null

  const open = () => void Discipline.openApp({ id: app.id }).catch(() => {})

  if (compact) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label={`Open ${app.name}`}
        className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-hover"
      >
        {app.icon ? <img src={app.icon} alt="" className="size-6 rounded-md" /> : <span className="text-sm">Open</span>}
      </button>
    )
  }

  return (
    <button type="button" onClick={open} className={cn(buttonClass('secondary', 'md'), 'mt-6 gap-2.5')}>
      {app.icon ? <img src={app.icon} alt="" className="size-5 rounded" /> : null}
      Open {app.name}
    </button>
  )
}
