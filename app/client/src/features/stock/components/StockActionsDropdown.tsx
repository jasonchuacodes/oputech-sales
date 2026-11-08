'use client'

import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components'

interface Props {
  productName: string
  onCount: () => void
  onReceive: () => void
}

export const StockActionsDropdown = ({
  productName,
  onCount,
  onReceive,
}: Props) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={`${productName} stock actions`}
        className="text-text-tertiary hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 flex size-11 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3 md:size-8"
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={6} className="w-40">
      <DropdownMenuItem
        className="min-h-10 px-3 py-2"
        onSelect={onCount}
      >
        Update count
      </DropdownMenuItem>
      <DropdownMenuItem
        className="min-h-10 px-3 py-2"
        onSelect={onReceive}
      >
        Add stock
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
