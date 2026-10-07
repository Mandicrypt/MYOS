import { useCallback, useEffect, useRef, useState } from 'react'
import { copyText } from '@/lib/clipboard'

export type CopyStatus = 'idle' | 'copied' | 'failed'

/** One-click copy with a short "Copied" state that returns to normal on its own. */
export function useCopy(value: string, resetAfterMs = 2000) {
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(async () => {
    const ok = await copyText(value)
    setStatus(ok ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus('idle'), ok ? resetAfterMs : resetAfterMs * 2)
  }, [value, resetAfterMs])

  return { status, copy }
}
