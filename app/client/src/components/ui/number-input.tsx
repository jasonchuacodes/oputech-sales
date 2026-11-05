import { useState } from 'react'
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

type NumberInputProps<T extends FieldValues> = Omit<
  React.ComponentProps<'input'>,
  'name'
> & {
  control: Control<T>
  name: Path<T>
  step?: number
  min?: number
  max?: number
  hideControls?: boolean
}

interface NumberField {
  name: string
  onBlur: () => void
  onChange: (value: number | undefined) => void
  ref: React.Ref<HTMLInputElement>
  value: number | undefined
}

interface NumberInputFieldProps extends Omit<
  React.ComponentProps<'input'>,
  'name' | 'value' | 'onChange' | 'type'
> {
  field: NumberField
  fieldState: ControllerFieldState
  step: number
  min?: number
  max?: number
  hideControls?: boolean
}

const toDisplayValue = (value: number | undefined) =>
  value === undefined || value === 0 ? '' : String(value)

function NumberInputField({
  field,
  fieldState,
  step,
  min,
  max,
  hideControls,
  className,
  ...props
}: NumberInputFieldProps) {
  const decimals = String(step).includes('.')
    ? String(step).split('.')[1].length
    : 0

  const round = (n: number) => Number(n.toFixed(decimals))

  const [text, setText] = useState(() => toDisplayValue(field.value))
  const [lastValue, setLastValue] = useState(field.value)

  if (field.value !== lastValue) {
    setLastValue(field.value)
    setText(toDisplayValue(field.value))
  }

  const current = Number(text || 0)
  const atMax = max !== undefined && current >= max
  const atMin = min !== undefined && current <= min

  const commit = (next: number) => {
    const rounded = round(next)
    setText(String(rounded))
    setLastValue(rounded)
    field.onChange(rounded)
  }

  const increment = () => {
    let next = Number(text || 0) + step
    if (max !== undefined) next = Math.min(next, max)
    commit(next)
  }

  const decrement = () => {
    let next = Number(text || 0) - step
    if (min !== undefined) next = Math.max(next, min)
    commit(next)
  }

  return (
    <div
      className={cn(
        'border-input focus-within:border-brand focus-within:ring-brand/10 rounded-input bg-card flex h-12 overflow-hidden border focus-within:ring-3 md:h-10',
        fieldState.error && 'border-danger ring-danger/20',
        className
      )}
    >
      <input
        {...props}
        {...field}
        value={text}
        placeholder={props.placeholder ?? '0'}
        type="number"
        inputMode={props.inputMode ?? (decimals > 0 ? 'decimal' : 'numeric')}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const nextText = e.target.value
          setText(nextText)

          if (nextText === '') {
            setLastValue(undefined)
            field.onChange(undefined)
            return
          }

          const parsed = e.target.valueAsNumber
          const value = Number.isNaN(parsed) ? undefined : round(parsed)
          setLastValue(value)
          field.onChange(value)
        }}
        className="flex-1 [appearance:textfield] bg-transparent px-4 text-base outline-none md:px-3 md:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      {!hideControls && (
        <div className="border-border flex w-10 flex-col border-l md:w-9">
          <button
            type="button"
            onClick={increment}
            disabled={atMax}
            className="flex flex-1 items-center justify-center hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={decrement}
            disabled={atMin}
            className="border-border flex flex-1 items-center justify-center border-t hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export function NumberInput<T extends FieldValues>({
  control,
  name,
  step = 1,
  min,
  max,
  hideControls,
  className,
  ...props
}: NumberInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <NumberInputField
          {...props}
          field={field}
          fieldState={fieldState}
          step={step}
          min={min}
          max={max}
          hideControls={hideControls}
          className={className}
        />
      )}
    />
  )
}
