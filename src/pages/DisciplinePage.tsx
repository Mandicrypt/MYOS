import { Check, Circle, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button, buttonClass } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { newId } from '@/lib/id'
import {
  Discipline,
  TEST_ALARM_ID,
  isNativeApp,
  type DisciplineAlarm,
  type DisciplineStatus,
  type PhoneApp,
} from '@/native/discipline'
import { useStore } from '@/store/store'

const pad = (n: number) => String(n).padStart(2, '0')

export function DisciplinePage() {
  if (!isNativeApp) {
    return (
      <>
        <PageHeader title="Discipline" />
        <p className="max-w-md text-base text-muted">
          Alarms that stop you from using chosen apps until a task is done only work in the MYOS phone app. Install the
          Android app, then open this page there.
        </p>
      </>
    )
  }
  return <DisciplineScreen />
}

function DisciplineScreen() {
  const { state } = useStore()
  const toast = useToast()

  const [status, setStatus] = useState<DisciplineStatus | null>(null)
  const [alarms, setAlarms] = useState<DisciplineAlarm[]>([])
  const [apps, setApps] = useState<PhoneApp[] | null>(null)
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const [time, setTime] = useState('08:00')
  const [label, setLabel] = useState('')
  const [taskId, setTaskId] = useState('')
  const [repeat, setRepeat] = useState(false)

  const openTasks = useMemo(
    () => state.tasks.filter((t) => t.status === 'open').sort((a, b) => a.title.localeCompare(b.title)),
    [state.tasks],
  )
  const chosenTask = state.tasks.find((t) => t.id === taskId)
  const canRepeat = Boolean(chosenTask?.recurrenceId)

  const refresh = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([Discipline.getStatus(), Discipline.listAlarms()])
      setStatus(s)
      setAlarms(a.alarms)
    } catch {
      // The phone side is not ready yet.
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(refresh, 2000)
    return () => window.clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    Promise.all([Discipline.getApps(), Discipline.getBlocked()])
      .then(([a, b]) => {
        if (cancelled) return
        setApps(a.apps)
        setBlocked(new Set(b.ids))
      })
      .catch(() => {
        if (!cancelled) setApps([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleApp = async (id: string) => {
    const next = new Set(blocked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setBlocked(next)
    await Discipline.setBlocked({ ids: [...next] })
  }

  const addAlarm = async () => {
    const [hour, minute] = time.split(':').map(Number)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return
    await Discipline.saveAlarm({
      id: newId(),
      label: label.trim() || chosenTask?.title || 'Time to do your task',
      hour,
      minute,
      repeat: canRepeat && repeat,
      taskId,
    })
    setLabel('')
    setTaskId('')
    setRepeat(false)
    toast.show(`Alarm set for ${pad(hour)}:${pad(minute)}`)
    void refresh()
  }

  const removeAlarm = async (id: string) => {
    await Discipline.removeAlarm({ id })
    void refresh()
  }

  const endEarly = async () => {
    if (!window.confirm('End this alarm early? The blocked apps will open again.')) return
    await Discipline.complete()
    void refresh()
  }

  const visibleApps = (apps ?? []).filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
  const activeTask = status?.activeTaskId ? state.tasks.find((t) => t.id === status.activeTaskId) : undefined

  return (
    <>
      <PageHeader title="Discipline" intro="An alarm that keeps ringing, and shuts out the apps you pick, until your task is done." />

      <div className="space-y-12">
        {status?.locked ? (
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-md font-medium">
              {status.waitingForCall ? 'Waiting for your call to end' : 'Your task is waiting'}
            </h2>
            <p className="mt-1 text-base text-muted">
              {activeTask ? activeTask.title : 'Finish what you set out to do. Your blocked apps are shut until then.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeTask ? (
                <Link to={`/focus/${activeTask.id}`} className={buttonClass('primary', 'md')}>
                  Open task
                </Link>
              ) : (
                <Button variant="primary" onClick={() => void Discipline.complete().then(refresh)}>
                  I am done
                </Button>
              )}
              {status.activeAlarmId === TEST_ALARM_ID ? (
                <Button onClick={() => void Discipline.complete().then(refresh)}>Stop test</Button>
              ) : (
                <Button variant="quiet" onClick={() => void endEarly()}>
                  End early
                </Button>
              )}
            </div>
          </section>
        ) : null}

        <Section title="Set up (once)">
          <ul className="divide-y divide-line">
            <SetupRow
              done={Boolean(status?.notificationsOn)}
              title="Notifications"
              hint="So the alarm can show on your screen."
              action="Allow"
              onAction={async () => {
                await Discipline.requestNotifications()
                await Discipline.openSettings({ page: 'notifications' })
              }}
            />
            {status && !status.fullScreenOn ? (
              <SetupRow
                done={false}
                title="Full-screen alarm"
                hint="So the alarm can open over your lock screen."
                action="Allow"
                onAction={() => Discipline.openSettings({ page: 'fullscreen' })}
              />
            ) : null}
            <SetupRow
              done={Boolean(status?.accessibilityOn)}
              title="App blocker"
              hint="Tap Open, find MYOS in the list, then switch it on. It only sees which app is open, never what is on your screen."
              action="Open"
              onAction={() => Discipline.openSettings({ page: 'accessibility' })}
            />
            <SetupRow
              done={null}
              title="Keep MYOS awake"
              hint="Some phones close apps to save battery. Choose MYOS and set it to Don't optimize."
              action="Open"
              onAction={() => Discipline.openSettings({ page: 'battery' })}
            />
          </ul>
        </Section>

        <Section title="Alarms">
          {alarms.length === 0 ? (
            <p className="text-base text-muted">No alarms yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {alarms.map((a) => {
                const task = state.tasks.find((t) => t.id === a.taskId)
                return (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-base tabular-nums">
                        {pad(a.hour)}:{pad(a.minute)}
                        <span className="ml-2 text-sm text-muted">{a.repeat ? 'Every day' : 'Once'}</span>
                      </p>
                      <p className="truncate text-sm text-muted">{task ? task.title : a.label || 'No task linked'}</p>
                    </div>
                    <Button variant="quiet" aria-label="Remove alarm" onClick={() => void removeAlarm(a.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-6 grid max-w-sm gap-4">
            <Field label="Time">
              <input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Task to finish">
              <select
                className={inputClass}
                value={taskId}
                onChange={(e) => {
                  setTaskId(e.target.value)
                  setRepeat(false)
                }}
              >
                <option value="">No task (I tap "I am done")</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alarm message (optional)">
              <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            {canRepeat ? (
              <label className="flex items-center gap-2 text-base">
                <input type="checkbox" className="size-4" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
                Ring every day
              </label>
            ) : null}
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => void addAlarm()}>
                Set alarm
              </Button>
              <Button onClick={() => void Discipline.testAlarm().then(() => toast.show('Test alarm rings in 8 seconds'))}>
                Test it
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Apps to block" aside={<span className="text-sm text-faint">{blocked.size} chosen</span>}>
          <input
            className={`${inputClass} mb-3 max-w-sm`}
            placeholder="Search apps"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {apps === null ? (
            <p className="text-base text-muted">Reading your apps…</p>
          ) : apps.length === 0 ? (
            <p className="text-base text-muted">Could not read the apps on this phone.</p>
          ) : (
            <ul className="divide-y divide-line">
              {visibleApps.map((app) => {
                const on = blocked.has(app.id)
                return (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => void toggleApp(app.id)}
                      aria-pressed={on}
                      className="flex w-full items-center gap-3 py-2.5 text-left"
                    >
                      {app.icon ? (
                        <img src={app.icon} alt="" className="size-8 rounded-md" />
                      ) : (
                        <span className="size-8 rounded-md bg-hover" />
                      )}
                      <span className="flex-1 truncate text-base">{app.name}</span>
                      <span className={on ? 'text-sm text-ink' : 'text-sm text-faint'}>{on ? 'Blocked' : 'Allowed'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </div>
    </>
  )
}

function SetupRow({
  done,
  title,
  hint,
  action,
  onAction,
}: {
  done: boolean | null
  title: string
  hint: string
  action: string
  onAction: () => void | Promise<void>
}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {done ? (
          <Check className="mt-0.5 size-4 shrink-0 text-calm-green" />
        ) : (
          <Circle className="mt-0.5 size-4 shrink-0 text-faint" />
        )}
        <div className="min-w-0">
          <p className="text-base">{title}</p>
          <p className="text-sm text-muted">{hint}</p>
        </div>
      </div>
      {done ? null : (
        <Button onClick={() => void onAction()} className="shrink-0">
          {action}
        </Button>
      )}
    </li>
  )
}
