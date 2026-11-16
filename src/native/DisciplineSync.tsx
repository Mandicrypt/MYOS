import { useEffect, useRef } from 'react'
import { useStore } from '@/store/store'
import { Discipline, TEST_ALARM_ID, isNativeApp, isTaskDone } from './discipline'

/**
 * Keeps the phone alarm and MYOS tasks in step. It renders nothing.
 *  - A task is finished: the alarm goes quiet and the blocked apps open again.
 *  - A task is finished before its alarm time: that alarm is cancelled (or skipped for today, if it repeats).
 */
export function DisciplineSync() {
  const { state, today } = useStore()
  const latest = useRef({ tasks: state.tasks, today })
  useEffect(() => {
    latest.current = { tasks: state.tasks, today }
  })

  useEffect(() => {
    if (!isNativeApp) return
    let cancelled = false
    let busy = false

    const sync = async () => {
      if (busy || cancelled) return
      busy = true
      try {
        const { tasks, today: day } = latest.current
        const [{ alarms }, status] = await Promise.all([Discipline.listAlarms(), Discipline.getStatus()])

        for (const alarm of alarms) {
          if (!alarm.taskId || !isTaskDone(tasks, alarm.taskId, day)) continue
          if (!alarm.repeat) await Discipline.removeAlarm({ id: alarm.id })
          else if (alarm.skipDate !== day) await Discipline.markDone({ id: alarm.id, date: day })
        }

        if (
          status.locked &&
          status.activeAlarmId !== TEST_ALARM_ID &&
          status.activeTaskId &&
          isTaskDone(tasks, status.activeTaskId, day)
        ) {
          await Discipline.complete()
        }
      } catch {
        // The phone side is not ready yet. Try again on the next round.
      } finally {
        busy = false
      }
    }

    void sync()
    const timer = window.setInterval(sync, 2500)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state.tasks, today])

  return null
}
