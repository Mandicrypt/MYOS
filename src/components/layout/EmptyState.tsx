import type { ReactNode } from 'react'

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="py-14 text-center">
      <p className="text-md text-ink">{title}</p>
      {children ? <div className="mt-1.5 text-base text-muted">{children}</div> : null}
    </div>
  )
}
