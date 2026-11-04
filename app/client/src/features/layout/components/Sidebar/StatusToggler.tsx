import { useState } from 'react'
import { Coffee } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../../components'
import { cn } from '../../../../utils/cn'
import { UserStatus } from '../../../../services/users/users.types'
import { useUpdateActivityStatus } from '../../../../services/users/users.queries'
import { useAuthContext } from '../../../../context/auth/useAuthContext'
import { useCurrentUserActivityStatus } from '../../hooks/useCurrentUserActivityStatus'

interface StatusTogglerProps {
  open: boolean
}

export const StatusToggler = ({ open }: StatusTogglerProps) => {
  const { auth } = useAuthContext()

  const [manualInput, setManualInput] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  const updateActivityStatus = useUpdateActivityStatus()
  const { status, message } = useCurrentUserActivityStatus()

  const handleStatusChange = (newStatus: UserStatus, newMessage?: string) => {
    if (!auth?.id) return
    updateActivityStatus.mutate({
      id: auth.id,
      input: { status: newStatus, message: newMessage },
    })
  }

  const handleSetManualStatus = () => {
    if (manualInput.trim()) {
      handleStatusChange(UserStatus.Inactive, manualInput)
      setManualInput('')
      setShowManualInput(false)
    }
  }

  const displayLabel =
    message ?? (status === UserStatus.Active ? 'Active' : 'Inactive')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'hover:bg-surface-hover flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
            !open && 'justify-center px-0'
          )}
        >
          <div className="bg-brand relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white uppercase">
            {auth?.username?.[0]}
            <span
              className={cn(
                'absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white',
                status === UserStatus.Active ? 'bg-success' : 'bg-gray-400'
              )}
            />
          </div>

          {open && (
            <div className="flex min-w-0 flex-col text-left leading-tight">
              <span className="text-foreground truncate text-sm font-medium">
                {auth?.username}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {displayLabel}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <div className="px-1 py-1.5">
          <div className="text-muted-foreground px-2 py-1 text-xs font-semibold tracking-wider uppercase">
            Status
          </div>
          <DropdownMenuItem
            onClick={() => handleStatusChange(UserStatus.Active)}
            className={cn(
              status === UserStatus.Active && !message && 'bg-accent'
            )}
          >
            <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
            Active
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusChange(UserStatus.Inactive, 'On Break')}
            className={cn(status === UserStatus.Inactive && 'bg-accent')}
          >
            <Coffee size={16} />
            On Break
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="px-2 py-2">
          {!showManualInput ? (
            <button
              onClick={() => setShowManualInput(true)}
              className="hover:bg-accent w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors"
            >
              Set custom status
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Enter your status..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetManualStatus()
                  }
                }}
                className="border-border placeholder-muted-foreground focus:ring-ring/50 rounded-md border bg-white px-2 py-1.5 text-base focus:ring-2 focus:outline-none md:text-sm"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  onClick={handleSetManualStatus}
                  className="bg-brand hover:bg-brand-hover flex-1 rounded-md px-2 py-1 text-xs font-medium text-white transition-colors"
                >
                  Set
                </button>
                <button
                  onClick={() => {
                    setShowManualInput(false)
                    setManualInput('')
                  }}
                  className="border-border hover:bg-surface-hover flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
