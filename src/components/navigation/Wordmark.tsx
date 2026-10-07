import logo from '@/assets/myos-logo.png'

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-md font-semibold tracking-[-0.01em]">
      <img src={logo} alt="" aria-hidden className="size-6 shrink-0" />
      MYOS
    </span>
  )
}
