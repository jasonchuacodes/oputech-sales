'use client'

import { useRef, useState } from 'react'
import { Box, ClipboardCheck, PackagePlus } from 'lucide-react'
import { CustomModal, Input, Label, SheetSelect } from '@/components'
import type { Product } from '@/services/product/product.types'
import {
  useEnableStockTracking,
  useReceiveStock,
  useReconcileStock,
} from '@/services/stock/stock.queries'
import { StockUnit, stockUnitLabels } from '@/services/stock/stock.types'

export type InventoryOperationMode = 'setup' | 'receive' | 'reconcile'

interface Props {
  mode: InventoryOperationMode
  open: boolean
  product: Product
  onClose: () => void
}

const unitOptions = Object.values(StockUnit).map((unit) => ({
  value: unit,
  label: stockUnitLabels[unit],
}))

export const InventoryOperationModal = ({
  mode,
  open,
  product,
  onClose,
}: Props) => {
  const enable = useEnableStockTracking()
  const receive = useReceiveStock()
  const reconcile = useReconcileStock()
  const inventory = product.inventory
  const [unit, setUnit] = useState<StockUnit>(StockUnit.PC)
  const [openingQuantity, setOpeningQuantity] = useState('')
  const [packageCount, setPackageCount] = useState('1')
  const [quantityPerPackage, setQuantityPerPackage] = useState('1')
  const [packageLabel, setPackageLabel] = useState('')
  const [countedQuantity, setCountedQuantity] = useState(
    inventory?.stockCount ?? '0'
  )
  const [note, setNote] = useState('')
  const clientMutationId = useRef('')

  const pending = enable.isPending || receive.isPending || reconcile.isPending
  const validDecimal = (value: string, allowZero = false) => {
    if (!value.trim()) return false
    const parsed = Number(value)
    return Number.isFinite(parsed) && (allowZero ? parsed >= 0 : parsed > 0)
  }

  const closeAfter = { onSuccess: onClose }
  const submit = () => {
    clientMutationId.current ||= crypto.randomUUID()
    if (mode === 'setup') {
      if (inventory || !validDecimal(openingQuantity, true)) return
      enable.mutate(
        {
          clientMutationId: clientMutationId.current,
          productId: product.id,
          unit,
          openingQuantity,
          note: note.trim() || undefined,
        },
        closeAfter
      )
      return
    }
    if (!inventory) return
    if (mode === 'receive') {
      if (!validDecimal(packageCount) || !validDecimal(quantityPerPackage))
        return
      receive.mutate(
        {
          clientMutationId: clientMutationId.current,
          productId: product.id,
          packageCount,
          quantityPerPackage,
          packageLabel: packageLabel.trim() || undefined,
          note: note.trim() || undefined,
        },
        closeAfter
      )
      return
    }
    if (!validDecimal(countedQuantity, true) || !note.trim()) return
    reconcile.mutate(
      {
        clientMutationId: clientMutationId.current,
        productId: product.id,
        countedQuantity,
        expectedRevision: inventory.revision,
        note: note.trim(),
      },
      closeAfter
    )
  }

  const config =
    mode === 'setup'
      ? {
          title: `Set up ${product.name}`,
          subtitle:
            'Choose the base unit and record the current physical count.',
          submit: 'Enable tracking',
          icon: Box,
        }
      : mode === 'receive'
        ? {
            title: `Receive ${product.name}`,
            subtitle: `Add incoming packages in ${inventory ? stockUnitLabels[inventory.unit] : ''}.`,
            submit: 'Receive stock',
            icon: PackagePlus,
          }
        : {
            title: `Count ${product.name}`,
            subtitle:
              'Enter the physical quantity. The difference will be recorded.',
            submit: 'Reconcile count',
            icon: ClipboardCheck,
          }

  return (
    <CustomModal
      open={open}
      title={config.title}
      subheader={config.subtitle}
      submitText={config.submit}
      icon={config.icon}
      loading={pending}
      disabled={
        mode === 'setup'
          ? !!inventory || !validDecimal(openingQuantity, true)
          : mode === 'receive'
            ? !inventory ||
              !validDecimal(packageCount) ||
              !validDecimal(quantityPerPackage)
            : !inventory || !validDecimal(countedQuantity, true) || !note.trim()
      }
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        {mode === 'setup' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Base unit</Label>
                <SheetSelect
                  title="Choose a base unit"
                  value={unit}
                  onValueChange={(value) => setUnit(value as StockUnit)}
                  options={unitOptions}
                />
              </div>
              <DecimalField
                id="opening-quantity"
                label="Opening count"
                value={openingQuantity}
                placeholder="0"
                onChange={setOpeningQuantity}
              />
            </div>
            <p className="bg-muted text-text-secondary rounded-md p-3 text-sm">
              {product.name} will be tracked in {stockUnitLabels[unit]}.
            </p>
          </>
        )}

        {mode === 'receive' && inventory && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <DecimalField
                id="package-count"
                label="Package count"
                value={packageCount}
                onChange={setPackageCount}
              />
              <DecimalField
                id="quantity-per-package"
                label={`Quantity per package (${stockUnitLabels[inventory.unit]})`}
                value={quantityPerPackage}
                onChange={setQuantityPerPackage}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="package-label">Package label</Label>
              <Input
                id="package-label"
                value={packageLabel}
                maxLength={80}
                placeholder="e.g. sack, case, delivery"
                onChange={(event) => setPackageLabel(event.target.value)}
              />
            </div>
          </>
        )}

        {mode === 'reconcile' && inventory && (
          <DecimalField
            id="counted-quantity"
            label={`Physical count (${stockUnitLabels[inventory.unit]})`}
            value={countedQuantity}
            onChange={setCountedQuantity}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stock-note">
            Note {mode === 'reconcile' ? '*' : '(optional)'}
          </Label>
          <Input
            id="stock-note"
            value={note}
            maxLength={500}
            placeholder={
              mode === 'reconcile'
                ? 'Why is this count changing?'
                : 'Reference or details'
            }
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
    </CustomModal>
  )
}

const DecimalField = ({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
)
