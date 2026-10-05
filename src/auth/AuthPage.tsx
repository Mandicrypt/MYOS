import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { CalmScreen } from './CalmScreen'
import { useAuth } from './useAuth'
import { WalletPicker } from './WalletPicker'

type Mode = 'sign-in' | 'sign-up'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [view, setView] = useState<'choose' | 'email'>('choose')
  const [picking, setPicking] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'sign-in') await signIn(email.trim(), password)
      else {
        const { needsConfirmation } = await signUp(email.trim(), password)
        if (needsConfirmation) {
          setNotice('Check your inbox to confirm your email, then sign in here.')
          setMode('sign-in')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const signingIn = mode === 'sign-in'

  if (view === 'choose') {
    return (
      <CalmScreen>
        <h1 className="mt-10 text-xl font-medium tracking-[-0.02em]">Welcome to MYOS</h1>
        <p className="mt-1.5 text-base text-muted">
          Sign in or create your account. Your projects, tasks and notes stay private to you.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Button variant="primary" size="lg" onClick={() => setPicking(true)}>
            Continue with Wallet
          </Button>
          <Button size="lg" onClick={() => setView('email')}>
            Continue with Email
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted">Both lead to the same kind of MYOS account.</p>
        <WalletPicker open={picking} onOpenChange={setPicking} />
      </CalmScreen>
    )
  }

  return (
    <CalmScreen>
      <button
        type="button"
        onClick={() => {
          setView('choose')
          setError(null)
        }}
        className="mt-8 -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 text-base text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Other ways to sign in
      </button>
      <h1 className="mt-6 text-xl font-medium tracking-[-0.02em]">{signingIn ? 'Sign in' : 'Create your account'}</h1>
      <p className="mt-1.5 text-base text-muted">
        {signingIn ? 'Pick up where you left off, on any device.' : 'Your projects, tasks and notes, private to you.'}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete={signingIn ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-base text-soft-red">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-lg bg-accent-soft px-3 py-2.5 text-base text-accent-ink">
            {notice}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
          {busy ? 'One moment…' : signingIn ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-base text-muted">
        {signingIn ? 'New to MYOS? ' : 'Already have an account? '}
        <button
          type="button"
          onClick={() => {
            setMode(signingIn ? 'sign-up' : 'sign-in')
            setError(null)
          }}
          className="rounded-sm text-accent-ink underline-offset-4 hover:underline"
        >
          {signingIn ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </CalmScreen>
  )
}
