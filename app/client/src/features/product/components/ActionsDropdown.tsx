'use client'

import {
  Box,
  ClipboardCheck,
  History,
  MoreVertical,
  PackagePlus,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '../../../components'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/dropdown-menu'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../components/ui/sheet'
import { useDisclosure } from '../../../hooks/useDisclosure'
import { useIsDesktop } from '../../../hooks/useIsDesktop'

interface Props {
  canModifyProducts: boolean
  onEdit: () => void
  onDelete: () => void
  onSetupStock?: () => void
  onReceiveStock?: () => void
  onReconcileStock?: () => void
  onViewMovements?: () => void
}

export const ActionsDropdown = ({
  canModifyProducts,
  onEdit,
  onDelete,
  onSetupStock,
  onReceiveStock,
  onReconcileStock,
  onViewMovements,
}: Props) => {
  const isDesktop = useIsDesktop()
  const actions = useDisclosure()

  const runAction = (action: () => void) => {
    actions.onClose()
    action()
  }

  const trigger = (
    <button
      type="button"
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 items-center justify-center rounded-md transition-colors"
      aria-label="Product actions"
    >
      <MoreVertical size={16} />
    </button>
  )

  if (isDesktop) {
    return (
      <DropdownMenu open={actions.open} onOpenChange={actions.setOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onSetupStock && (
            <DropdownMenuItem onSelect={() => runAction(onSetupStock)}>
              <Box />
              Set up stock
            </DropdownMenuItem>
          )}
          {onReceiveStock && (
            <DropdownMenuItem onSelect={() => runAction(onReceiveStock)}>
              <PackagePlus />
              Receive stock
            </DropdownMenuItem>
          )}
          {onReconcileStock && (
            <DropdownMenuItem onSelect={() => runAction(onReconcileStock)}>
              <ClipboardCheck />
              Reconcile count
            </DropdownMenuItem>
          )}
          {onViewMovements && (
            <DropdownMenuItem onSelect={() => runAction(onViewMovements)}>
              <History />
              Movement history
            </DropdownMenuItem>
          )}
          {canModifyProducts && <DropdownMenuSeparator />}
          {canModifyProducts && (
            <DropdownMenuItem onSelect={() => runAction(onEdit)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          )}
          {canModifyProducts && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => runAction(onDelete)}
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
    <Sheet open={actions.open} onOpenChange={actions.setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent showClose aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Product actions</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-2">
          {onSetupStock && (
            <ActionButton
              icon={Box}
              label="Set up stock"
              onClick={() => runAction(onSetupStock)}
            />
          )}
          {onReceiveStock && (
            <ActionButton
              icon={PackagePlus}
              label="Receive stock"
              onClick={() => runAction(onReceiveStock)}
            />
          )}
          {onReconcileStock && (
            <ActionButton
              icon={ClipboardCheck}
              label="Reconcile count"
              onClick={() => runAction(onReconcileStock)}
            />
          )}
          {onViewMovements && (
            <ActionButton
              icon={History}
              label="Movement history"
              onClick={() => runAction(onViewMovements)}
            />
          )}
          {canModifyProducts && (
            <ActionButton
              icon={Pencil}
              label="Edit"
              onClick={() => runAction(onEdit)}
            />
          )}
          {canModifyProducts && (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => runAction(onDelete)}
            >
              <Trash2 />
              Delete
            </Button>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) => (
  <Button type="button" variant="outline" className="w-full" onClick={onClick}>
    <Icon />
    {label}
  </Button>
)
