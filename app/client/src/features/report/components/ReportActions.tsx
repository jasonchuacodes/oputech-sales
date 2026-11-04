'use client'

import { ChevronRight, Eye, MoreVertical, RotateCcw, Send, Trash2 } from 'lucide-react'
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
} from '../../../components/ui/sheet'
import type { ReportListItem } from '../../../services/report/report.types'
import { formatDate } from '../../../utils/date'
import { formatCurrency } from '../../../utils/number'

interface Props {
  item: ReportListItem
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  onView: (item: ReportListItem) => void
  onRemit: (item: ReportListItem) => void
  onDelete: (item: ReportListItem) => void
  canManage?: boolean
  disabled?: boolean
  mobile?: boolean
  showMobileTrigger?: boolean
}

export const ReportActions = ({
  item,
  mobileOpen,
  onMobileOpenChange,
  onView,
  onRemit,
  onDelete,
  canManage = false,
  disabled,
  mobile = true,
  showMobileTrigger = true,
}: Props) => {
  const RemitIcon = item.isRemitted ? RotateCcw : Send
  const remitLabel = item.isRemitted ? 'Undo remit' : 'Remit'

  return (
    <>
      <div className="hidden md:block" onClick={(event) => event.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 items-center justify-center rounded-md transition-colors disabled:opacity-50"
            aria-label={`Actions for report dated ${formatDate(item.toDate)}`}
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onView(item)}>
              <Eye />
              View report
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuItem disabled={disabled} onSelect={() => onRemit(item)}>
                  <RemitIcon />
                  {remitLabel}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={disabled}
                  variant="destructive"
                  onSelect={() => onDelete(item)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {mobile && (
        <>
          {showMobileTrigger && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onMobileOpenChange(true)
              }}
              className="text-text-secondary hover:bg-surface-hover flex size-11 items-center justify-center rounded-md disabled:opacity-50 md:hidden"
              aria-label={`Actions for report dated ${formatDate(item.toDate)}`}
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
            <SheetContent showClose aria-describedby="report-actions-description">
              <SheetHeader>
                <SheetTitle>Report actions</SheetTitle>
                <SheetDescription id="report-actions-description">
                  {formatDate(item.toDate)} · {formatCurrency(item.netIncome)} net income
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <dl className="rounded-card bg-background grid grid-cols-2 gap-3 p-4 text-sm">
                  <dt className="text-text-secondary">Status</dt>
                  <dd className="text-right font-medium">
                    {item.isRemitted ? 'Remitted' : 'Pending'}
                  </dd>
                  <dt className="text-text-secondary">Net income</dt>
                  <dd className="text-right font-semibold">
                    {formatCurrency(item.netIncome)}
                  </dd>
                </dl>
              </SheetBody>
              <SheetFooter className="flex-col sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto sm:flex-1"
                  onClick={() => onView(item)}
                >
                  <Eye />
                  View report
                </Button>
                {canManage && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto sm:flex-1"
                      disabled={disabled}
                      onClick={() => onRemit(item)}
                    >
                      <RemitIcon />
                      {remitLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:w-auto sm:flex-1"
                      disabled={disabled}
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </>
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </>
      )}
    </>
  )
}
