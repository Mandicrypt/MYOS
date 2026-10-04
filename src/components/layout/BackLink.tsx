import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="-ml-1 mb-8 inline-flex items-center gap-1.5 rounded-md px-1 text-base text-muted hover:text-ink"
    >
      <ArrowLeft className="size-4" /> {label}
    </Link>
  )
}
