import { Eye, MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import type { Transaction } from '../../../services/transaction/transaction.types'

interface Props {
  item: Transaction
  onView: (item: Transaction) => void
  onDelete: (item: Transaction) => void
}

export const TransactionActions = ({ item, onView, onDelete }: Props) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 items-center justify-center rounded-md transition-colors"
      aria-label="Transaction actions"
    >
      <MoreVertical className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-44">
      <DropdownMenuItem onSelect={() => onView(item)}>
        <Eye />
        View details
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={item.processed}
        variant="destructive"
        onSelect={() => onDelete(item)}
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
