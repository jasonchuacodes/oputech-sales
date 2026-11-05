'use client'

import { ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useIsDesktop } from '@/hooks/useIsDesktop'

interface ActionsDropdownProps {
  tenantName: string
  canEdit: boolean
  canDelete: boolean
  deleteDisabled: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
}

export const ActionsDropdown = ({
  tenantName,
  canEdit,
  canDelete,
  deleteDisabled,
  busy,
  onEdit,
  onDelete,
}: ActionsDropdownProps) => {
  const isDesktop = useIsDesktop()
  const actions = useDisclosure()

  const runAction = (action: () => void) => {
    actions.onClose()
    action()
  }

  if (isDesktop) {
    return (
      <DropdownMenu open={actions.open} onOpenChange={actions.setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            disabled={busy}
            aria-label={`Actions for ${tenantName}`}
            title="Tenant actions"
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {canEdit && (
            <DropdownMenuItem onSelect={() => runAction(onEdit)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit name
            </DropdownMenuItem>
          )}
          {canEdit && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              disabled={deleteDisabled}
              title={
                deleteDisabled
                  ? 'You must keep at least one tenant'
                  : `Delete ${tenantName}`
              }
              onSelect={() => runAction(onDelete)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Sheet open={actions.open} onOpenChange={actions.setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          disabled={busy}
          aria-label={`Actions for ${tenantName}`}
          title="Tenant actions"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent showClose>
        <SheetHeader>
          <SheetTitle>Tenant actions</SheetTitle>
          <SheetDescription>{tenantName}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-2">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => runAction(onEdit)}
            >
              <Pencil aria-hidden="true" />
              Edit name
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={deleteDisabled}
              title={
                deleteDisabled
                  ? 'You must keep at least one tenant'
                  : `Delete ${tenantName}`
              }
              onClick={() => runAction(onDelete)}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
