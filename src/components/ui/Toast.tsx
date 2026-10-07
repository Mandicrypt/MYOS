import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Toast = { id: number; message: string; action?: { label: string; run: () => void } }
type ToastApi = { show: (message: string, action?: Toast['action']) => void }

const ToastContext = createContext<ToastApi | null>(null)

/** One quiet message at a time, at the bottom of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ToastApi['show']>((message, action) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), message, action })
    timer.current = window.setTimeout(() => setToast(null), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 md:bottom-8"
      >
        {toast ? (
          <div
            key={toast.id}
            className="appear pointer-events-auto flex items-center gap-4 rounded-xl bg-toast py-2.5 pr-2.5 pl-4 text-base text-toast-ink shadow-lg"
          >
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run()
                  setToast(null)
                }}
                className="rounded-lg px-2.5 py-1 font-medium text-toast-action hover:bg-hover"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
