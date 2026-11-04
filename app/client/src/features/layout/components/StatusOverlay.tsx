import { createPortal } from 'react-dom'

interface StatusOverlayProps {
  open: boolean
  onActive: () => void
}

export const StatusOverlay = ({ open, onActive }: StatusOverlayProps) => {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm">
      <div className="relative flex h-72 w-72 items-center justify-center">
        <span className="bg-primary/5 absolute inset-0 rounded-full" />
        <span className="bg-primary/10 absolute inset-6 rounded-full" />
        <span className="bg-primary/20 absolute inset-12 rounded-full" />

        <button
          onClick={onActive}
          className="border-primary relative flex h-40 w-40 cursor-pointer items-center justify-center rounded-full border-2 bg-black/40 text-sm font-semibold tracking-wide text-white uppercase shadow-[0_0_12px_2px_rgba(37,99,235,0.7),0_0_30px_8px_rgba(37,99,235,0.4),inset_0_0_10px_rgba(37,99,235,0.5)] transition-transform hover:scale-105"
        >
          Go Active
        </button>
      </div>

      <div className="text-center">
        <p className="text-lg font-bold text-white">
          You&apos;re currently inactive
        </p>
        <p className="text-sm text-white/70">
          Tap the button to continue using the app.
        </p>
      </div>
    </div>,
    document.body
  )
}
