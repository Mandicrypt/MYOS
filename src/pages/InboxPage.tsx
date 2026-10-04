import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { InboxComposer } from '@/components/inbox/InboxComposer'
import { InboxItem } from '@/components/inbox/InboxItem'
import { useStore } from '@/store/store'

export function InboxPage() {
  const { state } = useStore()
  return (
    <>
      <PageHeader title="Inbox" intro="Get it out of your head. Sort it later — or never." />
      <InboxComposer />
      {state.inbox.length ? (
        <ul className="mt-6 divide-y divide-line">
          {state.inbox.map((item) => (
            <InboxItem key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <EmptyState title="Your head is clear.">Anything you add here waits quietly until you're ready.</EmptyState>
      )}
    </>
  )
}
