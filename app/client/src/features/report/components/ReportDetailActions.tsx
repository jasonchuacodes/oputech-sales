'use client'

import { MoreVertical, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../components/ui/sheet'
import { useSyncContext } from '../../../context/sync/useSyncContext'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useRemit } from '../../../services/report/report.queries'

interface Props {
  reportId: string
  isRemitted: boolean
  onDelete?: () => void
}

export const ReportDetailActions = ({ reportId, isRemitted, onDelete }: Props) => {
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const { canUseOnlineFeatures } = useSyncContext()
  const remit = useRemit()
  const RemitIcon = isRemitted ? RotateCcw : Send
  const remitLabel = isRemitted ? 'Undo remit' : 'Mark as remitted'
  const disabled = remit.isPending || !canUseOnlineFeatures

  const handleRemit = () => {
    setOpen(false)
    remit.mutate({ id: reportId, isRemitted: !isRemitted })
  }

  const handleDelete = () => {
    setOpen(false)
    onDelete?.()
  }

  const trigger = (
    <button
      type="button"
      className="text-text-secondary hover:bg-surface-hover flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      aria-label="Report actions"
    >
      <MoreVertical className="size-5" aria-hidden="true" />
    </button>
  )

  if (isDesktop) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled={disabled} onSelect={handleRemit}>
            <RemitIcon />
            {remitLabel}
          </DropdownMenuItem>
          {onDelete && (
            <DropdownMenuItem
              disabled={!canUseOnlineFeatures}
              variant="destructive"
              onSelect={handleDelete}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent showClose aria-describedby="report-detail-actions-description">
        <SheetHeader>
          <SheetTitle>Report actions</SheetTitle>
          <SheetDescription id="report-detail-actions-description">
            Manage this generated report.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <dl className="rounded-card bg-background grid grid-cols-2 gap-3 p-4 text-sm">
            <dt className="text-text-secondary">Status</dt>
            <dd className="text-right font-medium">
              {isRemitted ? 'Remitted' : 'Not remitted'}
            </dd>
          </dl>
        </SheetBody>
        <SheetFooter className="flex-col">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled}
            onClick={handleRemit}
          >
            <RemitIcon />
            {remitLabel}
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={!canUseOnlineFeatures}
              onClick={handleDelete}
            >
              <Trash2 />
              Delete
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
