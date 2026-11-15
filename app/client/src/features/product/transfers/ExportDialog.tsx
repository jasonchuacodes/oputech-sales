'use client'

import { Download, Minus, Package, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Button, Spinner } from '@/components'
import {
  ProductTransferStatus,
  ProductTransferType,
  isActiveProductTransfer,
  isCompletedProductTransfer,
} from '@/services/product-transfer/product-transfer.types'
import { formatTime } from '@/utils/date'
import type { ProductTransfersController } from './useProductTransfers'

interface ExportDialogProps {
  controller: ProductTransfersController
}

export const ExportDialog = ({ controller }: ExportDialogProps) => {
  const {
    job,
    dialogKind,
    dialogView,
    operationError,
    startingExport,
    downloading,
    dismissDialog,
    beginExport,
    downloadResult,
  } = controller
  const open = dialogKind === ProductTransferType.Export
  const currentJob =
    dialogView === 'job' && job?.type === ProductTransferType.Export
      ? job
      : null
  const active = isActiveProductTransfer(currentJob)
  const completed = isCompletedProductTransfer(currentJob)
  const DismissIcon = active ? Minus : X

  const renderBody = () => {
    if (!currentJob) {
      return (
        <div className="flex flex-col gap-4">
          <div className="bg-background flex gap-3 rounded-md p-4">
            <Package className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">Export the complete product catalog</p>
              <p className="text-text-secondary mt-1 text-sm">
                This exports all active products, not only the current search.
                The workbook supports up to 5,000 products and can be edited and
                imported again.
              </p>
            </div>
          </div>
        </div>
      )
    }
    if (active) {
      const queued = currentJob.status === ProductTransferStatus.Queued
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Spinner />
            <div>
              <p className="font-medium">
                {queued ? 'Export queued' : 'Generating Excel export…'}
              </p>
              <p className="text-text-secondary text-sm">
                {queued
                  ? 'Waiting for the background worker to start.'
                  : 'Generating the Excel workbook and uploading it for download.'}
              </p>
            </div>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
          </div>
        </div>
      )
    }
    if (completed) {
      return (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-medium">Your product export is ready</p>
            <p className="text-text-secondary mt-1 text-sm">
              {currentJob.totalRows.toLocaleString()}{' '}
              {currentJob.totalRows === 1 ? 'product' : 'products'} exported
              {currentJob.completedAt
                ? ` · ${formatTime(currentJob.completedAt, 'MMM D, YYYY, h:mm A')}`
                : ''}
            </p>
          </div>
          {currentJob.filesExpireAt && (
            <p className="text-text-tertiary text-sm">
              Available until{' '}
              {formatTime(currentJob.filesExpireAt, 'MMM D, YYYY, h:mm A')}.
            </p>
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        <p className="font-medium">Export could not be completed</p>
        <p className="text-destructive text-sm">
          {currentJob.failureMessage ?? 'Try generating a new product export.'}
        </p>
      </div>
    )
  }

  const renderFooter = () => {
    if (!currentJob) {
      return (
        <>
          <Button variant="outline" onClick={dismissDialog}>
            Close
          </Button>
          <Button disabled={startingExport} onClick={() => void beginExport()}>
            {startingExport && <Spinner size="xs" variant="current" />}
            Generate export
          </Button>
        </>
      )
    }
    if (active) return null
    if (completed) {
      return (
        <>
          <Button variant="outline" onClick={dismissDialog}>
            Close
          </Button>
          <Button disabled={downloading} onClick={() => void downloadResult()}>
            <Download />
            Download
          </Button>
        </>
      )
    }
    return (
      <>
        <Button variant="outline" onClick={dismissDialog}>
          Close
        </Button>
        <Button disabled={startingExport} onClick={() => void beginExport()}>
          Generate another export
        </Button>
      </>
    )
  }

  const footer = renderFooter()

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && dismissDialog()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="bg-foreground/50 fixed inset-0 z-50 backdrop-blur-sm" />
        <Dialog.Content className="bg-card fixed top-1/2 left-1/2 z-60 flex max-h-[85vh] w-[calc(100%-3rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg shadow-lg outline-none">
          <header className="flex items-start gap-3 p-5 pb-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold">
                Export products
              </Dialog.Title>
              <Dialog.Description className="text-text-secondary mt-1 text-sm">
                Generate an Excel workbook from the tenant product catalog.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={active ? 'Minimize transfer' : 'Close'}
                title={active ? 'Minimize' : 'Close'}
                className="text-text-secondary hover:bg-surface-hover focus-visible:ring-ring/30 flex size-10 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-3"
              >
                <DismissIcon className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {renderBody()}
            {operationError && (
              <p className="text-destructive mt-4 text-sm">{operationError}</p>
            )}
          </div>
          {footer && (
            <footer className="border-border flex shrink-0 items-center justify-end gap-3 border-t p-4">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
