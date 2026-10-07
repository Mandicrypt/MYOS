import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * A plain stopwatch. Optional. When a run ends (paused, or you leave Focus),
 * its length is reported once, so it can be saved as a focus session.
 */
export function FocusTimer({ onSession }: { onSession?: (minutes: number) => void }) {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const runStart = useRef<number | null>(null)
  const report = useRef(onSession)
  useEffect(() => {
    report.current = onSession
  }, [onSession])

  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [running])

  // Leaving Focus while the timer runs still counts the session.
  useEffect(
    () => () => {
      if (runStart.current !== null) report.current?.((Date.now() - runStart.current) / 60_000)
    },
    [],
  )

  const toggle = () => {
    if (running && runStart.current !== null) {
      report.current?.((Date.now() - runStart.current) / 60_000)
      runStart.current = null
    } else runStart.current = Date.now()
    setRunning((r) => !r)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={running ? 'Pause timer' : seconds ? 'Resume timer' : 'Start timer'}
      className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-base text-muted tabular-nums transition-colors hover:bg-hover hover:text-ink"
    >
      {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      {seconds || running ? `${mm}:${ss}` : 'Timer'}
    </button>
  )
}
