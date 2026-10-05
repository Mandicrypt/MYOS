import { Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { WalletStep } from './auth-context'
import { useAuth } from './useAuth'
import { discoverInjectedWallets } from './wallet/discover'
import { friendlyWalletError } from './wallet/errors'
import type { WalletOption } from './wallet/types'
import { walletConnectOption } from './wallet/walletconnect'

const STEP_TEXT: Record<WalletStep, string> = {
  connecting: 'Open your wallet to connect.',
  signing: 'Check your wallet and sign the message. It costs nothing.',
  verifying: 'Signing you in…',
}

/** Lists the wallets this browser has, plus WalletConnect, and runs the sign-in. */
export function WalletPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      title="Choose a wallet"
      description="Pick a wallet to sign in with"
    >
      {/* Mounted only while open, so every opening starts fresh. */}
      {open ? <WalletList onBusyChange={setBusy} /> : null}
    </Modal>
  )
}

function WalletList({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const { signInWithWallet } = useAuth()
  const [wallets, setWallets] = useState<WalletOption[] | null>(null)
  const [step, setStepState] = useState<WalletStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const setStep = (s: WalletStep | null) => {
    setStepState(s)
    onBusyChange(s !== null)
  }

  useEffect(() => {
    let active = true
    discoverInjectedWallets().then((found) => {
      if (!active) return
      const wc = walletConnectOption()
      setWallets(wc ? [...found, wc] : found)
    })
    return () => {
      active = false
    }
  }, [])

  const choose = async (wallet: WalletOption) => {
    setError(null)
    try {
      await signInWithWallet(wallet, setStep)
      // Success: the auth state changes and MYOS opens. Nothing else to do here.
    } catch (err) {
      setError(friendlyWalletError(err))
      setStep(null)
    }
  }

  return (
    <>
      {step ? (
        <p role="status" className="py-6 text-base text-muted">
          {STEP_TEXT[step]}
        </p>
      ) : wallets === null ? (
        <p role="status" className="py-6 text-base text-muted">
          Looking for wallets…
        </p>
      ) : wallets.length === 0 ? (
        <p className="py-4 text-base text-muted">
          No wallet found in this browser. Install a wallet such as MetaMask or Rabby, then try again.
        </p>
      ) : (
        <ul className="-mx-2">
          {wallets.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => void choose(w)}
                className="flex h-12 w-full items-center gap-3.5 rounded-lg px-2 text-left text-md transition-colors hover:bg-hover"
              >
                {w.icon ? (
                  <img src={w.icon} alt="" className="size-6 rounded-md" />
                ) : (
                  <Wallet className="size-5 text-muted" strokeWidth={1.6} aria-hidden />
                )}
                <span className="flex-1">{w.name}</span>
                {w.kind === 'walletconnect' ? <span className="text-sm text-muted">Phone wallets</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-base text-soft-red">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        MYOS only asks your wallet to sign a message. No transaction, no fees, and it will never ask for your recovery
        phrase.
      </p>
    </>
  )
}
