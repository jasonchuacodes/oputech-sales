'use client'

import { MoreVertical, Pencil, KeyRound, Trash2 } from 'lucide-react'
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
  onEdit: () => void
  onResetPassword: () => void
  onDelete: () => void
}

export const ActionsDropdown = ({
  onEdit,
  onResetPassword,
  onDelete,
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
      aria-label="User actions"
    >
      <MoreVertical size={16} />
    </button>
  )

  if (isDesktop) {
    return (
      <DropdownMenu open={actions.open} onOpenChange={actions.setOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => runAction(onEdit)}>
          <Pencil size={14} />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => runAction(onResetPassword)}>
          <KeyRound size={14} />
          Reset Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => runAction(onDelete)}>
          <Trash2 size={14} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Sheet open={actions.open} onOpenChange={actions.setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent showClose aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>User actions</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => runAction(onEdit)}>
            <Pencil />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => runAction(onResetPassword)}
          >
            <KeyRound />
            Reset password
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => runAction(onDelete)}
          >
            <Trash2 />
            Delete
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
