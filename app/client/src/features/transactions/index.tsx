'use client';

import { useState } from 'react';
import { Trash2, Receipt } from 'lucide-react';
import { PageHeader, Button } from '../../components';
import { DataTable, DataTableColumn } from '../../components/ui/data-table';
import { DatePicker } from '../../components/ui/date-picker';
import { useTransactions } from '../../services/transaction/transaction.queries';
import {
  Transaction,
  PaymentType,
  TransactionType,
} from '../../services/transaction/transaction.types';
import { dayjsLocal, formatDate, formatTime } from '../../utils/date';
import { formatCurrency } from '../../utils/number';
import { cn } from '../../utils/cn';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { LogExpenseModal } from './components/LogExpenseModal';

const TransactionsPage = () => {
  const [date, setDate] = useState(dayjsLocal().format('YYYY-MM-DD'));
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const { data, isLoading } = useTransactions({
    from: dayjsLocal(date).startOf('day').toISOString(),
    to: dayjsLocal(date).endOf('day').toISOString(),
  });

  const openDelete = (item: Transaction) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const columns: DataTableColumn<Transaction>[] = [
    { id: 'index', heading: '#', cell: (_, index) => index + 1 },
    {
      id: 'occurredAt',
      heading: 'Time',
      orderable: true,
      cell: (t) => formatTime(t.occurredAt),
    },
    {
      id: 'type',
      heading: 'Type',
      cell: (t) => (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              t.type === TransactionType.Expense ? 'bg-red-500' : 'bg-blue-500',
            )}
          />
          <span className="text-sm">
            {t.type === TransactionType.Expense ? 'Expense' : 'Sale'}
          </span>
        </div>
      ),
    },
    {
      id: 'items',
      heading: 'Items',
      cell: (t) =>
        t.type === TransactionType.Expense
          ? t.label
          : t.items.map((i) => `${i.name} ×${i.quantity}`).join(', '),
    },
    {
      id: 'paymentType',
      heading: 'Payment',
      cell: (t) => (t.paymentType === PaymentType.Cash ? 'Cash' : 'Online'),
    },
    {
      id: 'total',
      heading: 'Total',
      align: 'right',
      cell: (t) => formatCurrency(t.total),
    },
    {
      id: 'status',
      heading: 'Status',
      cell: (t) => {
        const label =
          t.syncState === 'blocked'
            ? 'Sync blocked'
            : t.syncState === 'deleting'
              ? 'Deleting'
              : t.syncState === 'pending'
                ? 'Unsynced'
                : t.processed
                  ? 'Processed'
                  : 'Pending report'
        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                t.syncState === 'blocked'
                  ? 'bg-red-500'
                  : t.syncState === 'pending' || t.syncState === 'deleting'
                    ? 'bg-blue-500'
                    : t.processed
                      ? 'bg-green-500'
                      : 'bg-amber-500',
              )}
            />
            <span className="text-sm">{label}</span>
          </div>
        )
      },
    },
    {
      id: 'actions',
      heading: '',
      align: 'right',
      cell: (t) => (
        <button
          type="button"
          onClick={() => openDelete(t)}
          disabled={t.processed}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40"
          aria-label="Delete transaction"
          title={
            t.processed
              ? 'Processed transactions cannot be deleted'
              : 'Delete transaction'
          }
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  const collection = DataTable.collection({
    items: data ?? [],
    itemToValue: (t) => t.id,
    itemToString: (t) => t.id,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
      <PageHeader
        action={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setExpenseOpen(true)}
          >
            <Receipt size={16} />
            Log Expense
          </Button>
        }
        title="Activity"
        description={`Showing transactions for ${formatDate(date)}`}
      />

      <DatePicker
        label="Date Filter"
        value={dayjsLocal(date).toDate()}
        onChange={(next) =>
          next && setDate(dayjsLocal(next).format('YYYY-MM-DD'))
        }
        disableFuture
        className="w-full md:w-56"
      />

      <DataTable
        collection={collection}
        columns={columns}
        loading={isLoading}
        emptyMessage="No transactions found for this date."
      />

      <DeleteConfirmModal
        item={selectedItem}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedItem(null);
        }}
      />

      <LogExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
      />
    </div>
  );
};

export default TransactionsPage;
