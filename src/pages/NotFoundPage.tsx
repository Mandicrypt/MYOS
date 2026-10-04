import { Link } from 'react-router-dom'
import { buttonClass } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="py-24">
      <p className="text-lg font-medium">There's nothing here.</p>
      <p className="mt-1.5 text-base text-muted">The link may be old or mistyped.</p>
      <Link to="/" className={buttonClass('secondary', 'md', 'mt-6')}>
        Go home
      </Link>
    </div>
  )
}
