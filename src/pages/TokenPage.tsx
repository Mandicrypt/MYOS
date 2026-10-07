import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section } from '@/components/layout/Section'
import { Wordmark } from '@/components/navigation/Wordmark'
import { BuyButton, ContractAddress, CopyButton } from '@/components/token/TokenActions'
import { useCopy } from '@/components/token/useCopy'
import { buttonClass } from '@/components/ui/Button'
import { TOKEN_PAGE, TOKENOMICS } from '@/config/token'

const T = TOKEN_PAGE

const linkClass = 'inline-flex items-center gap-1 rounded-sm text-accent-ink underline-offset-4 hover:underline'

/** A label on the left, a value on the right. Used for token info and tokenomics. */
function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="text-base text-muted">
        {label}
        {note ? <span className="text-faint"> · {note}</span> : null}
      </dt>
      <dd className="text-right text-base">{children}</dd>
    </div>
  )
}

/**
 * The MYOS token page. Public: it works without signing in.
 * `standalone` adds a small header for visitors who aren't inside the app.
 */
export function TokenPage({ standalone = false }: { standalone?: boolean }) {
  const { status, copy } = useCopy(T.contractAddress)
  const native = T.nativeTokenName ?? 'the chain’s native token'

  const content = (
    <>
      <header className="mb-10">
        <p className="text-base text-muted">MYOS Token</p>
        <h1 className="mt-1 text-2xl font-medium tracking-[-0.025em]">{T.ticker}</h1>
        <p className="mt-3 text-md text-muted">Official token details for MYOS.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <BuyButton url={T.buyUrl} ticker={T.ticker} className="w-full sm:w-auto sm:min-w-44" />
          <CopyButton status={status} onCopy={() => void copy()} className="w-full sm:w-auto sm:min-w-44" />
        </div>
        <p role="status" className="sr-only">
          {status === 'copied'
            ? 'Contract address copied'
            : status === 'failed'
              ? 'Could not copy. Select the address and copy it by hand.'
              : ''}
        </p>
        {status === 'failed' ? (
          <p className="mt-3 text-sm text-soft-red">
            Couldn’t copy automatically. Select the address below and copy it by hand.
          </p>
        ) : null}
      </header>

      <div className="space-y-14">
        <Section title="Contract address">
          <ContractAddress address={T.contractAddress} status={status} onCopy={() => void copy()} />
          <p className="mt-3 text-sm text-muted">Always check that the address matches this one before you buy.</p>
          {T.explorerUrl ? (
            <a href={T.explorerUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} mt-2 text-sm`}>
              View on explorer <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </Section>

        <Section title="Token information">
          <dl className="divide-y divide-line">
            <Row label="Name">{T.name}</Row>
            <Row label="Ticker">{T.ticker}</Row>
            <Row label="Chain">{T.chainName}</Row>
            {T.social.map((s) => (
              <Row key={s.url} label={s.label}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {s.handle} <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              </Row>
            ))}
          </dl>
        </Section>

        <Section title="How to buy">
          <ol className="divide-y divide-line">
            {[
              { title: 'Connect wallet', body: `Use a wallet that supports ${T.chainName}.` },
              { title: `Get ${native}`, body: 'You need a little to pay network fees and to swap.' },
              { title: `Swap for ${T.ticker}`, body: 'Open the Buy page, check the contract address, and swap.' },
            ].map((step, i) => (
              <li key={step.title} className="grid grid-cols-[1.75rem_1fr] gap-3 py-4">
                <span className="text-base text-muted tabular-nums">{i + 1}</span>
                <div>
                  <p className="text-md">{step.title}</p>
                  <p className="mt-0.5 text-base text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Tokenomics">
          <dl className="divide-y divide-line">
            {TOKENOMICS.map((row) => (
              <Row key={row.label} label={row.label} note={row.note}>
                {row.value ?? <span className="text-muted">To be announced</span>}
              </Row>
            ))}
          </dl>
        </Section>

        <p className="text-sm text-muted">
          MYOS will never ask for your seed phrase or private keys. This page is information, not financial advice.
        </p>
      </div>
    </>
  )

  if (!standalone) return content

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto w-full max-w-[680px] px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-24 sm:px-8 md:pt-10">
        <div className="mb-12 flex items-center justify-between md:mb-16">
          <Link to="/" aria-label="MYOS home" className="rounded-md">
            <Wordmark />
          </Link>
          <Link to="/" className={buttonClass('quiet', 'md', '-mr-3')}>
            Open MYOS
          </Link>
        </div>
        {content}
      </div>
    </div>
  )
}
