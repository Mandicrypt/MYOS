import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

/** "Are you sure?" before something is removed. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <p className="text-base leading-relaxed text-muted">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="quiet" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onOpenChange(false)
            onConfirm()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
