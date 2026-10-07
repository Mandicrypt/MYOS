import { Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { discoverInjectedWallets } from '@/auth/wallet/discover'
import { friendlyWalletError } from '@/auth/wallet/errors'
import type { WalletOption } from '@/auth/wallet/types'
import { walletConnectOption } from '@/auth/wallet/walletconnect'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { shortAddress } from '@/rewards/leaderboard'
import { connectWallet, disconnectWallet, signLinkMessage, type ConnectedWallet } from '@/rewards/wallet'

/**
 * Connect a wallet for rewards and prove it's yours by signing a message.
 * Uses the same wallet discovery and WalletConnect as sign-in; no other wallet library.
 */
export function RewardWalletDialog({
  open,
  onOpenChange,
  userId,
  onLinked,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  /** Receives the signed proof; the caller links it (server in live mode, local in mock mode). */
  onLinked: (address: string, signed: { message: string; signature: string }) => Promise<void>
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Connect a wallet for rewards"
      description="Connect and verify a wallet"
    >
      {open ? <Body userId={userId} onLinked={onLinked} onDone={() => onOpenChange(false)} /> : null}
    </Modal>
  )
}

function Body({
  userId,
  onLinked,
  onDone,
}: {
  userId: string
  onLinked: (a: string, s: { message: string; signature: string }) => Promise<void>
  onDone: () => void
}) {
  const [options, setOptions] = useState<WalletOption[] | null>(null)
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const walletRef = useRef<ConnectedWallet | null>(null)

  useEffect(() => {
    let active = true
    discoverInjectedWallets().then((found) => {
      if (!active) return
      const wc = walletConnectOption()
      setOptions(wc ? [...found, wc] : found)
    })
    return () => {
      active = false
      void disconnectWallet(walletRef.current)
    }
  }, [])

  const connect = async (option: WalletOption) => {
    setError(null)
    setBusy('Open your wallet to connect.')
    try {
      const w = await connectWallet(option, (change) => {
        if (change.disconnected) {
          walletRef.current = null
          setWallet(null)
          return
        }
        setWallet((current) => {
          if (!current) return current
          const next = {
            ...current,
            ...(change.address ? { address: change.address } : {}),
            ...(change.chainId ? { chainId: change.chainId } : {}),
          }
          walletRef.current = next
          return next
        })
      })
      walletRef.current = w
      setWallet(w)
    } catch (e) {
      setError(friendlyWalletError(e))
    } finally {
      setBusy(null)
    }
  }

  const verify = async () => {
    if (!walletRef.current) return
    setError(null)
    setBusy('Check your wallet and sign the message. It costs nothing.')
    try {
      const w = walletRef.current
      const signed = await signLinkMessage(w, userId)
      setBusy('Verifying…')
      await onLinked(w.address, signed)
      onDone()
    } catch (e) {
      setError(e instanceof Error && !(e as { code?: number }).code ? e.message : friendlyWalletError(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {busy ? (
        <p role="status" className="py-4 text-base text-muted">
          {busy}
        </p>
      ) : wallet ? (
        <div className="space-y-4">
          <p className="text-base">
            Connected: <span className="font-medium">{shortAddress(wallet.address)}</span>
            <span className="text-muted"> · network {wallet.chainId}</span>
          </p>
          <p className="text-sm text-muted">
            Next, sign a message to prove this wallet is yours. One wallet can only belong to one MYOS account, and your
            reward wallet can be changed once a week.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                void disconnectWallet(walletRef.current)
                walletRef.current = null
                setWallet(null)
              }}
            >
              Use another wallet
            </Button>
            <Button variant="primary" onClick={() => void verify()}>
              Verify wallet
            </Button>
          </div>
        </div>
      ) : options === null ? (
        <p role="status" className="py-4 text-base text-muted">
          Looking for wallets…
        </p>
      ) : options.length === 0 ? (
        <p className="py-4 text-base text-muted">
          No wallet found in this browser. Install a wallet such as MetaMask or Rabby, then try again.
        </p>
      ) : (
        <ul className="-mx-2">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => void connect(o)}
                className="flex h-12 w-full items-center gap-3.5 rounded-lg px-2 text-left text-md hover:bg-hover"
              >
                {o.icon ? (
                  <img src={o.icon} alt="" className="size-6 rounded-md" />
                ) : (
                  <Wallet className="size-5 text-muted" strokeWidth={1.6} aria-hidden />
                )}
                <span className="flex-1">{o.name}</span>
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
    </div>
  )
}
