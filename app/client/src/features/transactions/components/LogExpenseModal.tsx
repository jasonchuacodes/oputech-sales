import { useEffect, useRef } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Receipt } from 'lucide-react'
import {
  CustomModal,
  Input,
  Label,
  SheetSelect,
} from '../../../components'
import { NumberInput } from '../../../components/ui/number-input'
import { useCreateTransaction } from '../../../services/transaction/transaction.queries'
import {
  PaymentType,
  TransactionType,
} from '../../../services/transaction/transaction.types'
import { LogExpenseSchema, LogExpenseInput } from '../schemas/log-expense.schema'
import { clearDraft, getDraft, saveDraft } from '../../../offline/database'

const EXPENSE_DRAFT_KEY = 'expense-form'

interface Props {
  open: boolean
  onClose: () => void
}

export const LogExpenseModal = ({ open, onClose }: Props) => {
  const createTransaction = useCreateTransaction()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<LogExpenseInput>({
    defaultValues: { label: '', amount: 0, paymentType: PaymentType.Cash },
    resolver: zodResolver(LogExpenseSchema),
  })
  const draftLoaded = useRef(false)
  const draft = useWatch({ control })

  useEffect(() => {
    void getDraft<LogExpenseInput>(EXPENSE_DRAFT_KEY).then((draft) => {
      if (draft) reset(draft)
      draftLoaded.current = true
    })
  }, [reset])

  useEffect(() => {
    if (!draftLoaded.current) return
    void saveDraft(EXPENSE_DRAFT_KEY, draft)
  }, [draft])

  const handleClose = () => {
    onClose()
  }

  const handleSaved = () => {
    reset({ label: '', amount: 0, paymentType: PaymentType.Cash })
    void clearDraft(EXPENSE_DRAFT_KEY)
    onClose()
  }

  const onSubmit = (data: LogExpenseInput) => {
    createTransaction.mutate(
      {
        type: TransactionType.Expense,
        label: data.label,
        amount: data.amount,
        paymentType: data.paymentType,
        items: [],
      },
      { onSuccess: handleSaved }
    )
  }

  return (
    <CustomModal
      open={open}
      title="Log Expense"
      subheader="Record a cash outflow for this day."
      icon={Receipt}
      submitText="Log Expense"
      loading={createTransaction.isPending}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="label">Label *</Label>
          <Input
            id="label"
            placeholder="e.g. Ice delivery"
            aria-invalid={!!errors.label}
            {...register('label')}
          />
          {errors.label && (
            <p className="text-destructive text-xs">{errors.label.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount *</Label>
          <NumberInput name="amount" control={control} step={0.01} min={0} />
          {errors.amount && (
            <p className="text-destructive text-xs">
              {errors.amount.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Payment Type *</Label>
          <Controller
            name="paymentType"
            control={control}
            render={({ field }) => (
              <SheetSelect
                value={field.value}
                onValueChange={field.onChange}
                title="Choose a payment method"
                placeholder="Select a payment method…"
                options={[
                  { value: PaymentType.Cash, label: 'Cash' },
                  { value: PaymentType.Online, label: 'Online' },
                ]}
              />
            )}
          />
        </div>
      </div>
    </CustomModal>
  )
}
