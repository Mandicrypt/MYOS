import type { ReactNode } from 'react'

export function PageHeader({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <header className="mb-10 flex items-start justify-between gap-6">
      <div>
        <h1 className="text-xl font-medium tracking-[-0.02em]">{title}</h1>
        {intro ? <p className="mt-1.5 text-base text-muted">{intro}</p> : null}
      </div>
      {action}
    </header>
  )
}
