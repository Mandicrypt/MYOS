import { Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'

/** A plain stopwatch. Optional — nothing depends on it. */
export function FocusTimer() {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [running])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <button
      type="button"
      onClick={() => setRunning((r) => !r)}
      aria-label={running ? 'Pause timer' : seconds ? 'Resume timer' : 'Start timer'}
      className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-base text-muted tabular-nums transition-colors hover:bg-hover hover:text-ink"
    >
      {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      {seconds || running ? `${mm}:${ss}` : 'Timer'}
    </button>
  )
}
