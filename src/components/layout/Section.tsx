import type { ReactNode } from 'react'

/** A quiet group heading over content. No boxes. */
export function Section({
  title,
  aside,
  children,
  className,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-medium text-muted">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
