'use client'

import { useMemo, useRef, useState } from 'react'
import { Boxes, ClipboardCheck, PackagePlus } from 'lucide-react'
import { CustomModal, Input, Label, SheetSelect } from '@/components'
import type { Product } from '@/services/product/product.types'
import {
  useEnableStockTracking,
  useReceiveStock,
  useReconcileStock,
} from '@/services/stock/stock.queries'
import {
  StockUnit,
  stockUnitLabels,
  type Stock,
} from '@/services/stock/stock.types'

export type StockOperationMode = 'setup' | 'receive' | 'reconcile'

interface Props {
  mode: StockOperationMode
  open: boolean
  products: Product[]
  stock?: Stock | null
  onClose: () => void
}

const unitOptions = Object.values(StockUnit).map((unit) => ({
  value: unit,
  label: stockUnitLabels[unit],
}))

export const StockOperationModal = ({
  mode,
  open,
  products,
  stock,
  onClose,
}: Props) => {
  const enable = useEnableStockTracking()
  const receive = useReceiveStock()
  const reconcile = useReconcileStock()
  const availableProducts = useMemo(
    () => products.filter((product) => !product.stockTrackingEnabled),
    [products],
  )
  const [productId, setProductId] = useState(
    stock?.productId ?? availableProducts[0]?.id ?? '',
  )
  const [unit, setUnit] = useState<StockUnit>(StockUnit.PC)
  const [openingQuantity, setOpeningQuantity] = useState('0')
  const [packageCount, setPackageCount] = useState('1')
  const [quantityPerPackage, setQuantityPerPackage] = useState('1')
  const [packageLabel, setPackageLabel] = useState('')
  const [countedQuantity, setCountedQuantity] = useState(stock?.quantity ?? '0')
  const [note, setNote] = useState('')
  const clientMutationId = useRef('')

  const pending = enable.isPending || receive.isPending || reconcile.isPending
  const validDecimal = (value: string, allowZero = false) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && (allowZero ? parsed >= 0 : parsed > 0)
  }
  const selectedProduct = availableProducts.find((product) => product.id === productId)

  const closeAfter = { onSuccess: onClose }
  const submit = () => {
    clientMutationId.current ||= crypto.randomUUID()
    if (mode === 'setup') {
      if (!productId || !validDecimal(openingQuantity, true)) return
      enable.mutate(
        {
          clientMutationId: clientMutationId.current,
          productId,
          unit,
          openingQuantity,
          note: note.trim() || undefined,
        },
        closeAfter,
      )
      return
    }
    if (!stock) return
    if (mode === 'receive') {
      if (!validDecimal(packageCount) || !validDecimal(quantityPerPackage)) return
      receive.mutate(
        {
          clientMutationId: clientMutationId.current,
          productId: stock.productId,
          packageCount,
          quantityPerPackage,
          packageLabel: packageLabel.trim() || undefined,
          note: note.trim() || undefined,
        },
        closeAfter,
      )
      return
    }
    if (!validDecimal(countedQuantity, true) || !note.trim()) return
    reconcile.mutate(
      {
        clientMutationId: clientMutationId.current,
        productId: stock.productId,
        countedQuantity,
        note: note.trim(),
      },
      closeAfter,
    )
  }

  const config =
    mode === 'setup'
      ? {
          title: 'Set up stock',
          subtitle: 'Choose the base unit and record the current physical count.',
          submit: 'Enable tracking',
          icon: Boxes,
        }
      : mode === 'receive'
        ? {
            title: `Receive ${stock?.product.name ?? 'stock'}`,
            subtitle: `Add incoming packages in ${stock ? stockUnitLabels[stock.unit] : ''}.`,
            submit: 'Receive stock',
            icon: PackagePlus,
          }
        : {
            title: `Count ${stock?.product.name ?? 'stock'}`,
            subtitle: 'Enter the physical quantity. The difference will be recorded.',
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
          ? !productId || !validDecimal(openingQuantity, true)
          : mode === 'receive'
            ? !validDecimal(packageCount) || !validDecimal(quantityPerPackage)
            : !validDecimal(countedQuantity, true) || !note.trim()
      }
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        {mode === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Product</Label>
              <SheetSelect
                title="Choose a product"
                value={productId}
                onValueChange={setProductId}
                options={availableProducts.map((product) => ({
                  value: product.id,
                  label: product.name,
                }))}
                placeholder="Select product"
              />
              {availableProducts.length === 0 && (
                <p className="text-text-tertiary text-sm">
                  Every catalog product already has stock tracking enabled.
                </p>
              )}
            </div>
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
                onChange={setOpeningQuantity}
              />
            </div>
            {selectedProduct && (
              <p className="rounded-md bg-muted p-3 text-sm text-text-secondary">
                {selectedProduct.name} will be priced and tracked per{' '}
                {stockUnitLabels[unit]}.
              </p>
            )}
          </>
        )}

        {mode === 'receive' && stock && (
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
                label={`Quantity per package (${stockUnitLabels[stock.unit]})`}
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

        {mode === 'reconcile' && stock && (
          <DecimalField
            id="counted-quantity"
            label={`Physical count (${stockUnitLabels[stock.unit]})`}
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
            placeholder={mode === 'reconcile' ? 'Why is this count changing?' : 'Reference or details'}
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
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
)
