import type { ReactNode } from 'react'
import { Wordmark } from '@/components/navigation/Wordmark'

/** A quiet full-screen frame for loading, sign-in and one-off questions. */
export function CalmScreen({ children, label }: { children?: ReactNode; label?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 py-10">
      <div className="fade w-full max-w-sm">
        <Wordmark />
        {label ? (
          <p className="mt-8 text-base text-muted" role="status">
            {label}
          </p>
        ) : null}
        {children}
      </div>
    </main>
  )
}
